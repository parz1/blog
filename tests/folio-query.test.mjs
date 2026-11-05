import test from 'node:test'
import assert from 'node:assert/strict'
import { createFolioQuery, retainNewestSnapshot } from '../utils/folioQuery.ts'
test('client navigation retains a newer snapshot across cold fallback and accepts explicit higher-generation rollback', () => {
  const base = {
    contract: 'test',
    collections: Object.fromEntries(
      [
        'pages',
        'articles',
        'columns',
        'concepts',
        'entities',
        'projects',
        'gallery',
      ].map((k) => [k, []]),
    ),
  }
  const newer = { ...base, id: '2'.repeat(64), generation: 2 },
    cold = { ...base, id: '1'.repeat(64), generation: 0 }
  assert.equal(retainNewestSnapshot(newer, cold), newer)
  const rollback = { ...cold, generation: 3 }
  assert.equal(retainNewestSnapshot(newer, rollback), rollback)
})
test('runtime queries preserve filtering, multiple sort precedence, projection, limit and do not mutate a snapshot', async () => {
  const rows = [
    { slug: 'a', kind: 'post', published: '2026-01-01' },
    { slug: 'b', kind: 'post', published: '2026-02-01' },
    { slug: 'c', kind: 'log', published: '2026-03-01' },
  ]
  const load = async () => ({ collections: { articles: rows } })
  const result = await createFolioQuery('articles', load)
    .where('kind', '=', 'post')
    .order('published', 'DESC')
    .select('slug')
    .limit(1)
    .all()
  assert.deepEqual(result, [{ slug: 'b' }])
  assert.equal(rows[0].slug, 'a')
  assert.equal(
    await createFolioQuery('articles', load)
      .where('slug', '=', 'missing')
      .first(),
    null,
  )
})
