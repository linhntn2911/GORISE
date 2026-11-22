import crypto from 'node:crypto';

const COOKIE_NAME = 'webdev_app_session';
const STATE_COOKIE = 'gorise_oauth_state';
const ADMIN_EMAIL = 'chinguyen313x@gmail.com';

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function decodePart(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => part.trim().split('='))
    .filter(([key, value]) => key && value).map(([key, value]) => [key, decodeURIComponent(value)]));
}

function verifyJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || !process.env.MANUS_JWT_SECRET) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  let header; let payload;
  try { header = decodePart(encodedHeader); payload = decodePart(encodedPayload); } catch { return null; }
  if (header.alg !== 'HS256' || payload.appId !== process.env.MANUS_PROJECT_ID) return null;
  if (payload.exp && Number(payload.exp) < Math.floor(Date.now() / 1000)) return null;
  const expected = crypto.createHmac('sha256', process.env.MANUS_JWT_SECRET).update(`${encodedHeader}.${encodedPayload}`).digest('base64url');
  const a = Buffer.from(expected); const b = Buffer.from(encodedSignature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return payload;
}

export function setCookie(res, name, value, options = {}) {
  const attributes = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=None', 'Secure'];
  if (options.maxAge != null) attributes.push(`Max-Age=${options.maxAge}`);
  res.setHeader('Set-Cookie', [...(res.getHeader('Set-Cookie') || []), attributes.join('; ')]);
}

export function clearCookie(res, name) {
  setCookie(res, name, '', { maxAge: 0 });
}

function publicOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}`;
}

export function loginUrl(req, res) {
  const redirectUri = `${publicOrigin(req)}/api/auth/callback`;
  const nonce = crypto.randomBytes(24).toString('hex');
  const state = Buffer.from(JSON.stringify({ redirectUri, nonce })).toString('base64url');
  setCookie(res, STATE_COOKIE, nonce, { maxAge: 600 });
  const url = new URL('/app-auth', process.env.MANUS_OAUTH_PORTAL_URL);
  url.searchParams.set('appId', process.env.MANUS_PROJECT_ID);
  url.searchParams.set('redirectUri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('responseType', 'code');
  return url.toString();
}

export async function exchangeCode(code, redirectUri) {
  const response = await fetch(`${process.env.MANUS_OAUTH_API_URL}/webdev.v1.WebDevAuthPublicService/ExchangeToken`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: process.env.MANUS_PROJECT_ID, grantType: 'authorization_code', code, redirectUri }),
  });
  if (!response.ok) throw new Error('OAuth exchange failed');
  return response.json();
}

export async function getProfile(accessToken) {
  const response = await fetch(`${process.env.MANUS_OAUTH_API_URL}/webdev.v1.WebDevAuthPublicService/GetUserInfo`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken }),
  });
  if (!response.ok) throw new Error('OAuth identity lookup failed');
  return response.json();
}

export function createSessionToken(profile) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ appId: process.env.MANUS_PROJECT_ID, openId: profile.openId, email: profile.email, name: profile.name, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }));
  const signature = crypto.createHmac('sha256', process.env.MANUS_JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export async function getIdentity(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  const claims = verifyJwt(token);
  if (!claims) return null;
  let email = claims.email || claims.emailAddress || claims.user?.email || null;
  let name = claims.name || claims.user?.name || null;
  if (!email && process.env.MANUS_OAUTH_API_URL) {
    try {
      const response = await fetch(`${process.env.MANUS_OAUTH_API_URL}/webdev.v1.WebDevAuthPublicService/GetUserInfo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessToken: token }),
      });
      if (response.ok) { const info = await response.json(); email = info.email || null; name = info.name || null; }
    } catch { /* Treat an unavailable identity service as logged out. */ }
  }
  if (!email) return null;
  return { email: String(email).toLowerCase(), name: name || 'GORISE admin', isAdmin: String(email).toLowerCase() === ADMIN_EMAIL };
}

export function stateCookieName() { return STATE_COOKIE; }
export function cookieName() { return COOKIE_NAME; }
export function adminEmail() { return ADMIN_EMAIL; }
