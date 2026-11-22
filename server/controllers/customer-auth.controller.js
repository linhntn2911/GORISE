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
  const payload = base64url(
    JSON.stringify({
      id: customer.id,
      username: customer.username,
      fullName: customer.fullName || customer.full_name,
      phone: customer.phone || '',
      type: 'customer',
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
  return {
    id: claims.id,
    username: claims.username,
    fullName: claims.fullName,
    phone: claims.phone,
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

  // 4. Đăng xuất khách hàng (POST /api/customer/logout)
  if (pathname === '/api/customer/logout' && req.method === 'POST') {
    clearCookie(res, CUSTOMER_COOKIE);
    return json(res, 200, { ok: true, message: 'Đã đăng xuất.' });
  }

  return false;
}
