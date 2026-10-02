import type { FaceState } from '~/typings/face-lab'

export type Live2DFaceParameterId =
  | 'ParamAngleX'
  | 'ParamAngleY'
  | 'ParamAngleZ'
  | 'ParamBodyAngleX'
  | 'ParamEyeBallX'
  | 'ParamEyeBallY'
  | 'ParamEyeLOpen'
  | 'ParamEyeROpen'
  | 'ParamMouthOpenY'
  | 'ParamMouthForm'

export type Live2DFaceParameters = Record<Live2DFaceParameterId, number>

const NEUTRAL_PARAMETERS: Readonly<Live2DFaceParameters> = {
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
}

const bounded = (value: number, minimum: number, maximum: number) =>
  Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : 0

/** Converts the shared, mirrored FaceState into standard Cubism parameters. */
export const mapFaceStateToLive2D = (face: FaceState): Live2DFaceParameters => {
  if (!face.tracked) return { ...NEUTRAL_PARAMETERS }

  const yaw = bounded(face.head.yaw, -30, 30)
  const gazeWeight = 0.25 + bounded(face.gaze.confidence, 0, 1) * 0.75

  return {
    ParamAngleX: yaw,
    // FaceState uses screen-down pitch, roll, and gaze; Cubism uses up and CCW.
    ParamAngleY: 0 - bounded(face.head.pitch, -30, 30),
    ParamAngleZ: 0 - bounded(face.head.roll, -30, 30),
    ParamBodyAngleX: yaw * 0.25,
    // Gaze X has already been mirrored by useGazeSignal.
    ParamEyeBallX: bounded(face.gaze.x, -1, 1) * gazeWeight,
    ParamEyeBallY: 0 - bounded(face.gaze.y, -1, 1) * gazeWeight,
    ParamEyeLOpen: 1 - bounded(face.expression.blinkL, 0, 1),
    ParamEyeROpen: 1 - bounded(face.expression.blinkR, 0, 1),
    ParamMouthOpenY: bounded(face.expression.mouthOpen, 0, 1),
    ParamMouthForm: bounded(face.expression.smile, 0, 1),
  }
}
