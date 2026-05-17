import { defineEventHandler, readBody } from 'h3'

import {
  applyGalleryEdits,
  assertGallerySessionExists,
  assertLocalGalleryAccess,
  runLocalGalleryImport,
  writeEditedManifest,
  type LocalGalleryEdit,
  type LocalGalleryOptions,
} from '../../../utils/localGalleryUpload'

type UploadBody = {
  sessionId?: string
  edits?: Record<string, LocalGalleryEdit>
  options?: LocalGalleryOptions
}

export default defineEventHandler(async (event) => {
  assertLocalGalleryAccess(event)

  const body = await readBody<UploadBody>(event)
  const sessionId = body.sessionId || ''
  const sourceDir = await assertGallerySessionExists(sessionId)
  const result = await runLocalGalleryImport({
    sessionId,
    sourceDir,
    upload: true,
    options: body.options || {},
  })
  const manifest = applyGalleryEdits(result.manifest, body.edits || {})
  const editedManifestPath = await writeEditedManifest(
    sessionId,
    'gallery-media.uploaded.edited.json',
    manifest,
  )

  return {
    sessionId,
    manifest,
    manifestPath: editedManifestPath,
    stdout: result.stdout,
    stderr: result.stderr,
  }
})
