import crypto from 'node:crypto';
import sql from 'mssql';
import { getSqlPool } from '../db.js';
import { json, readJson } from '../utils/http.js';
import { hashPassword, verifyPassword, setCookie, clearCookie, parseCookies, createSessionToken } from '../auth.js';

const CUSTOMER_COOKIE = 'gorise_customer_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'gorise_super_secret_session_key_2026_xyz';

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function decodePart(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

export function createCustomerToken(customer) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const isAdmin = Boolean(customer.isAdmin || customer.username === 'admin');
  const payload = base64url(
    JSON.stringify({
      id: customer.id,
      username: customer.username,
      fullName: customer.fullName || customer.full_name,
      phone: customer.phone || '',
      type: 'customer',
      isAdmin: isAdmin,
      role: customer.role || (isAdmin ? 'super_admin' : 'customer'),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
    })
  );
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function verifyCustomerToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  let header;
  let payload;
  try {
    header = decodePart(encodedHeader);
    payload = decodePart(encodedPayload);
  } catch {
    return null;
  }
  if (header.alg !== 'HS256' || payload.type !== 'customer') return null;
  if (payload.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) return null;

  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(encodedSignature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return payload;
}

export async function getCustomerIdentity(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[CUSTOMER_COOKIE];
  if (!token) return null;
  const claims = verifyCustomerToken(token);
  if (!claims) return null;
  const isAdmin = Boolean(claims.isAdmin || claims.username === 'admin' || claims.role === 'super_admin' || claims.role === 'admin');
  return {
    id: claims.id,
    username: claims.username,
    fullName: claims.fullName,
    phone: claims.phone,
    role: claims.role || (isAdmin ? 'super_admin' : 'customer'),
    isAdmin,
  };
}

export async function handleCustomerAuth(req, res, pathname) {
  // 0. Kiểm tra trùng username (GET /api/customer/check-username?username=...)
  if (pathname === '/api/customer/check-username' && req.method === 'GET') {
    try {
      const requestUrl = new URL(req.url || '/', 'http://localhost');
      const username = String(requestUrl.searchParams.get('username') || '').trim().toLowerCase();
      if (!username || username.length < 3) {
        return json(res, 200, { available: false, error: 'Tên đăng nhập tối thiểu 3 ký tự.' });
      }
      if (!/^[a-z0-9_.-]+$/.test(username)) {
        return json(res, 200, { available: false, error: 'Tên đăng nhập không được chứa ký tự đặc biệt hoặc dấu cách.' });
      }
      const pool = await getSqlPool();
      const checkReq = pool.request();
      checkReq.input('username', sql.NVarChar(100), username);
      const existing = await checkReq.query(`
        SELECT TOP 1 id FROM customers WHERE username = @username
        UNION ALL
        SELECT TOP 1 id FROM admin_users WHERE username = @username
      `);
      const exists = existing.recordset.length > 0;
      return json(res, 200, {
        available: !exists,
        exists,
        message: exists ? 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác!' : 'Tên đăng nhập hợp lệ và có thể dùng!'
      });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  // 1. Đăng ký tài khoản khách hàng (POST /api/customer/register)
  if (pathname === '/api/customer/register' && req.method === 'POST') {
    try {
      const data = await readJson(req, 8000);
      const username = String(data.username || '').trim().toLowerCase();
      const fullName = String(data.fullName || data.name || '').trim();
      const phone = String(data.phone || '').trim().replace(/[^0-9]/g, '');
      const password = String(data.password || '');

      if (!username || username.length < 3) {
        return json(res, 400, { error: 'Tên đăng nhập cần tối thiểu 3 ký tự (chữ hoặc số).' });
      }
      if (!/^[a-z0-9_.-]+$/.test(username)) {
        return json(res, 400, { error: 'Tên đăng nhập không được chứa ký tự đặc biệt hoặc dấu cách.' });
      }
      if (!fullName || fullName.length < 2) {
        return json(res, 400, { error: 'Vui lòng nhập họ và tên của bạn.' });
      }
      if (!password || password.length < 6) {
        return json(res, 400, { error: 'Mật khẩu cần tối thiểu 6 ký tự.' });
      }

      const pool = await getSqlPool();

      // Kiểm tra trùng username
      const checkReq = pool.request();
      checkReq.input('username', sql.NVarChar(100), username);
      const existing = await checkReq.query(`
        SELECT TOP 1 id FROM customers WHERE username = @username
        UNION ALL
        SELECT TOP 1 id FROM admin_users WHERE username = @username
      `);

      if (existing.recordset.length > 0) {
        return json(res, 409, { error: 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác!' });
      }

      // Hash mật khẩu
      const { hash, salt } = hashPassword(password);
      const customerId = crypto.randomUUID();

      const insertReq = pool.request();
      insertReq.input('id', sql.NVarChar(64), customerId);
      insertReq.input('username', sql.NVarChar(100), username);
      insertReq.input('phone', sql.NVarChar(32), phone || null);
      insertReq.input('hash', sql.NVarChar(255), hash);
      insertReq.input('salt', sql.NVarChar(64), salt);
      insertReq.input('name', sql.NVarChar(255), fullName);

      await insertReq.query(`
        INSERT INTO customers (id, username, phone, password_hash, password_salt, full_name, is_active, is_verified, loyalty_points)
        VALUES (@id, @username, @phone, @hash, @salt, @name, 1, 0, 0)
      `);

      const customerProfile = {
        id: customerId,
        username,
        fullName,
        phone,
        loyaltyPoints: 0,
      };

      const token = createCustomerToken(customerProfile);
      setCookie(res, CUSTOMER_COOKIE, token, { maxAge: 60 * 60 * 24 * 30 });

      return json(res, 201, {
        success: true,
        message: 'Đăng ký tài khoản thành công!',
        customer: customerProfile,
      });
    } catch (error) {
      console.error('Customer register error:', error.message);
      return json(res, 500, { error: 'Không thể tạo tài khoản lúc này: ' + error.message });
    }
  }

  // 2. Đăng nhập khách hàng (POST /api/customer/login)
  if (pathname === '/api/customer/login' && req.method === 'POST') {
    try {
      const data = await readJson(req, 8000);
      const username = String(data.username || data.identifier || '').trim().toLowerCase();
      const password = String(data.password || '');

      if (!username || !password) {
        return json(res, 400, { error: 'Vui lòng nhập Tên đăng nhập và Mật khẩu.' });
      }

      const pool = await getSqlPool();
      const loginReq = pool.request();
      loginReq.input('username', sql.NVarChar(100), username);
      const result = await loginReq.query(`
        SELECT TOP 1 id, username, phone, password_hash, password_salt, full_name, is_active, loyalty_points
        FROM customers
        WHERE username = @username
      `);

      let user = result.recordset?.[0];
      let isAdmin = false;

      // Nếu không tìm thấy trong customers, kiểm tra trong bảng admin_users
      if (!user) {
        const adminReq = pool.request();
        adminReq.input('username', sql.NVarChar(100), username);
        const adminResult = await adminReq.query(`
          SELECT TOP 1 id, username, email, password_hash, password_salt, full_name, role, is_active
          FROM admin_users
          WHERE username = @username OR email = @username
        `);
        const adminUser = adminResult.recordset?.[0];
        if (adminUser) {
          user = {
            id: adminUser.id,
            username: adminUser.username,
            full_name: adminUser.full_name,
            email: adminUser.email,
            phone: '',
            password_hash: adminUser.password_hash,
            password_salt: adminUser.password_salt,
            is_active: adminUser.is_active,
            role: adminUser.role,
            loyalty_points: 0,
          };
          isAdmin = true;
        }
      }

      if (!user) {
        return json(res, 401, { error: 'Tên đăng nhập chưa được đăng ký trong hệ thống. Vui lòng kiểm tra lại hoặc chuyển sang tab Đăng ký!' });
      }
      if (!user.is_active) {
        return json(res, 403, { error: 'Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ ban quản trị.' });
      }

      const isValid = verifyPassword(password, user.password_hash, user.password_salt);
      if (!isValid) {
        return json(res, 401, { error: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại!' });
      }

      // Kiểm tra xem tài khoản này có quyền Quản trị trong admin_users không
      if (!isAdmin) {
        const adminCheck = await pool.request()
          .input('id', sql.NVarChar(64), user.id)
          .input('username', sql.NVarChar(100), user.username)
          .query('SELECT TOP 1 id, role, email, full_name FROM admin_users WHERE id = @id OR username = @username');
        const adminData = adminCheck.recordset?.[0];
        if (adminData) {
          isAdmin = true;
          user.role = adminData.role;
          user.email = adminData.email;
        }
      }

      if (isAdmin) {
        // Cập nhật last_login_at cho Admin
        const updateAdminReq = pool.request();
        updateAdminReq.input('id', sql.NVarChar(64), user.id);
        await updateAdminReq.query('UPDATE admin_users SET last_login_at = GETDATE() WHERE id = @id');

        // Tạo token phiên quản trị
        const adminToken = createSessionToken({
          id: user.id,
          username: user.username,
          email: user.email,
          name: user.full_name,
          role: user.role,
          isAdmin: true,
        });
        setCookie(res, 'gorise_admin_session', adminToken, { maxAge: 60 * 60 * 24 * 30 });

        const customerProfile = {
          id: user.id,
          username: user.username,
          fullName: user.full_name,
          phone: '',
          role: user.role,
          isAdmin: true,
        };
        const custToken = createCustomerToken(customerProfile);
        setCookie(res, CUSTOMER_COOKIE, custToken, { maxAge: 60 * 60 * 24 * 30 });

        return json(res, 200, {
          success: true,
          message: 'Đăng nhập Quản trị viên thành công!',
          customer: customerProfile,
          isAdmin: true,
          redirect: '/quan-ly/',
        });
      }

      // Cập nhật last_login_at cho khách hàng thông thường
      const updateReq = pool.request();
      updateReq.input('id', sql.NVarChar(64), user.id);
      await updateReq.query('UPDATE customers SET last_login_at = GETDATE() WHERE id = @id');

      const customerProfile = {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        phone: user.phone || '',
        loyaltyPoints: user.loyalty_points || 0,
        isAdmin: false,
      };

      const token = createCustomerToken(customerProfile);
      setCookie(res, CUSTOMER_COOKIE, token, { maxAge: 60 * 60 * 24 * 30 });

      return json(res, 200, {
        success: true,
        message: 'Đăng nhập thành công!',
        customer: customerProfile,
        isAdmin: false,
      });
    } catch (error) {
      console.error('Customer login error:', error.message);
      return json(res, 500, { error: 'Lỗi đăng nhập: ' + error.message });
    }
  }

  // 3. Lấy thông tin khách hiện tại (GET /api/customer/me)
  if (pathname === '/api/customer/me' && req.method === 'GET') {
    const customer = await getCustomerIdentity(req);
    return json(res, 200, {
      authenticated: Boolean(customer),
      customer: customer || null,
    });
  }

  // 4. Khách hàng xem lịch sử đơn hàng (GET /api/customer/orders)
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
        .input('customerId', sql.NVarChar(64), customer.id)
        .input('username', sql.NVarChar(100), customer.username)
        .query(`
          SELECT o.id, o.order_code, o.total_amount, o.shipping_fee, o.payment_method, o.payment_status, o.order_status, o.created_at,
                 o.customer_name, o.customer_phone, o.shipping_address, o.note,
                 (SELECT product_name, quantity, unit_price, total_price FROM order_items WHERE order_id = o.id FOR JSON PATH) AS items_json
          FROM orders o
          WHERE (o.customer_id = @customerId OR o.customer_id = @username)
            AND o.payment_status = 'paid'
          ORDER BY o.created_at DESC
        `);

      const orders = result.recordset.map(r => ({
        ...r,
        items: JSON.parse(r.items_json || '[]')
      }));

      return json(res, 200, { orders });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi tải đơn hàng: ' + err.message });
    }
  }

  // 4b. Khách hàng hủy đơn khi đơn chưa chuyển sang giao hàng.
  if (pathname.startsWith('/api/customer/orders/') && pathname.endsWith('/cancel') && req.method === 'PUT') {
    const customer = await getCustomerIdentity(req);
    if (!customer) {
      return json(res, 401, { error: 'Vui lòng đăng nhập để hủy đơn hàng.' });
    }
    if (customer.isAdmin) {
      return json(res, 403, { error: 'Quản trị viên không thể thao tác đơn hàng của khách.' });
    }

    const orderId = decodeURIComponent(pathname.split('/')[4] || '');
    if (!orderId) return json(res, 400, { error: 'Thiếu ID đơn hàng.' });

    try {
      const pool = await getSqlPool();
      const cancelResult = await pool.request()
        .input('id', sql.NVarChar(64), orderId)
        .input('customerId', sql.NVarChar(64), customer.id)
        .input('username', sql.NVarChar(100), customer.username)
        .query(`
          UPDATE orders
          SET order_status = 'cancelled',
              note = CASE
                WHEN note IS NULL OR note = '' THEN N'Khách hàng yêu cầu hủy đơn'
                ELSE note + N' | Khách hàng yêu cầu hủy đơn'
              END,
              updated_at = GETDATE()
          OUTPUT inserted.id, inserted.order_code, inserted.payment_status, inserted.order_status, inserted.updated_at
          WHERE id = @id
            AND (customer_id = @customerId OR customer_id = @username)
            AND order_status IN ('new', 'confirmed', 'preparing', 'processing');
        `);

      if (cancelResult.recordset?.[0]) {
        return json(res, 200, {
          success: true,
          message: 'Đã hủy đơn hàng.',
          order: cancelResult.recordset[0],
        });
      }

      const existing = await pool.request()
        .input('id', sql.NVarChar(64), orderId)
        .input('customerId', sql.NVarChar(64), customer.id)
        .input('username', sql.NVarChar(100), customer.username)
        .query(`
          SELECT TOP 1 order_status
          FROM orders
          WHERE id = @id AND (customer_id = @customerId OR customer_id = @username)
        `);

      if (!existing.recordset?.[0]) {
        return json(res, 404, { error: 'Không tìm thấy đơn hàng của bạn.' });
      }
      return json(res, 409, {
        error: 'Đơn hàng đã chuyển sang giao hàng hoặc đã kết thúc nên không thể hủy.',
      });
    } catch (err) {
      return json(res, 500, { error: 'Không thể hủy đơn hàng: ' + err.message });
    }
  }

  // 5. Cập nhật hồ sơ cá nhân (POST hoặc PUT /api/customer/profile)
  if (pathname === '/api/customer/profile' && (req.method === 'POST' || req.method === 'PUT')) {
    const customer = await getCustomerIdentity(req);
    if (!customer) {
      return json(res, 401, { error: 'Vui lòng đăng nhập để cập nhật hồ sơ.' });
    }
    try {
      const body = await readJson(req, 8000);
      const fullName = String(body.fullName || '').trim();
      const phone = String(body.phone || '').trim().replace(/[^0-9]/g, '');

      if (!fullName || fullName.length < 2) {
        return json(res, 400, { error: 'Vui lòng nhập Họ và tên (tối thiểu 2 ký tự).' });
      }
      if (phone && !/^0[0-9]{9}$/.test(phone)) {
        return json(res, 400, { error: 'Số điện thoại không hợp lệ (cần đúng 10 số, bắt đầu bằng 0).' });
      }

      const pool = await getSqlPool();
      const updateReq = pool.request();
      updateReq.input('id', sql.NVarChar(64), customer.id);
      updateReq.input('fullName', sql.NVarChar(255), fullName);
      updateReq.input('phone', sql.NVarChar(32), phone);
      await updateReq.query(`
        UPDATE customers
        SET full_name = @fullName, phone = @phone, updated_at = GETDATE()
        WHERE id = @id;
        IF EXISTS (SELECT 1 FROM admin_users WHERE id = @id)
        BEGIN
          UPDATE admin_users SET full_name = @fullName, phone = @phone WHERE id = @id;
        END
      `);

      const updatedProfile = {
        ...customer,
        fullName,
        phone,
      };
      const token = createCustomerToken(updatedProfile);
      setCookie(res, CUSTOMER_COOKIE, token, { maxAge: 60 * 60 * 24 * 30 });

      return json(res, 200, {
        success: true,
        message: 'Cập nhật thông tin thành công!',
        customer: updatedProfile,
      });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi cập nhật hồ sơ: ' + err.message });
    }
  }

  // 6. Đổi mật khẩu (POST /api/customer/change-password)
  if (pathname === '/api/customer/change-password' && req.method === 'POST') {
    const customer = await getCustomerIdentity(req);
    if (!customer) {
      return json(res, 401, { error: 'Vui lòng đăng nhập để đổi mật khẩu.' });
    }
    try {
      const body = await readJson(req, 8000);
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      const confirmPassword = String(body.confirmPassword || '');

      if (!currentPassword) {
        return json(res, 400, { error: 'Vui lòng nhập mật khẩu hiện tại.' });
      }
      if (!newPassword || newPassword.length < 6) {
        return json(res, 400, { error: 'Mật khẩu mới cần tối thiểu 6 ký tự.' });
      }
      if (newPassword !== confirmPassword) {
        return json(res, 400, { error: 'Mật khẩu xác nhận không khớp.' });
      }

      const pool = await getSqlPool();
      const userReq = pool.request();
      userReq.input('id', sql.NVarChar(64), customer.id);
      const userResult = await userReq.query(`
        SELECT TOP 1 id, password_hash, password_salt FROM customers WHERE id = @id
      `);
      let user = userResult.recordset?.[0];

      if (!user) {
        const adminReq = pool.request();
        adminReq.input('id', sql.NVarChar(64), customer.id);
        const adminResult = await adminReq.query(`
          SELECT TOP 1 id, password_hash, password_salt FROM admin_users WHERE id = @id
        `);
        user = adminResult.recordset?.[0];
      }

      if (!user) {
        return json(res, 404, { error: 'Không tìm thấy tài khoản.' });
      }

      const isValid = verifyPassword(currentPassword, user.password_hash, user.password_salt);
      if (!isValid) {
        return json(res, 400, { error: 'Mật khẩu hiện tại không chính xác. Vui lòng kiểm tra lại!' });
      }

      const { hash: newHash, salt: newSalt } = hashPassword(newPassword);
      const updatePassReq = pool.request();
      updatePassReq.input('id', sql.NVarChar(64), customer.id);
      updatePassReq.input('hash', sql.NVarChar(255), newHash);
      updatePassReq.input('salt', sql.NVarChar(64), newSalt);
      await updatePassReq.query(`
        UPDATE customers
        SET password_hash = @hash, password_salt = @salt, updated_at = GETDATE()
        WHERE id = @id;
        IF EXISTS (SELECT 1 FROM admin_users WHERE id = @id)
        BEGIN
          UPDATE admin_users SET password_hash = @hash, password_salt = @salt WHERE id = @id;
        END
      `);

      return json(res, 200, {
        success: true,
        message: 'Đổi mật khẩu thành công!',
      });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi đổi mật khẩu: ' + err.message });
    }
  }

  // 7. Khách hàng đánh giá sản phẩm sau khi mua (POST /api/customer/reviews)
  if (pathname === '/api/customer/reviews' && req.method === 'POST') {
    const customer = await getCustomerIdentity(req);
    if (!customer) {
      return json(res, 401, { error: 'Vui lòng đăng nhập tài khoản để đánh giá sản phẩm.' });
    }
    if (customer.isAdmin) {
      return json(res, 403, { error: 'Tài khoản quản trị viên không thể đánh giá bằng cổng khách hàng.' });
    }

    try {
      const body = await readJson(req, 20000);
      const rating = Math.min(5, Math.max(1, parseInt(body.rating, 10) || 5));
      const comment = String(body.comment || '').trim();
      const productId = String(body.productId || 'gorise-board-game').trim();

      if (!comment) {
        return json(res, 400, { error: 'Vui lòng nhập nội dung đánh giá sản phẩm.' });
      }

      const pool = await getSqlPool();

      // Kiểm tra xem khách hàng có đơn hàng đã thanh toán hoặc hoàn thành không
      const checkOrder = await pool.request()
        .input('customerId', sql.NVarChar(64), customer.id)
        .input('username', sql.NVarChar(100), customer.username || '')
        .query(`
          SELECT TOP 1 id, order_code, payment_status, order_status
          FROM orders
          WHERE (customer_id = @customerId OR customer_id = @username)
            AND (payment_status = 'paid' OR order_status = 'completed' OR order_status = 'processing')
        `);

      if (!checkOrder.recordset || checkOrder.recordset.length === 0) {
        return json(res, 403, { error: 'Bạn cần hoàn tất đơn hàng trước khi gửi đánh giá sản phẩm.' });
      }

      // Lưu đánh giá mới vào product_reviews (approved để hiển thị ngay trên website)
      const insertReq = pool.request();
      insertReq.input('productId', sql.NVarChar(64), productId);
      insertReq.input('customerId', sql.NVarChar(64), customer.id);
      insertReq.input('customerName', sql.NVarChar(100), customer.fullName || customer.username || 'Khách hàng GORISE');
      insertReq.input('customerPhone', sql.NVarChar(50), customer.phone || null);
      insertReq.input('rating', sql.Int, rating);
      insertReq.input('comment', sql.NVarChar(2000), comment);

      await insertReq.query(`
        INSERT INTO product_reviews (id, product_id, customer_id, customer_name, customer_phone, rating, comment, status, created_at, updated_at)
        VALUES (NEWID(), @productId, @customerId, @customerName, @customerPhone, @rating, @comment, 'approved', GETDATE(), GETDATE());
      `);

      return json(res, 201, {
        success: true,
        message: 'Cảm ơn bạn đã đánh giá! Nhận xét của bạn đã được đăng thành công.',
      });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi gửi đánh giá: ' + err.message });
    }
  }

  // 8. Lấy danh sách đánh giá của khách hàng hiện tại (GET /api/customer/my-reviews)
  if (pathname === '/api/customer/my-reviews' && req.method === 'GET') {
    const customer = await getCustomerIdentity(req);
    if (!customer) return json(res, 401, { error: 'Chưa đăng nhập.' });
    try {
      const pool = await getSqlPool();
      const result = await pool.request()
        .input('customerId', sql.NVarChar(64), customer.id)
        .query(`
          SELECT id, product_id, rating, comment, created_at
          FROM product_reviews
          WHERE customer_id = @customerId
          ORDER BY created_at DESC
        `);
      return json(res, 200, { reviews: result.recordset || [] });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi tải đánh giá cá nhân.' });
    }
  }

  // 9. Kiểm tra trạng thái mở khóa GORISE Play (GET /api/customer/play-status)
  if (pathname === '/api/customer/play-status' && req.method === 'GET') {
    const customer = await getCustomerIdentity(req);
    if (!customer) {
      return json(res, 200, { authenticated: false, unlocked: false });
    }
    try {
      const pool = await getSqlPool();
      const checkCust = await pool.request()
        .input('id', sql.NVarChar(64), customer.id)
        .query(`
          SELECT TOP 1 has_unlocked_play FROM customers WHERE id = @id;
          SELECT TOP 1 id FROM activation_codes WHERE activated_by_customer_id = @id;
        `);

      const hasUnlockedFlag = Boolean(checkCust.recordsets?.[0]?.[0]?.has_unlocked_play);
      const hasCode = Boolean(checkCust.recordsets?.[1]?.length > 0);

      const unlocked = hasUnlockedFlag || hasCode;

      return json(res, 200, { authenticated: true, unlocked, customer });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi kiểm tra quyền chơi: ' + err.message });
    }
  }

  // 10. Kích hoạt mã cào GORISE Play (POST /api/customer/activate-code)
  if (pathname === '/api/customer/activate-code' && req.method === 'POST') {
    const customer = await getCustomerIdentity(req);
    if (!customer) {
      return json(res, 401, { error: 'Vui lòng đăng nhập tài khoản để kích hoạt mã GORISE Play.' });
    }
    try {
      const body = await readJson(req, 8000);
      const rawCode = String(body.code || '').trim().toUpperCase();
      if (!rawCode) {
        return json(res, 400, { error: 'Vui lòng nhập mã kích hoạt.' });
      }
      const cleanCode = rawCode.replace(/[\s-]/g, '');

      const pool = await getSqlPool();
      const codeRes = await pool.request()
        .input('raw', sql.NVarChar(50), rawCode)
        .input('clean', sql.NVarChar(50), cleanCode)
        .query(`
          SELECT TOP 1 id, code, batch_name, status, activated_by_customer_id
          FROM activation_codes
          WHERE code = @raw OR REPLACE(code, '-', '') = @clean
        `);

      const codeItem = codeRes.recordset?.[0];
      if (!codeItem) {
        return json(res, 404, { error: 'Mã kích hoạt không chính xác. Vui lòng kiểm tra lại thẻ trong hộp game.' });
      }
      if (codeItem.status === 'revoked') {
        return json(res, 400, { error: 'Mã kích hoạt này đã bị vô hiệu hóa.' });
      }
      if (codeItem.status === 'used') {
        if (codeItem.activated_by_customer_id === customer.id) {
          return json(res, 200, { success: true, message: 'Tài khoản của bạn đã kích hoạt mã này trước đó. Chúc bạn chơi vui vẻ!' });
        }
        return json(res, 400, { error: 'Mã kích hoạt này đã được sử dụng bởi một tài khoản khác.' });
      }

      // Đánh dấu mã đã sử dụng và mở quyền chơi cho tài khoản
      await pool.request()
        .input('id', sql.NVarChar(64), codeItem.id)
        .input('custId', sql.NVarChar(64), customer.id)
        .input('custName', sql.NVarChar(100), customer.fullName || customer.username || 'Khách hàng GORISE')
        .query(`
          UPDATE activation_codes
          SET status = 'used',
              activated_by_customer_id = @custId,
              activated_by_name = @custName,
              activated_at = GETDATE()
          WHERE id = @id;

          UPDATE customers
          SET has_unlocked_play = 1
          WHERE id = @custId;
        `);

      return json(res, 200, {
        success: true,
        message: 'Kích hoạt thành công! Chào mừng bạn đến với không gian GORISE Play.',
      });
    } catch (err) {
      return json(res, 500, { error: 'Lỗi kích hoạt mã: ' + err.message });
    }
  }

  // 11. Đăng xuất khách hàng (POST /api/customer/logout)
  if (pathname === '/api/customer/logout' && req.method === 'POST') {
    clearCookie(res, CUSTOMER_COOKIE);
    return json(res, 200, { ok: true, message: 'Đã đăng xuất.' });
  }

  return false;
}
