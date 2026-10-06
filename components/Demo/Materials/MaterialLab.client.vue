<script setup lang="ts">
import * as THREE from 'three'
import { createRenderOnDemand } from '~/utils/renderOnDemand'
import {
  materialSamples,
  materialVertexShader,
  materialFragmentShader,
  type PrintMode,
  type SurfaceId,
} from '~/utils/materialLab'

import {
  createMaterialLayers,
  getMaterialPipeline,
  resolveMaterialPipeline,
  type PipelineMode,
  type MaterialNode,
  type MaterialLayer,
} from '~/utils/materialPipeline'

const { t } = useI18n()
const surface = ref<SurfaceId>('book')
const printMode = ref<PrintMode>('type')
const pipelineMode = ref<PipelineMode>('final')
const selectedNode = ref<MaterialNode>('base')
const layers = reactive(createMaterialLayers())
const seed = ref(27)
const pipeline = computed(() =>
  resolveMaterialPipeline(
    surface.value,
    pipelineMode.value,
    selectedNode.value,
    layers,
  ),
)
const setPipelineMode = (mode: PipelineMode) => {
  pipelineMode.value = mode
  if (mode === 'steps') selectNode('base')
}
const toggleLayer = (layer: MaterialLayer) => {
  layers[layer] = !layers[layer]
}
const restoreLayers = () => Object.assign(layers, createMaterialLayers())
const previewLabel = computed(() => {
  if (gpuState.value === 'fallback')
    return t('materialLab.pipeline.preview.fallback')
  if (pipelineMode.value === 'final' || pipeline.value.node.id === 'print')
    return t('materialLab.pipeline.preview.final')
  if (
    pipelineMode.value === 'steps' &&
    (pipeline.value.node.id === 'lighting' ||
      pipeline.value.node.id === 'highlights')
  )
    return t('materialLab.pipeline.preview.lit')
  return t(`materialLab.pipeline.nodes.${pipeline.value.node.id}.output`)
})
const light = ref(135)
const texture = ref(100)
const tilt = reactive({ x: -7, y: -12 })
const dragging = ref(false)
const gpuState = ref<'loading' | 'ready' | 'fallback'>('loading')
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const sheet = useTemplateRef<HTMLElement>('sheet')
const selectNode = async (node: MaterialNode) => {
  selectedNode.value = node
  if (pipelineMode.value === 'final') return
  await nextTick()
  const bounds = sheet.value?.getBoundingClientRect()
  if (bounds && (bounds.top < 80 || bounds.bottom > window.innerHeight - 30)) {
    sheet.value?.scrollIntoView({
      block: 'center',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    })
  }
}
const moveStep = (offset: number) => {
  const node = getMaterialPipeline(surface.value)[pipeline.value.index + offset]
  if (node) selectNode(node.id)
}
const sample = computed(() =>
  materialSamples.find((item) => item.id === surface.value)!,
)
const printModes: PrintMode[] = ['blank', 'type', 'pattern']
const cardStyle = computed(() => ({
  transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
  '--light-angle': `${light.value}deg`,
}))
const patternPaths = Array.from({ length: 26 }, (_sample, i) => {
  const radius = 55 + i * 2.8
  const points = Array.from({ length: 241 }, (_point, j) => {
    const angle = (j / 240) * Math.PI * 2
    const wave = radius + 11 * Math.sin(angle * 8 + i * 0.12)
    return `${j === 0 ? 'M' : 'L'}${150 + Math.cos(angle) * wave},${150 + Math.sin(angle) * wave}`
  })
  return `${points.join(' ')}Z`
})

let renderer: THREE.WebGLRenderer | undefined
let geometry: THREE.PlaneGeometry | undefined
let shader: THREE.ShaderMaterial | undefined
let observer: ResizeObserver | undefined
let scene: THREE.Scene | undefined
let camera: THREE.Camera | undefined
let drawing: ReturnType<typeof createRenderOnDemand> | undefined
let disposed = false
let dragStart:
  | { id: number; x: number; y: number; tiltX: number; tiltY: number }
  | undefined

const render = () => {
  if (
    disposed ||
    gpuState.value !== 'ready' ||
    !renderer ||
    !shader ||
    !scene ||
    !camera
  )
    return
  shader.uniforms.uSurface!.value = sample.value.shader
  shader.uniforms.uTexture!.value = texture.value / 100
  shader.uniforms.uSeed!.value = seed.value
  shader.uniforms.uOutput!.value = pipeline.value.output
  shader.uniforms.uLayers!.value.set(
    Number(pipeline.value.active.fibers),
    Number(pipeline.value.active.relief),
    Number(pipeline.value.active.lighting),
    Number(pipeline.value.active.spectrum),
  )
  shader.uniforms.uGrooves!.value = Number(pipeline.value.active.grooves)
  shader.uniforms.uLight!.value = (light.value * Math.PI) / 180
  shader.uniforms.uTilt!.value.set(
    (tilt.x * Math.PI) / 180,
    (tilt.y * Math.PI) / 180,
  )
  renderer.render(scene, camera)
}
const requestRender = () => {
  if (gpuState.value === 'ready') drawing?.invalidate()
}
const limitAngle = (angle: number) => Math.max(-32, Math.min(32, angle))
const resetView = () => {
  tilt.x = -7
  tilt.y = -12
}
const startDrag = (event: PointerEvent) => {
  if (!event.isPrimary || event.button !== 0) return
  dragStart = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    tiltX: tilt.x,
    tiltY: tilt.y,
  }
  dragging.value = true
  sheet.value?.setPointerCapture(event.pointerId)
  sheet.value?.focus({ preventScroll: true })
}
const moveDrag = (event: PointerEvent) => {
  if (!dragStart || dragStart.id !== event.pointerId) return
  tilt.x = limitAngle(dragStart.tiltX - (event.clientY - dragStart.y) * 0.22)
  tilt.y = limitAngle(dragStart.tiltY + (event.clientX - dragStart.x) * 0.22)
}
const stopDrag = () => {
  const pointerId = dragStart?.id
  dragStart = undefined
  dragging.value = false
  if (pointerId !== undefined && sheet.value?.hasPointerCapture(pointerId)) {
    sheet.value.releasePointerCapture(pointerId)
  }
}
const moveWithKeys = (event: KeyboardEvent) => {
  const step = event.shiftKey ? 8 : 3
  switch (event.key) {
    case 'ArrowLeft':
      tilt.y = limitAngle(tilt.y - step)
      break
    case 'ArrowRight':
      tilt.y = limitAngle(tilt.y + step)
      break
    case 'ArrowUp':
      tilt.x = limitAngle(tilt.x + step)
      break
    case 'ArrowDown':
      tilt.x = limitAngle(tilt.x - step)
      break
    case 'Home':
      resetView()
      break
    default:
      return
  }
  event.preventDefault()
}
const contextLost = (event: Event) => {
  event.preventDefault()
  gpuState.value = 'fallback'
  drawing?.cancel()
}
const contextRestored = () => {
  gpuState.value = 'ready'
  requestRender()
}

watch(surface, () => {
  if (
    !getMaterialPipeline(surface.value).some(
      (node) => node.id === selectedNode.value,
    )
  )
    selectedNode.value = 'base'
})
watch(
  [surface, light, texture, seed, pipeline, () => tilt.x, () => tilt.y],
  requestRender,
)

watch(
  [canvas, sheet],
  () => {
    if (!canvas.value || !sheet.value || renderer || disposed) return
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas.value,
        antialias: false,
        powerPreference: 'low-power',
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.debug.onShaderError = () => {
        gpuState.value = 'fallback'
      }
      scene = new THREE.Scene()
      camera = new THREE.Camera()
      geometry = new THREE.PlaneGeometry(2, 2)
      shader = new THREE.ShaderMaterial({
        vertexShader: materialVertexShader,
        fragmentShader: materialFragmentShader,
        uniforms: {
          uSurface: { value: 0 },
          uTexture: { value: 1 },
          uLight: { value: 0 },
          uSeed: { value: 27 },
          uOutput: { value: 0 },
          uLayers: { value: new THREE.Vector4(1, 1, 1, 1) },
          uGrooves: { value: 1 },
          uTilt: { value: new THREE.Vector2() },
        },
        depthTest: false,
        depthWrite: false,
      })
      scene.add(new THREE.Mesh(geometry, shader))
      drawing = createRenderOnDemand(render, {
        request: (callback) => requestAnimationFrame(callback),
        cancel: (handle) => cancelAnimationFrame(handle),
      })
      canvas.value.addEventListener('webglcontextlost', contextLost)
      canvas.value.addEventListener('webglcontextrestored', contextRestored)
      gpuState.value = 'ready'
      observer = new ResizeObserver(([entry]) => {
        if (!entry || !renderer) return
        renderer.setSize(
          Math.max(1, entry.contentRect.width),
          Math.max(1, entry.contentRect.height),
          false,
        )
        requestRender()
      })
      observer.observe(sheet.value)
    } catch {
      gpuState.value = 'fallback'
      renderer?.dispose()
      shader?.dispose()
      geometry?.dispose()
    }
  },
  { flush: 'post' },
)

onBeforeUnmount(() => {
  disposed = true
  stopDrag()
  drawing?.dispose()
  observer?.disconnect()
  canvas.value?.removeEventListener('webglcontextlost', contextLost)
  canvas.value?.removeEventListener('webglcontextrestored', contextRestored)
  geometry?.dispose()
  shader?.dispose()
  renderer?.dispose()
  renderer?.forceContextLoss()
})
</script>

<template>
  <section class="material-lab" :aria-label="t('materialLab.title')">
    <div
      class="sample-picker"
      role="group"
      :aria-label="t('materialLab.choose')"
    >
      <button
        v-for="item in materialSamples"
        :key="item.id"
        type="button"
        class="sample-option"
        :class="{ selected: surface === item.id }"
        :aria-pressed="surface === item.id"
        @click="surface = item.id"
      >
        <span class="swatch" :class="`swatch-${item.id}`" aria-hidden="true" />
        <span class="sample-name">{{
          t(`materialLab.samples.${item.id}.name`)
        }}</span>
        <span class="sample-number">{{ item.number }}</span>
      </button>
    </div>

    <div class="exploration-layout">
      <DemoMaterialsMaterialPipeline
        :surface="surface"
        :mode="pipelineMode"
        :selected="selectedNode"
        :layers="layers"
        :available="gpuState === 'ready'"
        @mode="setPipelineMode"
        @select="selectNode"
        @toggle="toggleLayer"
        @reset="restoreLayers"
      />
      <div class="workbench">
        <div class="stage">
          <div class="stage-top">
            <span
              >{{ sample.number }} /
              {{ t(`materialLab.samples.${surface}.name`) }}</span
            >
            <button type="button" class="reset-button" @click="resetView">
              <UIcon name="i-lucide-rotate-ccw" class="size-3.5" />
              {{ t('materialLab.reset') }}
            </button>
          </div>
          <div class="preview-toolbar">
            <p class="preview-caption" role="status">
              {{ t('materialLab.pipeline.preview.label') }} · {{ previewLabel }}
            </p>
            <div v-if="pipelineMode === 'steps'" class="preview-steps">
              <button
                type="button"
                :disabled="gpuState !== 'ready' || pipeline.index === 0"
                @click="moveStep(-1)"
              >
                {{ t('materialLab.pipeline.previous') }}
              </button>
              <span
                >{{ pipeline.index + 1 }} /
                {{ getMaterialPipeline(surface).length }}</span
              >
              <button
                type="button"
                :disabled="
                  gpuState !== 'ready' ||
                  pipeline.index === getMaterialPipeline(surface).length - 1
                "
                @click="moveStep(1)"
              >
                {{ t('materialLab.pipeline.next') }}
              </button>
            </div>
          </div>
          <div class="sheet-space">
            <div
              ref="sheet"
              class="sheet"
              :class="[`sheet-${surface}`, { dragging }]"
              :style="cardStyle"
              tabindex="0"
              role="group"
              :aria-label="
                t('materialLab.sheetLabel', {
                  material: t(`materialLab.samples.${surface}.name`),
                })
              "
              aria-describedby="material-keyboard-hint"
              @pointerdown="startDrag"
              @pointermove="moveDrag"
              @pointerup="stopDrag"
              @pointercancel="stopDrag"
              @lostpointercapture="stopDrag"
              @keydown="moveWithKeys"
            >
              <div class="fallback-surface" aria-hidden="true" />
              <canvas
                ref="canvas"
                class="surface-canvas"
                :class="{ visible: gpuState === 'ready' }"
                aria-hidden="true"
              />
              <div
                v-if="printMode !== 'blank' && pipeline.showPrint"
                class="print-layer"
                :class="`print-${printMode}`"
              >
                <div class="print-header">
                  <span>{{ t('materialLab.print.collection') }}</span
                  ><span>{{ sample.number }}</span>
                </div>
                <template v-if="printMode === 'type'">
                  <div class="type-center">
                    <span class="type-specimen" aria-hidden="true">Aa</span>
                    <h2>{{ t('materialLab.print.title') }}</h2>
                    <p>{{ t('materialLab.print.body') }}</p>
                  </div>
                  <div class="type-alphabet" aria-hidden="true">
                    ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />abcdefghijklmnopqrstuvwxyz<br />0123456789
                    &amp; ? !
                  </div>
                </template>
                <template v-else>
                  <svg
                    class="guilloche"
                    viewBox="0 0 300 300"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      v-for="(path, i) in patternPaths"
                      :key="i"
                      :d="path"
                      stroke="currentColor"
                      stroke-width="0.45"
                    />
                    <circle
                      cx="150"
                      cy="150"
                      r="28"
                      stroke="currentColor"
                      stroke-width="0.7"
                    />
                    <path
                      d="M135 150h30M150 135v30"
                      stroke="currentColor"
                      stroke-width="0.7"
                    />
                  </svg>
                  <p class="pattern-caption">
                    {{ t('materialLab.print.pattern') }}
                  </p>
                </template>
                <div class="print-footer">
                  <span>{{ t('materialLab.print.footer') }}</span
                  ><span>2026</span>
                </div>
              </div>
            </div>
          </div>
          <div class="stage-bottom">
            <span
              ><UIcon name="i-lucide-hand" class="size-3.5" />{{
                t('materialLab.drag')
              }}</span
            >
            <span class="angle-readout" aria-hidden="true"
              >X {{ Math.round(tilt.x) }}° · Y {{ Math.round(tilt.y) }}°</span
            >
          </div>
        </div>

        <aside class="controls">
          <div class="sample-story" aria-live="polite">
            <p class="control-eyebrow">{{ t('materialLab.observation') }}</p>
            <h2>{{ t(`materialLab.samples.${surface}.name`) }}</h2>
            <p>{{ t(`materialLab.samples.${surface}.description`) }}</p>
          </div>
          <fieldset class="control-section">
            <legend>{{ t('materialLab.printMode') }}</legend>
            <div class="print-options">
              <button
                v-for="mode in printModes"
                :key="mode"
                type="button"
                :aria-pressed="printMode === mode"
                :class="{ active: printMode === mode }"
                @click="printMode = mode"
              >
                {{ t(`materialLab.modes.${mode}`) }}
              </button>
            </div>
          </fieldset>
          <div class="control-section">
            <label for="material-light"
              >{{ t('materialLab.light')
              }}<output for="material-light">{{ light }}°</output></label
            >
            <input
              id="material-light"
              v-model.number="light"
              :aria-label="t('materialLab.light')"
              type="range"
              min="0"
              max="360"
              step="1"
            />
            <p class="control-help">{{ t('materialLab.lightHint') }}</p>
          </div>
          <div class="control-section">
            <label for="material-texture"
              >{{ t('materialLab.texture')
              }}<output for="material-texture">{{ texture }}%</output></label
            >
            <input
              id="material-texture"
              v-model.number="texture"
              :aria-label="t('materialLab.texture')"
              :disabled="gpuState !== 'ready'"
              type="range"
              min="0"
              max="180"
              step="5"
            />
          </div>
          <div class="control-section">
            <label for="material-seed">{{
              t('materialLab.pipeline.seed')
            }}</label>
            <input
              id="material-seed"
              v-model.number="seed"
              type="range"
              min="0"
              max="999"
              step="1"
              :disabled="gpuState !== 'ready'"
            />
            <p class="control-help">
              {{ t('materialLab.pipeline.seedHint', { seed }) }}
            </p>
          </div>
          <p id="material-keyboard-hint" class="keyboard-hint">
            {{ t('materialLab.keyboard') }}
          </p>
          <p v-if="gpuState === 'fallback'" class="fallback-note" role="status">
            {{ t('materialLab.fallback') }}
          </p>
        </aside>
      </div>
    </div>
    <p class="series-note">{{ t('materialLab.seriesNote') }}</p>
  </section>
</template>

<style scoped>
.material-lab {
  --lab-ink: #292c2b;
  --lab-muted: #747671;
  --lab-border: #e0e1da;
  --lab-panel: #fff;
  --lab-active: #e9ece4;
  --lab-focus: #66755e;
  color: var(--lab-ink);
}
.sample-picker {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 18px;
}
.sample-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--lab-border);
  border-radius: 10px;
  text-align: left;
  background: var(--lab-panel);
  cursor: pointer;
}
.sample-option.selected {
  border-color: #677265;
  box-shadow: inset 0 0 0 1px #677265;
}
.sample-option:hover {
  border-color: #899184;
}
.sample-name {
  font-size: 13px;
  font-weight: 500;
}
.sample-number {
  margin-left: auto;
  color: var(--lab-muted);
  font-size: 10px;
  font-family: monospace;
}
.swatch {
  flex: 0 0 30px;
  height: 36px;
  border-radius: 2px;
  box-shadow:
    inset 0 0 0 1px #0000000c,
    1px 2px 3px #00000012;
}
.swatch-book {
  background: #e9dfc8;
}
.swatch-kraft {
  background:
    repeating-linear-gradient(82deg, #ad865733 0 1px, transparent 1px 4px),
    #bd986b;
}
.swatch-cotton {
  background:
    repeating-radial-gradient(
      ellipse at 20% 40%,
      #b4ac971c 0 1px,
      transparent 1px 3px
    ),
    #e8e3d6;
}
.swatch-foil {
  background: linear-gradient(
    135deg,
    #aec8bd,
    #b2a5d5 30%,
    #f0d2a2 55%,
    #afd5cd 80%,
    #b4a1c4
  );
}
.workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 284px;
  border: 1px solid var(--lab-border);
  border-radius: 14px;
  overflow: hidden;
}
.stage {
  min-width: 0;
  background-color: #eeefea;
  background-image: radial-gradient(#858f7d38 0.65px, transparent 0.65px);
  background-size: 18px 18px;
}
.stage-top,
.stage-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 24px;
  color: #626b5e;
  font-size: 11px;
}
.stage-top {
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.reset-button,
.stage-bottom > span:first-child {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.reset-button {
  cursor: pointer;
  padding: 5px 0 5px 8px;
}
.reset-button:hover {
  color: #222c1f;
}
.angle-readout {
  font-family: monospace;
  white-space: nowrap;
}
.preview-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
}
.preview-steps {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--lab-muted);
  font-size: 10px;
}
.preview-steps button {
  cursor: pointer;
  border: 1px solid var(--lab-border);
  border-radius: 5px;
  padding: 4px 6px;
  background: var(--lab-panel);
}
.preview-steps button:disabled {
  opacity: 0.4;
  cursor: default;
}
.preview-caption {
  color: var(--lab-muted);
  text-align: center;
  font-size: 11px;
  padding: 0 16px;
}
.sheet-space {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 440px;
  perspective: 1100px;
  padding: 26px 40px;
}
.sheet {
  position: relative;
  flex-shrink: 0;
  width: 284px;
  aspect-ratio: 3 / 4;
  border-radius: 2px;
  cursor: grab;
  touch-action: none;
  user-select: none;
  box-shadow:
    1px 1px 0 #a39a87,
    2px 2px 0 #cec7b7,
    3px 3px 0 #a39a87,
    12px 20px 25px -12px #3236274a,
    28px 40px 70px -24px #32362750;
}
.sheet.dragging {
  cursor: grabbing;
}
.sheet:focus-visible {
  outline: 2px solid #66755e;
  outline-offset: 12px;
}
.surface-canvas,
.fallback-surface {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  pointer-events: none;
}
.surface-canvas {
  opacity: 0;
}
.surface-canvas.visible {
  opacity: 1;
}
.fallback-surface {
  background: #e9dfc8;
  background-image: repeating-radial-gradient(
    ellipse at 30% 10%,
    #59493309 0 1px,
    transparent 1px 3px
  );
}
.sheet-kraft .fallback-surface {
  background-color: #bd986b;
}
.sheet-cotton .fallback-surface {
  background-color: #e8e3d6;
  background-size: 6px 9px;
}
.sheet-foil .fallback-surface {
  background-image: linear-gradient(
    var(--light-angle),
    #9eb8b0,
    #a799bf 25%,
    #ecd1a1 48%,
    #a8cbc4 72%,
    #b2a3c7
  );
}
.print-layer {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  padding: 24px;
  color: #353a36;
  pointer-events: none;
}
.sheet-kraft .print-layer {
  color: #39291b;
}
.sheet-foil .print-layer {
  color: #252d37;
}
.print-header,
.print-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 8px;
  text-transform: uppercase;
  letter-spacing: 0.13em;
}
.print-header {
  padding-bottom: 10px;
  border-bottom: 0.5px solid currentColor;
}
.print-footer {
  margin-top: auto;
  padding-top: 10px;
  border-top: 0.5px solid currentColor;
  font-size: 7px;
}
.type-center {
  margin-top: 28px;
}
.type-specimen {
  display: block;
  font-family: 'Source Serif 4', 'Noto Serif SC', Georgia, serif;
  font-size: 82px;
  line-height: 1.05;
  letter-spacing: -5px;
}
.type-center h2 {
  font-family: 'Noto Serif SC', 'Noto Serif JP', 'Source Serif 4', serif;
  font-size: 21px;
  margin-top: 14px;
  line-height: 1.4;
}
.type-center p {
  margin-top: 8px;
  max-width: 190px;
  font-size: 9px;
  line-height: 1.8;
  opacity: 0.8;
}
.type-alphabet {
  margin-top: auto;
  margin-bottom: 18px;
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 10px;
  line-height: 1.8;
  letter-spacing: 0.05em;
}
.guilloche {
  width: 100%;
  margin: auto 0;
}
.pattern-caption {
  text-align: center;
  margin-bottom: 22px;
  font-family: serif;
  font-size: 11px;
  letter-spacing: 0.12em;
}
.controls {
  padding: 27px 24px 24px;
  background: var(--lab-panel);
  border-left: 1px solid var(--lab-border);
}
.control-eyebrow {
  font-size: 10px;
  letter-spacing: 0.15em;
  color: var(--lab-muted);
  text-transform: uppercase;
}
.sample-story h2 {
  margin-top: 12px;
  font-family: 'Noto Serif SC', 'Noto Serif JP', 'Source Serif 4', serif;
  font-size: 24px;
  line-height: 1.4;
}
.sample-story > p:last-child {
  margin-top: 10px;
  color: var(--lab-muted);
  font-size: 12px;
  line-height: 1.9;
  min-height: 70px;
}
.control-section {
  margin-top: 24px;
  border: 0;
  padding: 0;
  min-width: 0;
}
.control-section legend,
.control-section label {
  font-size: 12px;
  font-weight: 500;
}
.control-section label {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.control-section output {
  color: var(--lab-muted);
  font-size: 11px;
  font-weight: 400;
  font-family: monospace;
}
.print-options {
  display: flex;
  gap: 3px;
  border: 1px solid var(--lab-border);
  border-radius: 7px;
  padding: 3px;
  margin-top: 10px;
}
.print-options button {
  flex: 1;
  padding: 7px 3px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}
.print-options button.active {
  background: #e9ece4;
  color: #3e5037;
}
.control-section input {
  display: block;
  width: 100%;
  margin-top: 16px;
  accent-color: #607357;
  cursor: pointer;
}
.control-help {
  margin-top: 9px;
  color: var(--lab-muted);
  font-size: 10px;
  line-height: 1.7;
}
.keyboard-hint {
  border-top: 1px solid var(--lab-border);
  padding-top: 18px;
  margin-top: 24px;
  font-size: 10px;
  line-height: 1.8;
  color: var(--lab-muted);
}
.fallback-note {
  margin-top: 12px;
  font-size: 11px;
  line-height: 1.7;
  color: var(--lab-muted);
}
.series-note {
  color: var(--lab-muted);
  font-size: 11px;
  line-height: 1.8;
  margin-top: 16px;
}
button:focus-visible,
input:focus-visible {
  outline: 2px solid #66755e;
  outline-offset: 4px;
}
:global(.dark .material-lab) {
  --lab-ink: #e2e3de;
  --lab-muted: #a3a79d;
  --lab-border: #3e443a;
  --lab-panel: #232821;
  --lab-active: #343e2f;
  --lab-focus: #a4b298;
}
:global(.dark .material-lab .stage) {
  background-color: #343c31;
  background-image: radial-gradient(#a3b59730 0.65px, transparent 0.65px);
}
:global(.dark .material-lab .stage-top),
:global(.dark .material-lab .stage-bottom) {
  color: #b4bdae;
}
:global(.dark .material-lab .sample-option.selected) {
  border-color: #a4b298;
  box-shadow: inset 0 0 0 1px #a4b298;
}
:global(.dark .material-lab .reset-button:hover) {
  color: #fff;
}
@media (min-width: 1000px) {
  .exploration-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 20px;
    align-items: start;
  }
  .exploration-layout > :first-child {
    order: 2;
    position: sticky;
    top: 80px;
  }
  .workbench {
    order: 1;
    grid-template-columns: 1fr;
  }
  .controls {
    border-left: 0;
    border-top: 1px solid var(--lab-border);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }
  .sample-story,
  .keyboard-hint,
  .fallback-note {
    grid-column: 1 / -1;
  }
  .sample-story > p:last-child {
    min-height: 0;
  }
  .control-section,
  .keyboard-hint {
    margin-top: 0;
  }
}
@media (max-width: 760px) {
  .workbench {
    grid-template-columns: 1fr;
  }
  .controls {
    border-left: 0;
    border-top: 1px solid var(--lab-border);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    padding: 24px;
  }
  .sample-story,
  .keyboard-hint,
  .fallback-note {
    grid-column: 1 / -1;
  }
  .sample-story > p:last-child {
    min-height: 0;
  }
  .control-section {
    margin-top: 0;
  }
  .keyboard-hint {
    margin-top: 0;
  }
  .sample-picker {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .sheet-space {
    height: 430px;
  }
}
@media (max-width: 400px) {
  .sample-option {
    padding: 10px;
    gap: 8px;
  }
  .sheet {
    width: 248px;
  }
  .sheet-space {
    height: 385px;
    padding: 24px;
  }
  .stage-top,
  .stage-bottom {
    padding: 18px 16px;
  }
  .controls {
    grid-template-columns: 1fr;
    gap: 22px;
    padding: 22px;
  }
  .type-center {
    margin-top: 18px;
  }
  .type-specimen {
    font-size: 67px;
  }
  .type-center h2 {
    font-size: 19px;
    margin-top: 10px;
  }
  .type-alphabet {
    font-size: 8px;
    margin-bottom: 10px;
  }
}
</style>
