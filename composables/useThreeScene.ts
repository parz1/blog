import type { InjectionKey, Ref, ShallowRef } from 'vue'
import type * as THREE from 'three'

import type { ThreeSceneRuntime } from '~/utils/threeScene'

export interface ThreeSceneContext {
  runtime: ShallowRef<ThreeSceneRuntime | undefined>
  scene: Readonly<Ref<THREE.Scene | undefined>>
  camera: Readonly<Ref<THREE.PerspectiveCamera | undefined>>
  renderer: Readonly<Ref<THREE.WebGLRenderer | undefined>>
  controls: Readonly<Ref<ThreeSceneRuntime['controls'] | undefined>>
  ready: Readonly<Ref<boolean>>
  error: Ref<string>
  onFrame: (handler: (delta: number, elapsed: number) => void) => () => void
  onResize: (
    handler: (size: {
      width: number
      height: number
      pixelRatio: number
    }) => void,
  ) => () => void
}

const threeSceneKey: InjectionKey<ThreeSceneContext> = Symbol('three-scene')

export const provideThreeScene = () => {
  const runtime = shallowRef<ThreeSceneRuntime>()
  const error = ref('')
  const frameHandlers = new Set<(delta: number, elapsed: number) => void>()
  const resizeHandlers = new Set<
    (size: { width: number; height: number; pixelRatio: number }) => void
  >()
  let lastSize:
    | { width: number; height: number; pixelRatio: number }
    | undefined

  const context: ThreeSceneContext = {
    runtime,
    scene: computed(() => runtime.value?.scene),
    camera: computed(() => runtime.value?.camera),
    renderer: computed(() => runtime.value?.renderer),
    controls: computed(() => runtime.value?.controls),
    ready: computed(() => Boolean(runtime.value) && !error.value),
    error,
    onFrame(handler) {
      frameHandlers.add(handler)
      return () => frameHandlers.delete(handler)
    },
    onResize(handler) {
      resizeHandlers.add(handler)
      if (lastSize) handler(lastSize)
      return () => resizeHandlers.delete(handler)
    },
  }

  const attach = (nextRuntime: ThreeSceneRuntime) => {
    runtime.value = nextRuntime
    nextRuntime.setFrameHandler((delta, elapsed) => {
      for (const handler of frameHandlers) handler(delta, elapsed)
    })
    nextRuntime.setResizeHandler((size) => {
      lastSize = size
      for (const handler of resizeHandlers) handler(size)
    })
  }

  const detach = () => {
    runtime.value?.setFrameHandler()
    runtime.value?.setResizeHandler()
    runtime.value = undefined
    lastSize = undefined
  }

  provide(threeSceneKey, context)
  onScopeDispose(() => {
    frameHandlers.clear()
    resizeHandlers.clear()
  })

  return { context, attach, detach }
}

export const useThreeScene = () => {
  const context = inject(threeSceneKey)
  if (!context) {
    throw new Error('useThreeScene() must be used inside <ThreeScene>.')
  }
  return context
}

export const useThreeFrame = (
  handler: (delta: number, elapsed: number) => void,
) => {
  const scene = useThreeScene()
  let stop: (() => void) | undefined
  onMounted(() => {
    stop = scene.onFrame(handler)
  })
  onScopeDispose(() => stop?.())
  return scene
}

export const useThreeObject = <T extends THREE.Object3D>(
  factory: () => T,
  options: { dispose?: boolean } = {},
) => {
  const { scene } = useThreeScene()
  const object = shallowRef<T>()

  watch(
    scene,
    (nextScene, _, onCleanup) => {
      if (!nextScene) return
      const nextObject = factory()
      object.value = nextObject
      nextScene.add(nextObject)

      onCleanup(() => {
        nextScene.remove(nextObject)
        if (options.dispose !== false) {
          disposeThreeObjectResources(nextObject)
        }
        if (object.value === nextObject) object.value = undefined
      })
    },
    { immediate: true },
  )

  return object
}
