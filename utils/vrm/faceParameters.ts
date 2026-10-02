import type { FaceState } from '~/typings/face-lab'

export interface VrmFacePose {
  /** Local rotation in radians, applied to the normalized head with ZYX order. */
  head: { x: number; y: number; z: number }
  /** VRMLookAt uses degrees: positive yaw looks left, positive pitch looks down. */
  lookAt: { yaw: number; pitch: number }
  /** VRM expression weights, including eyelid closure rather than openness. */
  expression: {
    blinkLeft: number
    blinkRight: number
    aa: number
    happy: number
  }
}

const DEG_TO_RAD = Math.PI / 180
const HEAD_LIMIT = 30 * DEG_TO_RAD
const GAZE_YAW_LIMIT = 30
const GAZE_PITCH_LIMIT = 20

const bounded = (value: number, minimum: number, maximum: number) => {
  if (!Number.isFinite(value)) return 0
  const result = Math.min(maximum, Math.max(minimum, value))
  return result === 0 ? 0 : result
}

export const createNeutralVrmFacePose = (): VrmFacePose => ({
  head: { x: 0, y: 0, z: 0 },
  lookAt: { yaw: 0, pitch: 0 },
  expression: { blinkLeft: 0, blinkRight: 0, aa: 0, happy: 0 },
})

export const mapFaceStateToVrmPose = (state: FaceState): VrmFacePose => {
  if (!state.tracked) return createNeutralVrmFacePose()

  const gazeWeight = 0.25 + bounded(state.gaze.confidence, 0, 1) * 0.75

  return {
    head: {
      // In a VRM 1 front view (+Z), +X rotation points the face down and +Y right.
      x: bounded(state.head.pitch, -30, 30) * DEG_TO_RAD,
      y: bounded(state.head.yaw, -30, 30) * DEG_TO_RAD,
      // FaceState roll follows screen-clockwise rotation; VRM +Z is counterclockwise.
      z: (0 - bounded(state.head.roll, -30, 30)) * DEG_TO_RAD,
    },
    lookAt: {
      // Gaze X is already mirrored upstream. Gaze Y and VRM pitch are down-positive.
      yaw: bounded(state.gaze.x, -1, 1) * GAZE_YAW_LIMIT * gazeWeight,
      pitch: bounded(state.gaze.y, -1, 1) * GAZE_PITCH_LIMIT * gazeWeight,
    },
    expression: {
      blinkLeft: bounded(state.expression.blinkL, 0, 1),
      blinkRight: bounded(state.expression.blinkR, 0, 1),
      aa: bounded(state.expression.mouthOpen, 0, 1),
      happy: bounded(state.expression.smile, 0, 1),
    },
  }
}

const sanitizePose = (pose: VrmFacePose): VrmFacePose => ({
  head: {
    x: bounded(pose.head.x, -HEAD_LIMIT, HEAD_LIMIT),
    y: bounded(pose.head.y, -HEAD_LIMIT, HEAD_LIMIT),
    z: bounded(pose.head.z, -HEAD_LIMIT, HEAD_LIMIT),
  },
  lookAt: {
    yaw: bounded(pose.lookAt.yaw, -GAZE_YAW_LIMIT, GAZE_YAW_LIMIT),
    pitch: bounded(pose.lookAt.pitch, -GAZE_PITCH_LIMIT, GAZE_PITCH_LIMIT),
  },
  expression: {
    blinkLeft: bounded(pose.expression.blinkLeft, 0, 1),
    blinkRight: bounded(pose.expression.blinkRight, 0, 1),
    aa: bounded(pose.expression.aa, 0, 1),
    happy: bounded(pose.expression.happy, 0, 1),
  },
})

/** Adds frame-rate-independent smoothing while preserving short blinks. */
export const smoothVrmFacePose = (
  current: VrmFacePose,
  target: VrmFacePose,
  deltaMs: number,
): VrmFacePose => {
  const from = sanitizePose(current)
  const to = sanitizePose(target)
  const elapsed = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0
  const move = (start: number, end: number, smoothingMs: number) =>
    start + (end - start) * (1 - Math.exp(-elapsed / smoothingMs))
  const blink = (start: number, end: number) =>
    move(start, end, end > start ? 12 : 38)

  return {
    head: {
      x: move(from.head.x, to.head.x, 80),
      y: move(from.head.y, to.head.y, 80),
      z: move(from.head.z, to.head.z, 80),
    },
    lookAt: {
      yaw: move(from.lookAt.yaw, to.lookAt.yaw, 80),
      pitch: move(from.lookAt.pitch, to.lookAt.pitch, 80),
    },
    expression: {
      blinkLeft: blink(from.expression.blinkLeft, to.expression.blinkLeft),
      blinkRight: blink(from.expression.blinkRight, to.expression.blinkRight),
      aa: move(from.expression.aa, to.expression.aa, 45),
      happy: move(from.expression.happy, to.expression.happy, 90),
    },
  }
}
