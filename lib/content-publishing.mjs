import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import {
  createContentRelease,
  sha256,
  writeGeneratedPublication,
} from './blog-content.mjs'

export const defaultDeliveryOrigin = 'https://folio-kohl-xi.vercel.app'

function deliveryOrigin(value) {
  const url = new URL(value)
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error('Folio URL must be a plain HTTPS origin.')
  return url.origin
}

// No credential or network access in dry-run. Never retry an ambiguous POST.
export async function publishContent({
  root,
  origin = defaultDeliveryOrigin,
  dryRun = false,
  compile,
  loadToken,
  fetchImpl = fetch,
  expectedReleaseId,
  expectedChannel,
  library,
  expectedMediaFingerprint,
}) {
  origin = deliveryOrigin(origin)
  let channel
  if (!dryRun) {
    const response = await fetchImpl(`${origin}/api/v1/channel`, {
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok)
      throw new Error('Cannot read Folio channel; nothing uploaded.')
    channel = await response.json()
    if (!Number.isSafeInteger(channel.generation) || channel.generation < 0)
      throw new Error('Invalid Folio generation; nothing uploaded.')
    if (
      expectedChannel &&
      (channel.id !== expectedChannel.id ||
        channel.generation !== expectedChannel.generation)
    )
      throw new Error(
        'Folio changed after review; prepare and review a new candidate.',
      )
  }
  let release = await createContentRelease(root)
  const sourceRelease = release
  const mediaPlan = library
    ? await library.prepareLibrary({
        root,
        blogRoot: process.cwd(),
        release,
        origin,
        allowDownload: !dryRun,
      })
    : undefined
  if (mediaPlan?.blockers.length)
    throw new Error(
      'Release contains media that cannot be prepared; nothing uploaded.',
    )
  if (
    expectedMediaFingerprint &&
    mediaPlan?.fingerprint !== expectedMediaFingerprint
  )
    throw new Error(
      'Content changed after review; prepare and review a new candidate.',
    )
  release = mediaPlan?.release || release
  if (expectedReleaseId && release.id !== expectedReleaseId)
    throw new Error(
      'Content changed after review; prepare and review a new candidate.',
    )
  const bytes = JSON.stringify(release, null, 2) + '\n'
  if (
    Buffer.byteLength(
      JSON.stringify({ release, expectedGeneration: channel?.generation || 0 }),
    ) > 3_500_000
  )
    throw new Error('Release exceeds the delivery size limit.')
  await compile(release)
  const directory = join(root, '.local/releases')
  await mkdir(directory, { recursive: true })
  const file = join(directory, `${release.id}-${randomUUID()}.json`)
  await writeFile(file, bytes, { flag: 'wx' })
  await writeGeneratedPublication(root, sourceRelease)
  const prepared = {
    id: release.id,
    count: release.entries.length,
    file,
    dryRun,
  }
  if (dryRun) return prepared

  let token = await loadToken(root)
  if (typeof token !== 'string' || token.length < 32)
    throw new Error('Missing publishing credential; nothing uploaded.')
  let response
  try {
    if (mediaPlan?.files.length)
      await library.uploadLibrary({
        files: mediaPlan.files,
        origin,
        token,
        fetchImpl,
      })
  } catch {
    token = undefined
    throw new Error(
      'Release media upload or verification failed; publication was not activated. Check Library and prepare again.',
    )
  }
  try {
    response = await fetchImpl(`${origin}/api/v1/publish`, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ release, expectedGeneration: channel.generation }),
    })
  } catch {
    throw new Error(
      `Publish result uncertain. Check ${origin}/api/v1/channel against release ${release.id}; do not blindly retry.`,
    )
  } finally {
    token = undefined
  }
  if (response.status === 409)
    throw new Error(
      'Folio changed during preparation (409). Review the remote version before publishing again; no retry performed.',
    )
  if (!response.ok)
    throw new Error(
      `Folio rejected publication (HTTP ${response.status}); no retry performed.`,
    )
  let receipt
  try {
    receipt = await response.json()
  } catch {
    throw new Error(
      `Publish receipt unreadable. Check channel against release ${release.id} before retrying.`,
    )
  }
  if (
    receipt.id !== release.id ||
    receipt.sha256 !== sha256(bytes) ||
    receipt.generation !== channel.generation + 1
  )
    throw new Error(
      `Publish receipt mismatch. Check channel against release ${release.id} before retrying.`,
    )
  await writeFile(
    `${file}.receipt.json`,
    JSON.stringify(receipt, null, 2) + '\n',
    { flag: 'wx' },
  )
  return { ...prepared, generation: receipt.generation }
}
