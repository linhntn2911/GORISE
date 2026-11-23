import sql from 'mssql';
import pg from 'pg';

const { Pool: PgPool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || '';
const isPostgres = DATABASE_URL.startsWith('postgres://') || DATABASE_URL.startsWith('postgresql://');

let poolPromise = null;
let pgPoolInstance = null;

export const mssqlConfig = {
  server: process.env.MSSQL_SERVER || '127.0.0.1',
  port: Number(process.env.MSSQL_PORT || 1433),
  database: process.env.MSSQL_DATABASE || 'GORISE_DB',
  user: process.env.MSSQL_USER || 'gorise_user',
  password: process.env.MSSQL_PASSWORD || 'GorisePassword123!',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    useUTC: false,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

function getPgPool() {
  if (!pgPoolInstance) {
    pgPoolInstance = new PgPool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pgPoolInstance;
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
  specs: decodeJson(row.specs_json) || {},
  availability: row.availability,
  stockQuantity: row.stock_quantity == null ? null : Number(row.stock_quantity),
  status: row.status || 'selling',
  versionName: row.version_name || '',
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

// Translate T-SQL queries (used in controllers) to PostgreSQL
export function translateTsqlToPg(sqlText, inputs = {}) {
  let q = sqlText.trim();

  // 1. Convert DECLARE @newId ... INSERT ... SELECT @newId AS id
  const declareMatch = q.match(/DECLARE\s+@newId\s+NVARCHAR\(\d+\)\s*=\s*NEWID\(\);?\s*INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(@newId,\s*([^;]+)\);?\s*SELECT\s+@newId\s+AS\s+id;?/i);
  if (declareMatch) {
    const [, table, cols, vals] = declareMatch;
    q = `INSERT INTO ${table} (${cols}) VALUES (gen_random_uuid()::text, ${vals}) RETURNING id;`;
  }

  // 2. T-SQL functions to PostgreSQL
  q = q.replace(/GETDATE\(\)/gi, 'NOW()');
  q = q.replace(/NEWID\(\)/gi, 'gen_random_uuid()::text');
  q = q.replace(/ISNULL\(/gi, 'COALESCE(');

  // 3. DATEADD translations
  q = q.replace(/DATEADD\(day,\s*([+-]?\d+),\s*(GETDATE\(\)|NOW\(\))\)/gi, `(NOW() + ($1 * INTERVAL '1 day'))`);
  q = q.replace(/DATEADD\(day,\s*-@days,\s*(GETDATE\(\)|NOW\(\))\)/gi, `(NOW() - (@days * INTERVAL '1 day'))`);

  // 4. CONVERT(VARCHAR(10), CAST(created_at AS DATE), 120) and CAST(... AS DATE) -> ($1::date)
  q = q.replace(/CONVERT\(VARCHAR\(\d+\),\s*CAST\(([^)]+)\s+AS\s+DATE\),\s*120\)/gi, `($1::date)`);
  q = q.replace(/CAST\(([^)]+)\s+AS\s+DATE\)/gi, `($1::date)`);

  // 5. Convert FOR JSON PATH subquery for order_items
  q = q.replace(
    /\(\s*SELECT\s+product_name,\s*quantity,\s*unit_price,\s*total_price\s+FROM\s+order_items\s+WHERE\s+order_id\s*=\s*o\.id\s+FOR\s+JSON\s+PATH\s*\)\s*AS\s+items_json/gi,
    `(SELECT COALESCE(json_agg(json_build_object('product_name', product_name, 'quantity', quantity, 'unit_price', unit_price, 'total_price', total_price)), '[]'::json)::text FROM order_items WHERE order_id = o.id) AS items_json`
  );

  // 5. Convert SELECT TOP N ... to SELECT ... LIMIT N
  if (/UNION/i.test(q)) {
    q = q.replace(/SELECT\s+(DISTINCT\s+)?TOP\s+\d+\s+/gi, (m, dist) => `SELECT ${dist || ''}`);
    if (!/\bLIMIT\s+\d+/i.test(q)) {
      q = q.replace(/;?\s*$/, ' LIMIT 1;');
    }
  } else {
    const topMatch = q.match(/SELECT\s+(DISTINCT\s+)?TOP\s+(\d+)\s+/i);
    if (topMatch && !/\bLIMIT\s+\d+/i.test(q)) {
      const limitVal = topMatch[2];
      q = q.replace(/SELECT\s+(DISTINCT\s+)?TOP\s+\d+\s+/gi, (m, dist) => `SELECT ${dist || ''}`);
      q = q.replace(/;?\s*$/, ` LIMIT ${limitVal};`);
    }
  }

  // 6. Map @paramName to $1, $2, ...
  const paramRegex = /@([a-zA-Z0-9_]+)/g;
  let match;
  const paramNamesInOrder = [];
  while ((match = paramRegex.exec(q)) !== null) {
    paramNamesInOrder.push(match[1]);
  }

  const values = [];
  const nameToPlaceholder = {};
  let idx = 1;

  for (const name of paramNamesInOrder) {
    if (!nameToPlaceholder[name]) {
      nameToPlaceholder[name] = `$${idx++}`;
      values.push(inputs[name] !== undefined ? inputs[name] : null);
    }
  }

  q = q.replace(/@([a-zA-Z0-9_]+)/g, (m, name) => {
    return nameToPlaceholder[name] || m;
  });

  return { query: q, values };
}

// PostgreSQL Wrapper implementing MSSQL pool.request() and transaction() API
function createPgSqlPool() {
  const pgPool = getPgPool();

  function makeRequest(executor) {
    const inputs = {};
    return {
      input(name, typeOrVal, val) {
        inputs[name] = val !== undefined ? val : typeOrVal;
        return this;
      },
      async query(sqlText) {
        const { query, values } = translateTsqlToPg(sqlText, inputs);
        const result = await executor.query(query, values);
        return {
          recordset: result.rows || [],
          rowsAffected: [result.rowCount || 0],
        };
      },
    };
  }

  return {
    request() {
      return makeRequest(pgPool);
    },
    transaction() {
      let client = null;
      return {
        async begin() {
          client = await pgPool.connect();
          await client.query('BEGIN');
        },
        async commit() {
          if (client) {
            await client.query('COMMIT');
            client.release();
            client = null;
          }
        },
        async rollback() {
          if (client) {
            try {
              await client.query('ROLLBACK');
            } finally {
              client.release();
              client = null;
            }
          }
        },
        request() {
          return makeRequest(client || pgPool);
        },
      };
    },
  };
}

export async function getSqlPool() {
  if (isPostgres) {
    return createPgSqlPool();
  }

  if (!poolPromise) {
    poolPromise = sql.connect(mssqlConfig).catch((err) => {
      poolPromise = null;
      throw err;
    });
  }
  return poolPromise;
}

// Emulate [rows, result] signature compatible with MySQL-style db calls
export function getPool() {
  if (isPostgres) {
    const pgPool = getPgPool();
    return {
      async query(sqlText, params = []) {
        let pIdx = 1;
        const pgText = sqlText.replace(/\?/g, () => `$${pIdx++}`);
        const result = await pgPool.query(pgText, params);
        const rows = result.rows || [];
        rows.affectedRows = result.rowCount || 0;
        return [rows, { affectedRows: result.rowCount || 0 }];
      },

      async execute(sqlText, params = []) {
        return this.query(sqlText, params);
      },

      async getConnection() {
        const client = await pgPool.connect();
        return {
          async execute(sqlText, params = []) {
            let pIdx = 1;
            const pgText = sqlText.replace(/\?/g, () => `$${pIdx++}`);
            const result = await client.query(pgText, params);
            const rows = result.rows || [];
            rows.affectedRows = result.rowCount || 0;
            return [rows, { affectedRows: result.rowCount || 0 }];
          },
          async beginTransaction() {
            await client.query('BEGIN');
          },
          async commit() {
            await client.query('COMMIT');
          },
          async rollback() {
            await client.query('ROLLBACK');
          },
          release() {
            client.release();
          },
        };
      },
    };
  }

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
  req.input('id', id);
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
  await pool.request()
    .input('slot', media.slot)
    .query('UPDATE media_assets SET is_active = 0 WHERE slot = @slot AND deleted_at IS NULL');

  await pool.request()
    .input('id', media.id)
    .input('slot', media.slot)
    .input('name', media.originalName)
    .input('type', media.contentType)
    .input('size', media.sizeBytes)
    .input('key', media.storageKey)
    .input('url', media.stableUrl)
    .input('actor', media.createdBy)
    .query(`
      INSERT INTO media_assets (id, slot, original_name, content_type, size_bytes, storage_key, stable_url, is_active, created_by)
      VALUES (@id, @slot, @name, @type, @size, @key, @url, 1, @actor)
    `);
  return media;
}

export async function deactivateMedia(id) {
  const pool = await getSqlPool();
  const req = pool.request();
  req.input('id', id);
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
  if (pgPoolInstance) {
    await pgPoolInstance.end();
    pgPoolInstance = null;
  }
  if (poolPromise) {
    const pool = await poolPromise;
    await pool.close();
    poolPromise = null;
  }
}
