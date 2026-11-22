import { clearCookie, cookieName, createSessionToken, exchangeCode, getIdentity, getProfile, loginUrl, setCookie, stateCookieName } from '../auth.js';
import { json } from '../utils/http.js';

export async function handleAuth(req, res, pathname, requestUrl) {
  if (pathname === '/api/auth/login' && req.method === 'GET') {
    res.writeHead(302, { Location: loginUrl(req, res), 'Cache-Control': 'no-store' });
    return res.end();
  }

  if (pathname === '/api/auth/callback' && req.method === 'GET') {
    const state = requestUrl.searchParams.get('state');
    const code = requestUrl.searchParams.get('code');
    const cookies = Object.fromEntries(
      String(req.headers.cookie || '')
        .split(';')
        .map((part) => part.trim().split('='))
        .filter(([key, value]) => key && value)
    );
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state || '', 'base64url').toString('utf8'));
    } catch {
      stateData = null;
    }
    if (!code || !stateData || decodeURIComponent(cookies[stateCookieName()] || '') !== stateData.nonce) {
      return json(res, 400, { error: 'OAuth state không hợp lệ.' });
    }
    try {
      const token = await exchangeCode(code, stateData.redirectUri);
      const profile = await getProfile(token.accessToken);
      setCookie(res, cookieName(), createSessionToken(profile), { maxAge: 60 * 60 * 24 * 30 });
      clearCookie(res, stateCookieName());
      res.writeHead(302, { Location: '/quan-ly/', 'Cache-Control': 'no-store' });
      return res.end();
    } catch (error) {
      console.error('OAuth callback failed:', error.message);
      return json(res, 502, { error: 'Đăng nhập Manus chưa hoàn tất.' });
    }
  }

  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    clearCookie(res, cookieName());
    return json(res, 200, { ok: true });
  }

  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const identity = await getIdentity(req);
    return json(res, 200, {
      authenticated: Boolean(identity),
      identity: identity ? { name: identity.name, email: identity.email, isAdmin: identity.isAdmin } : null,
    });
  }

  return false;
}
