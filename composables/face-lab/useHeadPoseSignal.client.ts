import type {
  FaceDetectionSnapshot,
  HeadPoseAngles,
  HeadPoseSignalConfig,
} from '~/typings/face-lab'
import {
  applyDeadZone,
  extractHeadPose,
  subtractHeadPose,
  wrapDegrees,
} from '~/utils/face-lab/headPose'

const ZERO_POSE: HeadPoseAngles = { yaw: 0, pitch: 0, roll: 0 }

const clonePose = (pose: HeadPoseAngles): HeadPoseAngles => ({ ...pose })

const filterPose = (
  current: HeadPoseAngles,
  target: HeadPoseAngles,
  alpha: number,
): HeadPoseAngles => ({
  yaw: current.yaw + wrapDegrees(target.yaw - current.yaw) * alpha,
  pitch: current.pitch + wrapDegrees(target.pitch - current.pitch) * alpha,
  roll: current.roll + wrapDegrees(target.roll - current.roll) * alpha,
})

const deadZonePose = (
  pose: HeadPoseAngles,
  deadZone: number,
): HeadPoseAngles => ({
  yaw: applyDeadZone(pose.yaw, deadZone),
  pitch: applyDeadZone(pose.pitch, deadZone),
  roll: applyDeadZone(pose.roll, deadZone),
})

export const useHeadPoseSignal = () => {
  const tracked = ref(false)
  const calibrated = ref(false)
  const raw = ref<HeadPoseAngles>(clonePose(ZERO_POSE))
  const relative = ref<HeadPoseAngles>(clonePose(ZERO_POSE))
  const filtered = ref<HeadPoseAngles>(clonePose(ZERO_POSE))
  const neutral = ref<HeadPoseAngles>(clonePose(ZERO_POSE))
  const config = reactive<HeadPoseSignalConfig>({
    deadZone: 1.5,
    smoothingMs: 65,
    returnMs: 720,
    lostGraceMs: 140,
  })

  let lastUpdateAt = 0
  let lastTrackedAt = 0

  const update = (
    snapshot?: FaceDetectionSnapshot,
    now = performance.now(),
  ) => {
    const deltaMs = lastUpdateAt
      ? Math.min(100, Math.max(1, now - lastUpdateAt))
      : 16.67
    lastUpdateAt = now

    const nextRaw = extractHeadPose(snapshot?.transformMatrix)
    if (snapshot?.faceCount && nextRaw) {
      tracked.value = true
      lastTrackedAt = now
      raw.value = nextRaw
      const nextRelative = calibrated.value
        ? subtractHeadPose(nextRaw, neutral.value)
        : clonePose(nextRaw)
      relative.value = nextRelative
      const target = deadZonePose(nextRelative, config.deadZone)
      const alpha = 1 - Math.exp(-deltaMs / Math.max(1, config.smoothingMs))
      filtered.value = filterPose(filtered.value, target, alpha)
      return
    }

    tracked.value = false
    if (now - lastTrackedAt <= config.lostGraceMs) return

    const alpha = 1 - Math.exp(-deltaMs / Math.max(1, config.returnMs))
    filtered.value = filterPose(filtered.value, ZERO_POSE, alpha)
  }

  const calibrate = () => {
    if (!tracked.value) return false
    neutral.value = clonePose(raw.value)
    relative.value = clonePose(ZERO_POSE)
    filtered.value = clonePose(ZERO_POSE)
    calibrated.value = true
    return true
  }

  const resetCalibration = () => {
    neutral.value = clonePose(ZERO_POSE)
    relative.value = clonePose(raw.value)
    filtered.value = deadZonePose(raw.value, config.deadZone)
    calibrated.value = false
  }

  const clear = () => {
    tracked.value = false
    calibrated.value = false
    raw.value = clonePose(ZERO_POSE)
    relative.value = clonePose(ZERO_POSE)
    filtered.value = clonePose(ZERO_POSE)
    neutral.value = clonePose(ZERO_POSE)
    lastUpdateAt = 0
    lastTrackedAt = 0
  }

  return {
    tracked: readonly(tracked),
    calibrated: readonly(calibrated),
    raw: readonly(raw),
    relative: readonly(relative),
    filtered: readonly(filtered),
    neutral: readonly(neutral),
    config,
    update,
    calibrate,
    resetCalibration,
    clear,
  }
}
