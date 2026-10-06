import assert from 'node:assert/strict'
import test from 'node:test'
import { createRenderOnDemand } from '../utils/renderOnDemand.ts'

const setup = () => {
  let nextId = 0
  let draws = 0
  const callbacks = new Map<number, FrameRequestCallback>()
  const cancelled: number[] = []
  const runtime = createRenderOnDemand(() => draws++, {
    request(callback) {
      callbacks.set(++nextId, callback)
      return nextId
    },
    cancel(handle) {
      cancelled.push(handle)
      callbacks.delete(handle)
    },
  })
  const flush = () => {
    const batch = [...callbacks.values()]
    callbacks.clear()
    for (const callback of batch) callback(0)
  }
  return { runtime, callbacks, cancelled, flush, draws: () => draws }
}

test('many pointer and light changes draw once, then remain idle', () => {
  const stage = setup()
  for (let i = 0; i < 100; i++) stage.runtime.invalidate()
  assert.equal(stage.callbacks.size, 1)
  stage.flush()
  assert.equal(stage.draws(), 1)
  assert.equal(stage.callbacks.size, 0)
  stage.flush()
  assert.equal(stage.draws(), 1)
  stage.runtime.invalidate()
  stage.flush()
  assert.equal(stage.draws(), 2)
})

test('context loss cancels pending work and restoration can draw again', () => {
  const stage = setup()
  stage.runtime.invalidate()
  stage.runtime.cancel()
  stage.flush()
  assert.equal(stage.draws(), 0)
  assert.deepEqual(stage.cancelled, [1])
  stage.runtime.invalidate()
  stage.flush()
  assert.equal(stage.draws(), 1)
})

test('leaving the page cancels a pending draw and rejects later input', () => {
  const stage = setup()
  stage.runtime.invalidate()
  stage.runtime.dispose()
  stage.runtime.invalidate()
  stage.flush()
  assert.equal(stage.draws(), 0)
  assert.equal(stage.callbacks.size, 0)
  assert.deepEqual(stage.cancelled, [1])
})

test('a frame already queued for delivery cannot touch disposed GPU resources', () => {
  const stage = setup()
  stage.runtime.invalidate()
  const queuedCallback = [...stage.callbacks.values()][0]!
  stage.runtime.dispose()
  queuedCallback(0)
  assert.equal(stage.draws(), 0)
})
