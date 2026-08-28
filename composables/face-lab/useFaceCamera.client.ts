import type { FaceCameraSettings, FaceCameraState } from '~/typings/face-lab'

const getCameraErrorMessage = (error: unknown) => {
  if (!(error instanceof DOMException)) {
    return error instanceof Error ? error.message : String(error)
  }

  const messages: Record<string, string> = {
    NotAllowedError: 'Camera permission was denied.',
    NotFoundError: 'No front-facing camera was found.',
    NotReadableError: 'The camera is already in use or unavailable.',
    OverconstrainedError: 'The requested camera settings are unavailable.',
    SecurityError: 'Camera access is blocked by the browser.',
  }

  return messages[error.name] ?? error.message
}

export const useFaceCamera = () => {
  const state = ref<FaceCameraState>('idle')
  const stream = shallowRef<MediaStream>()
  const errorMessage = ref('')
  const settings = ref<FaceCameraSettings>({
    width: 0,
    height: 0,
    frameRate: 0,
  })

  const stop = () => {
    stream.value?.getTracks().forEach((track: MediaStreamTrack) => track.stop())
    stream.value = undefined
    settings.value = { width: 0, height: 0, frameRate: 0 }
    state.value = 'idle'
  }

  const start = async (video: HTMLVideoElement) => {
    stop()
    errorMessage.value = ''
    state.value = 'requesting'

    if (!navigator.mediaDevices?.getUserMedia) {
      state.value = 'error'
      errorMessage.value = 'Camera access requires HTTPS or localhost.'
      throw new Error(errorMessage.value)
    }

    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
        },
      })

      stream.value = nextStream
      video.srcObject = nextStream
      await video.play()

      const trackSettings = nextStream.getVideoTracks()[0]?.getSettings()
      settings.value = {
        width: trackSettings?.width ?? video.videoWidth,
        height: trackSettings?.height ?? video.videoHeight,
        frameRate: trackSettings?.frameRate ?? 0,
      }
      state.value = 'streaming'
    } catch (error) {
      stop()
      state.value = 'error'
      errorMessage.value = getCameraErrorMessage(error)
      throw error
    }
  }

  onBeforeUnmount(stop)

  return {
    state: readonly(state),
    settings: readonly(settings),
    errorMessage: readonly(errorMessage),
    start,
    stop,
  }
}
