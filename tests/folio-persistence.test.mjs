import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import {
  postgresPersistence,
  cacheMigration,
} from '../lib/folio-persistence.mjs'

test(
  'real shared Postgres cache survives a new adapter and rejects a late older writer',
  { skip: !process.env.FOLIO_TEST_DATABASE_URL },
  async () => {
    const key = 'folio-adapter-test-' + randomUUID()
    const url = process.env.FOLIO_TEST_DATABASE_URL
    const pool = new pg.Pool({ connectionString: url })
    let first, second
    try {
      await pool.query(cacheMigration)
      first = postgresPersistence(url, key)
      await first.write(2, 'latest-verified-snapshot')
      await first.close()
      first = undefined
      second = postgresPersistence(url, key)
      assert.equal(await second.read(), 'latest-verified-snapshot')
      await second.write(1, 'late-old-snapshot')
      assert.equal(await second.read(), 'latest-verified-snapshot')
      await second.write(3, 'explicit-rollback')
      assert.equal(await second.read(), 'explicit-rollback')
    } finally {
      await first?.close()
      await second?.close()
      await pool.query(
        'DELETE FROM blog_folio_cache_v1.snapshots WHERE key=$1',
        [key],
      )
      await pool.end()
    }
  },
)
