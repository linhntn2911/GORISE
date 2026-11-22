import { ensureBuilderPages, listBuilderPages, getBuilderPage, saveBuilderDraft, publishBuilderPage, listBuilderVersions, rollbackBuilderPage, getPublishedBuilderSchema } from '../db-builder.js';
import { json, readJson, requireAdmin, validateBuilderSchema } from '../utils/http.js';

export async function handleBuilder(req, res, pathname) {
  if (pathname === '/api/builder/pages' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'Website Builder')) return true;
    try {
      await ensureBuilderPages();
      json(res, 200, { pages: await listBuilderPages() });
    } catch (error) {
      console.error('Builder list failed:', error.message);
      json(res, 503, { error: 'Không thể tải danh sách trang.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/builder/pages/') && pathname.endsWith('/versions') && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'lịch sử phiên bản')) return true;
    const slug = decodeURIComponent(pathname.split('/')[4] || '');
    try {
      json(res, 200, { versions: await listBuilderVersions(slug) });
    } catch {
      json(res, 503, { error: 'Không thể tải lịch sử phiên bản.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/builder/pages/') && pathname.endsWith('/rollback') && req.method === 'POST') {
    const identity = await requireAdmin(req, res, 'rollback trang');
    if (!identity) return true;
    const slug = decodeURIComponent(pathname.split('/')[4] || '');
    try {
      const data = await readJson(req);
      const page = await rollbackBuilderPage(slug, String(data.versionId || ''), identity.email);
      json(res, page ? 200 : 404, page ? { page } : { error: 'Không tìm thấy phiên bản.' });
    } catch {
      json(res, 503, { error: 'Không thể khôi phục phiên bản.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/builder/pages/') && pathname.endsWith('/publish') && req.method === 'POST') {
    const identity = await requireAdmin(req, res, 'publish trang');
    if (!identity) return true;
    const slug = decodeURIComponent(pathname.split('/')[4] || '');
    try {
      const data = await readJson(req, 8000);
      const page = await publishBuilderPage(slug, identity.email, String(data.note || 'Publish từ GORISE STUDIO').slice(0, 500));
      json(res, page ? 200 : 404, page ? { page } : { error: 'Không tìm thấy trang.' });
    } catch {
      json(res, 503, { error: 'Không thể publish trang.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/builder/pages/') && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'Website Builder')) return true;
    const slug = decodeURIComponent(pathname.split('/')[4] || '');
    try {
      const page = await getBuilderPage(slug);
      json(res, page ? 200 : 404, page ? { page } : { error: 'Không tìm thấy trang.' });
    } catch {
      json(res, 503, { error: 'Không thể tải trang.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/builder/pages/') && req.method === 'PUT') {
    const identity = await requireAdmin(req, res, 'lưu bản nháp');
    if (!identity) return true;
    const slug = decodeURIComponent(pathname.split('/')[4] || '');
    try {
      const data = await readJson(req, 250000);
      const error = validateBuilderSchema(data.schema);
      if (error) return json(res, 400, { error });
      const page = await saveBuilderDraft(slug, data.schema, identity.email);
      json(res, page ? 200 : 404, page ? { page } : { error: 'Không tìm thấy trang.' });
    } catch {
      json(res, 503, { error: 'Không thể lưu bản nháp.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/builder/published/') && req.method === 'GET') {
    const slug = decodeURIComponent(pathname.split('/').pop() || '');
    try {
      const schema = await getPublishedBuilderSchema(slug);
      json(res, schema ? 200 : 404, schema ? { schema } : { error: 'Không tìm thấy schema.' });
    } catch {
      json(res, 503, { error: 'Không thể tải schema public.' });
    }
    return true;
  }

  return false;
}
