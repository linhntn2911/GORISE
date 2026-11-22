import crypto from 'node:crypto';
import { getPool } from './db.js';

const decode = (value, fallback) => { if (value == null) return fallback; try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return fallback; } };
const iso = (value) => value instanceof Date ? value.toISOString() : String(value || '');

export async function listBuilderTemplates() {
  const [rows] = await getPool().query('SELECT id, name, category, schema_json, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt FROM builder_templates ORDER BY updated_at DESC LIMIT 200');
  return rows.map((row) => ({ ...row, schema: decode(row.schema_json, { version: 1, sections: [] }), createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) }));
}
export async function saveBuilderTemplate(item, actor) {
  const id = String(item.id || crypto.randomUUID()).slice(0, 64);
  const name = String(item.name || '').trim().slice(0, 160);
  const category = String(item.category || 'GORISE').trim().slice(0, 80);
  if (!name) throw Object.assign(new Error('Template cần có tên.'), { code: 'VALIDATION' });
  await getPool().execute(`INSERT INTO builder_templates (id, name, category, schema_json, created_by) VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), schema_json=VALUES(schema_json), updated_at=CURRENT_TIMESTAMP`, [id, name, category, JSON.stringify(item.schema || { version: 1, sections: [] }), actor]);
  const [rows] = await getPool().execute('SELECT id, name, category, schema_json, created_by AS createdBy, created_at AS createdAt, updated_at AS updatedAt FROM builder_templates WHERE id = ?', [id]);
  const row = rows[0]; return row ? { ...row, schema: decode(row.schema_json, {}), createdAt: iso(row.createdAt), updatedAt: iso(row.updatedAt) } : null;
}
export async function deleteBuilderTemplate(id) { const [result] = await getPool().execute('DELETE FROM builder_templates WHERE id = ?', [id]); return result.affectedRows > 0; }

export async function getPageMeta(slug) {
  const [rows] = await getPool().execute('SELECT page_slug AS slug, meta_title AS metaTitle, meta_description AS metaDescription, og_image AS ogImage, canonical_url AS canonicalUrl, robots, updated_by AS updatedBy, updated_at AS updatedAt FROM cms_page_meta WHERE page_slug = ?', [slug]);
  return rows[0] ? { ...rows[0], updatedAt: iso(rows[0].updatedAt) } : { slug, metaTitle: '', metaDescription: '', ogImage: '', canonicalUrl: '', robots: 'index,follow' };
}
export async function savePageMeta(slug, data, actor) {
  await getPool().execute(`INSERT INTO cms_page_meta (page_slug, meta_title, meta_description, og_image, canonical_url, robots, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE meta_title=VALUES(meta_title), meta_description=VALUES(meta_description), og_image=VALUES(og_image), canonical_url=VALUES(canonical_url), robots=VALUES(robots), updated_by=VALUES(updated_by), updated_at=CURRENT_TIMESTAMP`, [String(slug).slice(0, 120), String(data.metaTitle || '').slice(0, 255), String(data.metaDescription || '').slice(0, 500), String(data.ogImage || '').slice(0, 500), String(data.canonicalUrl || '').slice(0, 500), ['index,follow', 'noindex,nofollow', 'index,nofollow'].includes(data.robots) ? data.robots : 'index,follow', actor]);
  return getPageMeta(slug);
}
export async function writeAdminActivity(actor, action, entityType, entityId = '', detail = {}) { await getPool().execute('INSERT INTO admin_activity_log (id, actor, action, entity_type, entity_id, detail_json) VALUES (?, ?, ?, ?, ?, ?)', [crypto.randomUUID(), actor, String(action).slice(0, 120), String(entityType).slice(0, 80), String(entityId).slice(0, 120), JSON.stringify(detail)]); }
export async function listAdminActivity() { const [rows] = await getPool().query('SELECT id, actor, action, entity_type AS entityType, entity_id AS entityId, detail_json AS detail, created_at AS createdAt FROM admin_activity_log ORDER BY created_at DESC LIMIT 100'); return rows.map((row) => ({ ...row, detail: decode(row.detail, {}), createdAt: iso(row.createdAt) })); }
