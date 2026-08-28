import type {
  ExpressionSignalConfig,
  FaceDetectionSnapshot,
  FaceExpressionState,
} from '~/typings/face-lab'
import {
  extractExpression,
  interpretBlink,
  interpretMouthOpen,
  interpretSmile,
  normalizeExpressionBaseline,
} from '~/utils/face-lab/expression'

const ZERO_EXPRESSION: FaceExpressionState = {
  blinkL: 0,
  blinkR: 0,
  mouthOpen: 0,
  smile: 0,
}

const cloneExpression = (
  expression: FaceExpressionState,
): FaceExpressionState => ({ ...expression })

const moveToward = (
  current: number,
  target: number,
  deltaMs: number,
  ms: number,
) => current + (target - current) * (1 - Math.exp(-deltaMs / Math.max(1, ms)))

export const useExpressionSignal = () => {
  const tracked = ref(false)
  const calibrated = ref(false)
  const raw = ref<FaceExpressionState>(cloneExpression(ZERO_EXPRESSION))
  const filtered = ref<FaceExpressionState>(cloneExpression(ZERO_EXPRESSION))
  const neutral = ref({ mouthOpen: 0, smile: 0 })
  const config = reactive<ExpressionSignalConfig>({
    smoothingMs: 42,
    returnMs: 220,
    lostGraceMs: 120,
  })

  let lastUpdateAt = 0
  let lastTrackedAt = 0
  let blinkLClosed = false
  let blinkRClosed = false
  let blinkLHoldUntil = 0
  let blinkRHoldUntil = 0

  const interpretBlinkState = (
    value: number,
    side: 'left' | 'right',
    now: number,
  ) => {
    let closed = side === 'left' ? blinkLClosed : blinkRClosed
    let holdUntil = side === 'left' ? blinkLHoldUntil : blinkRHoldUntil

    if (!closed && value >= 0.36) {
      closed = true
      holdUntil = now + 105
    } else if (closed && now >= holdUntil && value <= 0.2) {
      closed = false
    }

    if (side === 'left') {
      blinkLClosed = closed
      blinkLHoldUntil = holdUntil
    } else {
      blinkRClosed = closed
      blinkRHoldUntil = holdUntil
    }

    const continuous = interpretBlink(value)
    return closed ? Math.max(0.94, continuous) : continuous
  }

  const update = (
    snapshot?: FaceDetectionSnapshot,
    now = performance.now(),
  ) => {
    const deltaMs = lastUpdateAt
      ? Math.min(100, Math.max(1, now - lastUpdateAt))
      : 16.67
    lastUpdateAt = now

    const nextRaw = extractExpression(snapshot)
    if (nextRaw) {
      tracked.value = true
      lastTrackedAt = now
      raw.value = nextRaw
      const mouthOpen = calibrated.value
        ? normalizeExpressionBaseline(
            nextRaw.mouthOpen,
            neutral.value.mouthOpen,
          )
        : nextRaw.mouthOpen
      const smile = calibrated.value
        ? normalizeExpressionBaseline(nextRaw.smile, neutral.value.smile)
        : nextRaw.smile
      const target = {
        blinkL: interpretBlinkState(nextRaw.blinkL, 'left', now),
        blinkR: interpretBlinkState(nextRaw.blinkR, 'right', now),
        mouthOpen: interpretMouthOpen(mouthOpen),
        smile: interpretSmile(smile),
      }
      filtered.value = {
        blinkL: moveToward(
          filtered.value.blinkL,
          target.blinkL,
          deltaMs,
          target.blinkL > filtered.value.blinkL ? 12 : 38,
        ),
        blinkR: moveToward(
          filtered.value.blinkR,
          target.blinkR,
          deltaMs,
          target.blinkR > filtered.value.blinkR ? 12 : 38,
        ),
        mouthOpen: moveToward(
          filtered.value.mouthOpen,
          target.mouthOpen,
          deltaMs,
          config.smoothingMs,
        ),
        smile: moveToward(
          filtered.value.smile,
          target.smile,
          deltaMs,
          config.smoothingMs,
        ),
      }
      return
    }

    tracked.value = false
    raw.value = cloneExpression(ZERO_EXPRESSION)
    if (now - lastTrackedAt <= config.lostGraceMs) return
    filtered.value = {
      blinkL: moveToward(filtered.value.blinkL, 0, deltaMs, 48),
      blinkR: moveToward(filtered.value.blinkR, 0, deltaMs, 48),
      mouthOpen: moveToward(
        filtered.value.mouthOpen,
        0,
        deltaMs,
        config.returnMs,
      ),
      smile: moveToward(filtered.value.smile, 0, deltaMs, config.returnMs),
    }
  }

  const calibrate = () => {
    if (!tracked.value) return false
    neutral.value = {
      mouthOpen: raw.value.mouthOpen,
      smile: raw.value.smile,
    }
    filtered.value = {
      ...filtered.value,
      mouthOpen: 0,
      smile: 0,
    }
    calibrated.value = true
    return true
  }

  const resetCalibration = () => {
    neutral.value = { mouthOpen: 0, smile: 0 }
    filtered.value = cloneExpression(raw.value)
    calibrated.value = false
  }

  const clear = () => {
    tracked.value = false
    calibrated.value = false
    raw.value = cloneExpression(ZERO_EXPRESSION)
    filtered.value = cloneExpression(ZERO_EXPRESSION)
    neutral.value = { mouthOpen: 0, smile: 0 }
    blinkLClosed = false
    blinkRClosed = false
    blinkLHoldUntil = 0
    blinkRHoldUntil = 0
    lastUpdateAt = 0
    lastTrackedAt = 0
  }

  return {
    tracked: readonly(tracked),
    calibrated: readonly(calibrated),
    raw: readonly(raw),
    filtered: readonly(filtered),
    neutral: readonly(neutral),
    config,
    update,
    calibrate,
    resetCalibration,
    clear,
  }
}
