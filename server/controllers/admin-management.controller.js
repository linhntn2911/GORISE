import crypto from 'node:crypto';
import sql from 'mssql';
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
    if (customer.isAdmin) {
      return json(res, 403, { error: 'Tài khoản quản trị viên không được phép mua hoặc tạo đơn hàng.' });
    }

    try {
      const body = await readJson(req, 100000);
      const recipientName = (body.customerName || customer.fullName || '').trim();
      const recipientPhone = (body.customerPhone || customer.phone || '').trim();
      const shippingAddress = (body.shippingAddress || '').trim();
      const note = (body.note || '').trim();
      const quantity = Math.min(99, Math.max(1, Number(body.quantity) || 1));
      const productId = String(body.productId || '').trim();
      if (body.paymentMethod && body.paymentMethod !== 'bank_transfer') {
        return json(res, 400, { error: 'GORISE chỉ nhận đơn sau khi thanh toán chuyển khoản thành công.' });
      }
      const paymentMethod = 'bank_transfer';

      if (!recipientName) return json(res, 400, { error: 'Vui lòng nhập tên người nhận hàng.' });
      if (!recipientPhone) return json(res, 400, { error: 'Vui lòng nhập số điện thoại nhận hàng.' });
      if (!shippingAddress) return json(res, 400, { error: 'Vui lòng nhập địa chỉ giao hàng.' });

      const pool = await getSqlPool();
      const productResult = await pool.request()
        .input('productId', sql.NVarChar(64), productId)
        .query(`
          SELECT TOP 1 id, product_name, price_vnd, sale_price_vnd, status, stock_quantity
          FROM products
          WHERE (@productId <> '' AND id = @productId)
             OR (@productId = '' AND status = 'selling')
          ORDER BY CASE WHEN id = @productId THEN 0 ELSE 1 END, updated_at DESC
        `);
      const product = productResult.recordset?.[0];
      if (!product) return json(res, 404, { error: 'Sản phẩm không tồn tại hoặc chưa được xuất bản.' });
      if (product.status !== 'selling') return json(res, 409, { error: 'Sản phẩm hiện không ở trạng thái đang bán.' });
      if (product.stock_quantity != null && Number(product.stock_quantity) < quantity) {
        return json(res, 409, { error: 'Số lượng đặt vượt quá tồn kho hiện tại.' });
      }

      const unitPrice = Number(product.sale_price_vnd ?? product.price_vnd ?? 0);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) return json(res, 409, { error: 'Giá sản phẩm chưa hợp lệ.' });
      const shippingFee = 35000;
      const totalAmount = unitPrice * quantity + shippingFee;

      const orderCode = 'ORD-' + Math.floor(100000 + Math.random() * 900000);

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
          .input('productId', product.id)
          .input('productName', product.product_name)
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
          message: 'Đã tạo yêu cầu thanh toán. Đơn hàng chỉ được ghi nhận sau khi SePay xác nhận thanh toán.',
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
    if (customer.isAdmin) {
      return json(res, 403, { error: 'Quản trị viên vui lòng xem đơn hàng trong Admin Dashboard.' });
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
            AND o.payment_status = 'paid'
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

      // Chỉ giao dịch đã được SePay xác nhận mới là đơn hàng/doanh thu thực tế.
      const revRes = await pool.request().query(`
        SELECT 
          ISNULL(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS totalRevenue,
          ISNULL(SUM(CASE WHEN CAST(created_at AS DATE) = CAST(GETDATE() AS DATE) AND payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS todayRevenue,
          ISNULL(SUM(CASE WHEN created_at >= DATEADD(day, -7, GETDATE()) AND payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS weekRevenue,
          ISNULL(SUM(CASE WHEN created_at >= DATEADD(day, -30, GETDATE()) AND payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS monthRevenue,
          COUNT(*) AS totalOrders,
          ISNULL(SUM(CASE WHEN order_status = 'new' THEN 1 ELSE 0 END), 0) AS newOrders,
          ISNULL(SUM(CASE WHEN order_status IN ('confirmed', 'preparing', 'processing', 'shipping') THEN 1 ELSE 0 END), 0) AS processingOrders,
          ISNULL(SUM(CASE WHEN order_status = 'completed' THEN 1 ELSE 0 END), 0) AS completedOrders,
          ISNULL(SUM(CASE WHEN order_status = 'cancelled' THEN 1 ELSE 0 END), 0) AS cancelledOrders
        FROM orders
        WHERE payment_status = 'paid'
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

      // Đơn hàng gần đây
      const recentOrders = await pool.request().query(`
        SELECT TOP 50 id, order_code, customer_name, customer_phone, total_amount, payment_method, payment_status, order_status, created_at
        FROM orders
        WHERE payment_status = 'paid'
        ORDER BY created_at DESC
      `);

      // Đánh giá gần đây
      const recentReviews = await pool.request().query(`
        SELECT TOP 50 id, customer_name, rating, comment, status, created_at
        FROM product_reviews
        ORDER BY created_at DESC
      `);

      // Doanh thu theo 7 ngày gần nhất
      const dailyChart = await pool.request().query(`
        SELECT 
          CONVERT(VARCHAR(10), CAST(created_at AS DATE), 120) AS date,
          ISNULL(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS revenue,
          COUNT(*) AS ordersCount
        FROM orders
        WHERE created_at >= DATEADD(day, -7, GETDATE()) AND payment_status = 'paid'
        GROUP BY CAST(created_at AS DATE)
        ORDER BY CAST(created_at AS DATE) ASC
      `);

      const rev = revRes.recordset[0] || {};
      const cust = custRes.recordset[0] || {};
      const revs = revsRes.recordset[0] || {};

      const totalRevenue = Number(rev.totalRevenue ?? rev.totalrevenue ?? 0);
      const todayRevenue = Number(rev.todayRevenue ?? rev.todayrevenue ?? 0);
      const weekRevenue = Number(rev.weekRevenue ?? rev.weekrevenue ?? 0);
      const monthRevenue = Number(rev.monthRevenue ?? rev.monthrevenue ?? 0);
      const totalOrders = Number(rev.totalOrders ?? rev.totalorders ?? 0);
      const newOrders = Number(rev.newOrders ?? rev.neworders ?? 0);
      const processingOrders = Number(rev.processingOrders ?? rev.processingorders ?? 0);
      const completedOrders = Number(rev.completedOrders ?? rev.completedorders ?? 0);
      const cancelledOrders = Number(rev.cancelledOrders ?? rev.cancelledorders ?? 0);

      const totalCustomers = Number(cust.totalCustomers ?? cust.totalcustomers ?? 0);
      const activeCustomers = Number(cust.activeCustomers ?? cust.activecustomers ?? 0);

      const totalReviews = Number(revs.totalReviews ?? revs.totalreviews ?? 0);
      const rawAvg = Number(revs.avgRating ?? revs.avgrating ?? 5.0);
      const avgRating = Number((isNaN(rawAvg) ? 5.0 : rawAvg).toFixed(1));
      const pendingReviews = Number(revs.pendingReviews ?? revs.pendingreviews ?? 0);

      return json(res, 200, {
        stats: {
          totalRevenue,
          todayRevenue,
          weekRevenue,
          monthRevenue,
          totalOrders,
          newOrders,
          processingOrders,
          completedOrders,
          cancelledOrders,
          totalCustomers,
          activeCustomers,
          totalReviews,
          avgRating,
          pendingReviews,
          recentOrders: recentOrders.recordset || [],
          recentReviews: recentReviews.recordset || [],
          dailyChart: dailyChart.recordset || []
        }
      });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi tải dữ liệu Dashboard: ' + err.message });
    }
  }

  // GET /api/admin/dashboard/chart?days=7 — Biểu đồ doanh thu theo chu kỳ lọc (7, 14, 30 ngày)
  if (pathname === '/api/admin/dashboard/chart' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'Chart')) return true;
    try {
      const requestUrl = new URL(req.url || '/', 'http://localhost');
      const days = Math.min(90, Math.max(3, Number(requestUrl.searchParams.get('days')) || 7));
      const pool = await getSqlPool();
      const chartReq = pool.request();
      chartReq.input('days', sql.Int, days);
      const result = await chartReq.query(`
        SELECT 
          CONVERT(VARCHAR(10), CAST(created_at AS DATE), 120) AS date,
          ISNULL(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS revenue,
          COUNT(*) AS ordersCount
        FROM orders
        WHERE created_at >= DATEADD(day, -@days, GETDATE()) AND payment_status = 'paid'
        GROUP BY CAST(created_at AS DATE)
        ORDER BY CAST(created_at AS DATE) ASC
      `);
      return json(res, 200, { days, dailyChart: result.recordset });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi tải biểu đồ doanh thu: ' + err.message });
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
          ISNULL(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0) AS total_spent
        FROM customers c
        LEFT JOIN orders o ON o.customer_id = c.id AND o.payment_status = 'paid'
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

      // Bảo vệ tài khoản Quản trị viên: không bao giờ được phép khóa
      const checkCust = await pool.request()
        .input('id', customerId)
        .query("SELECT username FROM customers WHERE id = @id");
      if (checkCust.recordset.length && checkCust.recordset[0].username === 'admin') {
        return json(res, 400, { error: 'Tài khoản Quản trị viên hệ thống (admin) được bảo vệ cố định, không thể khóa!' });
      }

      await pool.request()
        .input('id', customerId)
        .input('isActive', sql.Bit, isActive ? 1 : 0)
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
        WHERE o.payment_status = 'paid'
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

  // PUT /api/admin/transactions/:id/status — Admin chỉ cập nhật quy trình giao nhận.
  // Trạng thái thanh toán chỉ được cập nhật bởi webhook SePay.
  if (pathname.startsWith('/api/admin/transactions/') && pathname.endsWith('/status') && req.method === 'PUT') {
    if (!await requireAdmin(req, res, 'Transactions')) return true;
    try {
      const id = decodeURIComponent(pathname.split('/')[4] || '');
      const body = await readJson(req, 10000);
      const { orderStatus } = body;

      const allowedOrderStatuses = new Set(['new', 'confirmed', 'preparing', 'processing', 'shipping', 'completed', 'cancelled']);
      if (!id) return json(res, 400, { error: 'Thiếu ID đơn hàng.' });
      if (!orderStatus) {
        return json(res, 400, { error: 'Chưa chọn trạng thái cần cập nhật.' });
      }
      if (orderStatus && !allowedOrderStatuses.has(orderStatus)) {
        return json(res, 400, { error: 'Trạng thái đơn hàng không hợp lệ.' });
      }

      const pool = await getSqlPool();
      let query = 'UPDATE orders SET updated_at = GETDATE()';
      const reqSql = pool.request().input('id', id);

      query += ', order_status = @orderStatus';
      reqSql.input('orderStatus', orderStatus);
      query += " WHERE id = @id AND payment_status = 'paid'";

      const updateResult = await reqSql.query(query);
      if (!updateResult.rowsAffected?.[0]) {
        return json(res, 404, { error: 'Không tìm thấy đơn hàng đã thanh toán cần cập nhật.' });
      }

      const updated = await pool.request()
        .input('id', id)
        .query(`
          SELECT id, order_code, payment_status, order_status, updated_at
          FROM orders
          WHERE id = @id
        `);
      return json(res, 200, {
        success: true,
        message: 'Đã cập nhật giao dịch.',
        transaction: updated.recordset[0],
      });
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
          ISNULL(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS totalIncome,
          ISNULL(SUM(CASE WHEN CAST(created_at AS DATE) = CAST(GETDATE() AS DATE) AND payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS todayIncome,
          ISNULL(SUM(CASE WHEN created_at >= DATEADD(day, -7, GETDATE()) AND payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS weekIncome,
          ISNULL(SUM(CASE WHEN created_at >= DATEADD(day, -30, GETDATE()) AND payment_status = 'paid' THEN total_amount ELSE 0 END), 0) AS monthIncome,
          ISNULL(SUM(CASE WHEN payment_status = 'paid' AND payment_method = 'bank_transfer' THEN total_amount ELSE 0 END), 0) AS qrBankIncome,
          ISNULL(SUM(CASE WHEN payment_status = 'paid' AND payment_method = 'cod' THEN total_amount ELSE 0 END), 0) AS codIncome,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) AS successfulTransactions
        FROM orders
      `);

      // Danh sách các giao dịch phát sinh thu nhập thành công
      const paidOrders = await pool.request().query(`
        SELECT id, order_code, customer_name, customer_phone, total_amount, payment_method, payment_status, order_status, created_at
        FROM orders
        WHERE payment_status = 'paid'
        ORDER BY created_at DESC
      `);

      const s = summary.recordset[0] || {};
      const totalIncome = Number(s.totalIncome ?? s.totalincome ?? 0);
      const todayIncome = Number(s.todayIncome ?? s.todayincome ?? 0);
      const weekIncome = Number(s.weekIncome ?? s.weekincome ?? 0);
      const monthIncome = Number(s.monthIncome ?? s.monthincome ?? 0);
      const qrBankIncome = Number(s.qrBankIncome ?? s.qrbankincome ?? 0);
      const codIncome = Number(s.codIncome ?? s.codincome ?? 0);
      const successfulTransactions = Number(s.successfulTransactions ?? s.successfultransactions ?? 0);
      const aov = successfulTransactions > 0 ? Math.round(totalIncome / successfulTransactions) : 0;

      return json(res, 200, {
        income: {
          totalIncome,
          todayIncome,
          weekIncome,
          monthIncome,
          qrBankIncome,
          codIncome,
          successfulTransactions,
          averageOrderValue: aov,
          transactions: paidOrders.recordset || []
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

  // =========================================================================
  // 5. QUẢN LÝ MÃ KÍCH HOẠT GORISE PLAY (ACTIVATION CODES)
  // =========================================================================

  // GET /api/admin/activation-codes — Danh sách mã kích hoạt
  if (pathname === '/api/admin/activation-codes' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'ActivationCodes')) return true;
    try {
      const url = new URL(req.url, 'http://localhost');
      const search = (url.searchParams.get('search') || '').trim();
      const status = url.searchParams.get('status') || 'all';
      const batch = (url.searchParams.get('batch') || '').trim();
      const page = Math.max(1, parseInt(url.searchParams.get('page'), 10) || 1);
      const limit = Math.min(200, Math.max(10, parseInt(url.searchParams.get('limit'), 10) || 50));
      const offset = (page - 1) * limit;

      const pool = await getSqlPool();

      let whereConditions = ['1=1'];
      const request = pool.request();

      if (status !== 'all') {
        whereConditions.push('status = @status');
        request.input('status', sql.NVarChar(20), status);
      }
      if (batch) {
        whereConditions.push('batch_name = @batch');
        request.input('batch', sql.NVarChar(100), batch);
      }
      if (search) {
        whereConditions.push('(code LIKE @search OR activated_by_name LIKE @search)');
        request.input('search', sql.NVarChar(100), `%${search}%`);
      }

      const whereClause = whereConditions.join(' AND ');

      request.input('offset', sql.Int, offset);
      request.input('limit', sql.Int, limit);

      const [itemsRes, countRes, statRes, batchesRes] = await Promise.all([
        request.query(`
          SELECT id, code, batch_name, status, activated_by_customer_id, activated_by_name, activated_at, created_at
          FROM activation_codes
          WHERE ${whereClause}
          ORDER BY created_at DESC, id DESC
          OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
        `),
        pool.request().query(`
          SELECT COUNT(*) AS total FROM activation_codes WHERE ${whereClause}
        `),
        pool.request().query(`
          SELECT 
            COUNT(*) AS totalAll,
            ISNULL(SUM(CASE WHEN status = 'unused' THEN 1 ELSE 0 END), 0) AS unusedCount,
            ISNULL(SUM(CASE WHEN status = 'used' THEN 1 ELSE 0 END), 0) AS usedCount
          FROM activation_codes
        `),
        pool.request().query(`
          SELECT DISTINCT batch_name 
          FROM activation_codes 
          WHERE batch_name IS NOT NULL AND batch_name <> ''
          ORDER BY batch_name DESC
        `),
      ]);

      return json(res, 200, {
        codes: itemsRes.recordset || [],
        total: countRes.recordset?.[0]?.total || 0,
        page,
        limit,
        stats: statRes.recordset?.[0] || { totalAll: 0, unusedCount: 0, usedCount: 0 },
        batches: (batchesRes.recordset || []).map((b) => b.batch_name),
      });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi tải danh sách mã kích hoạt: ' + err.message });
    }
  }

  // POST /api/admin/activation-codes/batch — Tạo hàng loạt mã cào
  if (pathname === '/api/admin/activation-codes/batch' && req.method === 'POST') {
    if (!await requireAdmin(req, res, 'ActivationCodes')) return true;
    try {
      const body = await readJson(req, 20000);
      const count = Math.min(2000, Math.max(1, parseInt(body.count, 10) || 50));
      const prefix = String(body.prefix || 'GORISE').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'GORISE';
      const batchName = String(body.batchName || '').trim() || `Đợt ${new Date().toLocaleDateString('vi-VN')}`;

      // Bảng chữ cái dễ đọc, loại bỏ ký tự dễ nhầm lẫn: 0, 1, I, O
      const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      const pool = await getSqlPool();

      // Sinh mã ngẫu nhiên bảo đảm không trùng lặp
      const generatedSet = new Set();
      while (generatedSet.size < count) {
        let part1 = '';
        let part2 = '';
        const bytes = crypto.randomBytes(8);
        for (let i = 0; i < 4; i++) {
          part1 += CHARS[bytes[i] % CHARS.length];
          part2 += CHARS[bytes[i + 4] % CHARS.length];
        }
        generatedSet.add(`${prefix}-${part1}-${part2}`);
      }

      const codesArray = [...generatedSet];

      // Ghi vào CSDL theo từng batch 100 dòng
      const CHUNK_SIZE = 100;
      for (let i = 0; i < codesArray.length; i += CHUNK_SIZE) {
        const chunk = codesArray.slice(i, i + CHUNK_SIZE);
        const reqInsert = pool.request();
        reqInsert.input('batchName', sql.NVarChar(100), batchName);

        const valueClauses = chunk.map((c, idx) => {
          reqInsert.input(`code_${idx}`, sql.NVarChar(50), c);
          reqInsert.input(`id_${idx}`, sql.NVarChar(64), `act_${crypto.randomUUID().replace(/-/g, '')}`);
          return `(@id_${idx}, @code_${idx}, @batchName, 'unused', GETDATE())`;
        }).join(', ');

        await reqInsert.query(`
          INSERT INTO activation_codes (id, code, batch_name, status, created_at)
          VALUES ${valueClauses}
        `);
      }

      return json(res, 201, {
        success: true,
        message: `Đã tạo thành công ${codesArray.length} mã kích hoạt cho đợt "${batchName}".`,
        count: codesArray.length,
        batchName,
      });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi tạo lô mã kích hoạt: ' + err.message });
    }
  }

  // GET /api/admin/activation-codes/export — Xuất file CSV/Excel cho xưởng in
  if (pathname === '/api/admin/activation-codes/export' && req.method === 'GET') {
    if (!await requireAdmin(req, res, 'ActivationCodes')) return true;
    try {
      const url = new URL(req.url, 'http://localhost');
      const batch = (url.searchParams.get('batch') || '').trim();
      const status = url.searchParams.get('status') || 'unused';

      const pool = await getSqlPool();
      let queryStr = `
        SELECT code, batch_name, status, activated_by_name, activated_at, created_at
        FROM activation_codes
        WHERE 1=1
      `;
      const reqExport = pool.request();

      if (batch) {
        queryStr += ' AND batch_name = @batch';
        reqExport.input('batch', sql.NVarChar(100), batch);
      }
      if (status !== 'all') {
        queryStr += ' AND status = @status';
        reqExport.input('status', sql.NVarChar(20), status);
      }
      queryStr += ' ORDER BY created_at DESC';

      const result = await reqExport.query(queryStr);
      const rows = result.recordset || [];

      // CSV with UTF-8 BOM
      const BOM = '\uFEFF';
      let csv = BOM + 'STT,Mã cào Board Game,Đợt in,Trạng thái,Người kích hoạt,Ngày kích hoạt,Ngày tạo mã\r\n';

      rows.forEach((r, idx) => {
        const stt = idx + 1;
        const code = `"${r.code}"`;
        const bName = `"${(r.batch_name || '').replace(/"/g, '""')}"`;
        const sttText = r.status === 'used' ? 'Đã sử dụng' : (r.status === 'revoked' ? 'Đã hủy' : 'Chưa sử dụng');
        const actName = `"${(r.activated_by_name || '').replace(/"/g, '""')}"`;
        const actAt = r.activated_at ? `"${new Date(r.activated_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}"` : '""';
        const crAt = r.created_at ? `"${new Date(r.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}"` : '""';

        csv += `${stt},${code},${bName},${sttText},${actName},${actAt},${crAt}\r\n`;
      });

      const fileName = `GORISE_ActivationCodes_${new Date().toISOString().slice(0, 10)}.csv`;
      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-cache',
      });
      res.end(csv);
      return true;
    } catch (err) {
      return json(res, 500, { error: 'Lỗi xuất file mã cào: ' + err.message });
    }
  }

  return false;
}
