import type { FaceState, PuppetPose } from '~/typings/face-lab'

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export const NEUTRAL_PUPPET_POSE: PuppetPose = {
  presence: 0,
  headX: 0,
  headY: 0,
  headRoll: 0,
  faceShiftX: 0,
  faceScaleX: 1,
  eyeScaleL: 1,
  eyeScaleR: 1,
  gazeX: 0,
  gazeY: 0,
  blinkL: 0,
  blinkR: 0,
  mouthOpen: 0,
  smile: 0,
  hairX: 0,
  hairRoll: 0,
  breath: 0,
}

export const mapFaceStateToPuppet = (state: FaceState): PuppetPose => {
  const yaw = clamp(state.head.yaw / 22, -1, 1)
  const pitch = clamp(state.head.pitch / 24, -1, 1)
  const gazeConfidence = clamp(state.gaze.confidence, 0, 1)
  const gazeWeight = 0.25 + gazeConfidence * 0.75

  return {
    presence: state.tracked ? 1 : 0,
    headX: yaw,
    headY: pitch,
    headRoll: clamp(state.head.roll, -18, 18),
    faceShiftX: yaw * 30,
    faceScaleX: 1 - Math.abs(yaw) * 0.18,
    eyeScaleL: 1 + yaw * 0.28,
    eyeScaleR: 1 - yaw * 0.28,
    gazeX: clamp(state.gaze.x, -1, 1) * gazeWeight,
    gazeY: clamp(state.gaze.y, -1, 1) * gazeWeight,
    blinkL: clamp(state.expression.blinkL, 0, 1),
    blinkR: clamp(state.expression.blinkR, 0, 1),
    mouthOpen: clamp(state.expression.mouthOpen, 0, 1),
    smile: clamp(state.expression.smile, 0, 1),
    hairX: yaw * 30,
    hairRoll: -yaw * 7,
    breath: 0,
  }
}
