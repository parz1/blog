import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { assertEmbeddedVrm, MAX_VRM_BYTES } from '../utils/vrm/modelData.ts'

const packGlb = (json: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(json))
  const length = Math.ceil(bytes.length / 4) * 4
  const buffer = new ArrayBuffer(20 + length)
  const header = new DataView(buffer)
  header.setUint32(0, 0x46546c67, true)
  header.setUint32(4, 2, true)
  header.setUint32(8, buffer.byteLength, true)
  header.setUint32(12, length, true)
  header.setUint32(16, 0x4e4f534a, true)
  const body = new Uint8Array(buffer, 20)
  body.fill(0x20)
  body.set(bytes)
  return buffer
}

test('accepts the actual bundled, self-contained VRM sample', () => {
  const model = readFileSync(
    new URL('../public/vrm/sample.vrm', import.meta.url),
  )
  assert.doesNotThrow(() => assertEmbeddedVrm(Uint8Array.from(model).buffer))
})

test('blocks external resources before GLTFLoader can request them', () => {
  for (const uri of [
    'https://example.com/avatar.png',
    '//example.com/a.bin',
    '../texture.png',
  ]) {
    const model = packGlb({ extensions: { VRMC_vrm: {} }, images: [{ uri }] })
    assert.throws(() => assertEmbeddedVrm(model), /externalResources/)
  }
  assert.doesNotThrow(() =>
    assertEmbeddedVrm(
      packGlb({
        extensions: { VRM: {} },
        images: [{ uri: 'data:image/png;base64,AA==' }],
      }),
    ),
  )
})

test('rejects unsupported, truncated, oversized, and malformed model files', () => {
  const model = packGlb({ extensions: { VRMC_vrm: {} } })
  assert.throws(() => assertEmbeddedVrm(model.slice(0, 16)), /invalidFile/)
  assert.throws(
    () => assertEmbeddedVrm(model.slice(0, model.byteLength - 1)),
    /invalidFile/,
  )
  assert.throws(
    () => assertEmbeddedVrm(new ArrayBuffer(MAX_VRM_BYTES + 1)),
    /invalidFile/,
  )
  assert.throws(
    () => assertEmbeddedVrm(packGlb({ asset: { version: '2.0' } })),
    /invalidFile/,
  )
  const corrupt = model.slice(0)
  new DataView(corrupt).setUint32(12, 0xffffffff, true)
  assert.throws(() => assertEmbeddedVrm(corrupt), /invalidFile/)
})
