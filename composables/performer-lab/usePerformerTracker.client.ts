import type { FaceLandmarkerState } from '~/typings/face-lab'
import type {
  PerformerTrackerKind,
  PerformerTrackerStats,
  PerformerTrackerWorkerRequest,
  PerformerTrackerWorkerResponse,
  PerformerTrackingFrame,
} from '~/typings/performer-lab'
// oxlint-disable-next-line import/default -- Vite exposes `?worker` modules as constructors.
import PerformerTrackerWorker from '~/workers/performer-tracker.worker?worker'

type FrameVideo = HTMLVideoElement & {
  cancelVideoFrameCallback?: (handle: number) => void
  requestVideoFrameCallback?: (
    callback: (now: number, metadata: VideoFrameCallbackMetadata) => void,
  ) => number
}

const EMPTY_STATS: PerformerTrackerStats = {
  cameraFps: 0,
  inferenceFps: 0,
  inferenceMs: 0,
  faceInferenceMs: 0,
  handInferenceMs: 0,
}

export const usePerformerTracker = () => {
  const state = ref<FaceLandmarkerState>('idle')
  const frame = shallowRef<PerformerTrackingFrame>()
  const stats = ref<PerformerTrackerStats>({ ...EMPTY_STATS })
  const errorMessage = ref('')

  let faceWorker: Worker | undefined
  let handWorker: Worker | undefined
  const readyKinds = new Set<PerformerTrackerKind>()
  const pendingResults = new Map<
    number,
    {
      id: number
      timestamp: number
      sourceWidth: number
      sourceHeight: number
      face?: PerformerTrackingFrame['face']
      hands?: PerformerTrackingFrame['hands']
      faceInferenceMs?: number
      handInferenceMs?: number
    }
  >()
  let activeVideo: FrameVideo | undefined
  let frameCallbackId: number | undefined
  let animationFrameId: number | undefined
  let running = false
  let inFlight = false
  let requestId = 0
  let lastRequestAt = 0
  let cameraFrames = 0
  let inferenceFrames = 0
  let cameraWindowStartedAt = 0
  let inferenceWindowStartedAt = 0

  const faceTracked = computed(() => Boolean(frame.value?.face.faceCount))
  const handCount = computed(() => frame.value?.hands.length ?? 0)

  const updateCameraFps = (now: number) => {
    if (!cameraWindowStartedAt) cameraWindowStartedAt = now
    cameraFrames += 1
    const elapsed = now - cameraWindowStartedAt
    if (elapsed < 750) return
    stats.value.cameraFps = (cameraFrames * 1000) / elapsed
    cameraFrames = 0
    cameraWindowStartedAt = now
  }

  const updateInferenceFps = (now: number) => {
    if (!inferenceWindowStartedAt) inferenceWindowStartedAt = now
    inferenceFrames += 1
    const elapsed = now - inferenceWindowStartedAt
    if (elapsed < 750) return
    stats.value.inferenceFps = (inferenceFrames * 1000) / elapsed
    inferenceFrames = 0
    inferenceWindowStartedAt = now
  }

  const handleWorkerMessage = (
    event: MessageEvent<PerformerTrackerWorkerResponse>,
  ) => {
    const message = event.data
    if (message.type === 'ready') {
      readyKinds.add(message.kind)
      if (readyKinds.size === 2) state.value = 'ready'
      return
    }
    if (message.type === 'error') {
      inFlight = false
      state.value = 'error'
      const source = message.kind ? `${message.kind} ` : ''
      errorMessage.value = `MediaPipe ${source}${message.stage}: ${message.message}`
      console.error(errorMessage.value, message.stack ?? '')
      return
    }

    const pending = pendingResults.get(message.id) ?? {
      id: message.id,
      timestamp: message.timestamp,
      sourceWidth: message.sourceWidth,
      sourceHeight: message.sourceHeight,
    }
    if (message.type === 'face-result') {
      pending.face = message.face
      pending.faceInferenceMs = message.inferenceMs
    } else {
      pending.hands = message.hands
      pending.handInferenceMs = message.inferenceMs
    }
    pendingResults.set(message.id, pending)
    if (!pending.face || !pending.hands) return

    const faceInferenceMs = pending.faceInferenceMs ?? 0
    const handInferenceMs = pending.handInferenceMs ?? 0
    const nextFrame: PerformerTrackingFrame = {
      id: pending.id,
      timestamp: pending.timestamp,
      sourceWidth: pending.sourceWidth,
      sourceHeight: pending.sourceHeight,
      inferenceMs: Math.max(faceInferenceMs, handInferenceMs),
      faceInferenceMs,
      handInferenceMs,
      face: pending.face,
      hands: pending.hands,
    }
    pendingResults.clear()
    inFlight = false
    frame.value = nextFrame
    stats.value = {
      ...stats.value,
      inferenceMs: nextFrame.inferenceMs,
      faceInferenceMs,
      handInferenceMs,
    }
    updateInferenceFps(performance.now())
  }

  const initialize = () => {
    if (faceWorker && handWorker && state.value === 'ready') {
      return Promise.resolve()
    }

    state.value = 'loading'
    errorMessage.value = ''
    faceWorker?.terminate()
    handWorker?.terminate()
    readyKinds.clear()
    pendingResults.clear()
    faceWorker = new PerformerTrackerWorker()
    handWorker = new PerformerTrackerWorker()
    faceWorker.addEventListener('message', handleWorkerMessage)
    handWorker.addEventListener('message', handleWorkerMessage)
    const handleWorkerError = (event: ErrorEvent) => {
      state.value = 'error'
      errorMessage.value = event.message || 'Performer tracker Worker failed.'
    }
    faceWorker.addEventListener('error', handleWorkerError)
    handWorker.addEventListener('error', handleWorkerError)

    const appBaseUrl = new URL(
      useRuntimeConfig().app.baseURL,
      window.location.origin,
    )
    const faceRequest: PerformerTrackerWorkerRequest = {
      type: 'initialize',
      kind: 'face',
      modelUrl: new URL('models/face_landmarker.task', appBaseUrl).href,
      wasmBaseUrl: new URL('wasm/', appBaseUrl).href.replace(/\/$/, ''),
    }
    const handRequest: PerformerTrackerWorkerRequest = {
      type: 'initialize',
      kind: 'hand',
      modelUrl: new URL('models/hand_landmarker.task', appBaseUrl).href,
      wasmBaseUrl: faceRequest.wasmBaseUrl,
    }

    return new Promise<void>((resolve, reject) => {
      const stopWatch = watch(state, (nextState: FaceLandmarkerState) => {
        if (nextState === 'ready') {
          stopWatch()
          resolve()
        } else if (nextState === 'error') {
          stopWatch()
          reject(new Error(errorMessage.value))
        }
      })
      faceWorker?.postMessage(faceRequest, [])
      handWorker?.postMessage(handRequest, [])
    })
  }

  const detectFrame = async (video: FrameVideo, now: number) => {
    updateCameraFps(now)
    if (
      !running ||
      inFlight ||
      state.value !== 'ready' ||
      !faceWorker ||
      !handWorker
    ) {
      return
    }
    const minimumInterval = window.matchMedia('(max-width: 640px)').matches
      ? 1000 / 10
      : 1000 / 18
    if (now - lastRequestAt < minimumInterval || video.readyState < 2) return

    inFlight = true
    lastRequestAt = now
    try {
      const faceImage = await createImageBitmap(video)
      const handImage = await createImageBitmap(faceImage)
      if (!running || !faceWorker || !handWorker) {
        faceImage.close()
        handImage.close()
        inFlight = false
        return
      }
      requestId += 1
      const request: PerformerTrackerWorkerRequest = {
        type: 'detect',
        id: requestId,
        timestamp: now,
        frame: faceImage,
      }
      const handRequest: PerformerTrackerWorkerRequest = {
        ...request,
        frame: handImage,
      }
      faceWorker.postMessage(request, [faceImage])
      handWorker.postMessage(handRequest, [handImage])
    } catch (error) {
      inFlight = false
      state.value = 'error'
      errorMessage.value =
        error instanceof Error ? error.message : String(error)
    }
  }

  const scheduleFrame = () => {
    const video = activeVideo
    if (!running || !video) return
    if (video.requestVideoFrameCallback) {
      frameCallbackId = video.requestVideoFrameCallback((now) => {
        void detectFrame(video, now)
        scheduleFrame()
      })
      return
    }
    animationFrameId = requestAnimationFrame((now) => {
      void detectFrame(video, now)
      scheduleFrame()
    })
  }

  const start = async (video: HTMLVideoElement) => {
    await initialize()
    activeVideo = video
    running = true
    cameraFrames = 0
    inferenceFrames = 0
    cameraWindowStartedAt = 0
    inferenceWindowStartedAt = 0
    scheduleFrame()
  }

  const stopProcessing = () => {
    running = false
    inFlight = false
    if (frameCallbackId !== undefined) {
      activeVideo?.cancelVideoFrameCallback?.(frameCallbackId)
    }
    if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId)
    frameCallbackId = undefined
    animationFrameId = undefined
    activeVideo = undefined
  }

  const dispose = () => {
    stopProcessing()
    if (faceWorker || handWorker) {
      const request: PerformerTrackerWorkerRequest = { type: 'close' }
      faceWorker?.postMessage(request, [])
      handWorker?.postMessage(request, [])
      faceWorker?.terminate()
      handWorker?.terminate()
    }
    faceWorker = undefined
    handWorker = undefined
    readyKinds.clear()
    pendingResults.clear()
    frame.value = undefined
    stats.value = { ...EMPTY_STATS }
    state.value = 'idle'
    errorMessage.value = ''
  }

  onBeforeUnmount(dispose)

  return {
    state: readonly(state),
    frame: readonly(frame),
    stats: readonly(stats),
    faceTracked,
    handCount,
    errorMessage: readonly(errorMessage),
    start,
    stopProcessing,
    dispose,
  }
}
