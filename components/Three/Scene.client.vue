<script setup lang="ts">
import type { ThreeSceneRuntime } from '~/utils/threeScene'

const props = withDefaults(
  defineProps<{
    fov?: number
    near?: number
    far?: number
    alpha?: boolean
    antialias?: boolean
    maxPixelRatio?: number
    cameraPosition?: [number, number, number]
    controlsTarget?: [number, number, number]
    controls?: boolean
  }>(),
  {
    fov: 45,
    near: 0.1,
    far: 500,
    alpha: true,
    antialias: true,
    maxPixelRatio: 2,
    cameraPosition: () => [0, 0, 8],
    controlsTarget: () => [0, 0, 0],
    controls: true,
  },
)

const emit = defineEmits<{
  ready: [runtime: ThreeSceneRuntime]
  error: [error: Error]
}>()

const container = useTemplateRef<HTMLElement>('container')
const { context, attach, detach } = provideThreeScene()
const isReady = context.ready
const errorMessage = context.error
let sceneRuntime: ThreeSceneRuntime | undefined

onMounted(async () => {
  await nextTick()
  if (!container.value) {
    const error = new Error('The 3D scene container is unavailable.')
    context.error.value = error.message
    emit('error', error)
    return
  }

  try {
    sceneRuntime = createThreeSceneRuntime({
      container: container.value,
      fov: props.fov,
      near: props.near,
      far: props.far,
      alpha: props.alpha,
      antialias: props.antialias,
      maxPixelRatio: props.maxPixelRatio,
    })
    sceneRuntime.camera.position.set(...props.cameraPosition)
    sceneRuntime.controls.target.set(...props.controlsTarget)
    sceneRuntime.controls.enabled = props.controls
    sceneRuntime.controls.update()
    attach(sceneRuntime)
    emit('ready', sceneRuntime)
  } catch (reason) {
    const error =
      reason instanceof Error
        ? reason
        : new Error('Three.js initialization failed.')
    context.error.value = error.message
    emit('error', error)
  }
})

watch(
  () => props.fov,
  (fov) => {
    if (!sceneRuntime) return
    sceneRuntime.camera.fov = fov
    sceneRuntime.camera.updateProjectionMatrix()
  },
)

watch(
  () => props.controls,
  (enabled) => {
    if (sceneRuntime) sceneRuntime.controls.enabled = enabled
  },
)

onBeforeUnmount(() => {
  detach()
  sceneRuntime?.dispose()
  sceneRuntime = undefined
})

defineExpose({
  runtime: context.runtime,
  scene: context.scene,
  camera: context.camera,
  renderer: context.renderer,
  controls: context.controls,
})
</script>

<template>
  <div class="three-scene relative min-h-0 overflow-hidden">
    <div ref="container" class="absolute inset-0" />

    <slot
      v-if="isReady"
      :runtime="context.runtime.value"
      :scene="context.scene.value"
      :camera="context.camera.value"
      :renderer="context.renderer.value"
      :controls="context.controls.value"
    />

    <slot v-if="errorMessage" name="error" :error="errorMessage">
      <div class="absolute inset-0 grid place-items-center bg-gray-950 p-6">
        <UAlert
          class="max-w-lg"
          color="error"
          variant="subtle"
          title="Unable to start the 3D scene"
          :description="errorMessage"
        />
      </div>
    </slot>
  </div>
</template>

<style scoped>
.three-scene.absolute {
  position: absolute;
}
</style>
