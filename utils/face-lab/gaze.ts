import type {
  EyeGazeEstimate,
  FaceDetectionSnapshot,
  GazeFrameEstimate,
} from '~/typings/face-lab'

interface Point2 {
  x: number
  y: number
}

interface EyeDefinition {
  iris: number[]
  screenLeftCorner: number
  screenRightCorner: number
  upperLid: number[]
  lowerLid: number[]
  blinkShape: string
}

const LEFT_EYE: EyeDefinition = {
  iris: [473, 474, 475, 476, 477],
  screenLeftCorner: 362,
  screenRightCorner: 263,
  upperLid: [385, 386, 387],
  lowerLid: [373, 374, 380],
  blinkShape: 'eyeBlinkLeft',
}

const RIGHT_EYE: EyeDefinition = {
  iris: [468, 469, 470, 471, 472],
  screenLeftCorner: 33,
  screenRightCorner: 133,
  upperLid: [158, 159, 160],
  lowerLid: [144, 145, 153],
  blinkShape: 'eyeBlinkRight',
}

const EMPTY_EYE: EyeGazeEstimate = {
  x: 0,
  y: 0,
  confidence: 0,
  openness: 0,
  blink: 0,
  width: 0,
}

const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value))

const landmark = (
  landmarks: Float32Array,
  index: number,
): Point2 | undefined => {
  const offset = index * 3
  const x = landmarks[offset]
  const y = landmarks[offset + 1]
  if (x === undefined || y === undefined) return undefined
  return { x, y }
}

const averagePoints = (
  landmarks: Float32Array,
  indices: number[],
): Point2 | undefined => {
  let x = 0
  let y = 0
  for (const index of indices) {
    const point = landmark(landmarks, index)
    if (!point) return undefined
    x += point.x
    y += point.y
  }
  return { x: x / indices.length, y: y / indices.length }
}

const blendshapeScore = (snapshot: FaceDetectionSnapshot, name: string) => {
  const index = snapshot.blendshapeNames?.indexOf(name) ?? -1
  return index >= 0 ? (snapshot.blendshapeScores?.[index] ?? 0) : 0
}

const estimateEye = (
  snapshot: FaceDetectionSnapshot,
  definition: EyeDefinition,
): EyeGazeEstimate => {
  const landmarks = snapshot.landmarks
  if (!landmarks || landmarks.length < 478 * 3) return { ...EMPTY_EYE }

  const leftCorner = landmark(landmarks, definition.screenLeftCorner)
  const rightCorner = landmark(landmarks, definition.screenRightCorner)
  const iris = averagePoints(landmarks, definition.iris)
  const upper = averagePoints(landmarks, definition.upperLid)
  const lower = averagePoints(landmarks, definition.lowerLid)
  if (!leftCorner || !rightCorner || !iris || !upper || !lower) {
    return { ...EMPTY_EYE }
  }

  const horizontalX = rightCorner.x - leftCorner.x
  const horizontalY = rightCorner.y - leftCorner.y
  const width = Math.hypot(horizontalX, horizontalY)
  if (width < 1e-4) return { ...EMPTY_EYE }

  const axisX = horizontalX / width
  const axisY = horizontalY / width
  let verticalX = -axisY
  let verticalY = axisX
  if (verticalY < 0) {
    verticalX *= -1
    verticalY *= -1
  }

  const cornerCenter = {
    x: (leftCorner.x + rightCorner.x) / 2,
    y: (leftCorner.y + rightCorner.y) / 2,
  }
  const lidCenter = {
    x: (upper.x + lower.x) / 2,
    y: (upper.y + lower.y) / 2,
  }
  const irisFromCornerX = iris.x - cornerCenter.x
  const irisFromCornerY = iris.y - cornerCenter.y
  const irisFromLidsX = iris.x - lidCenter.x
  const irisFromLidsY = iris.y - lidCenter.y
  const opening = Math.abs(
    (lower.x - upper.x) * verticalX + (lower.y - upper.y) * verticalY,
  )
  const openingRatio = opening / width
  const openness = clamp((openingRatio - 0.055) / 0.16)
  const blink = clamp(blendshapeScore(snapshot, definition.blinkShape))
  const blinkWeight = clamp(1 - blink / 0.72)

  const x = (irisFromCornerX * axisX + irisFromCornerY * axisY) / width
  const y = (irisFromLidsX * verticalX + irisFromLidsY * verticalY) / width
  const irisRadius =
    definition.iris
      .slice(1)
      .map((index) => landmark(landmarks, index))
      .filter((point): point is Point2 => Boolean(point))
      .reduce(
        (sum, point) => sum + Math.hypot(point.x - iris.x, point.y - iris.y),
        0,
      ) / Math.max(1, definition.iris.length - 1)
  const irisGeometry = clamp((irisRadius / width - 0.025) / 0.055)
  const containment = clamp(1 - Math.max(0, Math.abs(x) - 0.34) * 5)
  const confidence = clamp(
    snapshot.signalQuality *
      openness *
      blinkWeight *
      (0.55 + irisGeometry * 0.45) *
      containment,
  )

  return { x, y, confidence, openness, blink, width }
}

export const estimateGazeFrame = (
  snapshot?: FaceDetectionSnapshot,
): GazeFrameEstimate | undefined => {
  if (!snapshot?.faceCount) return undefined
  return {
    left: estimateEye(snapshot, LEFT_EYE),
    right: estimateEye(snapshot, RIGHT_EYE),
  }
}

export const getEyeOverlayLandmarks = (landmarks?: Float32Array) => {
  if (!landmarks || landmarks.length < 478 * 3) return undefined
  const points = (indices: number[]) =>
    indices
      .map((index) => landmark(landmarks, index))
      .filter((point): point is Point2 => Boolean(point))
  return {
    leftEye: points([362, 385, 386, 387, 263, 373, 374, 380]),
    rightEye: points([33, 158, 159, 160, 133, 153, 145, 144]),
    leftIris: points([474, 475, 476, 477]),
    rightIris: points([469, 470, 471, 472]),
  }
}
