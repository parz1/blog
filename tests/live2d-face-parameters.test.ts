import assert from 'node:assert/strict'
import test from 'node:test'
import type { FaceState } from '../typings/face-lab.ts'
import { mapFaceStateToLive2D } from '../utils/live2d/faceParameters.ts'

const createFaceState = (): FaceState => ({
  tracked: true,
  head: { yaw: 0, pitch: 0, roll: 0 },
  gaze: { x: 0, y: 0, confidence: 1 },
  expression: { blinkL: 0, blinkR: 0, mouthOpen: 0, smile: 0 },
})

test('keeps mirrored horizontal directions and converts vertical axes to Cubism', () => {
  const face = createFaceState()
  face.head = { yaw: 24, pitch: 12, roll: 7 }
  face.gaze = { x: 0.75, y: 0.5, confidence: 1 }

  const parameters = mapFaceStateToLive2D(face)

  assert.equal(parameters.ParamAngleX, 24)
  assert.equal(parameters.ParamAngleY, -12)
  assert.equal(parameters.ParamAngleZ, -7)
  assert.equal(parameters.ParamBodyAngleX, 6)
  assert.equal(parameters.ParamEyeBallX, 0.75)
  assert.equal(parameters.ParamEyeBallY, -0.5)

  face.head = { yaw: -24, pitch: -12, roll: -7 }
  face.gaze = { x: -0.75, y: -0.5, confidence: 1 }
  const opposite = mapFaceStateToLive2D(face)

  assert.equal(opposite.ParamAngleX, -24)
  assert.equal(opposite.ParamAngleY, 12)
  assert.equal(opposite.ParamAngleZ, 7)
  assert.equal(opposite.ParamBodyAngleX, -6)
  assert.equal(opposite.ParamEyeBallX, -0.75)
  assert.equal(opposite.ParamEyeBallY, 0.5)
})

test('converts asymmetric blink scores to eye openness without swapping sides', () => {
  const face = createFaceState()
  face.expression = { blinkL: 1, blinkR: 0.25, mouthOpen: 0.6, smile: 0.8 }

  const parameters = mapFaceStateToLive2D(face)

  assert.equal(parameters.ParamEyeLOpen, 0)
  assert.equal(parameters.ParamEyeROpen, 0.75)
  assert.equal(parameters.ParamMouthOpenY, 0.6)
  assert.equal(parameters.ParamMouthForm, 0.8)
})

test('reduces uncertain gaze using the shared puppet confidence weighting', () => {
  const face = createFaceState()
  face.gaze = { x: 0.8, y: -0.8, confidence: 0 }
  assert.equal(mapFaceStateToLive2D(face).ParamEyeBallX, 0.2)
  assert.equal(mapFaceStateToLive2D(face).ParamEyeBallY, 0.2)

  face.gaze.confidence = 0.5
  assert.equal(mapFaceStateToLive2D(face).ParamEyeBallX, 0.5)

  face.gaze.confidence = 1
  assert.equal(mapFaceStateToLive2D(face).ParamEyeBallX, 0.8)
})

test('returns a neutral pose after tracking is lost, ignoring stale signals', () => {
  const face = createFaceState()
  face.tracked = false
  face.head = { yaw: 25, pitch: -18, roll: 14 }
  face.gaze = { x: 1, y: -1, confidence: 1 }
  face.expression = { blinkL: 1, blinkR: 1, mouthOpen: 1, smile: 1 }

  assert.deepEqual(mapFaceStateToLive2D(face), {
    ParamAngleX: 0,
    ParamAngleY: 0,
    ParamAngleZ: 0,
    ParamBodyAngleX: 0,
    ParamEyeBallX: 0,
    ParamEyeBallY: 0,
    ParamEyeLOpen: 1,
    ParamEyeROpen: 1,
    ParamMouthOpenY: 0,
    ParamMouthForm: 0,
  })
})

test('bounds angles and expressions even when tracking produces extreme values', () => {
  for (const direction of [-1, 1]) {
    const face = createFaceState()
    face.head = {
      yaw: 180 * direction,
      pitch: 90 * direction,
      roll: 75 * direction,
    }
    face.gaze = { x: 10 * direction, y: 5 * direction, confidence: 10 }
    face.expression = {
      blinkL: 3 * direction,
      blinkR: -3 * direction,
      mouthOpen: 5 * direction,
      smile: 4 * direction,
    }

    const parameters = mapFaceStateToLive2D(face)

    assert.equal(parameters.ParamAngleX, 30 * direction)
    assert.equal(parameters.ParamAngleY, -30 * direction)
    assert.equal(parameters.ParamAngleZ, -30 * direction)
    assert.equal(parameters.ParamBodyAngleX, 7.5 * direction)
    assert.equal(parameters.ParamEyeBallX, direction)
    assert.equal(parameters.ParamEyeBallY, -direction)
    assert.equal(parameters.ParamEyeLOpen, direction > 0 ? 0 : 1)
    assert.equal(parameters.ParamEyeROpen, direction > 0 ? 1 : 0)
    assert.equal(parameters.ParamMouthOpenY, direction > 0 ? 1 : 0)
    assert.equal(parameters.ParamMouthForm, direction > 0 ? 1 : 0)
  }
})

test('guards every non-finite input before writing model parameters', () => {
  for (const invalid of [
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ]) {
    const face = createFaceState()
    face.head = { yaw: invalid, pitch: invalid, roll: invalid }
    face.gaze = { x: invalid, y: invalid, confidence: invalid }
    face.expression = {
      blinkL: invalid,
      blinkR: invalid,
      mouthOpen: invalid,
      smile: invalid,
    }

    const parameters = mapFaceStateToLive2D(face)

    assert.ok(Object.values(parameters).every(Number.isFinite))
    assert.equal(parameters.ParamAngleX, 0)
    assert.equal(parameters.ParamAngleY, 0)
    assert.equal(parameters.ParamAngleZ, 0)
    assert.equal(parameters.ParamEyeBallX, 0)
    assert.equal(parameters.ParamEyeBallY, 0)
    assert.equal(parameters.ParamEyeLOpen, 1)
    assert.equal(parameters.ParamEyeROpen, 1)
    assert.equal(parameters.ParamMouthOpenY, 0)
    assert.equal(parameters.ParamMouthForm, 0)
  }
})

test('keeps face input immutable and returns an independent neutral pose each time', () => {
  const face = createFaceState()
  const before = structuredClone(face)
  mapFaceStateToLive2D(face)
  assert.deepEqual(face, before)

  face.tracked = false
  const neutral = mapFaceStateToLive2D(face)
  neutral.ParamEyeLOpen = 0
  assert.equal(mapFaceStateToLive2D(face).ParamEyeLOpen, 1)
})
