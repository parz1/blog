import { spawn } from 'node:child_process'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'

const base = 'https://parz1-blog-preview.parz1zhou.workers.dev'
const label = process.argv[2] ?? 'baseline'
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid report label')
const report = {
  label,
  startedAt: new Date().toISOString(),
  requests: [],
  invocations: [],
}
const tail = spawn(
  process.execPath,
  [
    'node_modules/wrangler/bin/wrangler.js',
    'tail',
    '--config',
    'wrangler.preview.json',
    '--format',
    'json',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
)
// Retain only timing, path and outcome; never persist request headers or geolocation.
let buffer = ''
tail.stdout.on('data', (chunk) => {
  buffer += chunk.toString()
  while (true) {
    const start = buffer.indexOf('{')
    if (start < 0) {
      buffer = ''
      break
    }
    buffer = buffer.slice(start)
    let depth = 0,
      quoted = false,
      escaped = false,
      end = -1
    for (let i = 0; i < buffer.length; i++) {
      const char = buffer[i]
      if (quoted) {
        if (escaped) escaped = false
        else if (char === '\\') escaped = true
        else if (char === '"') quoted = false
      } else if (char === '"') quoted = true
      else if (char === '{') depth++
      else if (char === '}' && --depth === 0) {
        end = i
        break
      }
    }
    if (end < 0) break
    try {
      const item = JSON.parse(buffer.slice(0, end + 1))
      const request = item.event?.request
      report.invocations.push({
        time: item.eventTimestamp,
        path: request?.url ? new URL(request.url).pathname : undefined,
        method: request?.method,
        cpuMs: item.cpuTime,
        wallMs: item.wallTime,
        outcome: item.outcome,
        status: item.event?.response?.status,
        exceptions: item.exceptions?.map((error) => ({
          name: error.name,
          message: error.message?.slice(0, 300),
        })),
      })
    } catch {
      /* Wrangler status messages are not invocation JSON. */
    }
    buffer = buffer.slice(end + 1)
  }
})
let tailError = ''
tail.stderr.on('data', (chunk) => {
  tailError += chunk.toString()
})
tail.on('error', (error) => {
  tailError = error.message
})

const cases = []
const add = (path, expected = 200, init = {}, validate) =>
  cases.push({ path, expected, init, validate })
const demos = (await readdir('pages/demo'))
  .filter((file) => file.endsWith('.vue'))
  .map((file) =>
    file === 'index.vue' ? '/demo' : `/demo/${file.slice(0, -4)}`,
  )
for (const prefix of ['', '/zh-CN', '/ja']) {
  for (const path of demos) add(`${prefix}${path}`)
  add(`${prefix}/tech`)
  add(`${prefix}/concepts/agent/local-graph`)
  add(`${prefix}/authors`, 301)
  add(`${prefix}/authors/koto`, 301)
}
for (const collection of [
  'articles',
  'columns',
  'concepts',
  'entities',
  'projects',
  'gallery',
  'pages',
]) {
  add(
    `/__nuxt_content/${collection}/query`,
    200,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sql: `SELECT "title" FROM _content_${collection} ORDER BY id ASC LIMIT 3`,
      }),
    },
    (text) => Array.isArray(JSON.parse(text)) && JSON.parse(text).length > 0,
  )
}
add(
  '/api/articles/markdown-cn/views',
  200,
  {},
  (text) => JSON.parse(text).enabled === false,
)
add(
  '/api/articles/markdown-cn/views',
  200,
  {
    method: 'POST',
    headers: { origin: base, 'sec-fetch-site': 'same-origin' },
  },
  (text) => JSON.parse(text).counted === false,
)
add('/api/articles/markdown-cn/views', 403, {
  method: 'POST',
  headers: { origin: 'https://example.com', 'sec-fetch-site': 'cross-site' },
})
add('/api/articles/does-not-exist/views', 404)
// This is intentionally unavailable: the preview has no GitHub credential.
add('/api/github/repo?owner=minerei-devs&repo=leclog', 500)
add('/api/__local/content-workspace', 404)
add('/api/__local/gallery-upload/upload', 404, { method: 'POST' })
add('/zh-CN/blog/does-not-exist', 404)
add('/zh-CN/characters/does-not-exist', 404)

const priority = (test) =>
  test.path.includes('/query') ? 0 : test.path.includes('/api/') ? 1 : 2

try {
  if (label.startsWith('cold')) {
    cases.sort((a, b) => priority(a) - priority(b))
  }
  await delay(label.startsWith('cold') ? 20000 : 4500)
  // Three bounded passes, serial first pass, concurrency three on later passes.
  for (let pass = 1; pass <= 3; pass++) {
    let index = 0
    async function worker() {
      while (index < cases.length) {
        const test = cases[index++]
        const started = performance.now()
        let row
        try {
          const response = await fetch(`${base}${test.path}`, {
            ...test.init,
            redirect: 'manual',
            signal: AbortSignal.timeout(20000),
          })
          const text = await response.text()
          row = {
            pass,
            path: test.path,
            method: test.init.method ?? 'GET',
            expected: test.expected,
            status: response.status,
            ms: Math.round(performance.now() - started),
            bytes: Buffer.byteLength(text),
            location: response.headers.get('location') ?? undefined,
            errorBody:
              response.status >= 500 && text.length < 1000 ? text : undefined,
            resourceLimit:
              /Worker exceeded resource limits|error code: 1102/i.test(text),
            valid:
              response.status === test.expected &&
              (!test.validate || test.validate(text)),
          }
        } catch (error) {
          row = { pass, path: test.path, valid: false, error: error.name }
        }
        report.requests.push(row)
        if (!row.valid) console.log(JSON.stringify(row))
      }
    }
    await Promise.all(Array.from({ length: pass === 1 ? 1 : 3 }, worker))
    console.log(
      `Pass ${pass}: ${report.requests.filter((row) => row.pass === pass && row.valid).length}/${cases.length} match expected status and payload`,
    )
  }
  await delay(6000)
} finally {
  tail.kill()
  report.finishedAt = new Date().toISOString()
  if (!report.invocations.length)
    report.telemetryWarning =
      'No invocation events received; CPU evidence unavailable'
  if (tailError && !report.invocations.length)
    report.telemetryWarning =
      'Tail did not provide invocation evidence; inspect local authentication/connectivity'
  await mkdir('.local', { recursive: true })
  await writeFile(
    `.local/cloudflare-dynamic-${label}.json`,
    JSON.stringify(report, null, 2),
  )
  console.log(
    JSON.stringify({
      requests: report.requests.length,
      unexpected: report.requests.filter((row) => !row.valid).length,
      invocations: report.invocations.length,
      exceededCpu: report.invocations.filter(
        (row) => row.outcome === 'exceededCpu',
      ).length,
    }),
  )
  process.exitCode = report.requests.some((row) => !row.valid) ? 1 : 0
}
