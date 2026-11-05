import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const config = JSON.parse(readFileSync('wrangler.preview.json', 'utf8'))
const build = JSON.parse(readFileSync('.output/nitro.json', 'utf8'))
assert.equal(
  build.preset,
  'cloudflare-module',
  'Run build:cloudflare-preview first',
)
assert.equal(config.name, 'parz1-blog-preview')
assert.ok(!config.routes?.length, 'Preview must not bind custom routes')
assert.equal(config.vars.ARTICLE_VIEWS_ENABLED, 'false')
assert.equal(config.d1_databases[0].database_name, 'blog-preview-content')
assert.match(readFileSync('.output/public/_headers', 'utf8'), /noindex/)
assert.ok(
  readFileSync('.output/public/zh-CN/blog/index.html', 'utf8').includes(
    config.vars.NUXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN,
  ),
  'Preview must contain static blog pages and its public analytics token',
)
const result = spawnSync(
  process.execPath,
  [
    'node_modules/wrangler/bin/wrangler.js',
    'deploy',
    '--config',
    'wrangler.preview.json',
  ],
  { stdio: 'inherit' },
)
process.exitCode = result.status ?? 1
