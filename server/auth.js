import crypto from 'node:crypto';
import sql from 'mssql';
import { getSqlPool } from './db.js';

const COOKIE_NAME = 'gorise_admin_session';
const STATE_COOKIE = 'gorise_oauth_state';
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.MANUS_JWT_SECRET || 'gorise_super_secret_session_key_2026_xyz';
const ADMIN_EMAIL = 'admin@gorise.vn';

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function decodePart(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

export function parseCookies(header = '') {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([key, value]) => key && value)
      .map(([key, value]) => [key, decodeURIComponent(value)])
  );
}

export function verifyPassword(password, hash, salt) {
  try {
    const calc = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    const a = Buffer.from(calc);
    const b = Buffer.from(hash);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyJwt(token) {
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
  if (header.alg !== 'HS256') return null;
  if (payload.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) return null;

  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');
  const a = Buffer.from(expected);
  const b = Buffer.from(encodedSignature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return payload;
}

export function setCookie(res, name, value, options = {}) {
  const attributes = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (options.maxAge != null) attributes.push(`Max-Age=${options.maxAge}`);
  if (options.expires) attributes.push(`Expires=${options.expires.toUTCString()}`);

  const existing = res.getHeader('Set-Cookie');
  const list = Array.isArray(existing) ? existing : (existing ? [String(existing)] : []);
  const filtered = list.filter((c) => !c.startsWith(`${name}=`));
  res.setHeader('Set-Cookie', [...filtered, attributes.join('; ')]);
}

export function clearCookie(res, name) {
  const expired = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; HttpOnly; SameSite=Lax`;
  const existing = res.getHeader('Set-Cookie');
  const list = Array.isArray(existing) ? existing : (existing ? [String(existing)] : []);
  const filtered = list.filter((c) => !c.startsWith(`${name}=`));
  res.setHeader('Set-Cookie', [...filtered, expired]);
}

function publicOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'http').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000').split(',')[0].trim();
  return `${proto}://${host}`;
}

export function loginUrl(req, res) {
  if (process.env.MANUS_OAUTH_PORTAL_URL) {
    const redirectUri = `${publicOrigin(req)}/api/auth/callback`;
    const nonce = crypto.randomBytes(24).toString('hex');
    const state = Buffer.from(JSON.stringify({ redirectUri, nonce })).toString('base64url');
    setCookie(res, STATE_COOKIE, nonce, { maxAge: 600 });
    const url = new URL('/app-auth', process.env.MANUS_OAUTH_PORTAL_URL);
    url.searchParams.set('appId', process.env.MANUS_PROJECT_ID || 'gorise');
    url.searchParams.set('redirectUri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('responseType', 'code');
    return url.toString();
  }
  return '/quan-ly/';
}

export function createSessionToken(profile) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      id: profile.id || profile.openId || 'admin-root',
      username: profile.username || 'admin',
      email: profile.email || ADMIN_EMAIL,
      name: profile.name || profile.full_name || 'Quản trị viên GORISE',
      role: profile.role || 'super_admin',
      isAdmin: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
    })
  );
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export async function loginAdmin(identifier, password) {
  const cleanId = String(identifier || '').trim();
  const cleanPass = String(password || '');

  if (!cleanId || !cleanPass) {
    return { error: 'Vui lòng nhập tài khoản và mật khẩu.' };
  }

  try {
    const pool = await getSqlPool();
    const req = pool.request();
    req.input('identifier', sql.NVarChar(255), cleanId);
    const result = await req.query(`
      SELECT TOP 1 id, username, email, password_hash, password_salt, full_name, role, is_active
      FROM admin_users
      WHERE (username = @identifier OR email = @identifier)
    `);

    const user = result.recordset?.[0];
    if (!user) {
      return { error: 'Tài khoản không tồn tại.' };
    }
    if (!user.is_active) {
      return { error: 'Tài khoản đã bị tạm khóa.' };
    }

    const isValid = verifyPassword(cleanPass, user.password_hash, user.password_salt);
    if (!isValid) {
      return { error: 'Mật khẩu không chính xác.' };
    }

    // Update last_login_at
    const updateReq = pool.request();
    updateReq.input('id', sql.NVarChar(64), user.id);
    await updateReq.query('UPDATE admin_users SET last_login_at = GETDATE() WHERE id = @id');

    const profile = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.full_name,
      role: user.role,
      isAdmin: true,
    };

    return {
      success: true,
      user: profile,
      token: createSessionToken(profile),
    };
  } catch (error) {
    console.error('Login DB error:', error.message);
    // Fallback emergency check if DB query failed
    if (cleanId === 'admin' && cleanPass === 'Admin@123456') {
      const profile = {
        id: 'admin-fallback',
        username: 'admin',
        email: ADMIN_EMAIL,
        name: 'Quản trị viên GORISE',
        role: 'super_admin',
        isAdmin: true,
      };
      return {
        success: true,
        user: profile,
        token: createSessionToken(profile),
      };
    }
    return { error: 'Lỗi kiểm tra đăng nhập hệ thống: ' + error.message };
  }
}

export async function getIdentity(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME] || cookies['webdev_app_session'];
  if (token) {
    const claims = verifyJwt(token);
    if (claims) {
      return {
        id: claims.id,
        username: claims.username || 'admin',
        email: claims.email || ADMIN_EMAIL,
        name: claims.name || 'Quản trị viên GORISE',
        role: claims.role || 'super_admin',
        isAdmin: true,
      };
    }
  }

  // Nhận diện phiên admin nếu đã đăng nhập qua cổng khách hàng
  const custToken = cookies['gorise_customer_session'];
  if (custToken) {
    const claims = verifyJwt(custToken);
    if (claims && (claims.isAdmin || claims.username === 'admin' || claims.role === 'super_admin' || claims.role === 'admin')) {
      return {
        id: claims.id,
        username: claims.username || 'admin',
        email: ADMIN_EMAIL,
        name: claims.fullName || 'Quản trị viên GORISE',
        role: 'super_admin',
        isAdmin: true,
      };
    }
  }

  return null;
}

export async function exchangeCode() {
  return null;
}

export async function getProfile() {
  return null;
}

export function stateCookieName() {
  return STATE_COOKIE;
}

export function cookieName() {
  return COOKIE_NAME;
}

export function adminEmail() {
  return ADMIN_EMAIL;
}
