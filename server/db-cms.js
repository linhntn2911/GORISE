import crypto from 'node:crypto';
import sql from 'mssql';
import { getPool, getSqlPool } from './db.js';

const decode = (value, fallback = null) => {
  if (value == null) return fallback;
  try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return fallback; }
};
const iso = (value) => value instanceof Date ? value.toISOString() : String(value || '');
const mapArticle = (row) => ({
  id: row.id, slug: row.slug, title: row.title, summary: row.summary || '', content: row.content || '',
  category: row.category || 'Tin tức khác', tags: decode(row.tags_json, []), thumbnailUrl: row.thumbnail_url || '',
  seoTitle: row.seo_title || '', seoDescription: row.seo_description || '', status: row.status,
  publishedAt: row.published_at ? iso(row.published_at) : null, createdAt: iso(row.created_at), updatedAt: iso(row.updated_at),
  createdBy: row.created_by,
});
const articleColumns = 'id, slug, title, summary, content, category, tags_json, thumbnail_url, seo_title, seo_description, status, published_at, created_at, updated_at, created_by';
export async function listAdminArticles() { const [rows] = await getPool().query(`SELECT ${articleColumns} FROM cms_articles WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 300`); return rows.map(mapArticle); }
export async function listPublicArticles() { const [rows] = await getPool().query(`SELECT ${articleColumns} FROM cms_articles WHERE deleted_at IS NULL AND status = 'published' ORDER BY COALESCE(published_at, updated_at) DESC LIMIT 100`); return rows.map(mapArticle); }
export async function getArticleBySlug(slug) { const [rows] = await getPool().execute(`SELECT ${articleColumns} FROM cms_articles WHERE slug = ? AND deleted_at IS NULL AND status = 'published' LIMIT 1`, [slug]); return rows[0] ? mapArticle(rows[0]) : null; }
export async function saveArticle(item, actor) {
  const id = item.id || crypto.randomUUID();
  const status = ['draft', 'published', 'hidden'].includes(item.status) ? item.status : 'draft';
  const publishedAt = status === 'published' ? (item.publishedAt || new Date()) : null;
  await getPool().execute(`INSERT INTO cms_articles (${articleColumns.replace(/, /g, ', ')}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?) ON DUPLICATE KEY UPDATE slug=VALUES(slug), title=VALUES(title), summary=VALUES(summary), content=VALUES(content), category=VALUES(category), tags_json=VALUES(tags_json), thumbnail_url=VALUES(thumbnail_url), seo_title=VALUES(seo_title), seo_description=VALUES(seo_description), status=VALUES(status), published_at=VALUES(published_at), updated_at=CURRENT_TIMESTAMP`, [id, String(item.slug || '').trim(), String(item.title || '').trim(), String(item.summary || ''), String(item.content || ''), String(item.category || 'Tin tức khác'), JSON.stringify(Array.isArray(item.tags) ? item.tags : []), String(item.thumbnailUrl || ''), String(item.seoTitle || ''), String(item.seoDescription || ''), status, publishedAt, actor]);
  return getArticleById(id);
}
async function getArticleById(id) { const [rows] = await getPool().execute(`SELECT ${articleColumns} FROM cms_articles WHERE id = ? LIMIT 1`, [id]); return rows[0] ? mapArticle(rows[0]) : null; }
export async function deleteArticle(id) { const [result] = await getPool().execute('UPDATE cms_articles SET status = \'hidden\', deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL', [id]); return result.affectedRows > 0; }

const productColumns = 'id, product_name, sku, description, short_description, price_vnd, sale_price_vnd, sale_start, sale_end, category, age_range, components_json, specs_json, availability, stock_quantity, status, version_name, gallery_json, video_url, shipping_json, payment_json, images_json, product_url, seo_json, updated_at';
const mapProduct = (row) => ({ id: row.id, productName: row.product_name, sku: row.sku || '', description: row.description || '', shortDescription: row.short_description || '', price: row.price_vnd == null ? null : Number(row.price_vnd), salePrice: row.sale_price_vnd == null ? null : Number(row.sale_price_vnd), saleStart: row.sale_start, saleEnd: row.sale_end, category: row.category || '', ageRange: row.age_range || '', components: decode(row.components_json, []), specs: decode(row.specs_json, {}), availability: row.availability || '', stockQuantity: row.stock_quantity == null ? null : Number(row.stock_quantity), status: row.status || 'draft', versionName: row.version_name || '', gallery: decode(row.gallery_json, []), videoUrl: row.video_url || '', images: decode(row.images_json, []), productUrl: row.product_url || '/kham-pha-tro-choi/', seo: decode(row.seo_json, {}), updatedAt: iso(row.updated_at) });
export async function listAdminProducts() { const [rows] = await getPool().query(`SELECT ${productColumns} FROM products ORDER BY updated_at DESC LIMIT 100`); return rows.map(mapProduct); }
export async function saveProduct(item) {
  const id = item.id || crypto.randomUUID();
  const status = ['selling', 'out_of_stock', 'stopped', 'draft'].includes(item.status) ? item.status : 'draft';
  const pool = await getSqlPool();
  const request = pool.request();

  request.input('id', sql.NVarChar(64), id);
  request.input('productName', sql.NVarChar(255), String(item.productName || '').trim());
  request.input('sku', sql.NVarChar(120), item.sku || '');
  request.input('description', sql.NVarChar(sql.MAX), item.description || '');
  request.input('shortDescription', sql.NVarChar(sql.MAX), item.shortDescription || '');
  request.input('price', sql.BigInt, item.price ?? null);
  request.input('salePrice', sql.BigInt, item.salePrice ?? null);
  request.input('saleStart', sql.Date, item.saleStart ? new Date(item.saleStart) : null);
  request.input('saleEnd', sql.Date, item.saleEnd ? new Date(item.saleEnd) : null);
  request.input('category', sql.NVarChar(150), item.category || '');
  request.input('ageRange', sql.NVarChar(150), item.ageRange || '');
  request.input('componentsJson', sql.NVarChar(sql.MAX), JSON.stringify(item.components || []));
  request.input('specsJson', sql.NVarChar(sql.MAX), JSON.stringify(item.specs || {}));
  request.input('availability', sql.NVarChar(150), item.availability || '');
  request.input('stockQuantity', sql.Int, item.stockQuantity ?? null);
  request.input('status', sql.NVarChar(32), status);
  request.input('versionName', sql.NVarChar(120), item.versionName || '');
  request.input('galleryJson', sql.NVarChar(sql.MAX), JSON.stringify(item.gallery || []));
  request.input('videoUrl', sql.NVarChar(500), item.videoUrl || '');
  request.input('imagesJson', sql.NVarChar(sql.MAX), JSON.stringify(item.images || []));
  request.input('productUrl', sql.NVarChar(255), item.productUrl || '/kham-pha-tro-choi/');
  request.input('seoJson', sql.NVarChar(sql.MAX), JSON.stringify(item.seo || {}));

  await request.query(`
    IF EXISTS (SELECT 1 FROM products WHERE id = @id)
    BEGIN
      UPDATE products SET
        product_name = @productName,
        sku = @sku,
        description = @description,
        short_description = @shortDescription,
        price_vnd = @price,
        sale_price_vnd = @salePrice,
        sale_start = @saleStart,
        sale_end = @saleEnd,
        category = @category,
        age_range = @ageRange,
        components_json = @componentsJson,
        specs_json = @specsJson,
        availability = @availability,
        stock_quantity = @stockQuantity,
        status = @status,
        version_name = @versionName,
        gallery_json = @galleryJson,
        video_url = @videoUrl,
        images_json = @imagesJson,
        product_url = @productUrl,
        seo_json = @seoJson,
        updated_at = GETDATE()
      WHERE id = @id;
    END
    ELSE
    BEGIN
      INSERT INTO products (
        id, product_name, sku, description, short_description, price_vnd, sale_price_vnd,
        sale_start, sale_end, category, age_range, components_json, specs_json, availability,
        stock_quantity, status, version_name, gallery_json, video_url, images_json,
        product_url, seo_json, updated_at
      ) VALUES (
        @id, @productName, @sku, @description, @shortDescription, @price, @salePrice,
        @saleStart, @saleEnd, @category, @ageRange, @componentsJson, @specsJson, @availability,
        @stockQuantity, @status, @versionName, @galleryJson, @videoUrl, @imagesJson,
        @productUrl, @seoJson, GETDATE()
      );
    END
  `);

  return getProductById(id);
}
async function getProductById(id) { const [rows] = await getPool().execute(`SELECT ${productColumns} FROM products WHERE id = ? LIMIT 1`, [id]); return rows[0] ? mapProduct(rows[0]) : null; }
export async function deleteProduct(id) { const [result] = await getPool().execute('UPDATE products SET status = \'stopped\', updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]); return result.affectedRows > 0; }
export async function dashboardStats() { const db = getPool(); const [[video]] = await db.query('SELECT COUNT(*) count FROM situation_videos WHERE deleted_at IS NULL'); const [[publishedVideos]] = await db.query('SELECT COUNT(*) count FROM situation_videos WHERE deleted_at IS NULL AND is_active = 1'); const [[article]] = await db.query('SELECT COUNT(*) count FROM cms_articles WHERE deleted_at IS NULL'); const [[publishedArticles]] = await db.query("SELECT COUNT(*) count FROM cms_articles WHERE deleted_at IS NULL AND status = 'published'"); const [[product]] = await db.query('SELECT COUNT(*) count FROM products'); const [[drafts]] = await db.query("SELECT (SELECT COUNT(*) FROM cms_articles WHERE deleted_at IS NULL AND status='draft') + (SELECT COUNT(*) FROM products WHERE status='draft') count"); return { videos: Number(video.count), publishedVideos: Number(publishedVideos.count), articles: Number(article.count), publishedArticles: Number(publishedArticles.count), products: Number(product.count), drafts: Number(drafts.count) }; }
