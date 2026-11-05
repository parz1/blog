import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { compileRelease } from '../lib/folio-compiler.mjs'
const cache = '.local/blog-content-build'
const pointer = JSON.parse(await readFile(join(cache, 'current.json'), 'utf8'))
const release = JSON.parse(
  await readFile(join(cache, pointer.id, 'release.json'), 'utf8'),
)
const compiled = await compileRelease(release)
await mkdir('.local/folio-runtime', { recursive: true })
await writeFile('.local/folio-runtime/fallback.json', JSON.stringify(compiled))
console.log(
  JSON.stringify({
    runtimeFallback: compiled.id,
    documents: release.entries.length,
    bytes: Buffer.byteLength(JSON.stringify(compiled)),
  }),
)
