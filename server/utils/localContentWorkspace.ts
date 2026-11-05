import { contentWorkspaceRoot } from '~~/lib/blog-content.mjs'
import { getHeader, createError, setHeader, type H3Event } from 'h3'
import { allowsWorkspacePreview } from '~~/utils/workspaceAccess.mjs'

export function assertWorkspacePreviewAccess(event: H3Event) {
  if (!import.meta.dev)
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  const host = getHeader(event, 'host') ?? ''
  const ip = event.node.req.socket?.remoteAddress
  if (
    !allowsWorkspacePreview({
      dev: import.meta.dev,
      host,
      ip,
      method: event.method,
      origin: getHeader(event, 'origin'),
    })
  )
    throw createError({
      statusCode: 403,
      statusMessage: 'Local same-origin access required',
    })
  setHeader(event, 'cache-control', 'no-store')
  setHeader(event, 'x-robots-tag', 'noindex, nofollow')
}

export function workspacePreviewRoot() {
  return contentWorkspaceRoot()
}

export function workspacePreviewError(error: unknown): never {
  const statusCode =
    error &&
    typeof error === 'object' &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
      ? error.statusCode
      : 400
  // Never expose OS errors, absolute paths or filesystem internals to responses.
  const message =
    error instanceof Error && !('code' in error)
      ? error.message
      : 'Workspace unavailable. Check the configured directory.'
  throw createError({ statusCode, message })
}
