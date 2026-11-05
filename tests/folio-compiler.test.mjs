import test from 'node:test'
import assert from 'node:assert/strict'
import { sha256 } from '../lib/blog-content.mjs'
import { compileRelease, searchSections } from '../lib/folio-compiler.mjs'
import { toHast } from 'minimark/hast'
const make = (markdown) => {
  const entries = [
    { path: 'blog/articles/new.cn.md', sha256: sha256(markdown), markdown },
  ]
  return {
    schemaVersion: 1,
    id: sha256(
      JSON.stringify(entries.map(({ path, sha256 }) => ({ path, sha256 }))),
    ),
    entries,
  }
}
const source =
  '---\ntitle: 新文章\nslug: runtime-new\nkind: post\nlang: cn\nauthors:\n - id: koto\n - id: parz1\npublished: 2026-11-05T00:00:00.000Z\n---\n\n## 测试 😀\n\n[[agent]] {漢字|かんじ} $x^2$\n\n```ts\nconst x = 1\n```\n'
test('runtime compiler preserves authored metadata, coauthor order, TOC, wiki, ruby, math, code and search', async () => {
  const release = make(source),
    parsed = await compileRelease(release)
  const doc = parsed.collections.articles[0],
    ast = JSON.stringify(toHast(doc.body))
  assert.equal(doc.slug, 'runtime-new')
  assert.deepEqual(
    doc.authors.map((a) => a.id),
    ['koto', 'parz1'],
  )
  for (const text of ['ruby', '/concepts/agent', 'katex', 'shiki'])
    assert.ok(ast.includes(text), text)
  assert.ok(doc.body.toc.links.length)
  assert.ok(JSON.stringify(searchSections(doc)).includes('😀'))
  assert.equal(
    (await compileRelease(release, parsed)).collections.articles[0],
    doc,
  )
})
test('invalid release, invalid schema and executable attributes are rejected before activation', async () => {
  for (const text of [
    source.replace('kind: post', 'kind: invalid'),
    source + '\n<script>alert(1)</script>',
  ])
    await assert.rejects(compileRelease(make(text)))
  const sanitized = await compileRelease(
    make(source + '\n<img src="x" onerror="alert(1)">'),
  )
  assert.ok(
    !JSON.stringify(sanitized.collections.articles[0].body).includes('onError'),
  )
  await assert.rejects(compileRelease({ ...make(source), id: '0'.repeat(64) }))
})
