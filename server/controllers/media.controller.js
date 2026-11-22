import crypto from 'node:crypto';
import { listMedia, listActiveMedia, createMedia, deactivateMedia } from '../db.js';
import { json, readJson, requireAdmin, safeFilename, presignStorage } from '../utils/http.js';

export async function handleMedia(req, res, pathname) {
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
      if (!/^image\/(png|jpe?g|webp|gif|svg\+xml)$/.test(contentType) || !Number.isInteger(size) || size < 1 || size > 8 * 1024 * 1024) {
        return json(res, 400, { error: 'Chỉ nhận PNG, JPG, WEBP, GIF hoặc SVG tối đa 8MB.' });
      }
      if (!/^[a-z0-9-]{2,80}$/.test(slot)) {
        return json(res, 400, { error: 'Tên vị trí ảnh không hợp lệ.' });
      }
      const id = crypto.randomUUID();
      const key = `gorise/media/${slot}/${id}-${safeFilename(data.name, 'image')}`;
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
