/// <reference lib="webworker" />

import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'

import type {
  FaceDetectionSnapshot,
  FaceLandmarkerWorkerRequest,
  FaceLandmarkerWorkerResponse,
  FaceLandmarkerWorkerStage,
} from '../typings/face-lab'

const workerScope = self as DedicatedWorkerGlobalScope
let landmarker: FaceLandmarker | undefined
let previousLandmarks: Float32Array | undefined

const send = (
  message: FaceLandmarkerWorkerResponse,
  transfer: Transferable[] = [],
) => workerScope.postMessage(message, transfer)

const createLandmarker = async (
  modelUrl: string,
  wasmBaseUrl: string,
  setStage: (stage: FaceLandmarkerWorkerStage) => void,
) => {
  setStage('resolve-wasm')
  // Vite emits this as a classic worker. Use MediaPipe's classic WASM loader
  // so `importScripts()` never has to parse the ESM loader's `import.meta`.
  const vision = await FilesetResolver.forVisionTasks(wasmBaseUrl)
  vision.wasmLoaderPath = `${vision.wasmLoaderPath}?v=1.0.1`

  setStage('load-model')
  const modelResponse = await fetch(modelUrl)
  if (!modelResponse.ok) {
    throw new Error(
      `Failed to load model (${modelResponse.status} ${modelResponse.statusText}).`,
    )
  }
  const modelAssetBuffer = new Uint8Array(await modelResponse.arrayBuffer())

  setStage('create-task')
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetBuffer,
      delegate: 'CPU',
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: true,
  })
}

const flattenLandmarks = (result: FaceLandmarkerResult) => {
  const face = result.faceLandmarks[0]
  if (!face) return undefined

  const values = new Float32Array(face.length * 3)
  face.forEach((landmark, index) => {
    const offset = index * 3
    values[offset] = landmark.x
    values[offset + 1] = landmark.y
    values[offset + 2] = landmark.z
  })
  return values
}

const getSignalQuality = (landmarks?: Float32Array) => {
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

    if (previousLandmarks?.length === landmarks.length) {
      const dx = x - (previousLandmarks[offset] ?? x)
      const dy = y - (previousLandmarks[offset + 1] ?? y)
      jitter += Math.hypot(dx, dy)
    }
  }

  centerX /= count
  centerY /= count
  const faceSize = Math.sqrt((maxX - minX) * (maxY - minY))
  const sizeScore = Math.min(1, faceSize / 0.28)
  const centerDistance = Math.hypot(centerX - 0.5, centerY - 0.5)
  const centerScore = Math.max(0, 1 - centerDistance / 0.7)
  const meanJitter = previousLandmarks ? jitter / count : 0
  const stabilityScore = Math.max(0, 1 - meanJitter / 0.035)

  previousLandmarks = landmarks.slice()
  return Math.min(
    1,
    Math.max(0, sizeScore * 0.45 + centerScore * 0.2 + stabilityScore * 0.35),
  )
}

const buildSnapshot = (
  result: FaceLandmarkerResult,
  request: Extract<FaceLandmarkerWorkerRequest, { type: 'detect' }>,
  inferenceMs: number,
): FaceDetectionSnapshot => {
  const landmarks = flattenLandmarks(result)
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
    signalQuality: getSignalQuality(landmarks),
    landmarks,
    transformMatrix,
    blendshapeNames,
    blendshapeScores,
  }
}

workerScope.addEventListener(
  'message',
  async (event: MessageEvent<FaceLandmarkerWorkerRequest>) => {
    const request = event.data
    let stage: FaceLandmarkerWorkerStage = request.type

    try {
      if (request.type === 'initialize') {
        landmarker?.close()
        previousLandmarks = undefined
        landmarker = await createLandmarker(
          request.modelUrl,
          request.wasmBaseUrl,
          (nextStage) => {
            stage = nextStage
          },
        )
        send({ type: 'ready' })
        return
      }

      if (request.type === 'close') {
        landmarker?.close()
        landmarker = undefined
        previousLandmarks = undefined
        return
      }

      if (!landmarker) throw new Error('Face Landmarker is not initialized.')

      const startedAt = performance.now()
      const result = landmarker.detectForVideo(request.frame, request.timestamp)
      const snapshot = buildSnapshot(
        result,
        request,
        performance.now() - startedAt,
      )
      const transfer: Transferable[] = []
      if (snapshot.landmarks) transfer.push(snapshot.landmarks.buffer)
      if (snapshot.transformMatrix)
        transfer.push(snapshot.transformMatrix.buffer)
      if (snapshot.blendshapeScores) {
        transfer.push(snapshot.blendshapeScores.buffer)
      }
      send({ type: 'result', snapshot }, transfer)
    } catch (error) {
      send({
        type: 'error',
        stage,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
    } finally {
      if (request.type === 'detect') request.frame.close()
    }
  },
)
