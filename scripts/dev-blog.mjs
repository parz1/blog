import { spawn } from 'node:child_process'

// Daily writing always previews local files, even with production env configured.
const child = spawn(
  process.execPath,
  ['node_modules/nuxt/bin/nuxt.mjs', 'dev', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      BLOG_CONTENT_MODE: 'workspace',
      NUXT_FOLIO_ORIGIN: '',
      NUXT_PUBLIC_FOLIO_RUNTIME: 'false',
    },
  },
)
child.on('error', () => {
  process.exitCode = 1
})
child.on('exit', (code) => {
  process.exitCode = code ?? 1
})
