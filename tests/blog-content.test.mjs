import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  importPublishedContent,
  createApprovedContentRelease as createContentRelease,
  prepareContentRelease,
  validateContentRelease,
  approveContent,
  collectionContentSource,
  sha256,
} from '../lib/blog-content.mjs'

const article = `---
status: published
title: Published test
slug: published-test
lang: cn
authors:
  - id: parz1
published: 2026-10-29T00:00:00.000Z
---

Public text.
`
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'blog-content-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  const source = join(directory, 'source'),
    root = join(directory, 'blog-content'),
    cache = join(directory, 'cache')
  await mkdir(join(source, 'blog/articles'), { recursive: true })
  await mkdir(join(root, 'content/blog/articles'), { recursive: true })
  await writeFile(join(source, 'blog/articles/old.md'), article)
  await writeFile(
    join(root, 'content/blog/articles/private.md'),
    article
      .replace('Public text.', 'Private draft.')
      .replace('status: published', 'status: draft')
      .replace('title:', 'draft: true\ntitle:'),
  )
  await importPublishedContent(source, root)
  return { directory, source, root, cache }
}

test('complete copy preserves bytes, refuses conflicts, and excludes unselected workspace drafts', async (t) => {
  const { root, source } = await fixture(t)
  assert.deepEqual(
    await readFile(join(root, 'content/blog/articles/old.md')),
    await readFile(join(source, 'blog/articles/old.md')),
  )
  const release = await createContentRelease(root)
  assert.deepEqual(
    release.entries.map((entry) => entry.path),
    ['blog/articles/old.md'],
  )
  assert.ok(!JSON.stringify(release).includes('Private draft'))
  await assert.rejects(importPublishedContent(source, root), /second import/)
})
test('changed published bytes require explicit matching digest approval', async (t) => {
  const { root } = await fixture(t)
  const modified = article.replace('Public text.', 'Reviewed correction.')
  await writeFile(join(root, 'content/blog/articles/old.md'), modified)
  await assert.rejects(createContentRelease(root), /without approval/)
  await assert.rejects(
    approveContent(root, 'blog/articles/old.md', '0'.repeat(64)),
    /changed/,
  )
  await approveContent(root, 'blog/articles/old.md', sha256(modified))
  assert.ok(
    (await createContentRelease(root)).entries[0].markdown.includes(
      'Reviewed correction',
    ),
  )
  await assert.rejects(
    approveContent(
      root,
      'blog/articles/private.md',
      sha256(await readFile(join(root, 'content/blog/articles/private.md'))),
    ),
    /Drafts/,
  )
})
test('deterministic releases validate hashes and reject traversal and duplicates', async (t) => {
  const { root } = await fixture(t)
  const release = await createContentRelease(root)
  assert.deepEqual(await createContentRelease(root), release)
  const changed = structuredClone(release)
  changed.entries[0].markdown += 'tamper'
  assert.throws(() => validateContentRelease(changed), /checksum/)
  for (const path of [
    '../secret.md',
    '/secret.md',
    'a/../../secret.md',
    'a\\secret.md',
    '.workspace/state.md',
  ]) {
    const invalid = structuredClone(release)
    invalid.entries[0].path = path
    assert.throws(() => validateContentRelease(invalid))
  }
  const duplicate = structuredClone(release)
  duplicate.entries.push(duplicate.entries[0])
  assert.throws(() => validateContentRelease(duplicate), /publication entry/)
})
test('prepared content is immutable, failures keep the previous pointer, corrupt caches fail closed', async (t) => {
  const { root, cache } = await fixture(t)
  const result = await prepareContentRelease({ root, cache })
  const pointer = await readFile(join(cache, 'current.json'), 'utf8')
  await assert.rejects(
    prepareContentRelease({ root, cache, file: join(root, 'missing.json') }),
  )
  assert.equal(await readFile(join(cache, 'current.json'), 'utf8'), pointer)
  await writeFile(
    join(cache, result.id, 'content/blog/articles/old.md'),
    'damaged',
  )
  await assert.rejects(prepareContentRelease({ root, cache }), /damaged/)
})
test('file artifacts support CI without a workspace; bad pins and insecure remote sources fail', async (t) => {
  const { root, cache, directory } = await fixture(t)
  const release = await createContentRelease(root)
  const file = join(directory, 'release.json'),
    bytes = JSON.stringify(release)
  await writeFile(file, bytes)
  assert.equal(
    (
      await prepareContentRelease({
        root: join(directory, 'no-workspace'),
        file,
        expected: sha256(bytes),
        cache,
      })
    ).id,
    release.id,
  )
  await assert.rejects(
    prepareContentRelease({ file, expected: '0'.repeat(64), cache }),
    /checksum/,
  )
  await assert.rejects(
    prepareContentRelease({
      url: 'http://example.invalid/release.json',
      expected: '0'.repeat(64),
      cache,
    }),
    /HTTPS/,
  )
  await assert.rejects(
    prepareContentRelease({
      url: 'https://example.invalid/release.json',
      cache,
    }),
    /SHA-256/,
  )
})
test('release collection input uses exact paths and preserves original content paths', async () => {
  const input = {
    mode: 'release',
    root: '/external/content',
    entries: [
      { path: 'blog/articles/old.md' },
      { path: 'about.md' },
      { path: 'concepts/seed.md' },
    ],
  }
  assert.deepEqual(collectionContentSource('blog/articles/*.md', input), [
    { cwd: '/external/content', include: 'blog/articles/old.md', prefix: '/' },
  ])
  assert.deepEqual(
    collectionContentSource('*.md', input).map((entry) => entry.include),
    ['about.md'],
  )
  assert.equal(collectionContentSource('*.md', { mode: 'legacy' }), '*.md')
})

test('HTTPS transport accepts a pinned package and redacts download failures', async (t) => {
  const { root, cache } = await fixture(t)
  const release = await createContentRelease(root)
  const bytes = JSON.stringify(release)
  const url =
    'https://storage.example.invalid/release.json?signature=private-test'
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async (_url, options) => {
      assert.equal(options.redirect, 'error')
      return new Response(bytes)
    },
  )
  assert.equal(
    (await prepareContentRelease({ url, expected: sha256(bytes), cache })).id,
    release.id,
  )
  fetchMock.mock.mockImplementation(async () => {
    throw new Error(url)
  })
  await assert.rejects(
    prepareContentRelease({ url, expected: sha256(bytes), cache }),
    (error) => {
      assert.ok(!error.message.includes('private-test'))
      return true
    },
  )
})
