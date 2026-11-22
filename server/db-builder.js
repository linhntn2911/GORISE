import crypto from 'node:crypto';
import { getPool } from './db.js';

const decode = (value, fallback) => {
  if (value == null) return fallback;
  try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return fallback; }
};
const iso = (value) => value instanceof Date ? value.toISOString() : String(value || '');
const mapPage = (row) => ({
  id: row.id, slug: row.slug, route: row.route, title: row.title,
  status: row.status, draft: decode(row.draft_schema, { sections: [] }),
  published: decode(row.published_schema, { sections: [] }),
  updatedAt: iso(row.updated_at), publishedAt: row.published_at ? iso(row.published_at) : null,
  updatedBy: row.updated_by || '', publishedBy: row.published_by || '',
});
const pageColumns = 'id, slug, route, title, status, draft_schema, published_schema, updated_at, published_at, updated_by, published_by';

const defaults = [
  ['home', '/', 'Trang chủ GORISE'],
  ['about', '/ve-gorise/', 'Về GORISE'],
  ['shop', '/kham-pha-tro-choi/', 'Shop Safe Home'],
  ['situations', '/video-tinh-huong/', 'Tình huống Safe Home'],
  ['news', '/tin-tuc/', 'Tin tức GORISE'],
  ['contact', '/lien-he/', 'Liên hệ GORISE'],
  ['challenge', '/thu-thach/', 'Thử thách GORISE'],
  ['cart', '/gio-hang/', 'Giỏ hàng GORISE'],
];
function defaultSchema(slug, title) {
  const comparison = slug === 'shop' ? { id: 'shop-compare', type: 'comparison', label: 'So sánh phiên bản Safe Home', visible: true, locked: false, content: { heading: 'Phiên bản nào phù hợp với bạn?', text: 'Hai hành trình khám phá an toàn – lựa chọn trải nghiệm phù hợp cho gia đình bạn.', image: '/product-safe-home.webp', buttonLabel: 'Khám phá Safe Home Standard' }, style: { background: '#eef8fc', color: '#123b73', padding: '72px 6%', width: '100%', minHeight: '0', margin: '0', borderRadius: '0', opacity: '1', boxShadow: 'none', backgroundImage: '' }, responsive: { desktop: {}, tablet: { padding: '56px 5%' }, mobile: { padding: '40px 20px', columns: '1' } }, animation: { name: 'slide-up', duration: '400ms', delay: '0ms', easing: 'ease', trigger: 'scroll', repeat: 'once' }, interactions: { buttonAction: 'scroll', target: '#shop-products' }, children: [] } : null;
  return { version: 1, page: slug, sections: [
    { id: `${slug}-hero`, type: 'hero', label: 'Hero Banner', visible: true, locked: false, content: { heading: title, text: 'Nội dung có thể chỉnh sửa trong GORISE STUDIO.', image: '', buttonLabel: 'Khám phá ngay' }, style: { background: '#f3f9f7', color: '#123b73', padding: '72px 6%' }, responsive: { mobile: { padding: '48px 20px' } }, interactions: { buttonAction: 'internal', target: '/' } },
    { id: `${slug}-content`, type: 'text-image', label: 'Text & Image', visible: true, locked: false, content: { heading: 'Một hành trình học qua trải nghiệm', text: 'Chọn section để chỉnh nội dung, hình ảnh và thiết kế.' }, style: { background: '#ffffff', color: '#123b73', padding: '64px 6%' }, responsive: { mobile: { padding: '40px 20px' } }, interactions: {} },
    ...(comparison ? [comparison] : []),
  ] };
}
async function getPageRow(slug) {
  const [rows] = await getPool().execute(`SELECT ${pageColumns} FROM cms_pages WHERE slug = ? LIMIT 1`, [slug]);
  return rows[0] || null;
}
export async function ensureBuilderPages() {
  const db = getPool();
  for (const [slug, route, title] of defaults) {
    const schema = JSON.stringify(defaultSchema(slug, title));
    await db.execute(`INSERT INTO cms_pages (id, slug, route, title, status, draft_schema, published_schema, updated_by) VALUES (?, ?, ?, ?, 'draft', ?, ?, 'system') ON DUPLICATE KEY UPDATE route=VALUES(route), title=VALUES(title)`, [crypto.createHash('sha1').update(slug).digest('hex').slice(0, 24), slug, route, title, schema, schema]);
  }
}
export async function listBuilderPages() {
  const [rows] = await getPool().query(`SELECT ${pageColumns} FROM cms_pages ORDER BY title ASC`);
  return rows.map(mapPage);
}
export async function getBuilderPage(slug) { const row = await getPageRow(slug); return row ? mapPage(row) : null; }
export async function saveBuilderDraft(slug, schema, actor) {
  const page = await getPageRow(slug); if (!page) return null;
  await getPool().execute("UPDATE cms_pages SET draft_schema = ?, status = 'draft', updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ?", [JSON.stringify(schema), actor, slug]);
  return getBuilderPage(slug);
}
export async function publishBuilderPage(slug, actor, note = 'Publish từ GORISE STUDIO') {
  const page = await getPageRow(slug); if (!page) return null;
  const id = crypto.randomUUID();
  const db = getPool(); const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(`INSERT INTO cms_page_versions (id, page_id, version_type, schema_json, created_by, note) VALUES (?, ?, 'published', ?, ?, ?)`, [id, page.id, page.draft_schema, actor, note]);
    await connection.execute("UPDATE cms_pages SET published_schema = draft_schema, status = 'published', published_at = CURRENT_TIMESTAMP, published_by = ?, updated_by = ? WHERE slug = ?", [actor, actor, slug]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  return getBuilderPage(slug);
}
export async function listBuilderVersions(slug) {
  const [rows] = await getPool().execute(`SELECT v.id, v.version_type AS versionType, v.created_by AS createdBy, v.created_at AS createdAt, v.note FROM cms_page_versions v JOIN cms_pages p ON p.id = v.page_id WHERE p.slug = ? ORDER BY v.created_at DESC LIMIT 50`, [slug]);
  return rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) }));
}
export async function rollbackBuilderPage(slug, versionId, actor) {
  const db = getPool(); const [rows] = await db.execute(`SELECT v.schema_json FROM cms_page_versions v JOIN cms_pages p ON p.id = v.page_id WHERE p.slug = ? AND v.id = ? LIMIT 1`, [slug, versionId]);
  if (!rows[0]) return null;
  await db.execute("UPDATE cms_pages SET draft_schema = ?, status = 'draft', updated_by = ? WHERE slug = ?", [rows[0].schema_json, actor, slug]);
  return getBuilderPage(slug);
}
export async function getPublishedBuilderSchema(slug) { const page = await getBuilderPage(slug); return page ? page.published : null; }
