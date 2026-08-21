<script setup lang="ts">
import * as THREE from 'three'

import type { MathFigure3DPreset } from '~/utils/mathFigures3d'
import type { ThreeSceneRuntime } from '~/utils/threeScene'

const props = withDefaults(
  defineProps<{
    preset: string
    interactive?: boolean
  }>(),
  {
    interactive: true,
  },
)

const sceneContainer = ref<HTMLElement | null>(null)
const errorMessage = ref('')
const ready = ref(false)
const playing = ref(false)
const controlValue = ref(0)
const definition = computed<MathFigure3DPreset | undefined>(() =>
  getMathFigure3DPreset(props.preset),
)

let runtime: ThreeSceneRuntime | undefined
let updateVisualization: (() => void) | undefined

watch(
  definition,
  (nextDefinition) => {
    controlValue.value = nextDefinition?.control.defaultValue ?? 0
    playing.value = false
  },
  { immediate: true },
)

watch(controlValue, () => updateVisualization?.())

const activePathPoint = computed(() => {
  const current = definition.value
  if (!current?.path) return undefined
  return current.path[Math.round(controlValue.value)]
})

const statusText = computed(() => {
  const current = definition.value
  if (!current) return ''

  if (current.control.kind === 'iteration') {
    const point = activePathPoint.value
    if (!point) return ''
    return `第 ${Math.round(controlValue.value)} 步 · w₁ = ${point.x.toFixed(2)} · w₂ = ${point.z.toFixed(2)} · J = ${point.value.toFixed(3)}`
  }

  return `b = ${controlValue.value.toFixed(1)} · 白线处 p = 0.500`
})

const compactStatusText = computed(() => {
  const current = definition.value
  if (!current) return ''

  if (current.control.kind === 'iteration') {
    const point = activePathPoint.value
    if (!point) return ''
    return `step ${Math.round(controlValue.value)} · J ${point.value.toFixed(3)}`
  }

  return `b ${controlValue.value.toFixed(1)}`
})

const formatControlValue = (value: number) => {
  const current = definition.value
  if (!current) return value.toString()
  return current.control.kind === 'iteration'
    ? Math.round(value).toString()
    : value.toFixed(1)
}

const disposeGroupChildren = (group: THREE.Group) => {
  group.traverse((object) => {
    if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
      object.geometry.dispose()
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material]
      for (const material of materials) material.dispose()
    }
  })
  group.clear()
}

const createTube = (
  points: THREE.Vector3[],
  color: THREE.ColorRepresentation,
  radius: number,
) => {
  if (points.length < 2) return undefined
  const curve = new THREE.CatmullRomCurve3(points)
  return new THREE.Mesh(
    new THREE.TubeGeometry(curve, Math.max(points.length * 2, 24), radius, 8),
    new THREE.MeshBasicMaterial({ color }),
  )
}

const togglePlayback = () => {
  const current = definition.value
  if (!current || current.control.kind !== 'iteration') return

  if (controlValue.value >= current.control.maximum) {
    controlValue.value = current.control.minimum
  }
  playing.value = !playing.value
}

const resetControl = () => {
  const current = definition.value
  if (!current) return
  playing.value = false
  controlValue.value = current.control.defaultValue
}

onMounted(() => {
  const container = sceneContainer.value
  const current = definition.value
  if (!container || !current) return

  try {
    const sceneRuntime = createThreeSceneRuntime({
      container,
      near: 0.1,
      far: 100,
      maxPixelRatio: 2,
    })
    runtime = sceneRuntime
    const { scene, camera, controls } = sceneRuntime
    scene.background = new THREE.Color(0x030712)
    camera.position.set(9, 7.5, 10)
    controls.target.set(0, 1.35, 0)
    controls.enablePan = false
    controls.minDistance = 7
    controls.maxDistance = 22
    controls.maxPolarAngle = Math.PI * 0.48
    controls.rotateSpeed = 0.55

    let cameraLayout: 'wide' | 'narrow' | undefined
    sceneRuntime.setResizeHandler(({ width, height }) => {
      const nextLayout = width / height < 1.15 ? 'narrow' : 'wide'
      if (nextLayout === cameraLayout) return
      cameraLayout = nextLayout

      const direction = camera.position.clone().sub(controls.target).normalize()
      const distance = nextLayout === 'narrow' ? 18.5 : 14.5
      camera.position.copy(controls.target).addScaledVector(direction, distance)
      controls.update()
    })

    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x111827, 1.7))
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5)
    keyLight.position.set(5, 9, 7)
    scene.add(keyLight)

    const width = current.xDomain[1] - current.xDomain[0]
    const depth = current.zDomain[1] - current.zDomain[0]
    const geometry = new THREE.PlaneGeometry(
      width,
      depth,
      current.segments,
      current.segments,
    )
    geometry.rotateX(-Math.PI / 2)
    geometry.translate(
      (current.xDomain[0] + current.xDomain[1]) / 2,
      0,
      (current.zDomain[0] + current.zDomain[1]) / 2,
    )
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.62,
      metalness: 0.04,
      side: THREE.DoubleSide,
    })
    const surface = new THREE.Mesh(geometry, material)
    scene.add(surface)

    const floorSize = Math.max(width, depth)
    const grid = new THREE.GridHelper(floorSize, 8, 0x64748b, 0x1f2937)
    grid.position.y = -0.04
    scene.add(grid)

    const axes = new THREE.AxesHelper(2.2)
    axes.position.y = 0.02
    scene.add(axes)

    const overlayGroup = new THREE.Group()
    scene.add(overlayGroup)

    const updateSurface = () => {
      const position = geometry.getAttribute('position')
      let color = geometry.getAttribute('color') as
        | THREE.BufferAttribute
        | undefined
      if (!color) {
        color = new THREE.BufferAttribute(
          new Float32Array(position.count * 3),
          3,
        )
        geometry.setAttribute('color', color)
      }

      const shade = new THREE.Color()
      const [valueMinimum, valueMaximum] = current.valueDomain
      for (let index = 0; index < position.count; index += 1) {
        const x = position.getX(index)
        const z = position.getZ(index)
        const value = current.evaluate(x, z, controlValue.value)
        const normalized = Math.min(
          1,
          Math.max(0, (value - valueMinimum) / (valueMaximum - valueMinimum)),
        )
        position.setY(index, value * current.verticalScale)
        shade.setHSL(0.62 - normalized * 0.53, 0.78, 0.53)
        color.setXYZ(index, shade.r, shade.g, shade.b)
      }

      position.needsUpdate = true
      color.needsUpdate = true
      geometry.computeVertexNormals()
    }

    const updateOverlays = () => {
      disposeGroupChildren(overlayGroup)

      if (current.path) {
        const selectedIndex = Math.round(controlValue.value)
        const visiblePoints = current.path.slice(0, selectedIndex + 1)
        const pathPoints = visiblePoints.map(
          (point) =>
            new THREE.Vector3(
              point.x,
              point.value * current.verticalScale + 0.08,
              point.z,
            ),
        )
        const path = createTube(pathPoints, 0xfacc15, 0.035)
        if (path) overlayGroup.add(path)

        for (const [index, point] of visiblePoints.entries()) {
          const isCurrent = index === visiblePoints.length - 1
          const marker = new THREE.Mesh(
            new THREE.SphereGeometry(isCurrent ? 0.14 : 0.065, 18, 12),
            new THREE.MeshBasicMaterial({
              color: isCurrent ? 0xffffff : 0xfacc15,
            }),
          )
          marker.position.set(
            point.x,
            point.value * current.verticalScale + 0.1,
            point.z,
          )
          overlayGroup.add(marker)
        }
      }

      const guidePoints = current.guide?.(controlValue.value)
      if (guidePoints?.length) {
        const points = guidePoints.map(
          (point) =>
            new THREE.Vector3(
              point.x,
              point.value * current.verticalScale + 0.055,
              point.z,
            ),
        )
        const guide = createTube(points, 0xffffff, 0.045)
        if (guide) overlayGroup.add(guide)
      }
    }

    updateVisualization = () => {
      if (current.control.kind === 'bias') updateSurface()
      updateOverlays()
    }
    updateSurface()
    updateOverlays()

    let playbackElapsed = 0
    sceneRuntime.setFrameHandler((delta) => {
      if (!playing.value || current.control.kind !== 'iteration') return
      playbackElapsed += delta
      if (playbackElapsed < 0.42) return
      playbackElapsed = 0

      const nextValue = controlValue.value + current.control.step
      if (nextValue >= current.control.maximum) {
        controlValue.value = current.control.maximum
        playing.value = false
        return
      }
      controlValue.value = nextValue
    })

    ready.value = true
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : '3D 数学图初始化失败。'
  }
})

onBeforeUnmount(() => {
  updateVisualization = undefined
  runtime?.dispose()
  runtime = undefined
})
</script>

<template>
  <figure
    v-if="definition"
    class="math-figure-3d not-prose my-6 overflow-hidden rounded-xl border border-gray-200 bg-white font-sans !text-left dark:border-gray-800 dark:bg-gray-950"
  >
    <header
      class="border-b border-gray-200 px-3 py-2.5 dark:border-gray-800 sm:px-4"
    >
      <div class="flex items-center gap-2">
        <span
          class="text-sm font-semibold leading-5 text-gray-950 dark:text-gray-50"
        >
          {{ definition.title }}
        </span>
        <span
          class="hidden shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium tracking-wide text-gray-500 uppercase sm:inline-flex dark:bg-gray-900 dark:text-gray-400"
        >
          WebGL 2
        </span>
      </div>
      <span
        class="mt-0.5 block text-xs leading-5 text-gray-500 dark:text-gray-500"
      >
        {{ definition.description }}
      </span>
    </header>

    <div class="relative h-[300px] overflow-hidden bg-gray-950 sm:h-[360px]">
      <div
        class="absolute inset-x-0 top-0 z-10 flex h-9 items-center justify-between gap-3 border-b border-white/10 bg-gray-950 px-3"
      >
        <span
          class="min-w-0 truncate font-mono text-[10px] leading-4 text-gray-400 sm:text-[11px]"
        >
          {{ definition.formula }}
        </span>
        <output
          :for="`math-figure-3d-${preset}`"
          class="shrink-0 font-mono text-[10px] leading-4 tabular-nums text-gray-300 sm:text-[11px]"
          :aria-label="statusText"
          aria-live="polite"
        >
          <span class="sm:hidden">{{ compactStatusText }}</span>
          <span class="hidden sm:inline">{{ statusText }}</span>
        </output>
      </div>

      <div
        ref="sceneContainer"
        class="absolute inset-x-0 bottom-0 top-9"
        role="img"
        :aria-label="`${definition.title}：${definition.caption}`"
      />

      <div
        class="pointer-events-none absolute right-3 bottom-3 hidden flex-wrap justify-end gap-1.5 text-[10px] text-gray-300 sm:flex"
        aria-hidden="true"
      >
        <span class="rounded bg-gray-950/75 px-2 py-1 backdrop-blur">
          X · {{ definition.xLabel }}
        </span>
        <span class="rounded bg-gray-950/75 px-2 py-1 backdrop-blur">
          Z · {{ definition.zLabel }}
        </span>
        <span class="rounded bg-gray-950/75 px-2 py-1 backdrop-blur">
          高度 · {{ definition.valueLabel }}
        </span>
      </div>

      <div
        v-if="!ready && !errorMessage"
        class="pointer-events-none absolute inset-x-0 bottom-0 top-9 grid place-items-center text-sm text-gray-400"
      >
        正在生成曲面…
      </div>

      <div
        v-if="errorMessage"
        class="absolute inset-x-0 bottom-0 top-9 grid place-items-center bg-gray-950 p-6"
      >
        <UAlert
          class="max-w-lg"
          color="error"
          variant="subtle"
          title="无法显示 3D 数学图"
          :description="errorMessage"
        />
      </div>
    </div>

    <div
      v-if="interactive"
      class="border-t border-gray-100 px-3 py-3 dark:border-gray-900 sm:px-4"
    >
      <div class="flex items-center gap-3">
        <UButton
          v-if="definition.control.kind === 'iteration'"
          :icon="playing ? 'i-lucide-pause' : 'i-lucide-play'"
          color="neutral"
          variant="soft"
          size="sm"
          :aria-label="playing ? '暂停梯度下降' : '播放梯度下降'"
          @click="togglePlayback"
        />
        <label
          :for="`math-figure-3d-${preset}`"
          class="shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {{ definition.control.label }}
        </label>
        <input
          :id="`math-figure-3d-${preset}`"
          v-model.number="controlValue"
          type="range"
          class="math-figure-3d-range min-w-0 flex-1"
          :min="definition.control.minimum"
          :max="definition.control.maximum"
          :step="definition.control.step"
          :aria-valuetext="statusText"
          @input="playing = false"
        />
        <output
          :for="`math-figure-3d-${preset}`"
          class="w-10 text-right font-mono text-xs tabular-nums text-gray-600 dark:text-gray-400"
        >
          {{ formatControlValue(controlValue) }}
        </output>
        <UButton
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="重置参数"
          @click="resetControl"
        />
      </div>
      <span
        class="mt-2 hidden text-xs text-gray-500 sm:block dark:text-gray-500"
      >
        拖动画面旋转，滚轮或双指缩放。
      </span>
    </div>

    <figcaption
      class="border-t border-gray-200 bg-gray-50/70 px-3 py-2.5 text-xs leading-5 text-gray-600 !mt-0 !text-left dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400 sm:px-4"
    >
      {{ definition.caption }}
    </figcaption>
  </figure>

  <UAlert
    v-else
    class="not-prose my-8"
    color="warning"
    variant="subtle"
    title="无法显示 3D 数学图"
    :description="`未知的图形预设：${preset}`"
  />
</template>

<style scoped>
.math-figure-3d-range {
  accent-color: var(--ui-primary);
}

.math-figure-3d-range:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 4px;
}
</style>
