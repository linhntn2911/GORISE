import { clearCookie, cookieName, setCookie, getIdentity, loginAdmin } from '../auth.js';
import { json, readJson } from '../utils/http.js';

export async function handleAuth(req, res, pathname, requestUrl) {
  // 1. Password-based Login (POST /api/auth/login)
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const data = await readJson(req, 8000);
      const identifier = data.username || data.email || data.identifier;
      const password = data.password;

      const result = await loginAdmin(identifier, password);
      if (!result.success) {
        return json(res, 401, { error: result.error });
      }

      setCookie(res, cookieName(), result.token, { maxAge: 60 * 60 * 24 * 30 });
      return json(res, 200, {
        success: true,
        user: result.user,
      });
    } catch (error) {
      console.error('Login request error:', error.message);
      return json(res, 500, { error: 'Lỗi xử lý đăng nhập.' });
    }
  }

  // 2. Redirect fallback for GET /api/auth/login
  if (pathname === '/api/auth/login' && req.method === 'GET') {
    res.writeHead(302, { Location: '/quan-ly/', 'Cache-Control': 'no-store' });
    return res.end();
  }

  // 3. Logout (POST /api/auth/logout)
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    clearCookie(res, cookieName());
    clearCookie(res, 'webdev_app_session');
    return json(res, 200, { ok: true });
  }

  // 4. Session Status (GET /api/auth/me)
  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const identity = await getIdentity(req);
    return json(res, 200, {
      authenticated: Boolean(identity),
      identity: identity
        ? {
            id: identity.id,
            username: identity.username,
            name: identity.name,
            email: identity.email,
            role: identity.role,
            isAdmin: identity.isAdmin,
          }
        : null,
    });
  }

  return false;
}
