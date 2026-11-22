import http from 'node:http';
import { databaseReady } from './db.js';
import { json } from './utils/http.js';
import { handleAuth } from './controllers/auth.controller.js';
import { handleCustomerAuth } from './controllers/customer-auth.controller.js';
import { handleAdminManagement } from './controllers/admin-management.controller.js';
import { handleSepayWebhook } from './controllers/sepay.controller.js';
import { handleDashboard } from './controllers/dashboard.controller.js';
import { handlePhase3 } from './controllers/phase3.controller.js';
import { handleBuilder } from './controllers/builder.controller.js';
import { handleArticles } from './controllers/articles.controller.js';
import { handleProducts } from './controllers/products.controller.js';
import { handleMedia } from './controllers/media.controller.js';
import { handleVideos } from './controllers/videos.controller.js';
import { handleAssistant } from './controllers/assistant.controller.js';
import { serveStatic } from './middleware/static.middleware.js';

const port = Number(process.env.PORT || 3000);

export async function requestHandler(req, res) {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const pathname = requestUrl.pathname;

  // Health check
  if (pathname === '/api/health' && req.method === 'GET') {
    try {
      const ready = await databaseReady();
      return json(res, ready ? 200 : 503, {
        status: ready ? 'ok' : 'preparing',
        productsReady: ready,
        webSearchReady: Boolean(process.env.TAVILY_API_KEY),
      });
    } catch {
      return json(res, 503, { status: 'database_unavailable', productsReady: false });
    }
  }

  // Route to controllers
  if (await handleAuth(req, res, pathname, requestUrl)) return;
  if (res.headersSent) return;
  if (await handleCustomerAuth(req, res, pathname)) return;
  if (res.headersSent) return;
  if (await handleSepayWebhook(req, res, pathname)) return;
  if (res.headersSent) return;
  if (await handleAdminManagement(req, res, pathname)) return;
  if (res.headersSent) return;
  if (await handleDashboard(req, res, pathname)) return;
  if (res.headersSent) return;
  if (await handlePhase3(req, res, pathname)) return;
  if (res.headersSent) return;
  if (await handleBuilder(req, res, pathname)) return;
  if (res.headersSent) return;
  if (await handleArticles(req, res, pathname)) return;
  if (res.headersSent) return;
  if (await handleProducts(req, res, pathname)) return;
  if (res.headersSent) return;
  if (await handleMedia(req, res, pathname)) return;
  if (res.headersSent) return;
  if (await handleVideos(req, res, pathname)) return;
  if (res.headersSent) return;
  if (await handleAssistant(req, res, pathname)) return;
  if (res.headersSent) return;

  // Static files and pages
  return serveStatic(req, res, pathname);
}

const server = http.createServer((req, res) => {
  requestHandler(req, res).catch((error) => {
    console.error('Server error:', error.message);
    if (!res.headersSent) json(res, 500, { error: 'Service unavailable' });
    else res.destroy();
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`GORISE application listening on 0.0.0.0:${port}`);
});

export default server;
