import type { FaceDetectionSnapshot, FaceExpressionState } from './face-lab'

export type Vector3Tuple = [number, number, number]
export type QuaternionTuple = [number, number, number, number]
export type TrackingHandedness = 'Left' | 'Right' | 'Unknown'

export interface HandTrackingSnapshot {
  handedness: TrackingHandedness
  confidence: number
  landmarks: Float32Array
  worldLandmarks?: Float32Array
}

export interface PerformerTrackingFrame {
  id: number
  timestamp: number
  sourceWidth: number
  sourceHeight: number
  inferenceMs: number
  faceInferenceMs: number
  handInferenceMs: number
  face: FaceDetectionSnapshot
  hands: HandTrackingSnapshot[]
}

export interface PerformerTrackerStats {
  cameraFps: number
  inferenceFps: number
  inferenceMs: number
  faceInferenceMs: number
  handInferenceMs: number
}

export interface PerformerHandState {
  tracked: boolean
  confidence: number
  handedness: TrackingHandedness
  wrist: Vector3Tuple
  joints: Vector3Tuple[]
  velocity: Vector3Tuple
}

export interface PerformerState3D {
  tracked: boolean
  timestamp: number
  head: {
    tracked: boolean
    position: Vector3Tuple
    rotation: Vector3Tuple
    quaternion: QuaternionTuple
    forward: Vector3Tuple
    angularVelocity: Vector3Tuple
  }
  eyes: {
    confidence: number
    localDirection: Vector3Tuple
    target: Vector3Tuple
  }
  face: FaceExpressionState & {
    tracked: boolean
    signalQuality: number
    landmarkCount: number
    normalizedLandmarks: Float32Array
    cameraLandmarks: Vector3Tuple[]
    transformMatrix: Float32Array
    blendshapeNames: string[]
    blendshapeScores: Float32Array
    eyesClosed: boolean
    mouthState: 'closed' | 'open'
    smileActive: boolean
  }
  hands: {
    left: PerformerHandState
    right: PerformerHandState
  }
}

export type PerformerTrackerWorkerStage =
  | PerformerTrackerWorkerRequest['type']
  | 'resolve-wasm'
  | 'load-model'
  | 'create-task'

export type PerformerTrackerKind = 'face' | 'hand'

export type PerformerTrackerWorkerRequest =
  | {
      type: 'initialize'
      kind: PerformerTrackerKind
      modelUrl: string
      wasmBaseUrl: string
    }
  | {
      type: 'detect'
      id: number
      timestamp: number
      frame: ImageBitmap
    }
  | {
      type: 'close'
    }

export type PerformerTrackerWorkerResponse =
  | { type: 'ready'; kind: PerformerTrackerKind }
  | {
      type: 'face-result'
      id: number
      timestamp: number
      sourceWidth: number
      sourceHeight: number
      inferenceMs: number
      face: FaceDetectionSnapshot
    }
  | {
      type: 'hand-result'
      id: number
      timestamp: number
      sourceWidth: number
      sourceHeight: number
      inferenceMs: number
      hands: HandTrackingSnapshot[]
    }
  | {
      type: 'error'
      kind?: PerformerTrackerKind
      stage: PerformerTrackerWorkerStage
      message: string
      stack?: string
    }
