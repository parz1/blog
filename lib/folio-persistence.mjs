import pg from 'pg'
export const cacheMigration = `CREATE SCHEMA IF NOT EXISTS blog_folio_cache_v1;
CREATE TABLE IF NOT EXISTS blog_folio_cache_v1.snapshots (
  key text PRIMARY KEY, generation integer NOT NULL, body text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);`
export function postgresPersistence(url, key) {
  const pool = new pg.Pool({
    connectionString: url,
    max: 2,
    connectionTimeoutMillis: 2000,
    query_timeout: 1000,
    idleTimeoutMillis: 10000,
  })
  return {
    async read() {
      const { rows } = await pool.query(
        'SELECT body FROM blog_folio_cache_v1.snapshots WHERE key=$1',
        [key],
      )
      return rows[0]?.body || null
    },
    async write(generation, body) {
      await pool.query(
        'INSERT INTO blog_folio_cache_v1.snapshots(key,generation,body) VALUES($1,$2,$3) ON CONFLICT(key) DO UPDATE SET generation=EXCLUDED.generation,body=EXCLUDED.body,updated_at=now() WHERE EXCLUDED.generation>=blog_folio_cache_v1.snapshots.generation',
        [key, generation, body],
      )
    },
  }
}
