import crypto from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listMedia, listActiveMedia, createMedia, deactivateMedia } from '../db.js';
import { json, readJson, requireAdmin, safeFilename, presignStorage } from '../utils/http.js';

const projectRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));

export async function handleMedia(req, res, pathname) {
  if (pathname === '/api/media/upload' && req.method === 'POST') {
    const identity = await requireAdmin(req, res, 'ảnh và video sản phẩm');
    if (!identity) return true;

    let savedPath = '';
    try {
      const requestUrl = new URL(req.url || '/', 'http://localhost');
      const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
      const isImage = /^image\/(png|jpe?g|webp|gif)$/.test(contentType);
      const isVideo = /^video\/(mp4|webm|quicktime|x-msvideo)$/.test(contentType);
      const maxSize = isVideo ? 250 * 1024 * 1024 : 8 * 1024 * 1024;
      const declaredSize = Number(requestUrl.searchParams.get('size') || req.headers['content-length'] || 0);
      const slot = String(requestUrl.searchParams.get('slot') || 'product-media').toLowerCase();

      if ((!isImage && !isVideo) || !Number.isInteger(declaredSize) || declaredSize < 1 || declaredSize > maxSize) {
        return json(res, 400, { error: 'Ảnh tối đa 8MB; video MP4, WebM, MOV hoặc AVI tối đa 250MB.' });
      }
      if (!/^product-[a-z0-9-]{2,64}$/.test(slot)) {
        return json(res, 400, { error: 'Vị trí file sản phẩm không hợp lệ.' });
      }

      const chunks = [];
      let received = 0;
      for await (const chunk of req) {
        received += chunk.length;
        if (received > maxSize) return json(res, 413, { error: 'File vượt quá dung lượng cho phép.' });
        chunks.push(chunk);
      }
      if (received < 1) return json(res, 400, { error: 'File tải lên đang trống.' });

      const id = crypto.randomUUID();
      const originalName = safeFilename(requestUrl.searchParams.get('name'), isVideo ? 'video' : 'image');
      const storedName = `${id}-${originalName}`;
      const targetDir = resolve(projectRoot, 'public', 'uploads', 'products', slot);
      savedPath = resolve(targetDir, storedName);
      await mkdir(targetDir, { recursive: true });
      await writeFile(savedPath, Buffer.concat(chunks), { flag: 'wx' });

      const stableUrl = `/uploads/products/${slot}/${storedName}`;
      const media = {
        id,
        slot,
        originalName,
        contentType,
        sizeBytes: received,
        storageKey: `local/products/${slot}/${storedName}`,
        stableUrl,
        createdBy: identity.email,
      };
      await createMedia(media);
      return json(res, 201, { media });
    } catch (error) {
      if (savedPath) await unlink(savedPath).catch(() => {});
      console.error('Local product media upload failed:', error.message);
      return json(res, 500, { error: 'Không lưu được file sản phẩm: ' + error.message });
    }
  }

  if (pathname === '/api/media/active' && req.method === 'GET') {
    try {
      json(res, 200, { media: await listActiveMedia() });
    } catch {
      json(res, 503, { error: 'Không thể tải ảnh đang dùng.' });
    }
    return true;
  }

  if (pathname === '/api/media' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'ảnh')) return true;
    try {
      json(res, 200, { media: await listMedia() });
    } catch {
      json(res, 503, { error: 'Không thể tải danh sách ảnh.' });
    }
    return true;
  }

  if (pathname === '/api/media/presign' && req.method === 'POST') {
    const identity = await requireAdmin(req, res, 'ảnh');
    if (!identity) return true;
    try {
      const data = await readJson(req);
      const contentType = String(data.contentType || '');
      const size = Number(data.size || 0);
      const slot = String(data.slot || 'general');
      const isImage = /^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(contentType);
      const isVideo = /^video\/(mp4|webm|quicktime|x-msvideo)$/.test(contentType);
      const maxSize = isVideo ? 250 * 1024 * 1024 : 8 * 1024 * 1024;
      if ((!isImage && !isVideo) || !Number.isInteger(size) || size < 1 || size > maxSize) {
        return json(res, 400, { error: 'Ảnh tối đa 8MB; video MP4, WebM, MOV hoặc AVI tối đa 250MB.' });
      }
      if (!/^[a-z0-9-]{2,80}$/.test(slot)) {
        return json(res, 400, { error: 'Tên vị trí ảnh không hợp lệ.' });
      }
      const id = crypto.randomUUID();
      const key = `gorise/media/${slot}/${id}-${safeFilename(data.name, isVideo ? 'video' : 'image')}`;
      const uploadUrl = await presignStorage(key);
      json(res, 200, {
        id,
        key,
        uploadUrl,
        stableUrl: `/manus-storage/${key}`,
        slot,
        originalName: safeFilename(data.name, 'image'),
        contentType,
        sizeBytes: size,
      });
    } catch (error) {
      console.error('Media presign failed:', error.message);
      json(res, 503, { error: 'Chưa tạo được đường dẫn tải ảnh. Hãy thử lại.' });
    }
    return true;
  }

  if (pathname === '/api/media/complete' && req.method === 'POST') {
    const identity = await requireAdmin(req, res, 'ảnh');
    if (!identity) return true;
    try {
      const data = await readJson(req);
      const key = String(data.key || '');
      const stableUrl = String(data.stableUrl || '');
      if (!/^gorise\/media\/[a-z0-9-]{2,80}\/[a-zA-Z0-9._-]+$/.test(key) || !stableUrl.startsWith('/manus-storage/')) {
        return json(res, 400, { error: 'Thông tin ảnh không hợp lệ.' });
      }
      const media = {
        id: String(data.id || crypto.randomUUID()).slice(0, 64),
        slot: String(data.slot || 'general'),
        originalName: String(data.originalName || 'image').slice(0, 255),
        contentType: String(data.contentType || 'image/png'),
        sizeBytes: Number(data.sizeBytes || 0),
        storageKey: key,
        stableUrl,
        createdBy: identity.email,
      };
      await createMedia(media);
      json(res, 201, { media });
    } catch (error) {
      console.error('Media complete failed:', error.message);
      json(res, 503, { error: 'Ảnh đã tải nhưng chưa lưu được chỉ mục. Hãy thử lại.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/media/') && req.method === 'DELETE') {
    const identity = await requireAdmin(req, res, 'ảnh');
    if (!identity) return true;
    const removed = await deactivateMedia(pathname.split('/').pop());
    json(res, removed ? 200 : 404, { ok: removed });
    return true;
  }

  return false;
}
