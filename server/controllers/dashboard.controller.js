import { dashboardStats } from '../db-cms.js';
import { json, requireAdmin } from '../utils/http.js';

export async function handleDashboard(req, res, pathname) {
  if (pathname === '/api/admin/stats' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'Dashboard')) return true;
    try {
      json(res, 200, { stats: await dashboardStats() });
    } catch {
      json(res, 503, { error: 'Không thể tải thống kê quản trị.' });
    }
    return true;
  }
  return false;
}
