import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createMaterialLayers,
  getMaterialPipeline,
  resolveMaterialPipeline,
} from '../utils/materialPipeline.ts'

// The UI can keep a node selected when changing material: the resolver must
// never send a paper-only data map to the foil shader, or vice versa.
test('switching material rejects incompatible diagnostic outputs', () => {
  const layers = createMaterialLayers()
  const foil = resolveMaterialPipeline('foil', 'inspect', 'normal', layers)
  assert.equal(foil.node.id, 'base')
  assert.equal(foil.output, 1)
  const paper = resolveMaterialPipeline('book', 'inspect', 'grooves', layers)
  assert.equal(paper.node.id, 'base')
  assert.equal(paper.output, 1)
})

test('walkthrough starts unlit, exposes height and normals, then lights and prints', () => {
  const layers = createMaterialLayers()
  const run = (selected: Parameters<typeof resolveMaterialPipeline>[2]) =>
    resolveMaterialPipeline('cotton', 'steps', selected, layers)
  assert.deepEqual(
    getMaterialPipeline('cotton').map((node) => run(node.id).output),
    [1, 2, 3, 4, 0, 0],
  )
  assert.equal(run('base').active.fibers, false)
  assert.equal(run('height').active.relief, true)
  assert.equal(run('normal').active.lighting, false)
  assert.equal(run('lighting').active.lighting, true)
  assert.equal(run('lighting').showPrint, false)
  assert.equal(run('print').showPrint, true)
})

test('walkthrough overrides switches temporarily without mutating the comparison', () => {
  const layers = createMaterialLayers()
  layers.relief = false
  layers.print = false
  const snapshot = { ...layers }
  const step = resolveMaterialPipeline('kraft', 'steps', 'print', layers)
  assert.equal(step.active.relief, true)
  assert.equal(step.showPrint, true)
  assert.deepEqual(layers, snapshot)
  const final = resolveMaterialPipeline('kraft', 'final', 'print', layers)
  assert.equal(final.active.relief, false)
  assert.equal(final.showPrint, false)
})

test('all data outputs hide print, while final compositing respects its switch', () => {
  for (const surface of ['book', 'foil'] as const) {
    const layers = createMaterialLayers()
    for (const node of getMaterialPipeline(surface)) {
      const inspect = resolveMaterialPipeline(
        surface,
        'inspect',
        node.id,
        layers,
      )
      assert.equal(inspect.showPrint, node.id === 'print')
      const final = resolveMaterialPipeline(surface, 'final', node.id, layers)
      assert.equal(final.output, 0)
      assert.equal(final.showPrint, true)
    }
  }
})

test('flow dependencies precede their consumers and height stays independent of pigment', () => {
  for (const surface of ['book', 'foil'] as const) {
    const nodes = getMaterialPipeline(surface)
    for (const [index, node] of nodes.entries()) {
      for (const input of node.inputs) {
        const dependency = nodes.findIndex((item) => item.id === input)
        assert.ok(dependency >= 0 && dependency < index)
      }
    }
  }
  assert.deepEqual(
    getMaterialPipeline('book').find((node) => node.id === 'normal')!.inputs,
    ['height'],
  )
  assert.deepEqual(
    getMaterialPipeline('book').find((node) => node.id === 'lighting')!.inputs,
    ['fibers', 'normal'],
  )
})
