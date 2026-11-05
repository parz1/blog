import pg from 'pg'
import { cacheMigration } from '../lib/folio-persistence.mjs'
const connectionString =
  process.env.FOLIO_CACHE_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL
if (!connectionString)
  throw new Error('Set a cache database URL before running this migration.')
const pool = new pg.Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 5000,
})
try {
  await pool.query(cacheMigration)
  console.log('Folio shared cache schema ready.')
} catch {
  console.error('Folio cache migration failed; connection details suppressed.')
  process.exitCode = 1
} finally {
  await pool.end()
}
