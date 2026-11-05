import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  initializeWorkspace,
  inspectWorkspace,
  checkpoint,
  addComment,
  updateThread,
  lineDiff,
  locateAnchor,
  parseSource,
} from '../lib/content-workspace.mjs'
import { allowsWorkspacePreview } from '../utils/workspaceAccess.mjs'

const source = `---
title: Test draft
slug: test-draft
lang: cn
status: draft
draft: true
authors:
  - id: koto
    roles: [writing]
  - id: parz1
    roles: [idea]
---

## Intro

保留这句话。😀

第二段还没有写完。
`
async function workspace(t) {
  const root = await mkdtemp(join(tmpdir(), 'koto-workspace-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  await initializeWorkspace(root, source)
  return root
}
const save = async (root, next, summary = '实际修改') => {
  const state = await inspectWorkspace(root)
  return checkpoint(root, {
    expectedHead: state.headRevisionId,
    expectedWorkingDigest: state.workingDigest,
    source: next,
    summary,
    actorId: 'koto',
    origin: 'agent',
  })
}
const commentInput = (state) => ({
  expectedHead: state.headRevisionId,
  revisionId: state.headRevisionId,
  blockId: state.revisions.at(-1).blocks[1].id,
  quote: '这句话',
  body: '请保留这个判断。',
  actorId: 'parz1',
  origin: 'human',
})

test('external initialization preserves exact bytes, ordered coauthors and refuses overwrite', async (t) => {
  const root = await workspace(t)
  const state = await inspectWorkspace(root)
  assert.equal(state.workingSource, source)
  assert.equal(state.revisions[0].source, source)
  assert.deepEqual(
    state.revisions[0].metadata.authors.map((credit) => credit.id),
    ['koto', 'parz1'],
  )
  assert.equal(state.dirty, false)
  await assert.rejects(initializeWorkspace(root, 'bad markdown'))
  await assert.rejects(initializeWorkspace(root, source), /empty directory/)
  assert.equal((await inspectWorkspace(root)).revisions.length, 1)
})

test('revisions survive reopening and reconstruct both sides of a diff', async (t) => {
  const root = await workspace(t)
  const next = source.replace('第二段还没有写完。', '第二段现在补完了。')
  await save(root, next)
  const state = await inspectWorkspace(root)
  assert.equal(state.revisions.length, 2)
  assert.equal(state.revisions[1].parentRevisionId, state.revisions[0].id)
  const diff = lineDiff(state.revisions[0].body, state.revisions[1].body)
  assert.equal(
    diff
      .filter((line) => line.kind !== 'add')
      .map((line) => line.text)
      .join('\n'),
    state.revisions[0].body,
  )
  assert.equal(
    diff
      .filter((line) => line.kind !== 'remove')
      .map((line) => line.text)
      .join('\n'),
    state.revisions[1].body,
  )
})

test('stale revision and external edits are rejected without losing working text', async (t) => {
  const root = await workspace(t)
  const old = await inspectWorkspace(root)
  await save(root, source.replace('第二段', '第三段'))
  await assert.rejects(checkpoint(root, { expectedHead: old.headRevisionId }), {
    statusCode: 409,
  })
  const current = await inspectWorkspace(root)
  const path = join(
    root,
    'content/blog/articles/characters-from-a-character-card.cn.md',
  )
  await writeFile(path, source + '\n外部编辑。\n')
  assert.equal((await inspectWorkspace(root)).dirty, true)
  await assert.rejects(
    checkpoint(root, {
      expectedHead: current.headRevisionId,
      expectedWorkingDigest: current.workingDigest,
      source,
      summary: '覆盖',
      actorId: 'parz1',
    }),
    { statusCode: 409 },
  )
  assert.ok((await readFile(path, 'utf8')).includes('外部编辑'))
})

test('concurrent changes from the same revision have exactly one winner', async (t) => {
  const root = await workspace(t)
  const state = await inspectWorkspace(root)
  const base = {
    expectedHead: state.headRevisionId,
    expectedWorkingDigest: state.workingDigest,
    summary: '并发',
    actorId: 'parz1',
  }
  const results = await Promise.allSettled([
    checkpoint(root, { ...base, source: source + '\nA\n' }),
    checkpoint(root, { ...base, source: source + '\nB\n' }),
  ])
  assert.equal(
    results.filter((entry) => entry.status === 'fulfilled').length,
    1,
  )
  assert.equal((await inspectWorkspace(root)).revisions.length, 2)
})

test('comments follow unchanged paragraphs and preserve their original revision after deletion', async (t) => {
  const root = await workspace(t)
  const state = await inspectWorkspace(root)
  const thread = await addComment(root, commentInput(state))
  await save(root, source.replace('## Intro', '新增一段。\n\n## Intro'))
  let current = await inspectWorkspace(root)
  assert.equal(
    locateAnchor(current.revisions.at(-1), thread.anchor).status,
    'anchored',
  )
  await save(root, source.replace('保留这句话。😀', '原文删除了。'))
  current = await inspectWorkspace(root)
  assert.equal(
    locateAnchor(current.revisions.at(-1), thread.anchor).status,
    'outdated',
  )
  assert.equal(
    locateAnchor(current.revisions[0], thread.anchor).status,
    'anchored',
  )
  assert.equal(current.threads[0].anchor.exact, '这句话')
})

test('ambiguous matches never silently move a discussion', async (t) => {
  const root = await workspace(t)
  const state = await inspectWorkspace(root)
  const thread = await addComment(root, commentInput(state))
  await save(root, source.replace('第二段还没有写完。', '保留这句话。😀'))
  assert.equal(
    locateAnchor((await inspectWorkspace(root)).revisions.at(-1), thread.anchor)
      .status,
    'ambiguous',
  )
})

test('replies, resolution and reopening persist and never become public automatically', async (t) => {
  const root = await workspace(t)
  const state = await inspectWorkspace(root)
  const thread = await addComment(root, commentInput(state))
  const input = {
    expectedHead: state.headRevisionId,
    threadId: thread.id,
    actorId: 'koto',
    origin: 'agent',
  }
  await updateThread(root, { ...input, action: 'reply', body: '会保留。' })
  await updateThread(root, { ...input, action: 'resolve' })
  let current = await inspectWorkspace(root)
  assert.equal(current.threads[0].messages.length, 2)
  assert.equal(current.threads[0].resolvedInRevisionId, state.headRevisionId)
  assert.equal(current.threads[0].visibility, 'private')
  await updateThread(root, { ...input, action: 'reopen' })
  current = await inspectWorkspace(root)
  assert.equal(current.threads[0].resolution, 'open')
  assert.equal(current.threads[0].events.length, 2)
})

test('invalid source, language switches and invalid anchors cannot create revisions or comments', async (t) => {
  const root = await workspace(t)
  for (const value of [
    source.replace('draft: true', 'draft: false'),
    source + 'x'.repeat(2_000_001),
    source.replace('lang: cn', 'lang: xx'),
  ])
    assert.throws(() => parseSource(value))
  await assert.rejects(
    save(root, source.replace('lang: cn', 'lang: en')),
    /separate variant/,
  )
  const state = await inspectWorkspace(root)
  await assert.rejects(
    addComment(root, { ...commentInput(state), quote: '不存在的文字' }),
  )
  assert.equal((await inspectWorkspace(root)).revisions.length, 1)
  assert.equal((await inspectWorkspace(root)).threads.length, 0)
})

test('temporary writes do not replace committed state; a dead process lock can be recovered', async (t) => {
  const root = await workspace(t)
  await writeFile(
    join(root, '.workspace/state.json.tmp-interrupted'),
    '{incomplete',
  )
  await writeFile(
    join(root, '.workspace/write.lock'),
    JSON.stringify({ pid: 2147483647 }),
  )
  await save(root, source + '\n恢复后的版本。\n')
  assert.equal((await inspectWorkspace(root)).revisions.length, 2)
})

test('access gate rejects production, non-loopback, forged host and cross-origin mutations', () => {
  const input = {
    dev: true,
    host: 'localhost:3000',
    ip: '::1',
    method: 'POST',
    origin: 'http://localhost:3000',
  }
  assert.equal(allowsWorkspacePreview(input), true)
  for (const change of [
    { dev: false },
    { host: 'localhost.evil:3000' },
    { ip: '10.0.0.2' },
    { origin: 'https://evil.example' },
    { origin: undefined },
  ])
    assert.equal(allowsWorkspacePreview({ ...input, ...change }), false)
  assert.equal(
    allowsWorkspacePreview({ ...input, method: 'GET', origin: undefined }),
    true,
  )
})
