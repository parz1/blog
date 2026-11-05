import type { H3Event } from 'h3'
import type { Collections } from '@nuxt/content'
import { queryCollection } from '@nuxt/content/server'
import { Redis } from '@upstash/redis'
import { waitUntil as vercelWaitUntil } from '@vercel/functions'
import { gzipSync, gunzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { createFolioCache } from '~~/lib/folio-cache.mjs'
import { compileRelease } from '~~/lib/folio-compiler.mjs'
import { sha256 } from '~~/lib/blog-content.mjs'
import { postgresPersistence } from '~~/lib/folio-persistence.mjs'
import { createFolioQuery, type FolioSnapshot } from '../../utils/folioQuery'

type CacheResult = {
  snapshot: FolioSnapshot
  generation: number
  verifiedAt: number
  source: string
  degraded: boolean
  persistence: string
}
let runtime: ReturnType<typeof createRuntime> | undefined
async function createRuntime() {
  const bootstrap =
    await useStorage('assets:folio').getItem<FolioSnapshot>('fallback.json')
  if (!bootstrap?.id) throw new Error('Missing bundled Folio fallback')
  const config = useRuntimeConfig()
  const configured = Boolean(config.folioOrigin)
  let origin = ''
  try {
    const url = new URL(String(config.folioOrigin))
    if (
      url.protocol === 'https:' &&
      url.pathname === '/' &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash
    )
      origin = url.origin
  } catch {
    /* Invalid configuration still serves the bundled content. */
  }
  const key = `folio-runtime:v1:${createHash('sha256')
    .update(origin + bootstrap.contract)
    .digest('hex')}`
  let redis: Redis | undefined
  try {
    if (
      (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
      (process.env.UPSTASH_REDIS_REST_URL &&
        process.env.UPSTASH_REDIS_REST_TOKEN)
    )
      redis = Redis.fromEnv()
  } catch {
    /* Shared cache is optional; it must never gate reading. */
  }
  const postgresUrl =
    process.env.FOLIO_CACHE_DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL
  const postgres =
    !redis && postgresUrl ? postgresPersistence(postgresUrl, key) : undefined
  async function download(path: string, max: number) {
    if (!origin) throw new Error('Folio origin unavailable')
    const response = await fetch(new URL(path, origin), {
      signal: AbortSignal.timeout(4000),
      redirect: 'error',
      cache: 'no-store',
    })
    if (!response.ok) throw new Error('Folio unavailable')
    let size = 0
    const chunks: Uint8Array[] = []
    for await (const chunk of response.body!) {
      size += chunk.length
      if (size > max) throw new Error('Folio response too large')
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  }
  const cache = createFolioCache({
    bootstrap,
    channel: configured
      ? async () =>
          JSON.parse((await download('/api/v1/channel', 8192)).toString('utf8'))
      : undefined,
    release: async (head: { id: string; sha256: string }) => {
      const bytes = await download(`/api/v1/releases/${head.id}`, 3500000)
      if (sha256(bytes) !== head.sha256)
        throw new Error('Folio checksum mismatch')
      return JSON.parse(bytes.toString('utf8'))
    },
    compile: compileRelease,
    onError: (stage: string, error: { code?: string; name?: string }) =>
      console.warn(
        '[folio]',
        stage,
        /^[A-Z0-9_]+$/.test(error?.code || '')
          ? error.code
          : error?.name || 'unavailable',
      ),
    read:
      redis || postgres
        ? async () => {
            const encoded = redis
              ? await redis.hget<string>(key + ':record', 'body')
              : await postgres!.read()
            const record = encoded
              ? JSON.parse(
                  gunzipSync(Buffer.from(encoded, 'base64'), {
                    maxOutputLength: 10000000,
                  }).toString('utf8'),
                )
              : null
            if (
              !record ||
              record.integrity !== sha256(JSON.stringify(record.snapshot))
            )
              return null
            return record
          }
        : undefined,
    write:
      redis || postgres
        ? async (record: CacheResult) => {
            const encoded = gzipSync(
              JSON.stringify({
                ...record,
                integrity: sha256(JSON.stringify(record.snapshot)),
              }),
            ).toString('base64')
            if (redis && encoded.length > 900000) return
            if (postgres) return postgres.write(record.generation, encoded)
            // A slower instance cannot replace a newer generation's last-known-good.
            await redis.eval(
              "local old=redis.call('HGET',KEYS[1],'generation'); if not old or tonumber(ARGV[1])>=tonumber(old) then redis.call('HSET',KEYS[1],'generation',ARGV[1],'body',ARGV[2]); end; return 1",
              [key + ':record'],
              [record.generation, encoded],
            )
            // Readers use the hash body; no mutable pointer to an incomplete blob.
          }
        : undefined,
  })
  return {
    ...cache,
    persistence: redis ? 'redis' : postgres ? 'postgres' : 'memory',
  }
}
export function getFolioSnapshot(event: H3Event): Promise<CacheResult> {
  return (event.context.folioSnapshot ||= (async () => {
    const cache = await (runtime ||= createRuntime())
    const record = await cache.get((task: Promise<unknown>) => {
      if (process.env.VERCEL === '1') vercelWaitUntil(task)
      else event.waitUntil(task)
    })
    return { ...record, persistence: cache.persistence }
  })())
}
export function queryRuntimeCollection<K extends keyof Collections>(
  event: H3Event,
  name: K,
) {
  if (import.meta.dev && !useRuntimeConfig().folioOrigin)
    return queryCollection(event, name)
  return createFolioQuery(
    name,
    async () => (await getFolioSnapshot(event)).snapshot,
  )
}
