import type { Ref } from 'vue'
import type { Application, Texture } from 'pixi.js'
import type {
  Cubism4InternalModel,
  Live2DModel,
} from 'pixi-live2d-display/cubism4'
import type { FaceState } from '~/typings/face-lab'
import { mapFaceStateToLive2D } from '~/utils/live2d/faceParameters'

type StageMode = 'pointer' | 'camera'
type StageModel = Live2DModel<Cubism4InternalModel>

let coreLoading: Promise<void> | undefined

const waitForCubismCore = async () => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const core = Reflect.get(window, 'Live2DCubismCore')
      if (typeof core?.Version?.csmGetVersion === 'function') {
        if (Number.isFinite(core.Version.csmGetVersion())) return
      }
    } catch {
      // The script can be loaded while its embedded runtime is initializing.
    }
    await new Promise<void>((resolve) => window.setTimeout(resolve, 25))
  }
  throw new Error('Cubism Core initialization timed out.')
}

const loadCubismCore = (source: string) => {
  if (coreLoading) return coreLoading
  if (Reflect.get(window, 'Live2DCubismCore')) return waitForCubismCore()

  coreLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    let finished = false
    const timeout = window.setTimeout(() => {
      finish(new Error('Cubism Core loading timed out.'))
    }, 15_000)

    const finish = (error?: Error) => {
      if (finished) return
      finished = true
      window.clearTimeout(timeout)
      script.removeEventListener('load', onLoad)
      script.removeEventListener('error', onError)
      if (error) {
        script.remove()
        coreLoading = undefined
        reject(error)
      } else {
        resolve()
      }
    }

    script.src = source
    script.async = true
    const onLoad = () => {
      void waitForCubismCore().then(
        () => finish(),
        (error: Error) => finish(error),
      )
    }
    const onError = () => finish(new Error('Unable to load Cubism Core.'))
    script.addEventListener('load', onLoad, { once: true })
    script.addEventListener('error', onError, { once: true })
    document.head.appendChild(script)
  })

  return coreLoading
}

export const useLive2DStage = (options: {
  container: Ref<HTMLElement | undefined>
  canvas: Ref<HTMLCanvasElement | undefined>
  face: Readonly<Ref<FaceState>>
  mode: Readonly<Ref<StageMode>>
}) => {
  const { t } = useI18n()
  const config = useRuntimeConfig()
  const status = ref<'loading' | 'ready' | 'error'>('loading')
  const errorMessage = ref('')
  const fps = ref(0)
  const expressions = ref<string[]>([])
  const currentExpression = ref<number | null>(null)
  const canvasKey = ref(0)

  let app: Application | undefined
  let model: StageModel | undefined
  let resizeObserver: ResizeObserver | undefined
  let disposed = false
  let generation = 0
  let expressionRequest = 0
  let pendingExpressionIndex: number | undefined
  let textureCache: Record<string, Texture> | undefined
  let motionIndex = 0
  let cameraWeight = 0
  let frameWindow = 0
  let frames = 0
  let smoothedParameters: Record<string, number> = {}

  const assetUrl = (path: string) =>
    new URL(path, new URL(config.app.baseURL, window.location.origin)).href

  const resize = () => {
    const container = options.container.value
    if (!container || !app || !model) return
    const width = Math.max(1, container.clientWidth)
    const height = Math.max(1, container.clientHeight)
    app.renderer.resize(width, height)
    const scale = Math.min(
      (width * 0.86) / model.internalModel.width,
      (height * 0.94) / model.internalModel.height,
    )
    model.scale.set(scale)
    model.position.set(width / 2, height / 2)
  }

  const syncVisibility = () => {
    if (!app) return
    if (document.hidden) app.stop()
    else {
      frameWindow = performance.now()
      frames = 0
      app.start()
    }
  }

  const pointerPosition = (event: PointerEvent) => {
    const canvas = options.canvas.value
    if (!canvas || !app) return undefined
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * app.screen.width,
      y: ((event.clientY - rect.top) / rect.height) * app.screen.height,
    }
  }

  const followPointer = (event: PointerEvent) => {
    if (options.mode.value !== 'pointer') return
    const position = pointerPosition(event)
    if (position) model?.focus(position.x, position.y)
  }

  const clearFocus = () => model?.internalModel.focusController.focus(0, 0)

  const playMotion = async () => {
    const activeModel = model
    if (!activeModel || status.value !== 'ready') return
    const entries = activeModel.internalModel.motionManager.definitions.TapBody
    if (!entries?.length) return
    errorMessage.value = ''
    try {
      await activeModel.motion('TapBody', motionIndex++ % entries.length, 3)
    } catch {
      if (activeModel === model && !disposed) {
        errorMessage.value = t('live2dLab.errors.motion')
      }
    }
  }

  const setExpression = async (index: number | null) => {
    const activeModel = model
    if (!activeModel || status.value !== 'ready') return
    if (index === null) {
      expressionRequest += 1
      pendingExpressionIndex = undefined
      const manager = activeModel.internalModel.motionManager.expressionManager
      if (manager) {
        // The adapter's reset only changes the rendered expression. Clear its
        // selection too so motions cannot restore it and it can be selected again.
        manager.reserveExpressionIndex = -1
        manager.currentExpression = manager.defaultExpression
        manager.resetExpression()
      }
      currentExpression.value = null
      errorMessage.value = ''
      return
    }
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= expressions.value.length
    ) {
      return
    }
    if (currentExpression.value === index || pendingExpressionIndex === index)
      return
    const request = ++expressionRequest
    pendingExpressionIndex = index
    errorMessage.value = ''
    try {
      const changed = await activeModel.expression(index)
      if (activeModel !== model || disposed || request !== expressionRequest)
        return
      if (changed) currentExpression.value = index
      else errorMessage.value = t('live2dLab.errors.expression')
    } catch {
      if (activeModel === model && !disposed && request === expressionRequest) {
        errorMessage.value = t('live2dLab.errors.expression')
      }
    } finally {
      if (request === expressionRequest) pendingExpressionIndex = undefined
    }
  }

  const tapModel = (event: PointerEvent) => {
    const position = pointerPosition(event)
    if (position) model?.tap(position.x, position.y)
  }

  const cleanup = () => {
    resizeObserver?.disconnect()
    resizeObserver = undefined
    const container = options.container.value
    container?.removeEventListener('pointermove', followPointer)
    container?.removeEventListener('pointerleave', clearFocus)
    container?.removeEventListener('pointerdown', tapModel)
    document.removeEventListener('visibilitychange', syncVisibility)
    app?.destroy(false, { children: true, texture: true, baseTexture: true })
    app = undefined
    model = undefined
    fps.value = 0
    expressions.value = []
    currentExpression.value = null
    expressionRequest += 1
    pendingExpressionIndex = undefined
    smoothedParameters = {}
    cameraWeight = 0
  }

  const retry = async () => {
    if (disposed) return
    const attempt = ++generation
    cleanup()
    status.value = 'loading'
    errorMessage.value = ''
    // Destroying a Pixi renderer loses its WebGL context. A new canvas gives
    // retries a fresh context instead of reusing the detached renderer's one.
    canvasKey.value += 1

    // Pixi caches failed image promises by URL. Discard only invalid model
    // textures so a retry can fetch them again without affecting valid visits.
    const modelDirectory = assetUrl('live2d/haru/')
    const invalidTextures = new Set(
      Object.entries(textureCache ?? {})
        .filter(
          ([url, texture]) =>
            url.startsWith(modelDirectory) &&
            !texture.baseTexture?.destroyed &&
            texture.baseTexture?.valid === false,
        )
        .map(([, texture]) => texture),
    )
    for (const texture of invalidTextures) texture.destroy(true)

    try {
      await nextTick()
      if (disposed || attempt !== generation) return
      await loadCubismCore(assetUrl('live2d/core/live2dcubismcore.min.js'))
      if (disposed || attempt !== generation) return
      // Cubism accesses the Core global when this module is evaluated.
      const [PIXI, cubism] = await Promise.all([
        import('pixi.js'),
        import('pixi-live2d-display/cubism4'),
      ])
      if (disposed || attempt !== generation) return
      textureCache = PIXI.utils.TextureCache
      const canvas = options.canvas.value
      const container = options.container.value
      if (!canvas || !container) return

      const nextApp = new PIXI.Application({
        view: canvas,
        width: Math.max(1, container.clientWidth),
        height: Math.max(1, container.clientHeight),
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        powerPreference: 'low-power',
      })
      app = nextApp
      nextApp.ticker.maxFPS = 60

      const loaded = await cubism.Live2DModel.from(
        assetUrl('live2d/haru/haru.model3.json'),
        { autoUpdate: false, autoInteract: false },
      )
      if (disposed || attempt !== generation) {
        // Another visit may be loading the same URLs through Pixi's cache.
        loaded.destroy()
        return
      }
      if (!(loaded.internalModel instanceof cubism.Cubism4InternalModel)) {
        loaded.destroy({ texture: true, baseTexture: true })
        throw new Error('The sample model requires Cubism 4.')
      }

      model = loaded as StageModel
      const activeModel = model
      nextApp.stage.addChild(activeModel)
      activeModel.anchor.set(0.5, 0.5)
      expressions.value =
        activeModel.internalModel.settings.expressions?.map(
          (entry) => entry.Name,
        ) ?? []

      const applyCamera = () => {
        if (cameraWeight <= 0.001) return
        for (const [id, value] of Object.entries(smoothedParameters)) {
          activeModel.internalModel.coreModel.setParameterValueById(
            id,
            value,
            cameraWeight,
          )
        }
      }
      // Apply the head pose before physics and restore eye/mouth signals after
      // idle motions and automatic blinking have been evaluated.
      activeModel.internalModel.on('afterMotionUpdate', applyCamera)
      activeModel.internalModel.on('beforeModelUpdate', applyCamera)
      activeModel.on('hit', (areas: string[]) => {
        if (areas.includes('Body')) void playMotion()
        else if (areas.includes('Head') && expressions.value.length) {
          void setExpression(
            ((currentExpression.value ?? -1) + 1) % expressions.value.length,
          )
        }
      })

      frameWindow = performance.now()
      frames = 0
      nextApp.ticker.add(() => {
        const delta = Math.min(nextApp.ticker.deltaMS, 50)
        const blend = 1 - Math.exp(-delta / 100)
        const tracking =
          options.mode.value === 'camera' && options.face.value.tracked
        cameraWeight += ((tracking ? 1 : 0) - cameraWeight) * blend
        if (options.mode.value === 'camera') {
          activeModel.internalModel.focusController.focus(0, 0, true)
        }
        const target = mapFaceStateToLive2D(options.face.value)
        for (const [id, value] of Object.entries(target)) {
          const previous = smoothedParameters[id] ?? value
          smoothedParameters[id] = previous + (value - previous) * blend
        }
        activeModel.update(delta)
        frames += 1
        const now = performance.now()
        if (now - frameWindow >= 750) {
          fps.value = Math.round((frames * 1000) / (now - frameWindow))
          frames = 0
          frameWindow = now
        }
      })

      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(container)
      container.addEventListener('pointermove', followPointer)
      container.addEventListener('pointerleave', clearFocus)
      container.addEventListener('pointerdown', tapModel)
      document.addEventListener('visibilitychange', syncVisibility)
      resize()
      status.value = 'ready'
      syncVisibility()
    } catch (error) {
      if (disposed || attempt !== generation) return
      cleanup()
      status.value = 'error'
      errorMessage.value = t('live2dLab.errors.load')
      console.error('Live2D stage:', error)
    }
  }

  onMounted(() => void retry())
  onBeforeUnmount(() => {
    disposed = true
    generation += 1
    cleanup()
  })

  return {
    status: readonly(status),
    errorMessage: readonly(errorMessage),
    fps: readonly(fps),
    expressions: readonly(expressions),
    currentExpression: readonly(currentExpression),
    canvasKey: readonly(canvasKey),
    playMotion,
    setExpression,
    retry,
  }
}
