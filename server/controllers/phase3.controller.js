import { listBuilderTemplates, saveBuilderTemplate, deleteBuilderTemplate, getPageMeta, savePageMeta, writeAdminActivity, listAdminActivity } from '../db-phase3.js';
import { json, readJson, requireAdmin } from '../utils/http.js';

export async function handlePhase3(req, res, pathname) {
  if (pathname === '/api/admin/phase3/templates' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'Template Library')) return true;
    try {
      json(res, 200, { templates: await listBuilderTemplates() });
    } catch {
      json(res, 503, { error: 'Không thể tải Template Library.' });
    }
    return true;
  }

  if (pathname === '/api/admin/phase3/templates' && req.method === 'POST') {
    const identity = await requireAdmin(req, res, 'Template Library');
    if (!identity) return true;
    try {
      const data = await readJson(req, 250000);
      const template = await saveBuilderTemplate(data, identity.email);
      await writeAdminActivity(identity.email, 'save_template', 'builder_template', template?.id || '', { name: template?.name || '' });
      json(res, 200, { template });
    } catch (error) {
      json(res, error.code === 'VALIDATION' ? 400 : 503, { error: error.code === 'VALIDATION' ? error.message : 'Không thể lưu template.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/admin/phase3/templates/') && req.method === 'DELETE') {
    const identity = await requireAdmin(req, res, 'Template Library');
    if (!identity) return true;
    try {
      const id = decodeURIComponent(pathname.split('/').pop() || '');
      const removed = await deleteBuilderTemplate(id);
      if (removed) await writeAdminActivity(identity.email, 'delete_template', 'builder_template', id);
      json(res, removed ? 200 : 404, { ok: removed });
    } catch {
      json(res, 503, { error: 'Không thể xóa template.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/admin/phase3/seo/') && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'SEO Manager')) return true;
    try {
      json(res, 200, { meta: await getPageMeta(decodeURIComponent(pathname.split('/').pop() || '')) });
    } catch {
      json(res, 503, { error: 'Không thể tải SEO metadata.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/admin/phase3/seo/') && req.method === 'PUT') {
    const identity = await requireAdmin(req, res, 'SEO Manager');
    if (!identity) return true;
    try {
      const slug = decodeURIComponent(pathname.split('/').pop() || '');
      const data = await readJson(req, 12000);
      const meta = await savePageMeta(slug, data, identity.email);
      await writeAdminActivity(identity.email, 'save_seo', 'page', slug, { metaTitle: meta.metaTitle });
      json(res, 200, { meta });
    } catch {
      json(res, 503, { error: 'Không thể lưu SEO metadata.' });
    }
    return true;
  }

  if (pathname === '/api/admin/phase3/activity' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'activity log')) return true;
    try {
      json(res, 200, { activity: await listAdminActivity() });
    } catch {
      json(res, 503, { error: 'Không thể tải activity log.' });
    }
    return true;
  }

  return false;
}
