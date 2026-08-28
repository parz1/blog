import type { HeadPoseAngles } from '~/typings/face-lab'

const RADIANS_TO_DEGREES = 180 / Math.PI

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const columnLength = (matrix: Float32Array, offset: number) =>
  Math.hypot(
    matrix[offset] ?? 0,
    matrix[offset + 1] ?? 0,
    matrix[offset + 2] ?? 0,
  )

/**
 * Extracts pitch, yaw, and roll from MediaPipe's column-major 4×4 face pose
 * matrix using Rz(roll) · Ry(yaw) · Rx(pitch). The upper-left 3×3 block
 * contains uniform scale and rotation.
 */
export const extractHeadPose = (
  matrix?: Float32Array,
): HeadPoseAngles | undefined => {
  if (!matrix || matrix.length < 16) return undefined

  const scaleX = columnLength(matrix, 0)
  const scaleY = columnLength(matrix, 4)
  const scaleZ = columnLength(matrix, 8)
  if (Math.min(scaleX, scaleY, scaleZ) < 1e-6) return undefined

  const r00 = (matrix[0] ?? 0) / scaleX
  const r10 = (matrix[1] ?? 0) / scaleX
  const r20 = (matrix[2] ?? 0) / scaleX
  const r11 = (matrix[5] ?? 0) / scaleY
  const r12 = (matrix[9] ?? 0) / scaleZ
  const r21 = (matrix[6] ?? 0) / scaleY
  const r22 = (matrix[10] ?? 0) / scaleZ

  const yawRadians = Math.asin(clamp(-r20, -1, 1))
  const nearGimbalLock = Math.abs(Math.cos(yawRadians)) < 1e-5
  const pitchRadians = nearGimbalLock
    ? Math.atan2(-r12, r11)
    : Math.atan2(r21, r22)
  const rollRadians = nearGimbalLock ? 0 : Math.atan2(r10, r00)

  return {
    yaw: yawRadians * RADIANS_TO_DEGREES,
    pitch: pitchRadians * RADIANS_TO_DEGREES,
    roll: rollRadians * RADIANS_TO_DEGREES,
  }
}

export const wrapDegrees = (value: number) => {
  let wrapped = ((((value + 180) % 360) + 360) % 360) - 180
  if (Object.is(wrapped, -0)) wrapped = 0
  return wrapped
}

export const subtractHeadPose = (
  pose: HeadPoseAngles,
  neutral: HeadPoseAngles,
): HeadPoseAngles => ({
  yaw: wrapDegrees(pose.yaw - neutral.yaw),
  pitch: wrapDegrees(pose.pitch - neutral.pitch),
  roll: wrapDegrees(pose.roll - neutral.roll),
})

export const applyDeadZone = (value: number, deadZone: number) => {
  const magnitude = Math.abs(value)
  if (magnitude <= deadZone) return 0
  return Math.sign(value) * (magnitude - deadZone)
}
