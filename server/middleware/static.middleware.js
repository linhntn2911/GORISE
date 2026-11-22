import { stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { createReadStream } from 'node:fs';
import { createGzip } from 'node:zlib';
import { resolveStaticFile } from '../static-resolver.js';
import { MIME_TYPES, json } from '../utils/http.js';

export async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { error: 'Method not allowed' });
    return true;
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
    const cacheControl = isHtml ? 'no-cache' : 'public, max-age=2592000, stale-while-revalidate=86400';

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
