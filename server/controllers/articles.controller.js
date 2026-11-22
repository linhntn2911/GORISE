import { listAdminArticles, listPublicArticles, getArticleBySlug, saveArticle, deleteArticle } from '../db-cms.js';
import { json, readJson, requireAdmin } from '../utils/http.js';

export async function handleArticles(req, res, pathname) {
  if (pathname === '/api/articles' && req.method === 'GET') {
    try {
      json(res, 200, { articles: await listPublicArticles() });
    } catch {
      json(res, 503, { error: 'Không thể tải bài viết.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/articles/slug/') && req.method === 'GET') {
    try {
      const article = await getArticleBySlug(decodeURIComponent(pathname.split('/').pop()));
      json(res, article ? 200 : 404, article ? { article } : { error: 'Không tìm thấy bài viết.' });
    } catch {
      json(res, 503, { error: 'Không thể tải bài viết.' });
    }
    return true;
  }

  if (pathname === '/api/articles/admin' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'bài viết')) return true;
    try {
      json(res, 200, { articles: await listAdminArticles() });
    } catch {
      json(res, 503, { error: 'Không thể tải kho bài viết.' });
    }
    return true;
  }

  if (pathname === '/api/articles' && (req.method === 'POST' || req.method === 'PATCH')) {
    const identity = await requireAdmin(req, res, 'bài viết');
    if (!identity) return true;
    try {
      const data = await readJson(req, 300000);
      if (!String(data.title || '').trim() || !String(data.slug || '').trim() || !String(data.content || '').trim()) {
        return json(res, 400, { error: 'Bài viết cần có tiêu đề, đường dẫn và nội dung.' });
      }
      const article = await saveArticle(data, identity.email);
      json(res, 200, { article });
    } catch (error) {
      json(res, error.code === 'ER_DUP_ENTRY' ? 409 : 503, {
        error: error.code === 'ER_DUP_ENTRY' ? 'Slug đã tồn tại.' : 'Chưa lưu được bài viết.',
      });
    }
    return true;
  }

  if (pathname.startsWith('/api/articles/') && req.method === 'DELETE') {
    if (!await requireAdmin(req, res, 'bài viết')) return true;
    const removed = await deleteArticle(pathname.split('/').pop());
    json(res, removed ? 200 : 404, { ok: removed });
    return true;
  }

  return false;
}
