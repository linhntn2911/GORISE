import { getPool } from './db.js';

const EVENT_COLUMNS = {
  view: 'views',
  helpful: 'helpful',
  save: 'saves',
  share: 'shares',
  copy: 'copies',
  question: 'question_opens',
  playlist: 'playlist_opens',
};

export const allowedVideoEvents = () => Object.keys(EVENT_COLUMNS);

export async function recordVideoEvent(videoId, event) {
  const column = EVENT_COLUMNS[event];
  if (!column || !videoId) return false;
  const db = getPool();
  const [result] = await db.execute(
    `INSERT INTO video_analytics (video_id, ${column}) VALUES (?, 1)
     ON DUPLICATE KEY UPDATE ${column} = ${column} + 1, updated_at = CURRENT_TIMESTAMP`,
    [String(videoId).slice(0, 64)],
  );
  return result.affectedRows > 0;
}

export async function getVideoAnalyticsSummary() {
  const db = getPool();
  const [[totals]] = await db.query(`
    SELECT
      COALESCE(SUM(views), 0) AS views,
      COALESCE(SUM(helpful), 0) AS helpful,
      COALESCE(SUM(saves), 0) AS saves,
      COALESCE(SUM(shares), 0) AS shares,
      COALESCE(SUM(copies), 0) AS copies,
      COALESCE(SUM(question_opens), 0) AS questionOpens,
      COALESCE(SUM(playlist_opens), 0) AS playlistOpens
    FROM video_analytics a
    INNER JOIN situation_videos v ON v.id = a.video_id AND v.deleted_at IS NULL
  `);
  const [rows] = await db.query(`
    SELECT v.id, v.title, v.thumbnail_url AS thumbnailUrl,
      COALESCE(a.views, 0) AS views,
      COALESCE(a.helpful, 0) AS helpful,
      COALESCE(a.saves, 0) AS saves,
      COALESCE(a.shares, 0) AS shares,
      COALESCE(a.copies, 0) AS copies,
      COALESCE(a.question_opens, 0) AS questionOpens,
      COALESCE(a.playlist_opens, 0) AS playlistOpens,
      COALESCE(a.views, 0) + COALESCE(a.helpful, 0) + COALESCE(a.saves, 0) + COALESCE(a.shares, 0) + COALESCE(a.copies, 0) + COALESCE(a.question_opens, 0) + COALESCE(a.playlist_opens, 0) AS interactions
    FROM situation_videos v
    LEFT JOIN video_analytics a ON a.video_id = v.id
    WHERE v.deleted_at IS NULL
    ORDER BY views DESC, interactions DESC, v.created_at DESC
    LIMIT 200
  `);
  const getVal = (obj, camel, lower) => Number(obj?.[camel] ?? obj?.[lower] ?? 0);
  const normalizedTotals = {
    views: getVal(totals, 'views', 'views'),
    helpful: getVal(totals, 'helpful', 'helpful'),
    saves: getVal(totals, 'saves', 'saves'),
    shares: getVal(totals, 'shares', 'shares'),
    copies: getVal(totals, 'copies', 'copies'),
    questionOpens: getVal(totals, 'questionOpens', 'questionopens'),
    playlistOpens: getVal(totals, 'playlistOpens', 'playlistopens'),
  };
  normalizedTotals.interactions = normalizedTotals.helpful + normalizedTotals.saves + normalizedTotals.shares + normalizedTotals.copies + normalizedTotals.questionOpens + normalizedTotals.playlistOpens;
  return {
    totals: normalizedTotals,
    videos: rows.map((row) => ({
      id: row.id,
      title: row.title,
      thumbnailUrl: row.thumbnailUrl || row.thumbnail_url || '',
      views: Number(row.views || 0),
      helpful: Number(row.helpful || 0),
      saves: Number(row.saves || 0),
      shares: Number(row.shares || 0),
      copies: Number(row.copies || 0),
      questionOpens: Number(row.questionOpens ?? row.questionopens ?? 0),
      playlistOpens: Number(row.playlistOpens ?? row.playlistopens ?? 0),
      interactions: Number(row.interactions || 0),
    }))
  };
}
