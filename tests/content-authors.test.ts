import { resolveContentInput } from '../lib/blog-content.mjs'
import assert from 'node:assert/strict'
import test from 'node:test'
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parseDocument } from 'yaml'
import {
  contentAuthorRoles,
  contentAuthorStructuredData,
  contentPublisher,
  isValidContentCredits,
  resolveContentAuthor,
  resolveContentCredits,
  type ContentCredit,
} from '../utils/contentAuthors.ts'
import { mergeLocalizedArticles } from '../utils/contentArticles.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const collaboration: ContentCredit[] = [
  { id: 'koto', roles: ['writing'] },
  { id: 'parz1', roles: ['idea', 'editing'] },
]

test('ordered credits preserve first/second author, contributions and publisher identity', () => {
  const result = resolveContentCredits(collaboration)
  assert.deepEqual(
    result.map((credit) => [credit.id, credit.position, credit.roles]),
    [
      ['koto', 1, ['writing']],
      ['parz1', 2, ['idea', 'editing']],
    ],
  )
  assert.equal(result[0]?.name, 'koto chan')
  assert.equal(result[0]?.kind, 'character')
  assert.equal(result[0]?.path, '/characters/koto')
  assert.equal(result[0]?.twitter, undefined)
  assert.equal(contentPublisher.id, 'parz1')
  assert.equal(
    resolveContentAuthor('unregistered-author').name,
    'unregistered-author',
  )
  assert.equal(resolveContentCredits()[0]?.id, 'parz1')
})

test('credits reject missing authors, duplicate authors, unknown identities/roles and a separate order field', () => {
  assert.equal(isValidContentCredits(collaboration), true)
  assert.equal(isValidContentCredits([{ id: 'parz1' }]), true)
  for (const input of [
    undefined,
    [],
    'parz1',
    [{ id: 'parz1' }, { id: 'parz1' }],
    [{ id: 'typo' }],
    [{ id: 'koto', roles: [] }],
    [{ id: 'parz1', roles: ['idea', 'idea'] }],
    [{ id: 'parz1', roles: ['owner'] }],
    [{ id: 'koto', order: 2 }],
  ])
    assert.equal(isValidContentCredits(input), false, JSON.stringify(input))
})

test('structured attribution includes every author in order without borrowing the publisher profile', () => {
  const authors = contentAuthorStructuredData(collaboration, {
    urlForPath: (profilePath) => `https://parz1.minerei.dev${profilePath}`,
    characterDescription: 'Virtual author',
  })
  assert.deepEqual(
    authors.map((author) => author.name),
    ['koto chan', 'parz1 ZHOU'],
  )
  assert.equal(authors[0]?.url, 'https://parz1.minerei.dev/characters/koto')
  assert.equal(authors[0]?.description, 'Virtual author')
  assert.equal(authors[1]?.url, 'https://parz1.minerei.dev/about')
  assert.equal(contentPublisher.name, 'parz1 ZHOU')
})

test('localization merging preserves the selected document credits in body and list queries', () => {
  const base = {
    title: 'Collaboration',
    slug: 'collaboration',
    kind: 'post' as const,
    published: '2026-10-27T00:00:00.000Z',
  }
  const localized = [
    { ...base, lang: 'cn', authors: collaboration },
    { ...base, lang: 'en', authors: [{ id: 'parz1' as const }] },
  ]
  for (const includeBody of [true, false]) {
    assert.deepEqual(
      mergeLocalizedArticles(localized, 'zh-CN', { includeBody })[0]?.authors,
      collaboration,
    )
    assert.deepEqual(
      mergeLocalizedArticles(localized, 'en-US', { includeBody })[0]?.authors,
      [{ id: 'parz1' }],
    )
  }
})

async function walk(directory: string): Promise<string[]> {
  const files: string[] = []
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, item.name)
    if (item.isDirectory()) files.push(...(await walk(filename)))
    else if (item.name.endsWith('.md')) files.push(filename)
  }
  return files
}

test('all published Markdown collections have explicit, valid ordered credits', async () => {
  const input = resolveContentInput()
  const files = input.entries
    ? input.entries.map((entry: { path: string }) =>
        path.join(input.root, entry.path),
      )
    : await walk(input.root)
  assert.ok(files.length > 0)
  for (const filename of files) {
    const text = await readFile(filename, 'utf8')
    const frontmatter =
      /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1]
    assert.ok(frontmatter, filename)
    const document = parseDocument(frontmatter, { uniqueKeys: true })
    assert.deepEqual(document.errors, [], filename)
    const data = document.toJSON() as Record<string, unknown>
    assert.equal(
      'author' in data,
      false,
      `Legacy singular author in ${filename}`,
    )
    assert.equal(
      isValidContentCredits(data.authors),
      true,
      `Missing or invalid authors in ${filename}`,
    )
  }
})

test('all contribution and rank labels exist in Chinese, English and Japanese', async () => {
  for (const locale of ['zh-CN', 'en-US', 'ja-JP']) {
    const messages = JSON.parse(
      await readFile(path.join(root, `i18n/locales/${locale}.json`), 'utf8'),
    ) as {
      contentAuthors: Record<string, unknown> & {
        roles: Record<string, string>
      }
    }
    for (const key of ['label', 'single', 'first', 'second', 'nth', 'virtual'])
      assert.ok(messages.contentAuthors[key], `${locale}:${key}`)
    for (const role of contentAuthorRoles)
      assert.ok(messages.contentAuthors.roles[role], `${locale}:${role}`)
  }
})

test('author portraits are project-owned assets and the existing owner portrait is preserved', async () => {
  const owner = await readFile(path.join(root, 'public/authors/parz1.jpg'))
  assert.deepEqual(owner, await readFile(path.join(root, 'assets/avatar.jpg')))
  const koto = await readFile(path.join(root, 'public/authors/koto.png'))
  assert.deepEqual([...koto.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
})

test('character profile copy is localized without an author directory or archive', async () => {
  for (const locale of ['zh-CN', 'en-US', 'ja-JP']) {
    const messages = JSON.parse(
      await readFile(path.join(root, `i18n/locales/${locale}.json`), 'utf8'),
    )
    assert.equal(messages.authorPages, undefined)
    for (const key of ['open', 'avatarAlt', 'pageTitle', 'back', 'virtual'])
      assert.ok(messages.profilePages[key], `${locale}:${key}`)
    for (const key of [
      'tagline',
      'identity',
      'introduction',
      'temperament',
      'relationship',
    ])
      assert.ok(
        messages.profilePages.characters.koto[key].trim(),
        `${locale}:${key}`,
      )
  }
})

test('public credits link characters to their profile and the owner to the existing about page', () => {
  assert.equal(resolveContentAuthor('koto').path, '/characters/koto')
  assert.equal(resolveContentAuthor('parz1').path, '/about')
  assert.equal(resolveContentAuthor('parz1').aboutPath, '/about')
  assert.equal(resolveContentAuthor('unregistered-author').path, undefined)
})
