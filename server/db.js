import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error('Managed product database is not configured');
  if (!pool) {
    pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 5,
      timezone: 'Z',
    });
  }
  return pool;
}

const decodeJson = (value) => {
  if (value == null) return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
};

const normalize = (row) => ({
  id: row.id,
  productName: row.product_name,
  description: row.description,
  shortDescription: row.short_description || '',
  price: row.price_vnd === null ? null : Number(row.price_vnd),
  salePrice: row.sale_price_vnd == null ? null : Number(row.sale_price_vnd),
  category: row.category,
  ageRange: row.age_range,
  components: decodeJson(row.components_json) || [],
  availability: row.availability,
  stockQuantity: row.stock_quantity == null ? null : Number(row.stock_quantity),
  status: row.status || 'selling',
  sku: row.sku || '',
  gallery: decodeJson(row.gallery_json) || [],
  videoUrl: row.video_url || '',
  shipping: decodeJson(row.shipping_json),
  payment: decodeJson(row.payment_json),
  images: decodeJson(row.images_json) || [],
  productUrl: row.product_url,
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
});

export async function listProducts() {
  const [rows] = await getPool().query('SELECT * FROM products ORDER BY product_name ASC LIMIT 50');
  return rows.map(normalize);
}

export async function getProduct(id = 'gorise-board-game') {
  const [rows] = await getPool().execute('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? normalize(rows[0]) : null;
}

export async function databaseReady() {
  const [rows] = await getPool().query('SELECT COUNT(*) AS count FROM products');
  return Number(rows[0].count) > 0;
}

export async function closeDatabase() {
  if (pool) await pool.end();
  pool = undefined;
}

export async function listMedia() {
  const [rows] = await getPool().query(`SELECT id, slot, original_name, content_type, size_bytes, storage_key, stable_url, is_active, created_by, created_at
    FROM media_assets WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 200`);
  return rows.map((row) => ({ id: row.id, slot: row.slot, originalName: row.original_name, contentType: row.content_type, sizeBytes: Number(row.size_bytes), storageKey: row.storage_key, stableUrl: row.stable_url, isActive: Boolean(row.is_active), createdBy: row.created_by, createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at) }));
}

export async function listActiveMedia() {
  const [rows] = await getPool().query(`SELECT slot, stable_url AS stableUrl FROM media_assets
    WHERE deleted_at IS NULL AND is_active = 1 ORDER BY created_at DESC LIMIT 50`);
  return rows.map((row) => ({ slot: row.slot, stableUrl: row.stableUrl }));
}

export async function createMedia(item) {
  const database = getPool();
  const connection = await database.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('UPDATE media_assets SET is_active = 0 WHERE slot = ? AND deleted_at IS NULL', [item.slot]);
    await connection.execute(`INSERT INTO media_assets (id, slot, original_name, content_type, size_bytes, storage_key, stable_url, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`, [item.id, item.slot, item.originalName, item.contentType, item.sizeBytes, item.storageKey, item.stableUrl, item.createdBy]);
    await connection.commit();
    return item;
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}

export async function deactivateMedia(id) {
  const [result] = await getPool().execute('UPDATE media_assets SET is_active = 0, deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL', [id]);
  return result.affectedRows > 0;
}
