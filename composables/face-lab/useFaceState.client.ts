import { useExpressionSignal } from '~/composables/face-lab/useExpressionSignal.client'
import { useGazeSignal } from '~/composables/face-lab/useGazeSignal.client'
import { useHeadPoseSignal } from '~/composables/face-lab/useHeadPoseSignal.client'
import type { FaceDetectionSnapshot, FaceState } from '~/typings/face-lab'

export const useFaceState = () => {
  const pose = useHeadPoseSignal()
  const gaze = useGazeSignal()
  const expression = useExpressionSignal()
  const faceTracked = ref(false)

  const calibrated = computed(
    () =>
      pose.calibrated.value &&
      gaze.calibrated.value &&
      expression.calibrated.value,
  )

  const state = computed<FaceState>(() => ({
    tracked: faceTracked.value,
    head: {
      yaw: pose.filtered.value.yaw,
      pitch: pose.filtered.value.pitch,
      roll: pose.filtered.value.roll,
    },
    gaze: {
      x: gaze.filtered.value.x,
      y: gaze.filtered.value.y,
      confidence: gaze.confidence.value,
    },
    expression: {
      blinkL: expression.filtered.value.blinkL,
      blinkR: expression.filtered.value.blinkR,
      mouthOpen: expression.filtered.value.mouthOpen,
      smile: expression.filtered.value.smile,
    },
  }))

  const update = (
    snapshot?: FaceDetectionSnapshot,
    now = performance.now(),
  ) => {
    faceTracked.value = Boolean(snapshot?.faceCount)
    pose.update(snapshot, now)
    gaze.update(snapshot, now)
    expression.update(snapshot, now)
  }

  const calibrate = () => {
    if (!faceTracked.value || !gaze.calibrate()) return false
    const poseReady = pose.calibrate()
    const expressionReady = expression.calibrate()
    return poseReady && expressionReady
  }

  const resetCalibration = () => {
    pose.resetCalibration()
    gaze.resetCalibration()
    expression.resetCalibration()
  }

  const clear = () => {
    faceTracked.value = false
    pose.clear()
    gaze.clear()
    expression.clear()
  }

  return {
    state: readonly(state),
    tracked: readonly(faceTracked),
    calibrated: readonly(calibrated),
    pose,
    gaze,
    expression,
    update,
    calibrate,
    resetCalibration,
    clear,
  }
}
