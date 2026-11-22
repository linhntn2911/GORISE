import { getPool } from './db.js';

const mapVideo = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  originalName: row.original_name,
  contentType: row.content_type,
  sizeBytes: Number(row.size_bytes),
  storageKey: row.storage_key,
  stableUrl: row.stable_url,
  thumbnailUrl: row.thumbnail_url || null,
  isActive: Boolean(row.is_active),
  createdBy: row.created_by,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
});

const columns = 'id, title, description, original_name, content_type, size_bytes, storage_key, stable_url, thumbnail_url, is_active, created_by, created_at';

export async function listPublicVideos() {
  const [rows] = await getPool().query(`SELECT ${columns}
    FROM situation_videos WHERE deleted_at IS NULL AND is_active = 1 ORDER BY created_at DESC LIMIT 200`);
  return rows.map(mapVideo);
}

export async function listAdminVideos() {
  const [rows] = await getPool().query(`SELECT ${columns}
    FROM situation_videos WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 200`);
  return rows.map(mapVideo);
}

export async function createVideo(item) {
  const [result] = await getPool().execute(`INSERT INTO situation_videos
    (id, title, description, original_name, content_type, size_bytes, storage_key, stable_url, thumbnail_url, is_active, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`, [item.id, item.title, item.description, item.originalName, item.contentType, item.sizeBytes, item.storageKey, item.stableUrl, item.thumbnailUrl || null, item.createdBy]);
  return result.affectedRows ? item : null;
}

export async function updateVideo(id, changes) {
  const fields = [];
  const values = [];
  if (Object.prototype.hasOwnProperty.call(changes, 'title')) { fields.push('title = ?'); values.push(changes.title); }
  if (Object.prototype.hasOwnProperty.call(changes, 'description')) { fields.push('description = ?'); values.push(changes.description); }
  if (Object.prototype.hasOwnProperty.call(changes, 'thumbnailUrl')) { fields.push('thumbnail_url = ?'); values.push(changes.thumbnailUrl || null); }
  if (!fields.length) return false;
  values.push(id);
  const [result] = await getPool().execute(`UPDATE situation_videos SET ${fields.join(', ')} WHERE id = ? AND deleted_at IS NULL`, values);
  return result.affectedRows > 0;
}

export async function deactivateVideo(id) {
  const [result] = await getPool().execute('UPDATE situation_videos SET is_active = 0, deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL', [id]);
  return result.affectedRows > 0;
}
