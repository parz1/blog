import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  copyFile,
  rename,
  lstat,
} from 'node:fs/promises'
import { dirname, resolve, join } from 'node:path'
import { parseDocument } from 'yaml'
import { isValidContentCredits } from '../utils/contentAuthors.ts'

// Commands run from the blog root (pnpm --dir also sets CWD). Avoid import.meta.url:
// Nitro rewrites it in deployed chunks, which is not a portable filesystem root.
export const blogRoot = resolve(process.cwd())
const defaultWorkspaceRoot = () => {
  const renamed = join(blogRoot, '../folio')
  // Compatibility for existing local checkouts; production still requires a release.
  return existsSync(renamed) ? renamed : join(blogRoot, '../blog-content')
}
export const contentWorkspaceRoot = () =>
  resolve(
    process.env.CONTENT_WORKSPACE_DIR || defaultWorkspaceRoot(),
  )
export const sha256 = (value) =>
  createHash('sha256').update(value).digest('hex')
const fail = (message) => {
  throw new Error(message)
}
export const validContentPath = (path) =>
  typeof path === 'string' &&
  /^(?:[\w-]+\/)*[\w.-]+\.md$/.test(path) &&
  !path
    .split('/')
    .some((part) => part === '.' || part === '..' || part.startsWith('.'))
const publicationFile = (root) => join(root, 'publication.json')
export function publicMetadata(markdown) {
  const match = /^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---/.exec(markdown)
  if (!match) fail('Content frontmatter is missing.')
  const doc = parseDocument(match[1], { uniqueKeys: true })
  if (doc.errors.length) fail('Invalid content frontmatter.')
  const data = doc.toJSON()
  if (
    !data ||
    !isValidContentCredits(data.authors) ||
    data.draft === true ||
    ['draft', 'in_review', 'withdrawn'].includes(data.status)
  )
    fail('Drafts, withdrawn content or invalid credits cannot enter a release.')
  return data
}
function validatePublication(value) {
  if (
    value.schemaVersion !== 1 ||
    !Array.isArray(value.entries) ||
    !value.entries.length
  )
    fail('Invalid or empty publication manifest.')
  const paths = new Set()
  for (const entry of value.entries) {
    if (
      !validContentPath(entry.path) ||
      paths.has(entry.path) ||
      !/^[a-f0-9]{64}$/.test(entry.sha256)
    )
      fail('Invalid publication entry.')
    paths.add(entry.path)
  }
  return value
}
export const readPublication = (root) =>
  validatePublication(JSON.parse(readFileSync(publicationFile(root), 'utf8')))
async function atomicJson(path, value) {
  await mkdir(dirname(path), { recursive: true })
  const temporary = `${path}.tmp-${randomUUID()}`
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', {
    flag: 'wx',
  })
  await rename(temporary, path)
}

async function walk(root, path = '') {
  const result = []
  for (const item of await readdir(join(root, path), { withFileTypes: true })) {
    const next = path ? `${path}/${item.name}` : item.name
    if (item.isSymbolicLink())
      fail('Symlinks are not accepted in content imports.')
    if (item.isDirectory()) result.push(...(await walk(root, next)))
    else result.push(next)
  }
  return result.toSorted()
}

// Copy the whole tree, but only the known published Markdown enters the manifest.
export async function importPublishedContent(sourceRoot, workspaceRoot) {
  if (existsSync(publicationFile(workspaceRoot)))
    fail('A publication manifest already exists. Refusing a second import.')
  const files = await walk(sourceRoot)
  const markdown = []
  for (const path of files) {
    const source = join(sourceRoot, path),
      destination = join(workspaceRoot, 'content', path)
    const bytes = await readFile(source)
    if (
      path.endsWith('.md') &&
      !path.split('/').some((part) => part.startsWith('.'))
    ) {
      if (!validContentPath(path)) fail('Unsupported content path.')
      publicMetadata(bytes.toString('utf8'))
      markdown.push({ path, sha256: sha256(bytes) })
    }
    if (
      existsSync(destination) &&
      sha256(await readFile(destination)) !== sha256(bytes)
    )
      fail(`Conflicting destination: ${path}`)
  }
  // Do all validation before copying, never overwrite an existing different file.
  for (const path of files) {
    const destination = join(workspaceRoot, 'content', path)
    await mkdir(dirname(destination), { recursive: true })
    if (!existsSync(destination))
      await copyFile(join(sourceRoot, path), destination, 1)
  }
  const manifest = {
    schemaVersion: 1,
    provenance: 'imported-public-baseline',
    entries: markdown,
  }
  validatePublication(manifest)
  await atomicJson(publicationFile(workspaceRoot), manifest)
  return { files: files.length, published: markdown.length }
}

export async function approveContent(root, path, expectedDigest) {
  if (!validContentPath(path) || !/^[a-f0-9]{64}$/.test(expectedDigest || ''))
    fail('Approve requires a path and its reviewed SHA-256.')
  const manifest = readPublication(root)
  const bytes = await readFile(join(root, 'content', path))
  if (sha256(bytes) !== expectedDigest)
    fail('The reviewed content changed; approval was not applied.')
  publicMetadata(bytes.toString('utf8'))
  const entries = manifest.entries.filter((entry) => entry.path !== path)
  entries.push({ path, sha256: expectedDigest })
  await atomicJson(publicationFile(root), {
    schemaVersion: 1,
    provenance: 'explicit-content-selection',
    entries: entries.toSorted((a, b) => a.path.localeCompare(b.path, 'en')),
  })
}

export async function createContentRelease(root) {
  const manifest = readPublication(root)
  const entries = []
  for (const entry of manifest.entries) {
    const path = join(root, 'content', entry.path)
    if (!(await lstat(path)).isFile())
      fail('Published content must be a regular file.')
    const bytes = await readFile(path)
    if (sha256(bytes) !== entry.sha256)
      fail(`Published content changed without approval: ${entry.path}`)
    const markdown = bytes.toString('utf8')
    publicMetadata(markdown)
    entries.push({ ...entry, markdown })
  }
  entries.sort((a, b) => a.path.localeCompare(b.path, 'en'))
  const id = sha256(
    JSON.stringify(
      entries.map(({ path, sha256: hash }) => ({ path, sha256: hash })),
    ),
  )
  return { schemaVersion: 1, id, entries }
}

export function validateContentRelease(value) {
  validatePublication(value)
  if (!/^[a-f0-9]{64}$/.test(value.id)) fail('Invalid release ID.')
  if (value.entries.length > 10000) fail('Release contains too many files.')
  for (const entry of value.entries) {
    if (
      typeof entry.markdown !== 'string' ||
      sha256(entry.markdown) !== entry.sha256
    )
      fail('Release file checksum mismatch.')
    publicMetadata(entry.markdown)
  }
  const id = sha256(
    JSON.stringify(
      value.entries.map(({ path, sha256: hash }) => ({ path, sha256: hash })),
    ),
  )
  if (id !== value.id) fail('Release manifest checksum mismatch.')
  return value
}

export async function prepareContentRelease({
  root = contentWorkspaceRoot(),
  file = process.env.BLOG_CONTENT_RELEASE_FILE,
  url = process.env.BLOG_CONTENT_RELEASE_URL,
  expected = process.env.BLOG_CONTENT_RELEASE_SHA256,
  cache = join(blogRoot, '.local/blog-content-build'),
} = {}) {
  if (file && url) fail('Choose either a release file or a URL.')
  let bytes
  if (file) bytes = await readFile(resolve(file))
  else if (url) {
    if (!url.startsWith('https://') || !/^[a-f0-9]{64}$/.test(expected || ''))
      fail('Remote releases require HTTPS and an expected SHA-256.')
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000),
        redirect: 'error',
      })
      if (!response.ok) fail('Download failed.')
      const chunks = []
      let size = 0
      for await (const chunk of response.body) {
        size += chunk.length
        if (size > 20_000_000) fail('Release too large.')
        chunks.push(chunk)
      }
      bytes = Buffer.concat(chunks)
    } catch {
      fail(
        'Content release download failed. Check private build access; the URL is not logged.',
      )
    }
  } else
    bytes = Buffer.from(
      JSON.stringify(await createContentRelease(root), null, 2) + '\n',
    )
  if (bytes.length > 20_000_000) fail('Release too large.')
  if (expected && sha256(bytes) !== expected)
    fail('Release download checksum mismatch.')
  const release = validateContentRelease(JSON.parse(bytes.toString('utf8')))
  const target = join(cache, release.id)
  await mkdir(cache, { recursive: true })
  // A fixed release directory is reused only after every file has been checked.
  if (existsSync(target)) {
    for (const entry of release.entries)
      if (
        sha256(await readFile(join(target, 'content', entry.path))) !==
        entry.sha256
      )
        fail('Cached release is damaged.')
  } else {
    const stage = join(cache, `.stage-${randomUUID()}`)
    await mkdir(stage)
    for (const entry of release.entries) {
      const destination = join(stage, 'content', entry.path)
      await mkdir(dirname(destination), { recursive: true })
      await writeFile(destination, entry.markdown, { flag: 'wx' })
    }
    await atomicJson(join(stage, 'release.json'), release)
    await rename(stage, target)
  }
  await atomicJson(join(cache, 'current.json'), {
    schemaVersion: 1,
    id: release.id,
    sha256: sha256(bytes),
  })
  return {
    id: release.id,
    sha256: sha256(bytes),
    count: release.entries.length,
  }
}

export function resolveContentInput(env = process.env) {
  if (env.BLOG_CONTENT_SCHEMA_ONLY === '1' && process.argv.includes('prepare'))
    return {
      mode: 'schema',
      root: join(blogRoot, '.local/content-schema-only'),
      entries: null,
    }
  const mode =
    env.BLOG_CONTENT_MODE ||
    (env.NODE_ENV === 'production' ? 'release' : 'workspace')
  if (mode === 'legacy')
    return { mode, root: join(blogRoot, 'content'), entries: null }
  if (mode === 'workspace') {
    if (env.NODE_ENV === 'production')
      fail(
        'Production cannot read a mutable workspace. Run content:prepare first.',
      )
    const workspace = resolve(
      env.CONTENT_WORKSPACE_DIR || defaultWorkspaceRoot(),
    )
    return {
      mode,
      root: join(workspace, 'content'),
      entries: readPublication(workspace).entries,
    }
  }
  if (mode !== 'release') fail('Unknown BLOG_CONTENT_MODE.')
  const cache = join(blogRoot, '.local/blog-content-build')
  const pointer = JSON.parse(readFileSync(join(cache, 'current.json'), 'utf8'))
  if (!/^[a-f0-9]{64}$/.test(pointer.id))
    fail('Invalid prepared release pointer.')
  const directory = join(cache, pointer.id)
  const release = validateContentRelease(
    JSON.parse(readFileSync(join(directory, 'release.json'), 'utf8')),
  )
  if (release.id !== pointer.id) fail('Prepared release ID mismatch.')
  for (const entry of release.entries)
    if (
      sha256(readFileSync(join(directory, 'content', entry.path))) !==
      entry.sha256
    )
      fail('Prepared release content changed.')
  return { mode, root: join(directory, 'content'), entries: release.entries }
}

export function collectionContentSource(
  pattern,
  input = resolveContentInput(),
) {
  if (input.mode === 'legacy') return pattern
  if (input.mode === 'schema') return { cwd: input.root, include: pattern }
  // Only exact manifest paths: later draft files cannot slip in through a glob.
  const directory = pattern.slice(0, pattern.lastIndexOf('/') + 1)
  const entries = input.entries.filter(
    (entry) =>
      entry.path.startsWith(directory) &&
      !entry.path.slice(directory.length).includes('/') &&
      entry.path.endsWith('.md'),
  )
  if (!entries.length)
    fail(`No selected content for collection pattern ${pattern}`)
  return entries.map((entry) => ({
    cwd: input.root,
    include: entry.path,
    prefix: '/',
  }))
}
