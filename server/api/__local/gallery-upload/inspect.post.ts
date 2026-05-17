import { defineEventHandler, readMultipartFormData } from 'h3'

import {
  applyGalleryEdits,
  assertLocalGalleryAccess,
  createGalleryUploadSession,
  parseJsonPart,
  runLocalGalleryImport,
  writeEditedManifest,
  writeUploadedGalleryFiles,
  type LocalGalleryEdit,
  type LocalGalleryOptions,
} from '../../../utils/localGalleryUpload'

export default defineEventHandler(async (event) => {
  assertLocalGalleryAccess(event)

  const parts = await readMultipartFormData(event)
  const sessionId = createGalleryUploadSession()
  const edits = parseJsonPart<Record<string, LocalGalleryEdit>>(
    parts,
    'edits',
    {},
  )
  const options = parseJsonPart<LocalGalleryOptions>(parts, 'options', {})
  const { sourceDir, saved } = await writeUploadedGalleryFiles(sessionId, parts)
  const result = await runLocalGalleryImport({
    sessionId,
    sourceDir,
    upload: false,
    options,
  })
  const manifest = applyGalleryEdits(result.manifest, edits)
  const editedManifestPath = await writeEditedManifest(
    sessionId,
    'gallery-media.inspect.edited.json',
    manifest,
  )

  return {
    sessionId,
    files: saved,
    manifest,
    manifestPath: editedManifestPath,
    stdout: result.stdout,
    stderr: result.stderr,
  }
})
