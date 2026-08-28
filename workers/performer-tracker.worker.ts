/// <reference lib="webworker" />

import {
  FaceLandmarker,
  FilesetResolver,
  HandLandmarker,
  type FaceLandmarkerResult,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision'

import type { FaceDetectionSnapshot } from '../typings/face-lab'
import type {
  HandTrackingSnapshot,
  PerformerTrackerWorkerRequest,
  PerformerTrackerWorkerResponse,
  PerformerTrackerWorkerStage,
  PerformerTrackerKind,
  TrackingHandedness,
} from '../typings/performer-lab'

const workerScope = self as DedicatedWorkerGlobalScope

let faceLandmarker: FaceLandmarker | undefined
let handLandmarker: HandLandmarker | undefined
let trackerKind: PerformerTrackerKind | undefined
let previousFaceLandmarks: Float32Array | undefined

const send = (
  message: PerformerTrackerWorkerResponse,
  transfer: Transferable[] = [],
) => workerScope.postMessage(message, transfer)

const fetchModel = async (url: string, label: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(
      `Failed to load ${label} (${response.status} ${response.statusText}).`,
    )
  }
  return new Uint8Array(await response.arrayBuffer())
}

const initializeTask = async (
  request: Extract<PerformerTrackerWorkerRequest, { type: 'initialize' }>,
  setStage: (stage: PerformerTrackerWorkerStage) => void,
) => {
  setStage('resolve-wasm')
  // Vite emits this as a classic worker. Match it with MediaPipe's classic
  // loader instead of asking `importScripts()` to parse an ESM file.
  const vision = await FilesetResolver.forVisionTasks(request.wasmBaseUrl)
  vision.wasmLoaderPath = `${vision.wasmLoaderPath}?v=1.0.1`

  setStage('load-model')
  const model = await fetchModel(request.modelUrl, `${request.kind} model`)
  setStage('create-task')
  trackerKind = request.kind

  if (request.kind === 'face') {
    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetBuffer: model, delegate: 'CPU' },
      runningMode: 'VIDEO',
      numFaces: 1,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    })
    return
  }

  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetBuffer: model, delegate: 'CPU' },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.45,
    minHandPresenceConfidence: 0.45,
    minTrackingConfidence: 0.45,
  })
}

const flattenLandmarks = (
  landmarks?: Array<{ x: number; y: number; z: number }>,
) => {
  if (!landmarks?.length) return undefined
  const values = new Float32Array(landmarks.length * 3)
  landmarks.forEach((landmark, index) => {
    const offset = index * 3
    values[offset] = landmark.x
    values[offset + 1] = landmark.y
    values[offset + 2] = landmark.z
  })
  return values
}

const getFaceSignalQuality = (landmarks?: Float32Array) => {
  if (!landmarks?.length) return 0
  let minX = 1
  let maxX = 0
  let minY = 1
  let maxY = 0
  let centerX = 0
  let centerY = 0
  let jitter = 0
  const count = landmarks.length / 3

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3
    const x = landmarks[offset] ?? 0
    const y = landmarks[offset + 1] ?? 0
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
    centerX += x
    centerY += y
    if (previousFaceLandmarks?.length === landmarks.length) {
      jitter += Math.hypot(
        x - (previousFaceLandmarks[offset] ?? x),
        y - (previousFaceLandmarks[offset + 1] ?? y),
      )
    }
  }

  centerX /= count
  centerY /= count
  const faceSize = Math.sqrt((maxX - minX) * (maxY - minY))
  const sizeScore = Math.min(1, faceSize / 0.28)
  const centerScore = Math.max(
    0,
    1 - Math.hypot(centerX - 0.5, centerY - 0.5) / 0.7,
  )
  const stabilityScore = Math.max(
    0,
    1 - (previousFaceLandmarks ? jitter / count : 0) / 0.035,
  )
  previousFaceLandmarks = landmarks.slice()
  return Math.min(
    1,
    Math.max(0, sizeScore * 0.45 + centerScore * 0.2 + stabilityScore * 0.35),
  )
}

const buildFaceSnapshot = (
  result: FaceLandmarkerResult,
  request: Extract<PerformerTrackerWorkerRequest, { type: 'detect' }>,
  inferenceMs: number,
): FaceDetectionSnapshot => {
  const landmarks = flattenLandmarks(result.faceLandmarks[0])
  const matrixData = result.facialTransformationMatrixes[0]?.data
  const transformMatrix = matrixData ? new Float32Array(matrixData) : undefined
  const categories = result.faceBlendshapes[0]?.categories ?? []
  const blendshapeNames = categories.map((category) => category.categoryName)
  const blendshapeScores = categories.length
    ? new Float32Array(categories.map((category) => category.score))
    : undefined

  return {
    id: request.id,
    timestamp: request.timestamp,
    inferenceMs,
    sourceWidth: request.frame.width,
    sourceHeight: request.frame.height,
    faceCount: result.faceLandmarks.length,
    signalQuality: getFaceSignalQuality(landmarks),
    landmarks,
    transformMatrix,
    blendshapeNames,
    blendshapeScores,
  }
}

const normalizeHandedness = (value?: string): TrackingHandedness => {
  if (value === 'Left' || value === 'Right') return value
  return 'Unknown'
}

const buildHands = (result: HandLandmarkerResult): HandTrackingSnapshot[] =>
  result.landmarks.flatMap((landmarks, index) => {
    const flattened = flattenLandmarks(landmarks)
    if (!flattened) return []
    const handedness = result.handedness[index]?.[0]
    return [
      {
        handedness: normalizeHandedness(handedness?.categoryName),
        confidence: handedness?.score ?? 0,
        landmarks: flattened,
        worldLandmarks: flattenLandmarks(result.worldLandmarks[index]),
      },
    ]
  })

workerScope.addEventListener(
  'message',
  async (event: MessageEvent<PerformerTrackerWorkerRequest>) => {
    const request = event.data
    let stage: PerformerTrackerWorkerStage = request.type

    try {
      if (request.type === 'initialize') {
        faceLandmarker?.close()
        handLandmarker?.close()
        previousFaceLandmarks = undefined
        trackerKind = undefined
        await initializeTask(request, (nextStage) => {
          stage = nextStage
        })
        send({ type: 'ready', kind: request.kind })
        return
      }

      if (request.type === 'close') {
        faceLandmarker?.close()
        handLandmarker?.close()
        faceLandmarker = undefined
        handLandmarker = undefined
        trackerKind = undefined
        previousFaceLandmarks = undefined
        return
      }

      if (!trackerKind || (trackerKind === 'face' && !faceLandmarker)) {
        throw new Error('Performer tracker is not initialized.')
      }
      if (trackerKind === 'hand' && !handLandmarker) {
        throw new Error('Performer tracker is not initialized.')
      }

      const startedAt = performance.now()
      if (trackerKind === 'face' && faceLandmarker) {
        const result = faceLandmarker.detectForVideo(
          request.frame,
          request.timestamp,
        )
        const inferenceMs = performance.now() - startedAt
        const face = buildFaceSnapshot(result, request, inferenceMs)
        const transfer: Transferable[] = []
        if (face.landmarks) transfer.push(face.landmarks.buffer)
        if (face.transformMatrix) transfer.push(face.transformMatrix.buffer)
        if (face.blendshapeScores) transfer.push(face.blendshapeScores.buffer)
        send(
          {
            type: 'face-result',
            id: request.id,
            timestamp: request.timestamp,
            sourceWidth: request.frame.width,
            sourceHeight: request.frame.height,
            inferenceMs,
            face,
          },
          transfer,
        )
        return
      }

      const result = handLandmarker!.detectForVideo(
        request.frame,
        request.timestamp,
      )
      const inferenceMs = performance.now() - startedAt
      const hands = buildHands(result)
      const transfer: Transferable[] = []
      for (const hand of hands) {
        transfer.push(hand.landmarks.buffer)
        if (hand.worldLandmarks) transfer.push(hand.worldLandmarks.buffer)
      }
      send(
        {
          type: 'hand-result',
          id: request.id,
          timestamp: request.timestamp,
          sourceWidth: request.frame.width,
          sourceHeight: request.frame.height,
          inferenceMs,
          hands,
        },
        transfer,
      )
    } catch (error) {
      send({
        type: 'error',
        kind: trackerKind,
        stage,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
    } finally {
      if (request.type === 'detect') request.frame.close()
    }
  },
)
