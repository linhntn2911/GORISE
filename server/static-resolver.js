import { resolve, normalize } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

const pages = new Set([
  '/',
  '/tin-tuc',
  '/ve-gorise',
  '/kham-pha-tro-choi',
  '/gorise-play',
  '/thu-thach',
  '/lien-he',
  '/gio-hang',
  '/quan-ly',
  '/quan-ly-builder',
  '/quan-ly-phase3',
  '/quan-ly-anh',
  '/video-tinh-huong',
  '/quan-ly-video',
]);

const lookupDirs = [
  root,
  resolve(root, 'public'),
  resolve(root, 'public/assets'),
  resolve(root, 'public/assets/branding'),
  resolve(root, 'public/assets/images'),
  resolve(root, 'public/assets/videos'),
  resolve(root, 'public/assets/thumbnails'),
  resolve(root, 'public/fonts'),
  resolve(root, 'fonts'),
  resolve(root, 'src/client/common'),
  resolve(root, 'src/client/pages'),
  resolve(root, 'src/client/admin'),
  resolve(root, 'src/styles'),
  resolve(root, 'styles'),
  resolve(root, 'styles/generated'),
];

const fileCache = new Map();

export function resolveStaticFile(pathname) {
  if (!pathname || typeof pathname !== 'string') return null;

  // Cached path
  if (fileCache.has(pathname)) {
    return fileCache.get(pathname);
  }

  const cleanPath = pathname.split('?')[0].split('#')[0];
  const route = cleanPath.replace(/\/$/, '') || '/';

  // 1. Game route
  const gamePrefix = '/gorise-play/game/';
  const gameRoot = resolve(root, 'gorise-play/game');
  if (route === '/gorise-play/game') {
    const candidate = resolve(gameRoot, 'index.html');
    if (existsSync(candidate)) return candidate;
  }
  if (cleanPath.startsWith(gamePrefix)) {
    try {
      const sub = decodeURIComponent(cleanPath.slice(gamePrefix.length));
      const candidate = resolve(gameRoot, sub);
      if ((candidate === gameRoot || candidate.startsWith(`${gameRoot}\\`) || candidate.startsWith(`${gameRoot}/`)) && existsSync(candidate) && statSync(candidate).isFile()) {
        fileCache.set(pathname, candidate);
        return candidate;
      }
    } catch {}
    return null;
  }

  // 2. Page HTML routes
  if (pages.has(route)) {
    const candidate = resolve(root, route === '/' ? 'index.html' : `${route.slice(1)}/index.html`);
    if (existsSync(candidate)) {
      fileCache.set(pathname, candidate);
      return candidate;
    }
  }

  if (route.startsWith('/tin-tuc/')) {
    const candidate = resolve(root, 'tin-tuc/index.html');
    if (existsSync(candidate)) {
      fileCache.set(pathname, candidate);
      return candidate;
    }
  }

  // 3. Direct relative or absolute asset path
  const sanitized = cleanPath.replace(/^\/+/, '');
  if (!sanitized || sanitized.includes('..')) return null;

  // Try direct path from root or public
  const directCandidates = [
    resolve(root, sanitized),
    resolve(root, 'public', sanitized),
    resolve(root, 'public/assets', sanitized),
  ];

  for (const candidate of directCandidates) {
    if (candidate.startsWith(root) && existsSync(candidate)) {
      try {
        if (statSync(candidate).isFile()) {
          fileCache.set(pathname, candidate);
          return candidate;
        }
      } catch {}
    }
  }

  // 4. Fallback search across standard directories if filename only
  const filename = sanitized.split('/').pop();
  if (filename) {
    for (const dir of lookupDirs) {
      const candidate = resolve(dir, filename);
      if (candidate.startsWith(root) && existsSync(candidate)) {
        try {
          if (statSync(candidate).isFile()) {
            fileCache.set(pathname, candidate);
            return candidate;
          }
        } catch {}
      }
    }
  }

  return null;
}
