import { getSqlPool } from '../db.js';
import { json, readJson, requireAdmin } from '../utils/http.js';
import { getCustomerIdentity } from './customer-auth.controller.js';

export async function handleAdminManagement(req, res, pathname) {
  // =========================================================================
  // 1. PUBLIC & CUSTOMER ENDPOINTS
  // =========================================================================

  // GET /api/reviews — Lấy danh sách đánh giá đã duyệt cho website
  if (pathname === '/api/reviews' && req.method === 'GET') {
    try {
      const pool = await getSqlPool();
      const result = await pool.request().query(`
        SELECT id, product_id, customer_name, rating, comment, admin_reply, replied_at, created_at
        FROM product_reviews
        WHERE status = 'approved'
        ORDER BY created_at DESC
      `);
      return json(res, 200, { reviews: result.recordset });
    } catch (err) {
      return json(res, 500, { error: 'Không thể tải đánh giá sản phẩm.' });
    }
  }

  // POST /api/orders — Khách hàng đặt mua đơn hàng (Bắt buộc phải đăng nhập!)
  if (pathname === '/api/orders' && req.method === 'POST') {
    const customer = await getCustomerIdentity(req);
    if (!customer) {
      return json(res, 401, { error: 'Vui lòng đăng nhập tài khoản để tiến hành đặt mua hàng!' });
    }

    try {
      const body = await readJson(req, 100000);
      const recipientName = (body.customerName || customer.fullName || '').trim();
      const recipientPhone = (body.customerPhone || customer.phone || '').trim();
      const shippingAddress = (body.shippingAddress || '').trim();
      const note = (body.note || '').trim();
      const quantity = Math.max(1, Number(body.quantity) || 1);
      const paymentMethod = body.paymentMethod === 'cod' ? 'cod' : 'bank_transfer';

      if (!recipientName) return json(res, 400, { error: 'Vui lòng nhập tên người nhận hàng.' });
      if (!recipientPhone) return json(res, 400, { error: 'Vui lòng nhập số điện thoại nhận hàng.' });
      if (!shippingAddress) return json(res, 400, { error: 'Vui lòng nhập địa chỉ giao hàng.' });

      const unitPrice = 299000;
      const shippingFee = 30000;
      const totalAmount = unitPrice * quantity + shippingFee;

      const orderCode = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

      const pool = await getSqlPool();
      const transaction = pool.transaction();
      await transaction.begin();

      try {
        const orderInsert = await transaction.request()
          .input('orderCode', orderCode)
          .input('customerId', customer.id)
          .input('customerName', recipientName)
          .input('customerPhone', recipientPhone)
          .input('customerEmail', customer.email || null)
          .input('shippingAddress', shippingAddress)
          .input('note', note || null)
          .input('totalAmount', totalAmount)
          .input('shippingFee', shippingFee)
          .input('paymentMethod', paymentMethod)
          .input('paymentStatus', paymentMethod === 'bank_transfer' ? 'pending' : 'pending')
          .input('orderStatus', 'new')
          .query(`
            DECLARE @newId NVARCHAR(64) = NEWID();
            INSERT INTO orders (id, order_code, customer_id, customer_name, customer_phone, customer_email, shipping_address, note, total_amount, shipping_fee, payment_method, payment_status, order_status, created_at, updated_at)
            VALUES (@newId, @orderCode, @customerId, @customerName, @customerPhone, @customerEmail, @shippingAddress, @note, @totalAmount, @shippingFee, @paymentMethod, @paymentStatus, @orderStatus, GETDATE(), GETDATE());
            SELECT @newId AS id;
          `);

        const orderId = orderInsert.recordset[0].id;

        await transaction.request()
          .input('orderId', orderId)
          .input('productId', 'gorise-board-game')
          .input('productName', 'Bộ trò chơi GORISE Board Game – Safe Home')
          .input('quantity', quantity)
          .input('unitPrice', unitPrice)
          .input('totalPrice', unitPrice * quantity)
          .query(`
            INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, total_price)
            VALUES (NEWID(), @orderId, @productId, @productName, @quantity, @unitPrice, @totalPrice)
          `);

        await transaction.commit();

        return json(res, 201, {
          success: true,
          message: 'Đặt hàng thành công!',
          order: {
            id: orderId,
            orderCode,
            totalAmount,
            shippingFee,
            paymentMethod,
            customerName: recipientName
          }
        });
      } catch (err) {
        await transaction.rollback();
        throw err;
      }
    } catch (err) {
      return json(res, 500, { error: 'Lỗi tạo đơn hàng: ' + err.message });
    }
  }

  // GET /api/customer/orders — Khách hàng xem lịch sử đơn hàng của mình
  if (pathname === '/api/customer/orders' && req.method === 'GET') {
    const customer = await getCustomerIdentity(req);
    if (!customer) {
      return json(res, 401, { error: 'Vui lòng đăng nhập để xem đơn hàng.' });
    }

    try {
      const pool = await getSqlPool();
      const result = await pool.request()
        .input('customerId', customer.id)
        .query(`
          SELECT o.id, o.order_code, o.total_amount, o.shipping_fee, o.payment_method, o.payment_status, o.order_status, o.created_at,
                 (SELECT product_name, quantity, unit_price, total_price FROM order_items WHERE order_id = o.id FOR JSON PATH) AS items_json
          FROM orders o
          WHERE o.customer_id = @customerId
          ORDER BY o.created_at DESC
        `);

      const orders = result.recordset.map(r => ({
        ...r,
        items: JSON.parse(r.items_json || '[]')
      }));

      return json(res, 200, { orders });
    } catch (err) {
      return json(res, 500, { error: 'Không thể tải danh sách đơn hàng.' });
    }
  }

  // =========================================================================
  // 2. ADMIN SECURE ENDPOINTS (Bảo vệ bằng requireAdmin)
  // =========================================================================

  // GET /api/admin/dashboard/stats — Thống kê Dashboard tổng quan
  if (pathname === '/api/admin/dashboard/stats' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'Dashboard')) return true;
    try {
      const pool = await getSqlPool();

      // Doanh thu thực tế (đã thanh toán hoặc hoàn tất)
      const revRes = await pool.request().query(`
        SELECT 
          ISNULL(SUM(CASE WHEN payment_status = 'paid' OR order_status = 'completed' THEN total_amount ELSE 0 END), 0) AS totalRevenue,
          ISNULL(SUM(CASE WHEN CAST(created_at AS DATE) = CAST(GETDATE() AS DATE) AND (payment_status = 'paid' OR order_status = 'completed') THEN total_amount ELSE 0 END), 0) AS todayRevenue,
          ISNULL(SUM(CASE WHEN created_at >= DATEADD(day, -7, GETDATE()) AND (payment_status = 'paid' OR order_status = 'completed') THEN total_amount ELSE 0 END), 0) AS weekRevenue,
          ISNULL(SUM(CASE WHEN created_at >= DATEADD(day, -30, GETDATE()) AND (payment_status = 'paid' OR order_status = 'completed') THEN total_amount ELSE 0 END), 0) AS monthRevenue,
          COUNT(*) AS totalOrders,
          ISNULL(SUM(CASE WHEN order_status = 'new' THEN 1 ELSE 0 END), 0) AS newOrders,
          ISNULL(SUM(CASE WHEN order_status = 'processing' THEN 1 ELSE 0 END), 0) AS processingOrders,
          ISNULL(SUM(CASE WHEN order_status = 'completed' THEN 1 ELSE 0 END), 0) AS completedOrders,
          ISNULL(SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelledOrders
        FROM orders
      `);

      // Số lượng khách hàng
      const custRes = await pool.request().query(`
        SELECT COUNT(*) AS totalCustomers,
               ISNULL(SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END), 0) AS activeCustomers
        FROM customers
        WHERE username IS NOT NULL OR auth_provider = 'local'
      `);

      // Đánh giá
      const revsRes = await pool.request().query(`
        SELECT 
          COUNT(*) AS totalReviews,
          ISNULL(AVG(CAST(rating AS FLOAT)), 5.0) AS avgRating,
          ISNULL(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pendingReviews
        FROM product_reviews
      `);

      // 5 đơn hàng mới nhất
      const recentOrders = await pool.request().query(`
        SELECT TOP 5 id, order_code, customer_name, customer_phone, total_amount, payment_method, payment_status, order_status, created_at
        FROM orders
        ORDER BY created_at DESC
      `);

      // 5 đánh giá mới nhất
      const recentReviews = await pool.request().query(`
        SELECT TOP 5 id, customer_name, rating, comment, status, created_at
        FROM product_reviews
        ORDER BY created_at DESC
      `);

      // Doanh thu theo 7 ngày gần nhất
      const dailyChart = await pool.request().query(`
        SELECT 
          CONVERT(VARCHAR(10), CAST(created_at AS DATE), 120) AS date,
          ISNULL(SUM(CASE WHEN payment_status = 'paid' OR order_status = 'completed' THEN total_amount ELSE 0 END), 0) AS revenue,
          COUNT(*) AS ordersCount
        FROM orders
        WHERE created_at >= DATEADD(day, -7, GETDATE())
        GROUP BY CAST(created_at AS DATE)
        ORDER BY CAST(created_at AS DATE) ASC
      `);

      return json(res, 200, {
        stats: {
          ...revRes.recordset[0],
          ...custRes.recordset[0],
          ...revsRes.recordset[0],
          avgRating: Number(revsRes.recordset[0].avgRating.toFixed(1)),
          recentOrders: recentOrders.recordset,
          recentReviews: recentReviews.recordset,
          dailyChart: dailyChart.recordset
        }
      });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi tải dữ liệu Dashboard: ' + err.message });
    }
  }

  // GET /api/admin/accounts — Quản lý danh sách tài khoản khách hàng
  if (pathname === '/api/admin/accounts' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'Accounts')) return true;
    try {
      const pool = await getSqlPool();
      const result = await pool.request().query(`
        SELECT 
          c.id, c.username, c.full_name, c.email, c.phone, c.is_active, c.created_at, c.last_login_at,
          COUNT(o.id) AS orders_count,
          ISNULL(SUM(CASE WHEN o.payment_status = 'paid' OR o.order_status = 'completed' THEN o.total_amount ELSE 0 END), 0) AS total_spent
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id
        WHERE c.username IS NOT NULL OR c.auth_provider = 'local'
        GROUP BY c.id, c.username, c.full_name, c.email, c.phone, c.is_active, c.created_at, c.last_login_at
        ORDER BY c.created_at DESC
      `);

      return json(res, 200, { accounts: result.recordset });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi tải danh sách tài khoản: ' + err.message });
    }
  }

  // POST /api/admin/accounts/toggle-status — Khóa / Mở khóa tài khoản khách hàng
  if (pathname === '/api/admin/accounts/toggle-status' && req.method === 'POST') {
    if (!await requireAdmin(req, res, 'Accounts')) return true;
    try {
      const body = await readJson(req, 10000);
      const { customerId, isActive } = body;
      if (!customerId) return json(res, 400, { error: 'Thiếu ID khách hàng.' });

      const pool = await getSqlPool();
      await pool.request()
        .input('id', customerId)
        .input('isActive', isActive ? 1 : 0)
        .query('UPDATE customers SET is_active = @isActive, updated_at = GETDATE() WHERE id = @id');

      return json(res, 200, { success: true, is_active: Boolean(isActive) });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi cập nhật trạng thái tài khoản: ' + err.message });
    }
  }

  // GET /api/admin/transactions — Quản lý danh sách đơn hàng / giao dịch
  if (pathname === '/api/admin/transactions' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'Transactions')) return true;
    try {
      const pool = await getSqlPool();
      const result = await pool.request().query(`
        SELECT 
          o.id, o.order_code, o.customer_name, o.customer_phone, o.customer_email, o.shipping_address, o.note,
          o.total_amount, o.shipping_fee, o.payment_method, o.payment_status, o.order_status, o.created_at, o.updated_at,
          (
            SELECT product_name, quantity, unit_price, total_price 
            FROM order_items 
            WHERE order_id = o.id 
            FOR JSON PATH
          ) AS items_json
        FROM orders o
        ORDER BY o.created_at DESC
      `);

      const transactions = result.recordset.map(r => ({
        ...r,
        items: JSON.parse(r.items_json || '[]')
      }));

      return json(res, 200, { transactions });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi tải danh sách giao dịch: ' + err.message });
    }
  }

  // PUT /api/admin/transactions/:id/status — Cập nhật trạng thái thanh toán & đơn hàng
  if (pathname.startsWith('/api/admin/transactions/') && req.method === 'PUT') {
    if (!await requireAdmin(req, res, 'Transactions')) return true;
    try {
      const id = decodeURIComponent(pathname.replace('/api/admin/transactions/', ''));
      const body = await readJson(req, 10000);
      const { paymentStatus, orderStatus } = body;

      const pool = await getSqlPool();
      let query = 'UPDATE orders SET updated_at = GETDATE()';
      const reqSql = pool.request().input('id', id);

      if (paymentStatus) {
        query += ', payment_status = @paymentStatus';
        reqSql.input('paymentStatus', paymentStatus);
      }
      if (orderStatus) {
        query += ', order_status = @orderStatus';
        reqSql.input('orderStatus', orderStatus);
      }
      query += ' WHERE id = @id';

      await reqSql.query(query);
      return json(res, 200, { success: true, message: 'Đã cập nhật giao dịch.' });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi cập nhật giao dịch: ' + err.message });
    }
  }

  // GET /api/admin/income — Báo cáo & Thống kê thu nhập
  if (pathname === '/api/admin/income' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'Income')) return true;
    try {
      const pool = await getSqlPool();

      // Thống kê doanh thu theo thời gian
      const summary = await pool.request().query(`
        SELECT 
          ISNULL(SUM(CASE WHEN payment_status = 'paid' OR order_status = 'completed' THEN total_amount ELSE 0 END), 0) AS totalIncome,
          ISNULL(SUM(CASE WHEN CAST(created_at AS DATE) = CAST(GETDATE() AS DATE) AND (payment_status = 'paid' OR order_status = 'completed') THEN total_amount ELSE 0 END), 0) AS todayIncome,
          ISNULL(SUM(CASE WHEN created_at >= DATEADD(day, -7, GETDATE()) AND (payment_status = 'paid' OR order_status = 'completed') THEN total_amount ELSE 0 END), 0) AS weekIncome,
          ISNULL(SUM(CASE WHEN created_at >= DATEADD(day, -30, GETDATE()) AND (payment_status = 'paid' OR order_status = 'completed') THEN total_amount ELSE 0 END), 0) AS monthIncome,
          ISNULL(SUM(CASE WHEN (payment_status = 'paid' OR order_status = 'completed') AND payment_method = 'bank_transfer' THEN total_amount ELSE 0 END), 0) AS qrBankIncome,
          ISNULL(SUM(CASE WHEN (payment_status = 'paid' OR order_status = 'completed') AND payment_method = 'cod' THEN total_amount ELSE 0 END), 0) AS codIncome,
          COUNT(CASE WHEN payment_status = 'paid' OR order_status = 'completed' THEN 1 END) AS successfulTransactions
        FROM orders
      `);

      // Danh sách các giao dịch phát sinh thu nhập thành công
      const paidOrders = await pool.request().query(`
        SELECT id, order_code, customer_name, customer_phone, total_amount, payment_method, payment_status, order_status, created_at
        FROM orders
        WHERE payment_status = 'paid' OR order_status = 'completed'
        ORDER BY created_at DESC
      `);

      const s = summary.recordset[0];
      const aov = s.successfulTransactions > 0 ? Math.round(s.totalIncome / s.successfulTransactions) : 0;

      return json(res, 200, {
        income: {
          ...s,
          averageOrderValue: aov,
          transactions: paidOrders.recordset
        }
      });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi tải báo cáo thu nhập: ' + err.message });
    }
  }

  // GET /api/admin/reviews — Quản lý danh sách đánh giá sản phẩm
  if (pathname === '/api/admin/reviews' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'Reviews')) return true;
    try {
      const pool = await getSqlPool();
      const result = await pool.request().query(`
        SELECT r.id, r.product_id, p.product_name, r.customer_name, r.customer_phone, r.rating, r.comment, r.status, r.admin_reply, r.replied_at, r.created_at
        FROM product_reviews r
        LEFT JOIN products p ON p.id = r.product_id
        ORDER BY r.created_at DESC
      `);

      return json(res, 200, { reviews: result.recordset });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi tải danh sách đánh giá: ' + err.message });
    }
  }

  // PUT /api/admin/reviews/:id/status — Duyệt hoặc ẩn đánh giá
  if (pathname.startsWith('/api/admin/reviews/') && pathname.endsWith('/status') && req.method === 'PUT') {
    if (!await requireAdmin(req, res, 'Reviews')) return true;
    try {
      const id = pathname.split('/')[4];
      const body = await readJson(req, 10000);
      const status = body.status; // 'approved' hoặc 'hidden'
      if (!['approved', 'hidden', 'pending'].includes(status)) {
        return json(res, 400, { error: 'Trạng thái không hợp lệ.' });
      }

      const pool = await getSqlPool();
      await pool.request()
        .input('id', id)
        .input('status', status)
        .query('UPDATE product_reviews SET status = @status, updated_at = GETDATE() WHERE id = @id');

      return json(res, 200, { success: true, status });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi cập nhật trạng thái đánh giá: ' + err.message });
    }
  }

  // POST /api/admin/reviews/:id/reply — Admin trả lời đánh giá
  if (pathname.startsWith('/api/admin/reviews/') && pathname.endsWith('/reply') && req.method === 'POST') {
    if (!await requireAdmin(req, res, 'Reviews')) return true;
    try {
      const id = pathname.split('/')[4];
      const body = await readJson(req, 10000);
      const reply = (body.reply || '').trim();

      const pool = await getSqlPool();
      await pool.request()
        .input('id', id)
        .input('reply', reply)
        .query('UPDATE product_reviews SET admin_reply = @reply, replied_at = GETDATE(), updated_at = GETDATE() WHERE id = @id');

      return json(res, 200, { success: true, reply });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi gửi phản hồi đánh giá: ' + err.message });
    }
  }

  // DELETE /api/admin/reviews/:id — Xóa đánh giá spam
  if (pathname.startsWith('/api/admin/reviews/') && req.method === 'DELETE') {
    if (!await requireAdmin(req, res, 'Reviews')) return true;
    try {
      const id = pathname.split('/')[4];
      const pool = await getSqlPool();
      await pool.request()
        .input('id', id)
        .query('DELETE FROM product_reviews WHERE id = @id');

      return json(res, 200, { success: true, message: 'Đã xóa đánh giá.' });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi xóa đánh giá: ' + err.message });
    }
  }

  return false;
}
