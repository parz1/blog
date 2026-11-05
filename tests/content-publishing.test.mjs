import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  createContentRelease,
  collectionContentSource,
  resolveContentInput,
  migratePublicationStatus,
  sha256,
  validateContentRelease,
} from '../lib/blog-content.mjs'
import { publishContent } from '../lib/content-publishing.mjs'
import { withLifecycleStatus } from '../utils/contentLifecycle.mjs'

const article = (status = '') =>
  `---\n${status ? `status: ${status}\n` : ''}title: Test\nslug: test\nkind: post\nlang: cn\nauthors:\n  - id: parz1\npublished: 2026-11-05T00:00:00.000Z\n---\n\nTest body.\n`
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'folio-writing-'))
  t.after(() => rm(root, { force: true, recursive: true }))
  await mkdir(join(root, 'content/blog/articles'), { recursive: true })
  const put = (path, text) =>
    writeFile(join(root, 'content/blog/articles', path), text)
  await put('public.md', article('published'))
  await put('draft.md', article('draft'))
  await put('unmarked.md', article())
  await put('unfinished.md', 'An unfinished local draft without frontmatter.')
  return { root, put }
}

test('local input needs no manifest and watches patterns rather than startup file lists', async (t) => {
  const { root, put } = await fixture(t)
  const input = resolveContentInput({
    CONTENT_WORKSPACE_DIR: root,
    BLOG_CONTENT_MODE: 'workspace',
  })
  assert.equal(input.entries, null)
  assert.deepEqual(collectionContentSource('blog/articles/*.md', input), {
    cwd: join(root, 'content'),
    include: 'blog/articles/*.md',
    prefix: '/blog/articles',
  })
  await put('created-after-start.md', article())
  assert.equal(
    collectionContentSource('blog/articles/*.md', input).include,
    'blog/articles/*.md',
  )
  assert.throws(
    () =>
      resolveContentInput({
        BLOG_CONTENT_MODE: 'workspace',
        NODE_ENV: 'production',
      }),
    /Production cannot/,
  )
})

test('publication discovers only explicit published status, follows edits/removals, never trusts old manifest', async (t) => {
  const { root, put } = await fixture(t)
  await writeFile(join(root, 'publication.json'), '{broken legacy manifest')
  const first = await createContentRelease(root)
  assert.deepEqual(
    first.entries.map((e) => e.path),
    ['blog/articles/public.md'],
  )
  await put('new.md', article('published').replace('slug: test', 'slug: new'))
  await put('public.md', article('withdrawn'))
  const next = await createContentRelease(root)
  assert.deepEqual(
    next.entries.map((e) => e.path),
    ['blog/articles/new.md'],
  )
  assert.notEqual(first.id, next.id)
  assert.deepEqual(await createContentRelease(root), next)
  await put(
    'new.md',
    article('published').replace('title:', 'draft: true\ntitle:'),
  )
  await assert.rejects(createContentRelease(root), /Drafts/)
})

test('empty publication cannot erase the online blog; legacy immutable releases remain valid', async (t) => {
  const { root, put } = await fixture(t)
  const old = await createContentRelease(root)
  const markdown = article()
  old.entries = [
    { path: 'blog/articles/legacy.md', markdown, sha256: sha256(markdown) },
  ]
  old.id = sha256(
    JSON.stringify(
      old.entries.map(({ path, sha256: hash }) => ({ path, sha256: hash })),
    ),
  )
  assert.equal(validateContentRelease(old).id, old.id)
  await put('public.md', article())
  await assert.rejects(createContentRelease(root), /empty publication/)
})

test('migration touches only prior selected bytes, keeps backups, resumes a partial write', async (t) => {
  const { root } = await fixture(t)
  const before = article()
  await writeFile(
    join(root, 'publication.json'),
    JSON.stringify({
      schemaVersion: 1,
      entries: [{ path: 'blog/articles/unmarked.md', sha256: sha256(before) }],
    }),
  )
  const result = await migratePublicationStatus(root)
  assert.equal(result.migrated, 1)
  assert.equal(
    await readFile(join(root, 'content/blog/articles/draft.md'), 'utf8'),
    article('draft'),
  )
  const journal = JSON.parse(await readFile(result.backup, 'utf8'))
  assert.equal(journal.changes[0].before, before)
  // Simulate the original file still present when a journaled operation resumes.
  await writeFile(join(root, 'content/blog/articles/unmarked.md'), before)
  assert.equal((await migratePublicationStatus(root)).migrated, 1)
  await writeFile(
    join(root, 'content/blog/articles/unmarked.md'),
    before + 'new private edit',
  )
  await assert.rejects(migratePublicationStatus(root), /interrupted by an edit/)
})

test('migration rejects pre-existing drift without changing any content', async (t) => {
  const { root } = await fixture(t)
  await writeFile(
    join(root, 'publication.json'),
    JSON.stringify({
      schemaVersion: 1,
      entries: [{ path: 'blog/articles/unmarked.md', sha256: '0'.repeat(64) }],
    }),
  )
  await assert.rejects(
    migratePublicationStatus(root),
    /existing content changed/,
  )
  assert.equal(
    await readFile(join(root, 'content/blog/articles/unmarked.md'), 'utf8'),
    article(),
  )
})

test('migration retains business lifecycle independently from publication and local parser uses it', async (t) => {
  const { root } = await fixture(t)
  await mkdir(join(root, 'content/projects'))
  const before = article('active')
  await writeFile(join(root, 'content/projects/project.md'), before)
  await writeFile(
    join(root, 'publication.json'),
    JSON.stringify({
      schemaVersion: 1,
      entries: [{ path: 'projects/project.md', sha256: sha256(before) }],
    }),
  )
  await migratePublicationStatus(root)
  const migrated = await readFile(
    join(root, 'content/projects/project.md'),
    'utf8',
  )
  assert.ok(migrated.includes('status: published\n'))
  assert.ok(migrated.includes('lifecycleStatus: active\n'))
  assert.equal(
    withLifecycleStatus({
      status: 'published',
      meta: { lifecycleStatus: 'active' },
    }).status,
    'active',
  )
  assert.equal(withLifecycleStatus({ status: 'active' }).status, 'active')
})

test('dry-run compiles and generates artifacts without touching credentials or network', async (t) => {
  const { root } = await fixture(t)
  let compiled = false
  const result = await publishContent({
    root,
    dryRun: true,
    compile: async () => {
      compiled = true
    },
    loadToken: () => assert.fail('credential access'),
    fetchImpl: () => assert.fail('network access'),
  })
  assert.equal(compiled, true)
  assert.equal(result.count, 1)
  const manifest = JSON.parse(
    await readFile(join(root, 'publication.json'), 'utf8'),
  )
  assert.equal(manifest.provenance, 'generated-from-published-status')
  assert.equal(manifest.entries.length, 1)
})

test('one command publishes exactly the compiled snapshot with CAS and records verified receipt', async (t) => {
  const { root } = await fixture(t)
  let compiledId,
    calls = 0
  const result = await publishContent({
    root,
    compile: async (release) => {
      compiledId = release.id
    },
    loadToken: async () => 'x'.repeat(32),
    fetchImpl: async (_url, options) => {
      calls++
      assert.equal(options.redirect, 'error')
      if (calls === 1) return Response.json({ generation: 7 })
      const { release, expectedGeneration } = JSON.parse(options.body)
      assert.equal(release.id, compiledId)
      assert.equal(expectedGeneration, 7)
      return Response.json({
        id: release.id,
        sha256: sha256(JSON.stringify(release, null, 2) + '\n'),
        generation: 8,
      })
    },
  })
  assert.equal(calls, 2)
  assert.equal(result.generation, 8)
  assert.ok(
    JSON.parse(await readFile(`${result.file}.receipt.json`, 'utf8')).id,
  )
})

test('failed compilation never loads a credential or posts; conflicts and uncertain results never retry', async (t) => {
  const { root } = await fixture(t)
  await assert.rejects(
    publishContent({
      root,
      dryRun: true,
      compile: async () => {
        throw new Error('invalid schema')
      },
      loadToken: () => assert.fail('credential access'),
      fetchImpl: () => assert.fail('network'),
    }),
    /invalid schema/,
  )
  for (const mode of ['conflict', 'timeout', 'bad-receipt']) {
    let posts = 0
    await assert.rejects(
      publishContent({
        root,
        compile: async () => {},
        loadToken: async () => 'x'.repeat(32),
        fetchImpl: async (_url, options) => {
          if (!options.method) return Response.json({ generation: 2 })
          posts++
          if (mode === 'timeout')
            throw new Error('network includes private token')
          return mode === 'conflict'
            ? new Response('', { status: 409 })
            : Response.json({ id: 'wrong' })
        },
      }),
      /409|uncertain|mismatch/,
    )
    assert.equal(posts, 1)
  }
})
