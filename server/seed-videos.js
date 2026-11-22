import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sql from 'mssql';
import { getSqlPool } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function seedVideos() {
  const seedPath = resolve(__dirname, 'video-seed.json');
  const seed = JSON.parse(readFileSync(seedPath, 'utf8'));
  const videos = seed.videos || [];
  console.log(`Seeding ${videos.length} videos into MSSQL...`);
  const pool = await getSqlPool();

  for (const v of videos) {
    const req = pool.request();
    req.input('id', sql.NVarChar(64), v.id);
    req.input('title', sql.NVarChar(255), v.title);
    req.input('description', sql.NVarChar(sql.MAX), v.description || '');
    req.input('originalName', sql.NVarChar(255), v.originalName || 'video.mp4');
    req.input('contentType', sql.NVarChar(100), v.contentType || 'video/mp4');
    req.input('sizeBytes', sql.BigInt, v.sizeBytes || 0);
    req.input('storageKey', sql.NVarChar(255), v.storageKey || '');
    req.input('stableUrl', sql.NVarChar(500), v.stableUrl);
    req.input('thumbnailUrl', sql.NVarChar(500), v.thumbnailUrl || null);
    req.input('createdBy', sql.NVarChar(255), v.createdBy || 'system');
    req.input('createdAt', sql.DateTime2, new Date(v.createdAt || Date.now()));

    await req.query(`
      IF EXISTS (SELECT 1 FROM situation_videos WHERE id = @id)
      BEGIN
        UPDATE situation_videos 
        SET title = @title, description = @description, stable_url = @stableUrl, is_active = 1, deleted_at = NULL
        WHERE id = @id;
      END
      ELSE
      BEGIN
        INSERT INTO situation_videos (id, title, description, original_name, content_type, size_bytes, storage_key, stable_url, thumbnail_url, is_active, created_by, created_at)
        VALUES (@id, @title, @description, @originalName, @contentType, @sizeBytes, @storageKey, @stableUrl, @thumbnailUrl, 1, @createdBy, @createdAt);
      END
    `);
  }

  const result = await pool.request().query('SELECT count(*) as count FROM situation_videos WHERE deleted_at IS NULL AND is_active = 1');
  const count = result.recordset[0]?.count || 0;
  console.log(`Seeded successfully! Current active videos in MSSQL: ${count}`);
  return count;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  seedVideos()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
