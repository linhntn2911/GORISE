import { stat, writeFile, mkdir } from 'node:fs/promises';
import { extname, dirname, resolve } from 'node:path';
import { createReadStream, existsSync } from 'node:fs';
import { createGzip } from 'node:zlib';
import { resolveStaticFile } from '../static-resolver.js';
import { MIME_TYPES, json } from '../utils/http.js';
import { getMediaByUrl } from '../db.js';

export async function serveStatic(req, res, pathname) {
  if (pathname.startsWith('/manus-storage/')) {
    res.writeHead(302, {
      Location: `https://gorisevn.manus.space${pathname}`,
    });
    res.end();
    return true;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { error: 'Method not allowed' });
    return true;
  }

  // Phục hồi tự động file media tải lên từ PostgreSQL nếu disk ephemeral bị xóa (Render free restart)
  if (pathname.startsWith('/uploads/')) {
    try {
      const mediaRow = await getMediaByUrl(pathname);
      if (mediaRow && mediaRow.data_base64) {
        const buffer = Buffer.from(mediaRow.data_base64, 'base64');
        const contentType = mediaRow.content_type || 'image/jpeg';
        res.writeHead(200, {
          'Content-Type': contentType,
          'Content-Length': buffer.length,
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'X-Content-Type-Options': 'nosniff',
        });
        if (req.method === 'HEAD') {
          res.end();
          return true;
        }
        res.end(buffer);
        // Lưu tạm lại vào disk cục bộ để phục vụ cực nhanh cho các request tiếp theo
        const localTarget = resolve('public', pathname.replace(/^\/+/, ''));
        mkdir(dirname(localTarget), { recursive: true })
          .then(() => writeFile(localTarget, buffer))
          .catch(() => {});
        return true;
      }
    } catch (e) {
      console.warn('[serveStatic] Không tải được media từ DB:', e.message);
    }
  }

  const filepath = resolveStaticFile(pathname);
  if (!filepath) {
    json(res, 404, { error: 'Not found' });
    return true;
  }

  try {
    const info = await stat(filepath);
    if (!info.isFile()) {
      json(res, 404, { error: 'Not found' });
      return true;
    }

    const extension = extname(filepath);
    const isHtml = extension === '.html';
    const compressible = new Set(['.html', '.css', '.js', '.json', '.svg', '.txt']).has(extension);
    const acceptsGzip = /gzip/i.test(String(req.headers['accept-encoding'] || ''));
    const useGzip = compressible && acceptsGzip && info.size > 1024 && req.method !== 'HEAD';
    const cacheControl = 'no-cache, no-store, must-revalidate';

    const headers = {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff',
    };

    if (useGzip) {
      headers['Content-Encoding'] = 'gzip';
      headers.Vary = 'Accept-Encoding';
    } else {
      headers['Content-Length'] = info.size;
    }

    res.writeHead(200, headers);
    if (req.method === 'HEAD') {
      res.end();
      return true;
    }

    const source = createReadStream(filepath).on('error', () => res.destroy());
    if (useGzip) {
      source.pipe(createGzip({ level: 6 })).pipe(res);
    } else {
      source.pipe(res);
    }
    return true;
  } catch {
    json(res, 404, { error: 'Not found' });
    return true;
  }
}
