import crypto from 'node:crypto';
import { adminEmail, getIdentity } from '../auth.js';

const limits = new Map();
const analyticsLimits = new Map();

export const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.woff2': 'font/woff2',
};

export function json(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(data));
  return true;
}

export async function readJson(req, maxBytes = 16000) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
    throw Object.assign(new Error('JSON required'), { status: 415 });
  }
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBytes) {
      throw Object.assign(new Error('Too long'), { status: 413 });
    }
  }
  try {
    return JSON.parse(body);
  } catch {
    throw Object.assign(new Error('Invalid JSON'), { status: 400 });
  }
}

export function tooMany(req) {
  const ip = req.socket.remoteAddress || 'anonymous';
  const now = Date.now();
  if (limits.size > 10000) limits.clear();
  const item = limits.get(ip);
  if (!item || now - item.start > 60000) {
    limits.set(ip, { count: 1, start: now });
    return false;
  }
  item.count += 1;
  return item.count > 25;
}

export function tooManyAnalytics(req) {
  const ip = req.socket.remoteAddress || 'anonymous';
  const now = Date.now();
  if (analyticsLimits.size > 10000) analyticsLimits.clear();
  const item = analyticsLimits.get(ip);
  if (!item || now - item.start > 60000) {
    analyticsLimits.set(ip, { count: 1, start: now });
    return false;
  }
  item.count += 1;
  return item.count > 80;
}

export async function requireAdmin(req, res, label = 'nội dung') {
  const identity = await getIdentity(req);
  if (!identity) {
    json(res, 401, {
      error: `Bạn cần đăng nhập Manus để quản lý ${label}.`,
      loginUrl: '/api/auth/login',
    });
    return null;
  }
  if (!identity.isAdmin) {
    json(res, 403, {
      error: `Tài khoản này không có quyền quản lý ${label}. Chỉ ${adminEmail()} được phép.`,
    });
    return null;
  }
  return identity;
}

export function safeFilename(name, fallback = 'file') {
  return String(name || fallback)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .slice(0, 120) || fallback;
}

export async function presignStorage(path) {
  const url = new URL('/v1/storage/presign/put', process.env.MANUS_API_URL);
  url.searchParams.set('path', path);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.MANUS_API_KEY}` },
  });
  if (!response.ok) throw new Error('Storage presign failed');
  const data = await response.json();
  if (!data.url) throw new Error('Storage URL unavailable');
  return data.url;
}

export function publicOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}`;
}

export function validateVideo(data) {
  const contentType = String(data.contentType || '');
  const size = Number(data.size || 0);
  if (!/^video\/(mp4|webm|quicktime|x-msvideo)$/.test(contentType) || !Number.isInteger(size) || size < 1 || size > 250 * 1024 * 1024) {
    return { error: 'Chỉ nhận MP4, WebM, MOV hoặc AVI tối đa 250MB.' };
  }
  return { contentType, size };
}

export function validateImage(data) {
  const contentType = String(data.contentType || '');
  const size = Number(data.size || 0);
  if (!/^image\/(png|jpeg|webp)$/.test(contentType) || !Number.isInteger(size) || size < 1 || size > 8 * 1024 * 1024) {
    return { error: 'Thumbnail chỉ nhận PNG, JPG hoặc WEBP tối đa 8MB.' };
  }
  return { contentType, size };
}

export function validateBuilderSchema(schema) {
  if (!schema || typeof schema !== 'object' || !Array.isArray(schema.sections) || schema.sections.length > 80) {
    return 'Schema trang không hợp lệ.';
  }
  const ids = new Set();
  const safeCssValue = (value) =>
    value == null || (typeof value === 'string' && value.length <= 240 && !/[<>;{}]|url\s*\(|expression\s*\(|javascript:/i.test(value));

  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 6) return 'Cây component không hợp lệ hoặc quá sâu.';
    if (!/^[a-zA-Z0-9_-]{2,80}$/.test(String(node.id || '')) || ids.has(node.id)) {
      return 'Component có ID không hợp lệ hoặc bị trùng.';
    }
    ids.add(node.id);
    if (String(node.label || '').length > 160 || String(node.type || '').length > 80) return 'Tên component không hợp lệ.';
    if (JSON.stringify(node).length > 120000) return 'Component vượt giới hạn dữ liệu.';
    if (node.content && typeof node.content === 'object') {
      for (const value of Object.values(node.content)) {
        if (typeof value === 'string' && (value.length > 5000 || /<\/?script|javascript:/i.test(value))) {
          return 'Nội dung component không an toàn.';
        }
      }
    }
    if (node.style && typeof node.style === 'object') {
      for (const value of Object.values(node.style)) {
        if (!safeCssValue(value)) return 'Giá trị style không an toàn.';
      }
    }
    if (node.responsive && typeof node.responsive === 'object') {
      for (const config of Object.values(node.responsive)) {
        if (config && typeof config === 'object') {
          for (const value of Object.values(config)) {
            if (!safeCssValue(value)) return 'Giá trị responsive không an toàn.';
          }
        }
      }
    }
    const target = node.interactions?.target;
    if (target && (String(target).length > 500 || /^(javascript|data|vbscript):/i.test(String(target)))) {
      return 'Action target không an toàn.';
    }
    if (node.children != null && (!Array.isArray(node.children) || node.children.length > 60)) {
      return 'Danh sách children không hợp lệ.';
    }
    for (const child of node.children || []) {
      const error = walk(child, depth + 1);
      if (error) return error;
    }
    return null;
  };

  for (const section of schema.sections) {
    const error = walk(section);
    if (error) return error;
  }
  return null;
}
