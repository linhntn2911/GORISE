import sql from 'mssql';

let poolPromise = null;

export const mssqlConfig = {
  server: process.env.MSSQL_SERVER || '127.0.0.1',
  port: Number(process.env.MSSQL_PORT || 1433),
  database: process.env.MSSQL_DATABASE || 'GORISE_DB',
  user: process.env.MSSQL_USER || 'gorise_user',
  password: process.env.MSSQL_PASSWORD || 'GorisePassword123!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

export async function getSqlPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(mssqlConfig).catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

const decodeJson = (value) => {
  if (value == null) return null;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return value;
  }
};

const normalizeProduct = (row) => ({
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

const mapMedia = (row) => ({
  id: row.id,
  slot: row.slot,
  originalName: row.original_name,
  contentType: row.content_type,
  sizeBytes: Number(row.size_bytes),
  storageKey: row.storage_key,
  stableUrl: row.stable_url,
  isActive: Boolean(row.is_active),
  createdBy: row.created_by,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
});

// Helper function to translate MySQL-style queries to MSSQL
function adaptQuery(sqlQuery, params = []) {
  let transformed = sqlQuery;

  // 1. Convert LIMIT N to TOP N for SELECT queries
  const limitMatch = transformed.match(/\s+LIMIT\s+(\d+)\s*$/i);
  if (limitMatch) {
    const limitNum = limitMatch[1];
    transformed = transformed.replace(/\s+LIMIT\s+(\d+)\s*$/i, '');
    if (/^\s*SELECT\s+(DISTINCT\s+)?/i.test(transformed)) {
      transformed = transformed.replace(/^\s*SELECT\s+(DISTINCT\s+)?/i, (match, dist) => {
        return `SELECT ${dist || ''}TOP ${limitNum} `;
      });
    }
  }

  // 2. Convert ? placeholders to @p0, @p1, ...
  let paramIdx = 0;
  transformed = transformed.replace(/\?/g, () => `@p${paramIdx++}`);

  return { transformed, paramCount: paramIdx };
}

// Emulate [rows, result] signature compatible with existing db calls
export function getPool() {
  return {
    async query(sqlText, params = []) {
      const pool = await getSqlPool();
      const { transformed } = adaptQuery(sqlText, params);
      const req = pool.request();
      if (Array.isArray(params)) {
        params.forEach((val, i) => {
          req.input(`p${i}`, val);
        });
      }
      const result = await req.query(transformed);
      const rows = result.recordset || [];
      rows.affectedRows = result.rowsAffected?.[0] || 0;
      return [rows, { affectedRows: result.rowsAffected?.[0] || 0 }];
    },

    async execute(sqlText, params = []) {
      return this.query(sqlText, params);
    },

    async getConnection() {
      const pool = await getSqlPool();
      return {
        async execute(sqlText, params = []) {
          const { transformed } = adaptQuery(sqlText, params);
          const req = pool.request();
          if (Array.isArray(params)) {
            params.forEach((val, i) => {
              req.input(`p${i}`, val);
            });
          }
          const result = await req.query(transformed);
          const rows = result.recordset || [];
          rows.affectedRows = result.rowsAffected?.[0] || 0;
          return [rows, { affectedRows: result.rowsAffected?.[0] || 0 }];
        },
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {},
      };
    },
  };
}

export async function listProducts() {
  const pool = await getSqlPool();
  const result = await pool.request().query('SELECT TOP 50 * FROM products ORDER BY product_name ASC');
  return (result.recordset || []).map(normalizeProduct);
}

export async function getProduct(id = 'gorise-board-game') {
  const pool = await getSqlPool();
  const req = pool.request();
  req.input('id', sql.NVarChar(64), id);
  const result = await req.query('SELECT TOP 1 * FROM products WHERE id = @id');
  return result.recordset[0] ? normalizeProduct(result.recordset[0]) : null;
}

export async function listMedia() {
  const pool = await getSqlPool();
  const result = await pool.request().query(`
    SELECT TOP 300 id, slot, original_name, content_type, size_bytes, storage_key, stable_url, is_active, created_by, created_at
    FROM media_assets WHERE deleted_at IS NULL ORDER BY created_at DESC
  `);
  return (result.recordset || []).map(mapMedia);
}

export async function listActiveMedia() {
  const pool = await getSqlPool();
  const result = await pool.request().query(`
    SELECT TOP 300 id, slot, original_name, content_type, size_bytes, storage_key, stable_url, is_active, created_by, created_at
    FROM media_assets WHERE deleted_at IS NULL AND is_active = 1 ORDER BY created_at DESC
  `);
  return (result.recordset || []).map(mapMedia);
}

export async function createMedia(media) {
  const pool = await getSqlPool();
  const req = pool.request();
  req.input('id', sql.NVarChar(64), media.id);
  req.input('slot', sql.NVarChar(80), media.slot);
  req.input('name', sql.NVarChar(255), media.originalName);
  req.input('type', sql.NVarChar(100), media.contentType);
  req.input('size', sql.BigInt, media.sizeBytes);
  req.input('key', sql.NVarChar(255), media.storageKey);
  req.input('url', sql.NVarChar(500), media.stableUrl);
  req.input('actor', sql.NVarChar(255), media.createdBy);

  await req.query(`
    UPDATE media_assets SET is_active = 0 WHERE slot = @slot AND deleted_at IS NULL;
    INSERT INTO media_assets (id, slot, original_name, content_type, size_bytes, storage_key, stable_url, is_active, created_by)
    VALUES (@id, @slot, @name, @type, @size, @key, @url, 1, @actor);
  `);
  return media;
}

export async function deactivateMedia(id) {
  const pool = await getSqlPool();
  const req = pool.request();
  req.input('id', sql.NVarChar(64), id);
  const result = await req.query('UPDATE media_assets SET is_active = 0, deleted_at = GETDATE() WHERE id = @id AND deleted_at IS NULL');
  return (result.rowsAffected?.[0] || 0) > 0;
}

export async function databaseReady() {
  try {
    const pool = await getSqlPool();
    const result = await pool.request().query('SELECT 1 AS ready');
    return Boolean(result.recordset?.[0]?.ready);
  } catch (error) {
    return false;
  }
}

export async function closeDatabase() {
  if (poolPromise) {
    const pool = await poolPromise;
    await pool.close();
    poolPromise = null;
  }
}
