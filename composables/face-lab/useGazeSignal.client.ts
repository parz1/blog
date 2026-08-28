import type {
  EyeGazeEstimate,
  FaceDetectionSnapshot,
  GazeFrameEstimate,
  GazeSignalConfig,
} from '~/typings/face-lab'
import { estimateGazeFrame } from '~/utils/face-lab/gaze'

interface GazePoint {
  x: number
  y: number
}

interface GazeNeutral {
  left: GazePoint
  right: GazePoint
}

const ZERO_POINT: GazePoint = { x: 0, y: 0 }
const ZERO_EYE: EyeGazeEstimate = {
  x: 0,
  y: 0,
  confidence: 0,
  openness: 0,
  blink: 0,
  width: 0,
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const applyDeadZone = (value: number, deadZone: number) => {
  const magnitude = Math.abs(value)
  if (magnitude <= deadZone) return 0
  return Math.sign(value) * ((magnitude - deadZone) / (1 - deadZone))
}

const cloneEye = (eye: EyeGazeEstimate) => ({ ...eye })

export const useGazeSignal = () => {
  const tracked = ref(false)
  const calibrated = ref(false)
  const rawFrame = ref<GazeFrameEstimate>({
    left: cloneEye(ZERO_EYE),
    right: cloneEye(ZERO_EYE),
  })
  const raw = ref<GazePoint>({ ...ZERO_POINT })
  const filtered = ref<GazePoint>({ ...ZERO_POINT })
  const confidence = ref(0)
  const neutral = ref<GazeNeutral>({
    left: { ...ZERO_POINT },
    right: { ...ZERO_POINT },
  })
  const config = reactive<GazeSignalConfig>({
    sensitivity: 1,
    smoothingMs: 80,
    returnMs: 560,
    lostGraceMs: 160,
    minConfidence: 0.18,
    deadZone: 0.035,
  })

  let lastUpdateAt = 0
  let lastTrackedAt = 0

  const eyePoint = (eye: EyeGazeEstimate, center: GazePoint): GazePoint => ({
    // Camera coordinates are mirrored for the user-facing preview.
    x: -(eye.x - center.x) * 4.8 * config.sensitivity,
    y: (eye.y - center.y) * 9 * config.sensitivity,
  })

  const update = (
    snapshot?: FaceDetectionSnapshot,
    now = performance.now(),
  ) => {
    const deltaMs = lastUpdateAt
      ? Math.min(100, Math.max(1, now - lastUpdateAt))
      : 16.67
    lastUpdateAt = now

    const frame = estimateGazeFrame(snapshot)
    if (frame) rawFrame.value = frame
    const leftWeight = frame?.left.confidence ?? 0
    const rightWeight = frame?.right.confidence ?? 0
    const totalWeight = leftWeight + rightWeight
    const nextConfidence = clamp(totalWeight / 1.55, 0, 1)
    confidence.value = nextConfidence

    if (
      frame &&
      totalWeight > 0.001 &&
      nextConfidence >= config.minConfidence
    ) {
      const left = eyePoint(frame.left, neutral.value.left)
      const right = eyePoint(frame.right, neutral.value.right)
      const fused = {
        x: (left.x * leftWeight + right.x * rightWeight) / totalWeight,
        y: (left.y * leftWeight + right.y * rightWeight) / totalWeight,
      }
      const target = {
        x: clamp(applyDeadZone(fused.x, config.deadZone), -1, 1),
        y: clamp(applyDeadZone(fused.y, config.deadZone), -1, 1),
      }
      raw.value = target
      tracked.value = true
      lastTrackedAt = now
      const alpha = 1 - Math.exp(-deltaMs / Math.max(1, config.smoothingMs))
      filtered.value = {
        x: filtered.value.x + (target.x - filtered.value.x) * alpha,
        y: filtered.value.y + (target.y - filtered.value.y) * alpha,
      }
      return
    }

    tracked.value = false
    if (now - lastTrackedAt <= config.lostGraceMs) return
    const alpha = 1 - Math.exp(-deltaMs / Math.max(1, config.returnMs))
    filtered.value = {
      x: filtered.value.x * (1 - alpha),
      y: filtered.value.y * (1 - alpha),
    }
  }

  const calibrate = () => {
    const frame = rawFrame.value
    if (
      frame.left.confidence < config.minConfidence ||
      frame.right.confidence < config.minConfidence
    ) {
      return false
    }
    neutral.value = {
      left: { x: frame.left.x, y: frame.left.y },
      right: { x: frame.right.x, y: frame.right.y },
    }
    raw.value = { ...ZERO_POINT }
    filtered.value = { ...ZERO_POINT }
    calibrated.value = true
    return true
  }

  const resetCalibration = () => {
    neutral.value = {
      left: { ...ZERO_POINT },
      right: { ...ZERO_POINT },
    }
    raw.value = { ...ZERO_POINT }
    filtered.value = { ...ZERO_POINT }
    calibrated.value = false
  }

  const clear = () => {
    tracked.value = false
    calibrated.value = false
    rawFrame.value = {
      left: cloneEye(ZERO_EYE),
      right: cloneEye(ZERO_EYE),
    }
    raw.value = { ...ZERO_POINT }
    filtered.value = { ...ZERO_POINT }
    confidence.value = 0
    neutral.value = {
      left: { ...ZERO_POINT },
      right: { ...ZERO_POINT },
    }
    lastUpdateAt = 0
    lastTrackedAt = 0
  }

  return {
    tracked: readonly(tracked),
    calibrated: readonly(calibrated),
    rawFrame: readonly(rawFrame),
    raw: readonly(raw),
    filtered: readonly(filtered),
    confidence: readonly(confidence),
    neutral: readonly(neutral),
    config,
    update,
    calibrate,
    resetCalibration,
    clear,
  }
}
