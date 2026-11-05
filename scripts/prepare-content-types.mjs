import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

// Install-time type preparation must work before a private content package exists.
// The flag is scoped to this prepare child and is ignored by build/dev commands.
const require = createRequire(import.meta.url)
const cli = join(dirname(require.resolve('nuxt/package.json')), 'bin/nuxt.mjs')
const result = spawnSync(process.execPath, [cli, 'prepare'], {
  stdio: 'inherit',
  env: { ...process.env, BLOG_CONTENT_SCHEMA_ONLY: '1' },
})
process.exitCode = result.status ?? 1
