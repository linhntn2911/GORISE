import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import QRCode from 'qrcode';
import { listPublicVideos, listAdminVideos, createVideo, updateVideo, deactivateVideo } from '../db-video.js';
import { allowedVideoEvents, getVideoAnalyticsSummary, recordVideoEvent } from '../video-analytics.js';
import { json, readJson, requireAdmin, safeFilename, presignStorage, publicOrigin, validateVideo, validateImage, tooManyAnalytics } from '../utils/http.js';

export async function handleVideos(req, res, pathname) {
  if (pathname === '/api/videos/admin/analytics' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'analytics video')) return true;
    try {
      json(res, 200, { analytics: await getVideoAnalyticsSummary() });
    } catch {
      json(res, 503, { error: 'Không thể tải thống kê video.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/videos/') && pathname.endsWith('/analytics') && req.method === 'POST') {
    if (tooManyAnalytics(req)) return json(res, 429, { error: 'Bạn thao tác hơi nhanh, hãy thử lại sau ít phút.' });
    const videoId = pathname.split('/')[3];
    try {
      const data = await readJson(req, 3000);
      const event = String(data.event || '');
      if (!videoId || !allowedVideoEvents().includes(event)) {
        return json(res, 400, { error: 'Sự kiện video không hợp lệ.' });
      }
      await recordVideoEvent(videoId, event);
      json(res, 200, { ok: true });
    } catch {
      json(res, 503, { error: 'Chưa ghi nhận được tương tác video.' });
    }
    return true;
  }

  if (pathname === '/api/videos' && req.method === 'GET') {
    try {
      json(res, 200, { videos: await listPublicVideos() });
    } catch {
      json(res, 503, { error: 'Không thể tải video tình huống lúc này.' });
    }
    return true;
  }

  if (pathname === '/api/videos/admin' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'video')) return true;
    try {
      json(res, 200, { videos: await listAdminVideos() });
    } catch {
      json(res, 503, { error: 'Không thể tải kho video.' });
    }
    return true;
  }

  if (pathname === '/api/videos/presign' && req.method === 'POST') {
    const identity = await requireAdmin(req, res, 'video');
    if (!identity) return true;
    try {
      const data = await readJson(req);
      const checked = validateVideo(data);
      if (checked.error) return json(res, 400, { error: checked.error });
      const id = crypto.randomUUID();
      const key = `gorise/videos/${id}-${safeFilename(data.name, 'situation-video')}`;
      const uploadUrl = await presignStorage(key);
      json(res, 200, {
        id,
        key,
        uploadUrl,
        stableUrl: `/manus-storage/${key}`,
        title: String(data.title || data.name || 'Video tình huống').slice(0, 255),
        description: String(data.description || '').slice(0, 1000),
        originalName: safeFilename(data.name, 'situation-video'),
        contentType: checked.contentType,
        sizeBytes: checked.size,
      });
    } catch (error) {
      console.error('Video presign failed:', error.message);
      json(res, 503, { error: 'Chưa tạo được đường dẫn tải video. Hãy thử lại.' });
    }
    return true;
  }

  if (pathname === '/api/videos/upload' && req.method === 'POST') {
    const identity = await requireAdmin(req, res, 'video');
    if (!identity) return true;
    const contentType = String(req.headers['content-type'] || '');
    const size = Number(req.headers['content-length'] || 0);
    const checked = validateVideo({ contentType, size });
    if (checked.error) return json(res, 400, { error: checked.error });
    try {
      const requestUrl = new URL(req.url || '/', 'http://localhost');
      const id = crypto.randomUUID();
      const name = requestUrl.searchParams.get('name') || 'situation-video';
      const title = String(requestUrl.searchParams.get('title') || name).slice(0, 255);
      const description = String(requestUrl.searchParams.get('description') || '').slice(0, 1000);
      const originalName = safeFilename(name, 'situation-video');
      const key = `gorise/videos/${id}-${originalName}`;
      const stableUrl = `/manus-storage/${key}`;
      const uploadUrl = await presignStorage(key);
      const upload = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType, 'Content-Length': String(size) },
        body: Readable.toWeb(req),
        duplex: 'half',
      });
      if (!upload.ok) return json(res, 502, { error: 'Storage không nhận video. Hãy kiểm tra định dạng và thử lại.' });
      const video = {
        id,
        title,
        description,
        originalName,
        contentType,
        sizeBytes: size,
        storageKey: key,
        stableUrl,
        createdBy: identity.email,
      };
      await createVideo(video);
      json(res, 201, { video, publicUrl: `/video-tinh-huong/?v=${encodeURIComponent(id)}` });
    } catch (error) {
      console.error('Video upload failed:', error.message);
      json(res, 503, { error: 'Không thể tải video lên lúc này. Hãy thử lại.' });
    }
    return true;
  }

  if (pathname === '/api/videos/thumbnail/upload' && req.method === 'POST') {
    const identity = await requireAdmin(req, res, 'thumbnail video');
    if (!identity) return true;
    const contentType = String(req.headers['content-type'] || '');
    const size = Number(req.headers['content-length'] || 0);
    const checked = validateImage({ contentType, size });
    if (checked.error) return json(res, 400, { error: checked.error });
    try {
      const requestUrl = new URL(req.url || '/', 'http://localhost');
      const videoId = String(requestUrl.searchParams.get('videoId') || '');
      const name = requestUrl.searchParams.get('name') || 'video-thumbnail';
      if (!/^[a-f0-9-]{16,64}$/i.test(videoId)) return json(res, 400, { error: 'Thiếu video ID hợp lệ.' });
      const key = `gorise/video-thumbnails/${videoId}-${safeFilename(name, 'thumbnail')}`;
      const uploadUrl = await presignStorage(key);
      const upload = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType, 'Content-Length': String(size) },
        body: Readable.toWeb(req),
        duplex: 'half',
      });
      if (!upload.ok) return json(res, 502, { error: 'Storage không nhận thumbnail. Hãy kiểm tra định dạng và thử lại.' });
      const thumbnailUrl = `/manus-storage/${key}`;
      const updated = await updateVideo(videoId, { thumbnailUrl });
      json(res, updated ? 201 : 404, { ok: updated, thumbnailUrl });
    } catch (error) {
      console.error('Video thumbnail upload failed:', error.message);
      json(res, 503, { error: 'Không thể tải thumbnail lên lúc này. Hãy thử lại.' });
    }
    return true;
  }

  if (pathname === '/api/videos/complete' && req.method === 'POST') {
    const identity = await requireAdmin(req, res, 'video');
    if (!identity) return true;
    try {
      const data = await readJson(req);
      const key = String(data.key || '');
      const stableUrl = String(data.stableUrl || '');
      if (!/^gorise\/videos\/[a-zA-Z0-9._-]+$/.test(key) || !stableUrl.startsWith('/manus-storage/')) {
        return json(res, 400, { error: 'Thông tin video không hợp lệ.' });
      }
      const video = {
        id: String(data.id || crypto.randomUUID()).slice(0, 64),
        title: String(data.title || 'Video tình huống').slice(0, 255),
        description: String(data.description || '').slice(0, 1000),
        originalName: String(data.originalName || 'situation-video').slice(0, 255),
        contentType: String(data.contentType || 'video/mp4'),
        sizeBytes: Number(data.sizeBytes || 0),
        storageKey: key,
        stableUrl,
        createdBy: identity.email,
      };
      await createVideo(video);
      json(res, 201, { video, publicUrl: `/video-tinh-huong/?v=${encodeURIComponent(video.id)}` });
    } catch (error) {
      console.error('Video complete failed:', error.message);
      json(res, 503, { error: 'Video đã tải nhưng chưa lưu được chỉ mục. Hãy thử lại.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/videos/') && req.method === 'PATCH') {
    const identity = await requireAdmin(req, res, 'video');
    if (!identity) return true;
    try {
      const id = pathname.split('/').pop();
      const data = await readJson(req);
      const title = String(data.title || '').trim().slice(0, 255);
      const description = String(data.description || '').trim().slice(0, 1000);
      if (!id || !title) return json(res, 400, { error: 'Tiêu đề video không được để trống.' });
      const updated = await updateVideo(id, { title, description });
      json(res, updated ? 200 : 404, { ok: updated });
    } catch (error) {
      console.error('Video update failed:', error.message);
      json(res, 503, { error: 'Chưa cập nhật được video. Hãy thử lại.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/videos/') && pathname.endsWith('/qr.svg') && req.method === 'GET') {
    const identity = await requireAdmin(req, res, 'QR video');
    if (!identity) return true;
    const id = pathname.split('/')[3];
    if (!id) return json(res, 400, { error: 'Thiếu video ID.' });
    const target = `${publicOrigin(req)}/video-tinh-huong/?v=${encodeURIComponent(id)}`;
    try {
      const svg = await QRCode.toString(target, { type: 'svg', margin: 1, width: 320, errorCorrectionLevel: 'M' });
      res.writeHead(200, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(svg);
    } catch {
      json(res, 500, { error: 'Không tạo được QR code.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/videos/') && req.method === 'DELETE') {
    const identity = await requireAdmin(req, res, 'video');
    if (!identity) return true;
    const removed = await deactivateVideo(pathname.split('/').pop());
    json(res, removed ? 200 : 404, { ok: removed });
    return true;
  }

  return false;
}
