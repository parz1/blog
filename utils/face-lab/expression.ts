import type {
  FaceDetectionSnapshot,
  FaceExpressionState,
} from '~/typings/face-lab'

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

const smoothstep = (value: number, start: number, end: number) => {
  const normalized = clamp01((value - start) / Math.max(0.001, end - start))
  return normalized * normalized * (3 - 2 * normalized)
}

const score = (snapshot: FaceDetectionSnapshot, name: string) => {
  const index = snapshot.blendshapeNames?.indexOf(name) ?? -1
  return index >= 0 ? clamp01(snapshot.blendshapeScores?.[index] ?? 0) : 0
}

export const extractExpression = (
  snapshot?: FaceDetectionSnapshot,
): FaceExpressionState | undefined => {
  if (!snapshot?.faceCount || !snapshot.blendshapeScores) return undefined

  return {
    blinkL: score(snapshot, 'eyeBlinkLeft'),
    blinkR: score(snapshot, 'eyeBlinkRight'),
    mouthOpen: score(snapshot, 'jawOpen'),
    smile:
      (score(snapshot, 'mouthSmileLeft') + score(snapshot, 'mouthSmileRight')) /
      2,
  }
}

export const normalizeExpressionBaseline = (value: number, baseline: number) =>
  clamp01((value - baseline) / Math.max(0.15, 1 - baseline))

export const interpretBlink = (value: number) => smoothstep(value, 0.12, 0.56)

export const interpretMouthOpen = (value: number) =>
  smoothstep(value, 0.045, 0.52)

export const interpretSmile = (value: number) => smoothstep(value, 0.08, 0.48)
