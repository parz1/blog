import assert from 'node:assert/strict'

const base = process.argv[2] ?? 'http://localhost:8787'
const paths = [
  '/',
  '/zh-CN',
  '/ja',
  '/blog',
  '/zh-CN/blog',
  '/ja/blog',
  '/zh-CN/blog/markdown-cn',
  '/zh-CN/concepts/agent',
  '/zh-CN/entities/pdf',
  '/zh-CN/projects/leclog',
  '/zh-CN/gallery',
  '/zh-CN/characters/koto',
  '/sitemap.xml',
]
for (const path of paths) {
  const response = await fetch(`${base}${path}`)
  assert.equal(response.status, 200, path)
  assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/, path)
  const text = await response.text()
  assert.ok(
    !text.includes('characters-from-a-character-card'),
    `unpublished draft: ${path}`,
  )
  assert.ok(
    !text.includes('/_vercel/insights/script.js'),
    `Vercel beacon: ${path}`,
  )
  console.log(`OK ${path}`)
}
for (const path of [
  '/api/__local/content-workspace',
  '/zh-CN/__local/content-workspace',
  '/api/__local/gallery-upload/inspect',
  '/zh-CN/blog/characters-from-a-character-card',
]) {
  const response = await fetch(`${base}${path}`)
  assert.equal(response.status, 404, path)
  console.log(`PRIVATE 404 ${path}`)
}
const robots = await fetch(`${base}/robots.txt`).then((r) => r.text())
assert.match(robots, /Disallow: \//)
const views = await fetch(`${base}/api/articles/markdown-cn/views`).then((r) =>
  r.json(),
)
assert.equal(views.enabled, false)
console.log('OK robots and isolated view counter')
