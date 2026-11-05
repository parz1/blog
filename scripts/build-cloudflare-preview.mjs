import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { resolveContentInput } from '../lib/blog-content.mjs'

const { vars } = JSON.parse(readFileSync('wrangler.preview.json', 'utf8'))
const input = resolveContentInput({
  ...process.env,
  BLOG_CONTENT_MODE: 'release',
})
const routes = new Set()
const prefixes = ['', '/zh-CN', '/ja']
const bases = {
  'blog/articles': '/blog',
  'blog/columns': '/blog/columns',
  concepts: '/concepts',
  entities: '/entities',
  projects: '/projects',
}
for (const prefix of prefixes) {
  for (const path of [
    '',
    '/blog',
    '/blog/columns',
    '/blog/posts',
    '/blog/logs',
    '/blog/crap',
    '/concepts',
    '/entities',
    '/projects',
    '/gallery',
    '/about',
    '/about-this-site',
    '/characters/koto',
  ]) {
    routes.add(`${prefix}${path}` || '/')
  }
}
for (const entry of input.entries) {
  const markdown = readFileSync(join(input.root, entry.path), 'utf8')
  const frontmatter = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!frontmatter) throw new Error(`Missing frontmatter: ${entry.path}`)
  const metadata = parse(frontmatter[1])
  const directory = entry.path.slice(0, entry.path.lastIndexOf('/'))
  const base = bases[directory]
  if (base && metadata.slug) {
    for (const prefix of prefixes)
      routes.add(`${prefix}${base}/${encodeURIComponent(metadata.slug)}`)
  }
}

// Build locally from the approved release; do not run a Cloudflare remote build.
const result = spawnSync(
  process.execPath,
  ['node_modules/nuxt/bin/nuxt.mjs', 'build'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...vars,
      BLOG_PREVIEW_PRERENDER_ROUTES: JSON.stringify([...routes]),
      // Never bake local GitHub credentials into a public test deployment.
      NUXT_GITHUB_TOKEN: '',
      GITHUB_TOKEN: '',
      BLOG_DEPLOY_TARGET: 'cloudflare-preview',
      NUXT_PUBLIC_ANALYTICS_PROVIDER: 'cloudflare',
    },
  },
)
process.exitCode = result.status ?? 1
