/**
 * lib/db.js
 * PostgreSQL persistence layer with automatic schema migrations & JSON file fallback.
 * Uses 'pg' pool when DATABASE_URL is configured (Railway Postgres).
 */

const { Pool } = require('pg');

let pool = null;
let initialized = false;

function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  if (!pool) {
    // Railway internal private network (postgres.railway.internal) does not need SSL.
    // External connections require SSL with rejectUnauthorized: false.
    const isInternal = connectionString.includes('.railway.internal') || connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    pool = new Pool({
      connectionString,
      ssl: isInternal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });
    pool.on('error', (err) => {
      console.error('[Postgres Pool Error]:', err.message);
    });
  }
  return pool;
}

async function initDb(seedClips = [], seedCuration = null, seedConfig = null) {
  const p = getPool();
  if (!p) {
    return false;
  }
  if (initialized) return true;

  try {
    const client = await p.connect();
    try {
      // 1. Clips table
      await client.query(`
        CREATE TABLE IF NOT EXISTS clips (
          id TEXT PRIMARY KEY,
          platform TEXT NOT NULL,
          channel TEXT,
          title TEXT NOT NULL,
          game TEXT,
          url TEXT,
          video_url TEXT,
          thumbnail TEXT,
          duration TEXT,
          published_at TIMESTAMPTZ,
          views BIGINT DEFAULT 0,
          vibe TEXT DEFAULT 'highlight',
          featured BOOLEAN DEFAULT FALSE,
          placeholder BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 2. Curation table
      await client.query(`
        CREATE TABLE IF NOT EXISTS curation (
          id INT PRIMARY KEY DEFAULT 1,
          featured_id TEXT,
          vibes JSONB DEFAULT '{}'::jsonb,
          games JSONB DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 3. Site Config table
      await client.query(`
        CREATE TABLE IF NOT EXISTS site_config (
          id INT PRIMARY KEY DEFAULT 1,
          config JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 4. Stream Status table
      await client.query(`
        CREATE TABLE IF NOT EXISTS stream_status (
          id INT PRIMARY KEY DEFAULT 1,
          live BOOLEAN DEFAULT FALSE,
          platform TEXT,
          viewers INT DEFAULT 0,
          game TEXT,
          title TEXT,
          started_at TIMESTAMPTZ,
          url TEXT,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // Auto-seed clips if table is empty
      const countRes = await client.query('SELECT COUNT(*) FROM clips');
      const count = parseInt(countRes.rows[0].count, 10);
      if (count === 0 && seedClips.length > 0) {
        console.log(`[Postgres] Seeding ${seedClips.length} initial clips into database...`);
        for (const c of seedClips) {
          await client.query(`
            INSERT INTO clips (id, platform, channel, title, game, url, video_url, thumbnail, duration, published_at, views, vibe, featured, placeholder)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO NOTHING
          `, [
            c.id,
            c.platform,
            c.channel || null,
            c.title,
            c.game || null,
            c.url || null,
            c.video_url || null,
            c.thumbnail || null,
            c.duration || '',
            c.published_at ? new Date(c.published_at) : new Date(),
            c.views || 0,
            c.vibe || 'highlight',
            Boolean(c.featured),
            Boolean(c.placeholder)
          ]);
        }
      }

      // Auto-seed curation if table is empty
      if (seedCuration) {
        await client.query(`
          INSERT INTO curation (id, featured_id, vibes, games)
          VALUES (1, $1, $2, $3)
          ON CONFLICT (id) DO UPDATE SET
            featured_id = COALESCE(curation.featured_id, EXCLUDED.featured_id),
            vibes = curation.vibes || EXCLUDED.vibes,
            games = curation.games || EXCLUDED.games
        `, [seedCuration.featuredId || null, JSON.stringify(seedCuration.vibes || {}), JSON.stringify(seedCuration.games || {})]);
      }

      // Auto-seed config if table is empty
      if (seedConfig) {
        await client.query(`
          INSERT INTO site_config (id, config)
          VALUES (1, $1)
          ON CONFLICT (id) DO NOTHING
        `, [JSON.stringify(seedConfig)]);
      }

      console.log('[Postgres] Connected and database schema verified.');
      initialized = true;
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[Postgres Init Failed - using JSON files fallback]:', err.message);
    return false;
  }
}

async function getDbClips() {
  const p = getPool();
  if (!p || !initialized) return null;
  try {
    const res = await p.query(`
      SELECT id, platform, channel, title, game, url, video_url, thumbnail, duration,
             published_at, views, vibe, featured, placeholder
      FROM clips
      ORDER BY published_at DESC NULLS LAST
    `);
    return res.rows.map(r => ({
      ...r,
      views: r.views !== null ? Number(r.views) : null,
      published_at: r.published_at ? r.published_at.toISOString() : new Date().toISOString()
    }));
  } catch (err) {
    console.error('[Postgres getDbClips Error]:', err.message);
    return null;
  }
}

async function upsertDbClips(clips = []) {
  const p = getPool();
  if (!p || !initialized || clips.length === 0) return false;
  try {
    for (const c of clips) {
      await p.query(`
        INSERT INTO clips (id, platform, channel, title, game, url, video_url, thumbnail, duration, published_at, views, vibe, featured, placeholder, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          game = COALESCE(clips.game, EXCLUDED.game),
          url = EXCLUDED.url,
          video_url = COALESCE(EXCLUDED.video_url, clips.video_url),
          thumbnail = COALESCE(EXCLUDED.thumbnail, clips.thumbnail),
          duration = COALESCE(EXCLUDED.duration, clips.duration),
          views = COALESCE(EXCLUDED.views, clips.views),
          vibe = COALESCE(clips.vibe, EXCLUDED.vibe),
          featured = clips.featured,
          placeholder = EXCLUDED.placeholder,
          updated_at = NOW()
      `, [
        c.id,
        c.platform,
        c.channel || null,
        c.title,
        c.game || null,
        c.url || null,
        c.video_url || null,
        c.thumbnail || null,
        c.duration || '',
        c.published_at ? new Date(c.published_at) : new Date(),
        c.views || 0,
        c.vibe || 'highlight',
        Boolean(c.featured),
        Boolean(c.placeholder)
      ]);
    }
    return true;
  } catch (err) {
    console.error('[Postgres upsertDbClips Error]:', err.message);
    return false;
  }
}

async function updateDbCuration(clipId, { vibe, game, featured }) {
  const p = getPool();
  if (!p || !initialized) return false;
  try {
    if (featured) {
      await p.query('UPDATE clips SET featured = FALSE');
      await p.query('UPDATE clips SET featured = TRUE WHERE id = $1', [clipId]);
      await p.query(`
        UPDATE curation SET featured_id = $1, updated_at = NOW() WHERE id = 1
      `, [clipId]);
    }
    if (vibe) {
      await p.query('UPDATE clips SET vibe = $1, updated_at = NOW() WHERE id = $2', [vibe, clipId]);
      await p.query(`
        UPDATE curation SET vibes = jsonb_set(vibes, ARRAY[$1], to_jsonb($2::text)), updated_at = NOW() WHERE id = 1
      `, [clipId, vibe]);
    }
    if (game) {
      await p.query('UPDATE clips SET game = $1, updated_at = NOW() WHERE id = $2', [game, clipId]);
      await p.query(`
        UPDATE curation SET games = jsonb_set(games, ARRAY[$1], to_jsonb($2::text)), updated_at = NOW() WHERE id = 1
      `, [clipId, game]);
    }
    return true;
  } catch (err) {
    console.error('[Postgres updateDbCuration Error]:', err.message);
    return false;
  }
}

async function getDbConfig() {
  const p = getPool();
  if (!p || !initialized) return null;
  try {
    const res = await p.query('SELECT config FROM site_config WHERE id = 1');
    return res.rows[0]?.config || null;
  } catch (err) {
    console.error('[Postgres getDbConfig Error]:', err.message);
    return null;
  }
}

async function saveDbConfig(config) {
  const p = getPool();
  if (!p || !initialized) return false;
  try {
    await p.query(`
      INSERT INTO site_config (id, config, updated_at)
      VALUES (1, $1, NOW())
      ON CONFLICT (id) DO UPDATE SET config = EXCLUDED.config, updated_at = NOW()
    `, [JSON.stringify(config)]);
    return true;
  } catch (err) {
    console.error('[Postgres saveDbConfig Error]:', err.message);
    return false;
  }
}

async function getDbStatus() {
  const p = getPool();
  if (!p || !initialized) return null;
  try {
    const res = await p.query('SELECT * FROM stream_status WHERE id = 1');
    if (!res.rows[0]) return null;
    const r = res.rows[0];
    return {
      live: Boolean(r.live),
      platform: r.platform || null,
      viewers: Number(r.viewers || 0),
      game: r.game || null,
      title: r.title || null,
      started_at: r.started_at ? r.started_at.toISOString() : null,
      url: r.url || null,
      updated_at: r.updated_at ? r.updated_at.toISOString() : new Date().toISOString()
    };
  } catch (err) {
    console.error('[Postgres getDbStatus Error]:', err.message);
    return null;
  }
}

async function saveDbStatus(status) {
  const p = getPool();
  if (!p || !initialized) return false;
  try {
    await p.query(`
      INSERT INTO stream_status (id, live, platform, viewers, game, title, started_at, url, updated_at)
      VALUES (1, $1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (id) DO UPDATE SET
        live = EXCLUDED.live,
        platform = EXCLUDED.platform,
        viewers = EXCLUDED.viewers,
        game = EXCLUDED.game,
        title = EXCLUDED.title,
        started_at = EXCLUDED.started_at,
        url = EXCLUDED.url,
        updated_at = NOW()
    `, [
      Boolean(status.live),
      status.platform || null,
      Number(status.viewers || 0),
      status.game || null,
      status.title || null,
      status.started_at ? new Date(status.started_at) : null,
      status.url || null
    ]);
    return true;
  } catch (err) {
    console.error('[Postgres saveDbStatus Error]:', err.message);
    return false;
  }
}

module.exports = {
  getPool,
  initDb,
  getDbClips,
  upsertDbClips,
  updateDbCuration,
  getDbConfig,
  saveDbConfig,
  getDbStatus,
  saveDbStatus
};
