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
      JSON.stringify(
        entries.map(({ path, sha256: hash }) => ({ path, sha256: hash })),
      ),
    ),
    entries,
  }
}
const source =
  '---\ntitle: 新文章\nslug: runtime-new\nkind: post\nlang: cn\nauthors:\n - id: koto\n - id: parz1\npublished: 2026-11-05T00:00:00.000Z\n---\n\n## 测试 😀\n\n[[agent]] {漢字|かんじ} $x^2$\n\n```ts\nconst x = 1\n```\n'
test('publication status migration preserves the legacy project rendering contract', async () => {
  const path = 'projects/project.md'
  const legacy =
    '---\ntitle: Project\nslug: project\nsummary: A project\nstatus: active\nupdated: 2026-11-05\nauthors:\n - id: parz1\nrepo:\n owner: parz1\n name: project\n---\n\nBody.\n'
  const compile = async (markdown) => {
    const entry = {
      path,
      markdown,
      sha256: sha256(markdown),
    }
    const id = sha256(
      JSON.stringify([{ path: entry.path, sha256: entry.sha256 }]),
    )
    return (await compileRelease({ schemaVersion: 1, id, entries: [entry] }))
      .collections.projects[0]
  }
  const old = await compile(legacy)
  const migrated = await compile(
    legacy.replace(
      'status: active',
      'status: published\nlifecycleStatus: active',
    ),
  )
  assert.equal(migrated.status, 'active')
  const { id: _oldId, ...before } = old
  const { id: _newId, ...after } = migrated
  assert.deepEqual(after, before)
})
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

test('heading anchors are stable across repeated releases and unrelated documents', async () => {
  const first = await compileRelease(make(source))
  const second = await compileRelease(make(source))
  assert.deepEqual(
    second.collections.articles[0].body,
    first.collections.articles[0].body,
  )
  const other = source.replace('slug: runtime-new', 'slug: another-article')
  const release = make(source)
  release.entries.push({
    path: 'blog/articles/other.cn.md',
    markdown: other,
    sha256: sha256(other),
  })
  release.id = sha256(
    JSON.stringify(
      release.entries.map(({ path, sha256: hash }) => ({ path, sha256: hash })),
    ),
  )
  const combined = await compileRelease(release)
  assert.deepEqual(
    combined.collections.articles[1].body,
    first.collections.articles[0].body,
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
