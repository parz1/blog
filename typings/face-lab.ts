export type FaceCameraState = 'idle' | 'requesting' | 'streaming' | 'error'

export type FaceLandmarkerState = 'idle' | 'loading' | 'ready' | 'error'

export interface FaceCameraSettings {
  width: number
  height: number
  frameRate: number
}

export interface FaceDetectionSnapshot {
  id: number
  timestamp: number
  inferenceMs: number
  sourceWidth: number
  sourceHeight: number
  faceCount: number
  signalQuality: number
  landmarks?: Float32Array
  transformMatrix?: Float32Array
  blendshapeNames?: string[]
  blendshapeScores?: Float32Array
}

export interface FaceLabStats {
  cameraFps: number
  inferenceFps: number
  inferenceMs: number
}

export interface HeadPoseAngles {
  yaw: number
  pitch: number
  roll: number
}

export interface HeadPoseSignalConfig {
  deadZone: number
  smoothingMs: number
  returnMs: number
  lostGraceMs: number
}

export interface EyeGazeEstimate {
  x: number
  y: number
  confidence: number
  openness: number
  blink: number
  width: number
}

export interface GazeFrameEstimate {
  left: EyeGazeEstimate
  right: EyeGazeEstimate
}

export interface GazeSignalConfig {
  sensitivity: number
  smoothingMs: number
  returnMs: number
  lostGraceMs: number
  minConfidence: number
  deadZone: number
}

export interface FaceExpressionState {
  blinkL: number
  blinkR: number
  mouthOpen: number
  smile: number
}

export interface ExpressionSignalConfig {
  smoothingMs: number
  returnMs: number
  lostGraceMs: number
}

export interface FaceState {
  tracked: boolean
  head: HeadPoseAngles
  gaze: {
    x: number
    y: number
    confidence: number
  }
  expression: FaceExpressionState
}

export interface PuppetPose {
  presence: number
  headX: number
  headY: number
  headRoll: number
  faceShiftX: number
  faceScaleX: number
  eyeScaleL: number
  eyeScaleR: number
  gazeX: number
  gazeY: number
  blinkL: number
  blinkR: number
  mouthOpen: number
  smile: number
  hairX: number
  hairRoll: number
  breath: number
}

export type FaceLandmarkerWorkerStage =
  | FaceLandmarkerWorkerRequest['type']
  | 'resolve-wasm'
  | 'load-model'
  | 'create-task'

export type FaceLandmarkerWorkerRequest =
  | {
      type: 'initialize'
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

export type FaceLandmarkerWorkerResponse =
  | {
      type: 'ready'
    }
  | {
      type: 'result'
      snapshot: FaceDetectionSnapshot
    }
  | {
      type: 'error'
      stage: FaceLandmarkerWorkerStage
      message: string
      stack?: string
    }
