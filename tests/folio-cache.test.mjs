import test from 'node:test'
import assert from 'node:assert/strict'
import { createFolioCache } from '../lib/folio-cache.mjs'
const id = (n) => String(n).repeat(64)
const snapshot = (n) => ({
  contract: 'test',
  id: id(n),
  collections: { articles: [{ slug: 'post-' + n }] },
})
test('publication switches only after full compilation; failures preserve last good; retry recovers', async () => {
  let clock = 100000,
    target = 1,
    broken = false,
    stored
  const cache = createFolioCache({
    bootstrap: snapshot(1),
    now: () => clock,
    foregroundBudget: 50,
    channel: async () => ({
      id: id(target),
      sha256: id(target),
      generation: target,
    }),
    release: async () => {
      if (broken) throw Error('timeout')
      return { id: id(target) }
    },
    compile: async (release) => {
      if (broken) throw Error('syntax')
      return snapshot(Number(release.id[0]))
    },
    write: async (record) => {
      stored = record
    },
  })
  assert.equal((await cache.get()).degraded, false)
  target = 2
  broken = true
  clock += 16000
  assert.equal((await cache.get()).snapshot.id, id(1))
  assert.equal((await cache.get()).degraded, true)
  broken = false
  clock += 6000
  assert.equal((await cache.get()).snapshot.id, id(2))
  assert.equal(stored.snapshot.id, id(2))
})
test('cold instance restores durable snapshot while provider is unavailable; corrupt storage uses bundled snapshot', async () => {
  const common = {
    bootstrap: snapshot(1),
    now: () => 100000,
    channel: async () => {
      throw Error('down')
    },
  }
  const valid = createFolioCache({
    ...common,
    read: async () => ({
      snapshot: snapshot(2),
      generation: 2,
      verifiedAt: 1000,
    }),
  })
  assert.equal((await valid.get()).snapshot.id, id(2))
  const corrupt = createFolioCache({
    ...common,
    read: async () => ({ generation: 2 }),
  })
  assert.equal((await corrupt.get()).snapshot.id, id(1))
  const failed = createFolioCache({
    ...common,
    read: async () => {
      throw Error('Redis down')
    },
  })
  assert.equal((await failed.get()).snapshot.id, id(1))
})
test('concurrent requests coalesce refresh and fall back within the foreground budget', async () => {
  let calls = 0,
    complete
  const gate = new Promise((resolve) => {
    complete = resolve
  })
  const tasks = []
  const cache = createFolioCache({
    bootstrap: snapshot(1),
    foregroundBudget: 5,
    channel: async () => {
      calls++
      await gate
      return { id: id(2), sha256: id(2), generation: 2 }
    },
    release: async () => ({}),
    compile: async () => snapshot(2),
  })
  const results = await Promise.all(
    Array.from({ length: 20 }, () => cache.get((task) => tasks.push(task))),
  )
  assert.equal(calls, 1)
  assert.ok(results.every((r) => r.snapshot.id === id(1)))
  complete()
  await Promise.all(tasks)
  assert.equal((await cache.get()).snapshot.id, id(2))
})
test('old generations and malformed releases cannot replace the current snapshot; explicit rollback with a new generation can', async () => {
  let clock = 100000,
    generation = 2,
    target = 2
  const cache = createFolioCache({
    bootstrap: snapshot(1),
    now: () => clock,
    channel: async () => ({ id: id(target), sha256: id(target), generation }),
    release: async () => ({}),
    compile: async () => snapshot(target),
  })
  assert.equal((await cache.get()).snapshot.id, id(2))
  clock += 16000
  generation = 1
  target = 1
  assert.equal((await cache.get()).snapshot.id, id(2))
  clock += 6000
  generation = 3
  assert.equal((await cache.get()).snapshot.id, id(1))
})
