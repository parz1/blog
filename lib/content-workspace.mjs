import { splitBlocks } from '../utils/workspaceText.mjs'
export { splitBlocks, locateAnchor, lineDiff } from '../utils/workspaceText.mjs'
import { createHash, randomUUID } from 'node:crypto'
import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  unlink,
} from 'node:fs/promises'
import { resolve, join, isAbsolute } from 'node:path'
import { parseDocument } from 'yaml'
import { isValidContentCredits } from '../utils/contentAuthors.ts'

const sourceName =
  'content/blog/articles/characters-from-a-character-card.cn.md'
const actorIds = ['parz1', 'koto', 'agent']
const digest = (text) => createHash('sha256').update(text).digest('hex')
const fail = (message, statusCode = 400) => {
  throw Object.assign(new Error(message), { statusCode })
}
const normalize = (text) => text.replaceAll('\r\n', '\n')
const rootPath = (root) => {
  if (!root || !isAbsolute(root))
    fail('An absolute workspace path is required.')
  return resolve(root)
}
const statePath = (root) => join(rootPath(root), '.workspace/state.json')
const workingPath = (root) => join(rootPath(root), sourceName)
const actor = (id, origin = 'human') => {
  if (!actorIds.includes(id) || !['human', 'agent', 'import'].includes(origin))
    fail('Invalid actor.')
  return { identityId: id, origin }
}

export function parseSource(source) {
  if (typeof source !== 'string' || Buffer.byteLength(source) > 2_000_000)
    fail('Markdown must be at most 2 MB.')
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source)
  if (!match) fail('Markdown frontmatter is required.')
  const document = parseDocument(match[1], { uniqueKeys: true })
  if (document.errors.length) fail('Invalid YAML frontmatter.')
  const metadata = document.toJSON()
  if (
    !metadata ||
    typeof metadata !== 'object' ||
    !isValidContentCredits(metadata.authors) ||
    !metadata.title ||
    !metadata.slug ||
    !['cn', 'en', 'ja'].includes(metadata.lang)
  )
    fail('Title, slug, language and valid ordered authors are required.')
  if (
    metadata.draft !== true ||
    metadata.status !== 'draft' ||
    metadata.published
  )
    fail('The pilot only accepts unpublished drafts.')
  return { metadata, body: normalize(source.slice(match[0].length)) }
}

function revision(source, previous, recordedBy, summary) {
  const parsed = parseSource(source)
  const oldBlocks = previous?.blocks ?? []
  const blocks = splitBlocks(parsed.body).map((block) => {
    const old = oldBlocks.filter((entry) => entry.markdown === block.markdown)
    const duplicates = splitBlocks(parsed.body).filter(
      (entry) => entry.markdown === block.markdown,
    )
    return {
      ...block,
      id:
        old.length === 1 && duplicates.length === 1 ? old[0].id : randomUUID(),
    }
  })
  return {
    id: randomUUID(),
    parentRevisionId: previous?.id ?? null,
    createdAt: new Date().toISOString(),
    actor: recordedBy,
    summary,
    source,
    sourceDigest: digest(source),
    ...parsed,
    blocks,
  }
}

async function atomicWrite(path, text) {
  const temporary = `${path}.tmp-${randomUUID()}`
  const file = await open(temporary, 'wx')
  try {
    await file.writeFile(text, 'utf8')
    await file.sync()
  } finally {
    await file.close()
  }
  await rename(temporary, path)
}

async function readState(root) {
  const state = JSON.parse(await readFile(statePath(root), 'utf8'))
  if (state.schemaVersion !== 1 || state.format !== 'koto-workspace-pilot')
    fail('Unsupported workspace format.', 422)
  return state
}

async function withLock(root, action) {
  const path = join(rootPath(root), '.workspace/write.lock')
  let file
  try {
    file = await open(path, 'wx')
  } catch (error) {
    if (error.code !== 'EEXIST') throw error
    // Recover a lock left by an exited process. Never steal a live writer's lock.
    let stale
    try {
      stale = JSON.parse(await readFile(path, 'utf8'))
    } catch {
      fail('Workspace is busy or its lock needs inspection.', 409)
    }
    try {
      process.kill(stale.pid, 0)
      fail('Workspace is busy.', 409)
    } catch (probe) {
      if (probe.code !== 'ESRCH') throw probe
      await unlink(path)
      try {
        file = await open(path, 'wx')
      } catch {
        fail('Workspace is busy.', 409)
      }
    }
  }
  try {
    await file.writeFile(JSON.stringify({ pid: process.pid }))
    const state = await readState(root)
    const result = await action(state)
    await atomicWrite(statePath(root), JSON.stringify(state, null, 2) + '\n')
    return result
  } finally {
    await file.close()
    await unlink(path)
  }
}

export async function initializeWorkspace(root, source) {
  root = rootPath(root)
  parseSource(source)
  try {
    if ((await readdir(root)).length)
      fail('Workspace initialization requires an empty directory.', 409)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  // Reserve initialization so two callers cannot both populate an empty root.
  await mkdir(root, { recursive: true })
  const reservation = await open(join(root, 'workspace.json'), 'wx')
  const initial = revision(
    source,
    null,
    actor('agent', 'import'),
    '导入 Koto 原始草稿（未发布）',
  )
  const state = {
    schemaVersion: 1,
    format: 'koto-workspace-pilot',
    id: randomUUID(),
    variantId: randomUUID(),
    sourcePath: sourceName,
    headRevisionId: initial.id,
    revisions: [initial],
    threads: [],
  }
  try {
    await reservation.writeFile(
      JSON.stringify(
        { schemaVersion: 1, id: state.id, format: state.format },
        null,
        2,
      ),
    )
    await mkdir(join(root, '.workspace'), { recursive: true })
    await mkdir(join(root, 'content/blog/articles'), { recursive: true })
    await atomicWrite(workingPath(root), source)
    await atomicWrite(statePath(root), JSON.stringify(state, null, 2) + '\n')
  } finally {
    await reservation.close()
  }
  return state
}

export async function inspectWorkspace(root) {
  const state = await readState(root)
  const workingSource = await readFile(workingPath(root), 'utf8')
  const head = state.revisions.find((item) => item.id === state.headRevisionId)
  return {
    ...state,
    workingSource,
    workingDigest: digest(workingSource),
    dirty: digest(workingSource) !== head.sourceDigest,
  }
}

function checkBase(state, expectedHead) {
  if (state.headRevisionId !== expectedHead)
    fail('The revision changed. Refresh before saving.', 409)
}

export async function checkpoint(root, input) {
  return withLock(root, async (state) => {
    checkBase(state, input.expectedHead)
    const working = await readFile(workingPath(root), 'utf8')
    if (digest(working) !== input.expectedWorkingDigest)
      fail('The file was edited externally. Refresh before saving.', 409)
    const source = input.source ?? working
    parseSource(source)
    if (
      typeof input.summary !== 'string' ||
      !input.summary.trim() ||
      input.summary.length > 500
    )
      fail('A change summary of 1–500 characters is required.')
    const previous = state.revisions.at(-1)
    if (digest(source) === previous.sourceDigest)
      fail('There are no content changes.')
    const next = revision(
      source,
      previous,
      actor(input.actorId, input.origin),
      input.summary.trim(),
    )
    if (next.metadata.lang !== previous.metadata.lang)
      fail('Changing the pilot language requires a separate variant.')
    // Keep a working copy after interruption; state remains a complete old or new snapshot.
    await atomicWrite(workingPath(root), source)
    state.revisions.push(next)
    state.headRevisionId = next.id
    return next
  })
}

export async function addComment(root, input) {
  return withLock(root, async (state) => {
    checkBase(state, input.expectedHead)
    const base = state.revisions.find((entry) => entry.id === input.revisionId)
    const block = base?.blocks.find((entry) => entry.id === input.blockId)
    if (!block || typeof input.quote !== 'string' || !input.quote.trim())
      fail('Select text in a recorded revision.')
    const index = block.markdown.indexOf(input.quote)
    if (index === -1 || block.markdown.indexOf(input.quote, index + 1) !== -1)
      fail('The quote must occur exactly once in the selected block.')
    const message = createMessage(input)
    const thread = {
      id: randomUUID(),
      variantId: state.variantId,
      baseRevisionId: base.id,
      anchor: {
        blockId: block.id,
        exact: input.quote,
        prefix: block.markdown.slice(Math.max(0, index - 32), index),
        suffix: block.markdown.slice(
          index + input.quote.length,
          index + input.quote.length + 32,
        ),
        startCodePoint: Array.from(block.markdown.slice(0, index)).length,
        endCodePoint: Array.from(
          block.markdown.slice(0, index + input.quote.length),
        ).length,
      },
      visibility: 'private',
      resolution: 'open',
      resolvedInRevisionId: null,
      messages: [message],
    }
    state.threads.push(thread)
    return thread
  })
}

function createMessage(input) {
  if (
    typeof input.body !== 'string' ||
    !input.body.trim() ||
    input.body.length > 8000
  )
    fail('Comment text must contain 1–8000 characters.')
  return {
    id: randomUUID(),
    body: input.body.trim(),
    actor: actor(input.actorId, input.origin),
    createdAt: new Date().toISOString(),
  }
}

export async function updateThread(root, input) {
  return withLock(root, async (state) => {
    checkBase(state, input.expectedHead)
    const thread = state.threads.find((entry) => entry.id === input.threadId)
    if (!thread) fail('Thread not found.', 404)
    if (input.action === 'reply') thread.messages.push(createMessage(input))
    else if (input.action === 'resolve' || input.action === 'reopen') {
      thread.resolution = input.action === 'resolve' ? 'resolved' : 'open'
      thread.resolvedInRevisionId =
        input.action === 'resolve' ? state.headRevisionId : null
      thread.events ??= []
      thread.events.push({
        action: input.action,
        actor: actor(input.actorId, input.origin),
        createdAt: new Date().toISOString(),
        revisionId: state.headRevisionId,
      })
    } else fail('Unknown thread action.')
    return thread
  })
}
