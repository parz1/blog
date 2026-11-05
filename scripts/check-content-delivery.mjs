import { parseArgs } from 'node:util'
import { validateContentRelease, sha256 } from '../lib/blog-content.mjs'

const { values } = parseArgs({ options: { origin: { type: 'string' } } })
try {
  const origin = new URL(values.origin || '')
  if (
    origin.protocol !== 'https:' ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  )
    throw new Error('Use an HTTPS origin without credentials or a path.')
  const get = async (path) => {
    const response = await fetch(new URL(path, origin), {
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
    })
    if (!response.ok)
      throw new Error(`Delivery request failed (${response.status}).`)
    const chunks = []
    let size = 0
    for await (const chunk of response.body) {
      size += chunk.length
      if (size > 3500000) throw new Error('Delivery response too large.')
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  }
  await get('/api/health')
  const channel = JSON.parse((await get('/api/v1/channel')).toString('utf8'))
  if (
    !/^[a-f0-9]{64}$/.test(channel.id) ||
    !/^[a-f0-9]{64}$/.test(channel.sha256) ||
    !Number.isSafeInteger(channel.generation)
  )
    throw new Error('Invalid channel receipt.')
  const path = `/api/v1/releases/${channel.id}`
  const bytes = await get(path)
  if (sha256(bytes) !== channel.sha256)
    throw new Error('Delivery checksum mismatch.')
  const release = validateContentRelease(JSON.parse(bytes.toString('utf8')))
  if (release.id !== channel.id) throw new Error('Delivery release mismatch.')
  console.log(
    JSON.stringify(
      {
        id: release.id,
        count: release.entries.length,
        generation: channel.generation,
        BLOG_CONTENT_RELEASE_URL: new URL(path, origin).href,
        BLOG_CONTENT_RELEASE_SHA256: channel.sha256,
      },
      null,
      2,
    ),
  )
} catch (error) {
  console.error(
    error.message.startsWith('Delivery') ||
      error.message.startsWith('Invalid channel') ||
      error.message.startsWith('Use an HTTPS')
      ? error.message
      : 'Delivery validation failed; request details suppressed.',
  )
  process.exitCode = 1
}
