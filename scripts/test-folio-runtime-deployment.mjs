import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { sha256 } from '../lib/blog-content.mjs'
const blog = process.env.TEST_BLOG_URL,
  folio = process.env.TEST_FOLIO_URL,
  token = process.env.CONTENT_OWNER_TOKEN
if (!blog?.startsWith('https://') || !folio?.startsWith('https://') || !token)
  throw Error('Explicit test URLs and owner token required')
const report = { blog, folio, checks: [] }
const request = async (path, options = {}) => {
  const r = await fetch(blog + path, {
    signal: AbortSignal.timeout(15000),
    ...options,
  })
  return {
    status: r.status,
    headers: Object.fromEntries(r.headers),
    body: await r.text(),
  }
}
const mode = async (value) => {
  const r = await fetch(folio + '/api/__test/mode', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode: value }),
    signal: AbortSignal.timeout(10000),
  })
  assert.equal(
    r.status,
    200,
    'isolated test control required before any publication',
  )
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const record = (name, details) => {
  report.checks.push({ name, ...details })
  console.log(JSON.stringify({ name, ...details }))
}
try {
  await mode('healthy')
  let snapshot
  for (let i = 0; i < 10; i++) {
    const r = await request('/api/folio/snapshot')
    assert.equal(r.status, 200)
    snapshot = JSON.parse(r.body)
    if (r.headers['x-folio-state'] === 'fresh') break
    await wait(1500)
  }
  const slug = 'folio-runtime-check-' + Date.now()
  const before = await request('/zh-CN/blog/' + slug)
  assert.equal(before.status, 404, 'healthy unknown slug is 404')
  record('before-publication', { status: before.status })
  const base = JSON.parse(
    await readFile('.local/deployment-readiness/release.json', 'utf8'),
  )
  const markdown = `---\ntitle: Folio Runtime Acceptance Fixture\nslug: ${slug}\nkind: post\nlang: cn\ndescription: Synthetic test content on an isolated preview only.\nauthors:\n  - id: koto\n    roles: [writing]\n  - id: parz1\n    roles: [idea]\npublished: 2026-11-05T00:00:00.000Z\n---\n\n## Runtime acceptance\n\nFolio runtime smoke proof. This is synthetic test content, not a published blog article.\n`
  const entries = [
    ...base.entries,
    {
      path: 'blog/articles/' + slug + '.cn.md',
      sha256: sha256(markdown),
      markdown,
    },
  ].sort((a, b) => a.path.localeCompare(b.path, 'en'))
  const release = {
    schemaVersion: 1,
    id: sha256(
      JSON.stringify(
        entries.map(({ path, sha256: hash }) => ({ path, sha256: hash })),
      ),
    ),
    entries,
  }
  const channel = await (await fetch(folio + '/api/v1/channel')).json()
  const pub = await fetch(folio + '/api/v1/publish', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ release, expectedGeneration: channel.generation }),
    signal: AbortSignal.timeout(15000),
  })
  assert.equal(pub.status, 200)
  const started = Date.now()
  for (let i = 0; i < 30; i++) {
    const r = await request('/api/folio/snapshot')
    assert.equal(r.status, 200)
    snapshot = JSON.parse(r.body)
    if (snapshot.id === release.id) break
    await wait(2000)
  }
  assert.equal(
    snapshot.id,
    release.id,
    'new release appears without a blog rebuild',
  )
  const article = await request('/zh-CN/blog/' + slug)
  assert.equal(article.status, 200)
  assert.ok(article.body.includes('Folio runtime smoke proof'))
  const canonical =
    article.body.match(/<link\b[^>]*rel="canonical"[^>]*>/)?.[0] ||
    article.body.match(
      /<link\b[^>]*href="[^"]*"[^>]*rel="canonical"[^>]*>/,
    )?.[0]
  assert.ok(
    canonical?.includes('https://parz1.minerei.dev/zh-CN/blog/' + slug),
    'canonical stays on production origin',
  )
  const ld = [
    ...article.body.matchAll(
      /<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
    ),
  ]
    .map((m) => JSON.parse(m[1]))
    .find((x) => x['@type'] === 'BlogPosting' || x['@type'] === 'Article')
  assert.ok(ld)
  assert.deepEqual(
    ld.author.map((a) => a.name),
    ['koto chan', 'parz1 ZHOU'],
  )
  assert.ok(article.body.includes('hreflang='))
  assert.ok((await request('/zh-CN/blog/posts')).body.includes(slug))
  assert.ok((await request('/sitemap.xml')).body.includes(slug))
  record('new-slug-seo-list-sitemap', {
    slug,
    release: release.id,
    status: article.status,
    elapsedMs: Date.now() - started,
  })
  for (const failure of ['down', 'slow', 'corrupt']) {
    await mode(failure)
    await wait(16000)
    const known = await request('/zh-CN/blog/corepack')
    assert.equal(known.status, 200, 'known content survives ' + failure)
    const unknown = await request('/zh-CN/blog/never-existed-folio-fixture')
    assert.equal(unknown.status, 503, 'stale absence is retryable ' + failure)
    assert.equal(unknown.headers['retry-after'], '15')
    record('fault-' + failure, {
      status: known.status,
      state: known.headers['x-folio-state'],
      unknown: unknown.status,
    })
  }
  await mode('healthy')
  await wait(6000)
  const recovered = await request('/api/folio/snapshot')
  assert.equal(recovered.status, 200)
  record('recovery', {
    status: recovered.status,
    release: JSON.parse(recovered.body).id,
  })
  await writeFile(
    '.local/deployment-readiness/runtime-e2e.json',
    JSON.stringify(report, null, 2),
  )
} finally {
  await mode('healthy')
}
