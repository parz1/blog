import assert from 'node:assert/strict'
import test from 'node:test'
import type { FaceState } from '../typings/face-lab.ts'
import {
  createNeutralVrmFacePose,
  mapFaceStateToVrmPose,
  smoothVrmFacePose,
} from '../utils/vrm/faceParameters.ts'
import type { VrmFacePose } from '../utils/vrm/faceParameters.ts'

const createFaceState = (): FaceState => ({
  tracked: true,
  head: { yaw: 0, pitch: 0, roll: 0 },
  gaze: { x: 0, y: 0, confidence: 1 },
  expression: { blinkL: 0, blinkR: 0, mouthOpen: 0, smile: 0 },
})

const poseValues = (pose: VrmFacePose) =>
  [pose.head, pose.lookAt, pose.expression].flatMap(Object.values)

const assertNear = (actual: number, expected: number) =>
  assert.ok(
    Math.abs(actual - expected) < 1e-12,
    `${actual} differs from ${expected}`,
  )

test('maps screen directions into VRM head radians and lookAt degrees', () => {
  for (const direction of [-1, 1]) {
    const face = createFaceState()
    face.head = {
      yaw: 24 * direction,
      pitch: 12 * direction,
      roll: 7 * direction,
    }
    face.gaze = { x: 0.75 * direction, y: 0.5 * direction, confidence: 1 }

    const pose = mapFaceStateToVrmPose(face)

    assertNear(pose.head.x, (12 * direction * Math.PI) / 180)
    assertNear(pose.head.y, (24 * direction * Math.PI) / 180)
    assertNear(pose.head.z, (-7 * direction * Math.PI) / 180)
    assert.equal(pose.lookAt.yaw, 22.5 * direction)
    assert.equal(pose.lookAt.pitch, 10 * direction)
  }
})

test('preserves anatomical eye sides and treats blink weights as closure', () => {
  const face = createFaceState()
  face.expression = { blinkL: 1, blinkR: 0.25, mouthOpen: 0.6, smile: 0.8 }

  assert.deepEqual(mapFaceStateToVrmPose(face).expression, {
    blinkLeft: 1,
    blinkRight: 0.25,
    aa: 0.6,
    happy: 0.8,
  })
})

test('reduces uncertain gaze without adding another horizontal mirror', () => {
  const face = createFaceState()
  face.gaze = { x: 0.8, y: -0.8, confidence: 0 }
  const uncertain = mapFaceStateToVrmPose(face)
  assert.equal(uncertain.lookAt.yaw, 6)
  assert.equal(uncertain.lookAt.pitch, -4)

  face.gaze.confidence = 1
  const confident = mapFaceStateToVrmPose(face)
  assert.equal(confident.lookAt.yaw, 24)
  assert.equal(confident.lookAt.pitch, -16)
})

test('returns neutral eyes, mouth, head and gaze when tracking is lost', () => {
  const face = createFaceState()
  face.tracked = false
  face.head = { yaw: 25, pitch: -18, roll: 14 }
  face.gaze = { x: 1, y: -1, confidence: 1 }
  face.expression = { blinkL: 1, blinkR: 1, mouthOpen: 1, smile: 1 }

  assert.deepEqual(mapFaceStateToVrmPose(face), createNeutralVrmFacePose())
})

test('bounds exaggerated face signals before applying them to the avatar', () => {
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

    const pose = mapFaceStateToVrmPose(face)

    assertNear(pose.head.x, (direction * Math.PI) / 6)
    assertNear(pose.head.y, (direction * Math.PI) / 6)
    assertNear(pose.head.z, (-direction * Math.PI) / 6)
    assert.equal(pose.lookAt.yaw, 30 * direction)
    assert.equal(pose.lookAt.pitch, 20 * direction)
    assert.equal(pose.expression.blinkLeft, direction > 0 ? 1 : 0)
    assert.equal(pose.expression.blinkRight, direction > 0 ? 0 : 1)
    assert.equal(pose.expression.aa, direction > 0 ? 1 : 0)
    assert.equal(pose.expression.happy, direction > 0 ? 1 : 0)
  }
})

test('replaces non-finite face signals with a finite neutral pose', () => {
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

    const pose = mapFaceStateToVrmPose(face)
    assert.ok(poseValues(pose).every(Number.isFinite))
    assert.deepEqual(pose, createNeutralVrmFacePose())
  }
})

test('produces the same smoothing after equal elapsed time at different frame rates', () => {
  const face = createFaceState()
  face.head = { yaw: 24, pitch: -12, roll: 7 }
  face.gaze = { x: 0.75, y: -0.5, confidence: 1 }
  face.expression = { blinkL: 1, blinkR: 0.5, mouthOpen: 0.6, smile: 0.8 }
  const target = mapFaceStateToVrmPose(face)
  const neutral = createNeutralVrmFacePose()

  const oneFrame = smoothVrmFacePose(neutral, target, 30)
  const twoFrames = smoothVrmFacePose(
    smoothVrmFacePose(neutral, target, 10),
    target,
    20,
  )

  poseValues(oneFrame).forEach((value, index) =>
    assertNear(value, poseValues(twoFrames)[index]!),
  )
})

test('closes eyelids quickly enough to preserve a brief blink and releases more slowly', () => {
  const open = createNeutralVrmFacePose()
  const closed = createNeutralVrmFacePose()
  closed.expression.blinkLeft = 1

  const closing = smoothVrmFacePose(open, closed, 20)
  const opening = smoothVrmFacePose(closed, open, 20)

  assert.ok(closing.expression.blinkLeft > 0.75)
  assert.ok(opening.expression.blinkLeft > 0.5)
  assert.ok(closing.expression.blinkLeft > 1 - opening.expression.blinkLeft)
  assert.equal(closing.expression.blinkRight, 0)
})

test('returns smoothly to neutral after tracking loss without overshooting', () => {
  const face = createFaceState()
  face.head = { yaw: -24, pitch: 12, roll: -7 }
  face.gaze = { x: -0.75, y: 0.5, confidence: 1 }
  face.expression = { blinkL: 1, blinkR: 0.5, mouthOpen: 0.6, smile: 0.8 }
  const current = mapFaceStateToVrmPose(face)
  face.tracked = false
  const target = mapFaceStateToVrmPose(face)
  const next = smoothVrmFacePose(current, target, 16)

  poseValues(next).forEach((value, index) => {
    const previous = poseValues(current)[index]!
    assert.ok(value >= Math.min(0, previous) && value <= Math.max(0, previous))
    assert.ok(Math.abs(value) < Math.abs(previous))
  })
})

test('invalid or backwards elapsed time does not advance a valid pose', () => {
  const current = createNeutralVrmFacePose()
  current.head.y = 0.2
  current.expression.blinkLeft = 0.5
  const target = createNeutralVrmFacePose()

  for (const delta of [0, -16, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.deepEqual(smoothVrmFacePose(current, target, delta), current)
  }
})

test('sanitizes malformed pose values before smoothing', () => {
  const current: VrmFacePose = {
    head: {
      x: Number.NaN,
      y: Number.POSITIVE_INFINITY,
      z: Number.NEGATIVE_INFINITY,
    },
    lookAt: { yaw: Number.NaN, pitch: Number.POSITIVE_INFINITY },
    expression: {
      blinkLeft: Number.NaN,
      blinkRight: Number.POSITIVE_INFINITY,
      aa: -5,
      happy: 10,
    },
  }
  const target: VrmFacePose = {
    head: { x: 100, y: -100, z: Number.NaN },
    lookAt: { yaw: 100, pitch: -100 },
    expression: { blinkLeft: 100, blinkRight: -100, aa: 10, happy: Number.NaN },
  }

  const smoothed = smoothVrmFacePose(current, target, 16)

  assert.ok(poseValues(smoothed).every(Number.isFinite))
  assert.ok(
    Object.values(smoothed.head).every(
      (value) => Math.abs(value) <= Math.PI / 6,
    ),
  )
  assert.ok(Math.abs(smoothed.lookAt.yaw) <= 30)
  assert.ok(Math.abs(smoothed.lookAt.pitch) <= 20)
  assert.ok(
    Object.values(smoothed.expression).every(
      (value) => value >= 0 && value <= 1,
    ),
  )
})

test('keeps mapper and smoothing inputs immutable and neutral poses independent', () => {
  const face = createFaceState()
  const before = structuredClone(face)
  const current = createNeutralVrmFacePose()
  const target = mapFaceStateToVrmPose(face)
  target.expression.aa = 1
  const beforeTarget = structuredClone(target)

  smoothVrmFacePose(current, target, 16)

  assert.deepEqual(face, before)
  assert.deepEqual(current, createNeutralVrmFacePose())
  assert.deepEqual(target, beforeTarget)
  current.head.x = 1
  current.expression.blinkLeft = 1
  assert.deepEqual(createNeutralVrmFacePose().head, { x: 0, y: 0, z: 0 })
  assert.equal(createNeutralVrmFacePose().expression.blinkLeft, 0)
})
