import { listProducts } from '../db.js';
import { listAdminProducts, saveProduct, deleteProduct } from '../db-cms.js';
import { json, readJson, requireAdmin } from '../utils/http.js';

export async function handleProducts(req, res, pathname) {
  if (pathname === '/api/products' && req.method === 'GET') {
    try {
      json(res, 200, { products: await listProducts() });
    } catch {
      json(res, 503, { error: 'Không thể tải dữ liệu sản phẩm lúc này.' });
    }
    return true;
  }

  if (pathname === '/api/products/admin' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'sản phẩm')) return true;
    try {
      json(res, 200, { products: await listAdminProducts() });
    } catch {
      json(res, 503, { error: 'Không thể tải kho sản phẩm.' });
    }
    return true;
  }

  if (pathname === '/api/products/admin' && (req.method === 'POST' || req.method === 'PATCH')) {
    const identity = await requireAdmin(req, res, 'sản phẩm');
    if (!identity) return true;
    try {
      const data = await readJson(req, 100000);
      if (!String(data.productName || '').trim()) {
        return json(res, 400, { error: 'Tên sản phẩm không được để trống.' });
      }
      const product = await saveProduct(data);
      json(res, 200, { product });
    } catch (error) {
      console.error('Product save failed:', error.message);
      json(res, 503, { error: 'Chưa lưu được sản phẩm.' });
    }
    return true;
  }

  if (pathname.startsWith('/api/products/admin/') && req.method === 'DELETE') {
    if (!await requireAdmin(req, res, 'sản phẩm')) return true;
    const removed = await deleteProduct(pathname.split('/').pop());
    json(res, removed ? 200 : 404, { ok: removed });
    return true;
  }

  return false;
}
