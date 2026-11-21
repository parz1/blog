import { createReadStream } from 'node:fs'
import { contentWorkspaceRoot } from '~~/lib/blog-content.mjs'
import { localOkfAsset, localAssetRange } from '~~/lib/local-okf-assets.mjs'
export default defineEventHandler(async (event) => {
  if (!import.meta.dev) throw createError({ statusCode: 404 })
  let asset
  try {
    asset = await localOkfAsset(
      contentWorkspaceRoot(),
      getRouterParam(event, 'path'),
    )
  } catch {
    throw createError({ statusCode: 404 })
  }
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Content-Type', asset.type)
  setHeader(event, 'Accept-Ranges', 'bytes')
  let range
  try {
    range = localAssetRange(getHeader(event, 'range'), asset.size)
  } catch {
    setHeader(event, 'Content-Range', `bytes */${asset.size}`)
    throw createError({ statusCode: 416 })
  }
  setHeader(event, 'Content-Length', range.end - range.start + 1)
  if (range.partial) {
    setResponseStatus(event, 206)
    setHeader(
      event,
      'Content-Range',
      `bytes ${range.start}-${range.end}/${asset.size}`,
    )
  }
  return sendStream(
    event,
    createReadStream(asset.file, { start: range.start, end: range.end }),
  )
})
