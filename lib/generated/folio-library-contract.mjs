// This contract is also vendored into the blog by scripts/sync-library-contract.mjs.
import { createHash } from 'node:crypto'
const digest = (value) => createHash('sha256').update(value).digest('hex')
const fail = () => {
  throw new Error('Invalid Library release contract.')
}
export const libraryContract = 'folio-library-1'
export function libraryManifest(value) {
  const entries = value.entries.map(({ path, sha256 }) => ({ path, sha256 }))
  return {
    schemaVersion: 2,
    libraryContract,
    entries,
    media: value.media,
    bindings: value.bindings,
  }
}
export const libraryReleaseId = (value) =>
  digest(JSON.stringify(libraryManifest(value)))
export function validateLibrary(value) {
  if (
    value.schemaVersion !== 2 ||
    value.libraryContract !== libraryContract ||
    !Array.isArray(value.media) ||
    !Array.isArray(value.bindings) ||
    value.media.length > 1000 ||
    value.bindings.length > 10000
  )
    fail()
  const blobs = new Map(),
    paths = new Set(value.entries.map((e) => e.path)),
    slots = new Set()
  let total = 0
  for (const item of value.media) {
    if (
      !item ||
      Object.keys(item).some(
        (key) => !['blobId', 'mediaType', 'byteLength'].includes(key),
      ) ||
      !/^[a-f0-9]{64}$/.test(item.blobId) ||
      blobs.has(item.blobId) ||
      !['image/jpeg', 'image/png', 'image/webp', 'video/mp4'].includes(
        item.mediaType,
      ) ||
      !Number.isSafeInteger(item.byteLength) ||
      item.byteLength < 1 ||
      item.byteLength > 25 * 1024 * 1024
    )
      fail()
    total += item.byteLength
    blobs.set(item.blobId, item)
  }
  if (total > 100 * 1024 * 1024) fail()
  for (const binding of value.bindings) {
    if (
      !binding ||
      Object.keys(binding).some(
        (key) =>
          !['documentPath', 'slot', 'assetId', 'role', 'blobId'].includes(key),
      ) ||
      !paths.has(binding.documentPath) ||
      !blobs.has(binding.blobId) ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
        binding.assetId,
      ) ||
      !['image', 'poster', 'motion', 'video'].includes(binding.role) ||
      typeof binding.slot !== 'string' ||
      !/^[\w.:-]{1,150}$/.test(binding.slot)
    )
      fail()
    const slot = `${binding.documentPath}:${binding.slot}`
    if (slots.has(slot)) fail()
    slots.add(slot)
  }
  if (new Set(value.bindings.map((b) => b.blobId)).size !== blobs.size) fail()
  if (
    value.media.some((item, i) => i && value.media[i - 1].blobId >= item.blobId)
  )
    fail()
  const order = (b) => `${b.documentPath}\0${b.slot}`
  if (
    value.bindings.some(
      (item, i) => i && order(value.bindings[i - 1]) >= order(item),
    )
  )
    fail()
  if (value.id !== libraryReleaseId(value)) fail()
  return value
}
