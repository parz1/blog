import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { promisify } from 'node:util'

import {
  createError,
  getHeader,
  setHeader,
  type H3Event,
  type MultiPartData,
} from 'h3'

const execFileAsync = promisify(execFile)
const cwd = process.cwd()
const sessionRoot = resolve(cwd, '.data/gallery-upload')
const importerPath = resolve(cwd, '.local/scripts/gallery-import.mjs')
const supportedExtensions = new Set(['.heic', '.heif', '.mov', '.mp4'])

export type LocalGalleryEdit = {
  title?: string
  caption?: string
  location?: string
}

export type LocalGalleryOptions = {
  uploadOriginals?: boolean
  uploadPublicLive?: boolean
}

type GalleryManifest = {
  items?: Array<Record<string, unknown>>
  [key: string]: unknown
}

export const assertLocalGalleryAccess = (event: H3Event) => {
  if (!import.meta.dev) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const host = getHeader(event, 'host') || ''
  const allowed =
    host.startsWith('localhost:') ||
    host.startsWith('127.0.0.1:') ||
    host.startsWith('[::1]:')

  if (!allowed) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Local gallery uploader only accepts localhost requests.',
    })
  }

  setHeader(event, 'cache-control', 'no-store')
}

export const createGalleryUploadSession = () =>
  `${new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14)}-${randomUUID().slice(0, 8)}`

export const gallerySessionDir = (sessionId: string) => {
  if (!/^[a-z0-9-]+$/i.test(sessionId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid session id.' })
  }

  return resolve(sessionRoot, sessionId)
}

export const parseJsonPart = <Value>(
  parts: MultiPartData[] | undefined,
  name: string,
  fallback: Value,
) => {
  const part = parts?.find((item) => item.name === name)
  if (!part) return fallback

  try {
    return JSON.parse(part.data.toString('utf8')) as Value
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid JSON payload for ${name}.`,
    })
  }
}

export const writeUploadedGalleryFiles = async (
  sessionId: string,
  parts: MultiPartData[] | undefined,
) => {
  const files =
    parts?.filter((part) => part.name === 'files' && part.filename) ?? []

  if (files.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No files uploaded.' })
  }

  const sourceDir = resolve(gallerySessionDir(sessionId), 'source')
  await mkdir(sourceDir, { recursive: true })

  const saved = []
  for (const file of files) {
    const fileName = sanitizeFileName(file.filename || 'upload')
    const extension = extname(fileName).toLowerCase()

    if (!supportedExtensions.has(extension)) {
      continue
    }

    const path = resolve(sourceDir, fileName)
    await writeFile(path, file.data)
    saved.push({
      name: fileName,
      path,
      size: file.data.byteLength,
      type: file.type || contentTypeForExtension(extension),
    })
  }

  if (saved.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Upload at least one HEIC/HEIF file and optional MOV/MP4.',
    })
  }

  return { sourceDir, saved }
}

export const runLocalGalleryImport = async ({
  sessionId,
  sourceDir,
  upload,
  options,
}: {
  sessionId: string
  sourceDir: string
  upload: boolean
  options: LocalGalleryOptions
}) => {
  await assertImporterExists()

  const manifestPath = resolve(
    gallerySessionDir(sessionId),
    upload ? 'gallery-media.uploaded.json' : 'gallery-media.inspect.json',
  )
  const args = [importerPath, '--manifest', manifestPath]

  if (!upload) {
    args.push('--no-upload')
  }

  args.push(sourceDir)

  const galleryEnv = await readGalleryEnvFromDotenv()
  const env = {
    ...process.env,
    ...galleryEnv,
    GALLERY_R2_UPLOAD_ORIGINALS: options.uploadOriginals ? 'true' : 'false',
    GALLERY_R2_UPLOAD_PUBLIC_LIVE: options.uploadPublicLive ? 'true' : 'false',
  }

  try {
    const { stdout, stderr } = await execFileAsync('node', args, {
      cwd,
      env,
      maxBuffer: 1024 * 1024 * 16,
    })
    const manifest = JSON.parse(
      await readFile(manifestPath, 'utf8'),
    ) as GalleryManifest

    return { manifestPath, manifest, stdout, stderr }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw createError({
      statusCode: 500,
      statusMessage: message,
    })
  }
}

export const applyGalleryEdits = (
  manifest: GalleryManifest,
  edits: Record<string, LocalGalleryEdit>,
) => {
  const items = (manifest.items ?? []).map((item) => {
    const key = stemForManifestItem(item)
    const edit = edits[key] || edits[String(item.id || '')] || {}

    return {
      ...item,
      title: cleanText(edit.title) || item.title,
      caption: cleanText(edit.caption),
      location: cleanText(edit.location),
    }
  })

  return {
    ...manifest,
    items,
  }
}

export const writeEditedManifest = async (
  sessionId: string,
  fileName: string,
  manifest: GalleryManifest,
) => {
  const path = resolve(gallerySessionDir(sessionId), fileName)
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`)
  return path
}

export const assertGallerySessionExists = async (sessionId: string) => {
  const sourceDir = resolve(gallerySessionDir(sessionId), 'source')

  try {
    const info = await stat(sourceDir)
    if (info.isDirectory()) return sourceDir
  } catch {
    // Throw below.
  }

  throw createError({
    statusCode: 404,
    statusMessage: 'Gallery upload session not found.',
  })
}

const assertImporterExists = async () => {
  try {
    const info = await stat(importerPath)
    if (info.isFile()) return
  } catch {
    // Throw below.
  }

  throw createError({
    statusCode: 500,
    statusMessage: 'Missing .local/scripts/gallery-import.mjs.',
  })
}

const readGalleryEnvFromDotenv = async () => {
  const env: Record<string, string> = {}

  try {
    const text = await readFile(resolve(cwd, '.env'), 'utf8')
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue

      const match = /^(?:export\s+)?(GALLERY_[A-Za-z0-9_]+)=(.*)$/.exec(line)
      if (!match) continue

      const [, key, rawValue] = match
      env[key] = parseEnvValue(rawValue)
    }
  } catch {
    return env
  }

  return env
}

const parseEnvValue = (value: string) => {
  const trimmed = value.trim()
  const quote = trimmed[0]

  if (
    (quote === '"' || quote === "'") &&
    trimmed.endsWith(quote) &&
    trimmed.length >= 2
  ) {
    return trimmed.slice(1, -1)
  }

  return trimmed.replace(/\s+#.*$/, '')
}

const stemForManifestItem = (item: Record<string, unknown>) => {
  const source = item.source as { heic?: string } | undefined
  const heicName = source?.heic
    ? basename(source.heic, extname(source.heic))
    : ''

  return heicName || String(item.title || item.id || '')
}

const cleanText = (value: unknown) => {
  if (typeof value !== 'string') return undefined

  return value.trim() || undefined
}

const sanitizeFileName = (value: string) =>
  basename(value).replace(/[^A-Za-z0-9._ -]/g, '_')

const contentTypeForExtension = (extension: string) => {
  if (extension === '.heic') return 'image/heic'
  if (extension === '.heif') return 'image/heif'
  if (extension === '.mov') return 'video/quicktime'
  if (extension === '.mp4') return 'video/mp4'

  return 'application/octet-stream'
}
