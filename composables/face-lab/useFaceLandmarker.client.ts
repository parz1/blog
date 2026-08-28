import type {
  FaceDetectionSnapshot,
  FaceLabStats,
  FaceLandmarkerState,
  FaceLandmarkerWorkerRequest,
  FaceLandmarkerWorkerResponse,
} from '~/typings/face-lab'
// oxlint-disable-next-line import/default -- Vite exposes `?worker` modules as constructors.
import FaceLandmarkerWorker from '~/workers/face-landmarker.worker?worker'

type FrameVideo = HTMLVideoElement & {
  cancelVideoFrameCallback?: (handle: number) => void
  requestVideoFrameCallback?: (
    callback: (now: number, metadata: VideoFrameCallbackMetadata) => void,
  ) => number
}

const EMPTY_STATS: FaceLabStats = {
  cameraFps: 0,
  inferenceFps: 0,
  inferenceMs: 0,
}

export const useFaceLandmarker = () => {
  const state = ref<FaceLandmarkerState>('idle')
  const snapshot = shallowRef<FaceDetectionSnapshot>()
  const stats = ref<FaceLabStats>({ ...EMPTY_STATS })
  const errorMessage = ref('')

  let worker: Worker | undefined
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

  const tracked = computed(() => Boolean(snapshot.value?.faceCount))

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
    event: MessageEvent<FaceLandmarkerWorkerResponse>,
  ) => {
    const message = event.data

    if (message.type === 'ready') {
      state.value = 'ready'
      return
    }

    if (message.type === 'error') {
      inFlight = false
      state.value = 'error'
      errorMessage.value = `MediaPipe ${message.stage}: ${message.message}`
      console.error(errorMessage.value, message.stack ?? '')
      return
    }

    inFlight = false
    snapshot.value = message.snapshot
    stats.value.inferenceMs = message.snapshot.inferenceMs
    updateInferenceFps(performance.now())
  }

  const initialize = () => {
    if (worker && state.value === 'ready') return Promise.resolve()

    state.value = 'loading'
    errorMessage.value = ''
    worker?.terminate()
    worker = new FaceLandmarkerWorker()
    worker.addEventListener('message', handleWorkerMessage)
    worker.addEventListener('error', (event) => {
      state.value = 'error'
      errorMessage.value = event.message || 'Face Landmarker Worker failed.'
    })

    const appBaseUrl = new URL(
      useRuntimeConfig().app.baseURL,
      window.location.origin,
    )
    const request: FaceLandmarkerWorkerRequest = {
      type: 'initialize',
      modelUrl: new URL('models/face_landmarker.task', appBaseUrl).href,
      wasmBaseUrl: new URL('wasm/', appBaseUrl).href.replace(/\/$/, ''),
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

      worker?.postMessage(request, [])
    })
  }

  const detectFrame = async (video: FrameVideo, now: number) => {
    updateCameraFps(now)
    if (!running || inFlight || state.value !== 'ready' || !worker) return

    const minimumInterval = window.matchMedia('(max-width: 640px)').matches
      ? 1000 / 18
      : 1000 / 26
    if (now - lastRequestAt < minimumInterval || video.readyState < 2) return

    inFlight = true
    lastRequestAt = now

    try {
      const frame = await createImageBitmap(video)
      if (!running || !worker) {
        frame.close()
        inFlight = false
        return
      }

      requestId += 1
      const request: FaceLandmarkerWorkerRequest = {
        type: 'detect',
        id: requestId,
        timestamp: now,
        frame,
      }
      worker.postMessage(request, [frame])
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
    if (animationFrameId !== undefined) {
      cancelAnimationFrame(animationFrameId)
    }
    frameCallbackId = undefined
    animationFrameId = undefined
    activeVideo = undefined
  }

  const dispose = () => {
    stopProcessing()
    if (worker) {
      const request: FaceLandmarkerWorkerRequest = { type: 'close' }
      worker.postMessage(request, [])
      worker.terminate()
    }
    worker = undefined
    snapshot.value = undefined
    stats.value = { ...EMPTY_STATS }
    state.value = 'idle'
    errorMessage.value = ''
  }

  onBeforeUnmount(dispose)

  return {
    state: readonly(state),
    snapshot: readonly(snapshot),
    stats: readonly(stats),
    tracked,
    errorMessage: readonly(errorMessage),
    start,
    stopProcessing,
    dispose,
  }
}
