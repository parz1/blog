<script setup lang="ts">
import { useFaceCamera } from '~/composables/face-lab/useFaceCamera.client'
import { useFaceLandmarker } from '~/composables/face-lab/useFaceLandmarker.client'
import { useFaceState } from '~/composables/face-lab/useFaceState.client'
import { useLive2DStage } from '~/composables/live2d/useLive2DStage.client'

const { t } = useI18n()
const container = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()
const video = ref<HTMLVideoElement>()
const mode = ref<'pointer' | 'camera'>('pointer')
const camera = useFaceCamera()
const detector = useFaceLandmarker()
const face = useFaceState()
const stage = useLive2DStage({
  container,
  canvas,
  face: face.state,
  mode: readonly(mode),
})

const starting = ref(false)
const cameraError = ref('')
const actionPending = ref(false)
let disposed = false
let cameraRequest = 0

const active = computed(() => camera.state.value === 'streaming')
const ready = computed(() => stage.status.value === 'ready')
const cameraStatus = computed(() => {
  if (cameraError.value || detector.state.value === 'error') return 'error'
  if (starting.value) return 'loading'
  if (!active.value) return 'idle'
  if (!face.tracked.value) return 'searching'
  return face.calibrated.value ? 'calibrated' : 'tracked'
})

watch(
  () => detector.snapshot.value,
  (snapshot) => face.update(snapshot, performance.now()),
)

const clearCamera = () => {
  detector.dispose()
  camera.stop()
  face.clear()
}

watch(
  () => detector.state.value,
  (state) => {
    if (state !== 'error' || starting.value || disposed) return
    cameraError.value =
      detector.errorMessage.value || t('live2dLab.camera.error')
    clearCamera()
  },
)

const stopCamera = () => {
  cameraRequest += 1
  clearCamera()
  cameraError.value = ''
  mode.value = 'pointer'
}

const selectPointer = () => {
  if (starting.value) return
  stopCamera()
}

const startCamera = async () => {
  const preview = video.value
  if (!preview || starting.value || disposed) return

  const request = ++cameraRequest
  starting.value = true
  cameraError.value = ''
  mode.value = 'camera'

  try {
    await camera.start(preview)
    if (disposed || request !== cameraRequest) {
      clearCamera()
      return
    }

    await detector.start(preview)
    if (disposed || request !== cameraRequest) clearCamera()
  } catch (error) {
    const message =
      camera.errorMessage.value ||
      detector.errorMessage.value ||
      (error instanceof Error ? error.message : String(error))
    clearCamera()
    if (!disposed && request === cameraRequest) cameraError.value = message
  } finally {
    starting.value = false
  }
}

const runStageAction = async (action: () => Promise<void>) => {
  if (actionPending.value || !ready.value) return
  actionPending.value = true
  try {
    await action()
  } finally {
    actionPending.value = false
  }
}

onBeforeUnmount(() => {
  disposed = true
  stopCamera()
})
</script>

<template>
  <section class="live2d-lab" aria-labelledby="live2d-lab-title">
    <header class="lab-intro">
      <h1 id="live2d-lab-title">{{ t('live2dLab.title') }}</h1>
      <p>{{ t('live2dLab.description') }}</p>
    </header>

    <div class="lab-frame">
      <section class="stage-panel" :aria-label="t('live2dLab.stage')">
        <div class="stage-toolbar">
          <div class="stage-status" aria-live="polite">
            <i :data-state="stage.status.value" aria-hidden="true" />
            <span>{{ t(`live2dLab.status.${stage.status.value}`) }}</span>
          </div>
          <span class="fps">{{
            t('live2dLab.fps', { value: stage.fps.value.toFixed(0) })
          }}</span>
        </div>

        <div
          ref="container"
          class="avatar-stage"
          :aria-busy="stage.status.value === 'loading'"
        >
          <canvas
            :key="stage.canvasKey.value"
            ref="canvas"
            :aria-label="t('live2dLab.stage')"
          />

          <div
            v-if="stage.status.value !== 'ready'"
            class="stage-message"
            aria-live="polite"
          >
            <UIcon
              :name="
                stage.status.value === 'error'
                  ? 'i-lucide-triangle-alert'
                  : 'i-lucide-loader-circle'
              "
              :class="{ 'loading-icon': stage.status.value === 'loading' }"
              aria-hidden="true"
            />
            <strong>{{ t(`live2dLab.status.${stage.status.value}`) }}</strong>
            <p v-if="stage.errorMessage.value" role="alert">
              {{ stage.errorMessage.value }}
            </p>
            <UButton
              v-if="stage.status.value === 'error'"
              icon="i-lucide-refresh-cw"
              variant="soft"
              @click="stage.retry"
            >
              {{ t('live2dLab.actions.retry') }}
            </UButton>
          </div>

          <p v-if="ready" class="stage-hint">
            <UIcon
              :name="
                mode === 'pointer'
                  ? 'i-lucide-mouse-pointer-2'
                  : 'i-lucide-camera'
              "
              aria-hidden="true"
            />
            {{ t(`live2dLab.mode.${mode}Hint`) }}
          </p>
        </div>
      </section>

      <aside class="controls-panel" :aria-label="t('live2dLab.controls')">
        <p v-if="ready && stage.errorMessage.value" role="alert">
          {{ stage.errorMessage.value }}
        </p>
        <section class="control-section">
          <h2>{{ t('live2dLab.mode.label') }}</h2>
          <div
            class="mode-switch"
            role="group"
            :aria-label="t('live2dLab.mode.label')"
          >
            <button
              type="button"
              :aria-pressed="mode === 'pointer'"
              :disabled="starting"
              @click="selectPointer"
            >
              <UIcon name="i-lucide-mouse-pointer-2" aria-hidden="true" />
              {{ t('live2dLab.mode.pointer') }}
            </button>
            <button
              type="button"
              :aria-pressed="mode === 'camera'"
              :disabled="starting"
              @click="mode = 'camera'"
            >
              <UIcon name="i-lucide-camera" aria-hidden="true" />
              {{ t('live2dLab.mode.camera') }}
            </button>
          </div>
          <p class="control-description">
            {{ t(`live2dLab.mode.${mode}Hint`) }}
          </p>

          <div v-if="mode === 'camera'" class="camera-actions">
            <UButton
              v-if="!active"
              icon="i-lucide-camera"
              :loading="starting"
              :disabled="!ready"
              @click="startCamera"
            >
              {{ t('live2dLab.actions.startCamera') }}
            </UButton>
            <template v-else>
              <UButton
                icon="i-lucide-crosshair"
                :disabled="starting || !face.tracked.value"
                @click="face.calibrate"
              >
                {{
                  t(
                    `live2dLab.actions.${face.calibrated.value ? 'calibrated' : 'calibrate'}`,
                  )
                }}
              </UButton>
              <UButton
                icon="i-lucide-square"
                color="neutral"
                variant="soft"
                :disabled="starting"
                @click="stopCamera"
              >
                {{ t('live2dLab.actions.stopCamera') }}
              </UButton>
            </template>
          </div>
        </section>

        <section class="control-section">
          <h2>{{ t('live2dLab.expressions.title') }}</h2>
          <p class="control-description">
            {{ t('live2dLab.expressions.description') }}
          </p>
          <div class="expression-grid">
            <UButton
              v-for="(_, index) in stage.expressions.value"
              :key="index"
              :color="
                stage.currentExpression.value === index ? 'primary' : 'neutral'
              "
              :variant="
                stage.currentExpression.value === index ? 'soft' : 'outline'
              "
              :aria-pressed="stage.currentExpression.value === index"
              :disabled="!ready || actionPending"
              @click="runStageAction(() => stage.setExpression(index))"
            >
              {{ t('live2dLab.expressions.item', { number: index + 1 }) }}
            </UButton>
          </div>
          <div class="model-actions">
            <UButton
              icon="i-lucide-sparkles"
              variant="soft"
              :disabled="!ready || actionPending"
              @click="runStageAction(stage.playMotion)"
            >
              {{ t('live2dLab.actions.playMotion') }}
            </UButton>
            <UButton
              icon="i-lucide-rotate-ccw"
              color="neutral"
              variant="ghost"
              :disabled="
                !ready ||
                actionPending ||
                stage.currentExpression.value === null
              "
              @click="runStageAction(() => stage.setExpression(null))"
            >
              {{ t('live2dLab.actions.resetExpression') }}
            </UButton>
          </div>
        </section>

        <section
          v-show="mode === 'camera'"
          class="control-section camera-section"
          aria-labelledby="live2d-camera-title"
        >
          <div class="camera-heading">
            <h2 id="live2d-camera-title">{{ t('live2dLab.camera.title') }}</h2>
            <span aria-live="polite">{{
              t(`live2dLab.camera.${cameraStatus}`)
            }}</span>
          </div>
          <div class="camera-preview">
            <video
              ref="video"
              autoplay
              muted
              playsinline
              :aria-label="t('live2dLab.camera.preview')"
            />
            <div v-if="!active" class="camera-empty">
              <UIcon name="i-lucide-camera-off" aria-hidden="true" />
              <span>{{
                t(`live2dLab.camera.${starting ? 'loading' : 'idle'}`)
              }}</span>
            </div>
          </div>
          <p class="control-description privacy-note">
            <UIcon name="i-lucide-shield-check" aria-hidden="true" />
            {{ t('live2dLab.camera.privacy') }}
          </p>
          <p
            v-if="cameraError || detector.errorMessage.value"
            class="camera-error"
            role="alert"
          >
            {{ t('live2dLab.camera.error') }}
            <span>{{ cameraError || detector.errorMessage.value }}</span>
          </p>
        </section>
      </aside>
    </div>

    <footer class="model-credit">
      <p>
        <span>Haru © Live2D Inc.</span>
        <a
          href="https://www.live2d.com/en/learn/sample/model-terms/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('live2dLab.terms') }}
          <UIcon name="i-lucide-arrow-up-right" aria-hidden="true" />
        </a>
      </p>
      <p lang="en" class="sample-disclaimer">
        This content uses sample data owned and copyrighted by Live2D Inc. The
        sample data are utilized in accordance with terms and conditions set by
        Live2D Inc. This content itself is created at the author’s sole
        discretion.
      </p>
    </footer>
  </section>
</template>

<style scoped>
.live2d-lab {
  color: var(--ui-text);
}

.lab-intro {
  margin-bottom: clamp(1.75rem, 4vw, 2.75rem);
}

.lab-intro h1 {
  margin: 0;
  color: var(--ui-text-highlighted);
  font-family: var(--font-serif, serif);
  font-size: clamp(2.5rem, 4.5vw, 3.5rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.04;
}

.lab-intro > p {
  max-width: 44rem;
  margin: 1rem 0 0;
  color: var(--ui-text-muted);
  font-size: 0.9375rem;
  line-height: 1.7;
}

.lab-frame {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(18rem, 0.85fr);
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: 0.75rem;
  background: var(--ui-bg);
}

.stage-panel {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.stage-toolbar,
.stage-status,
.camera-heading,
.stage-hint,
.mode-switch button,
.model-credit > p:first-child,
.model-credit a {
  display: flex;
  align-items: center;
}

.stage-toolbar {
  min-height: 3rem;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--ui-border);
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  font-size: 0.75rem;
}

.stage-status {
  gap: 0.55rem;
}

.stage-status i {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--ui-primary);
}

.stage-status i[data-state='loading'] {
  background: var(--ui-warning);
}

.stage-status i[data-state='error'] {
  background: var(--ui-error);
}

.fps {
  font-family: var(--font-mono, monospace);
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
}

.avatar-stage {
  position: relative;
  flex: 1;
  min-height: 39rem;
  overflow: hidden;
  background:
    radial-gradient(
      ellipse at 50% 38%,
      color-mix(in srgb, var(--ui-primary) 8%, transparent),
      transparent 62%
    ),
    var(--ui-bg-elevated);
}

.avatar-stage canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.stage-message {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.8rem;
  padding: 2rem;
  text-align: center;
  background: var(--ui-bg-elevated);
}

.stage-message > :first-child {
  width: 1.65rem;
  height: 1.65rem;
  color: var(--ui-primary);
}

.stage-message strong {
  color: var(--ui-text-highlighted);
  font-weight: 500;
}

.stage-message p {
  max-width: 30rem;
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.loading-icon {
  animation: spin 1.2s linear infinite;
}

.stage-hint {
  position: absolute;
  right: 1rem;
  bottom: 0.85rem;
  left: 1rem;
  justify-content: center;
  gap: 0.5rem;
  margin: 0;
  padding: 0.45rem 0.75rem;
  border-radius: 0.5rem;
  color: var(--ui-text-muted);
  background: color-mix(in srgb, var(--ui-bg) 85%, transparent);
  font-size: 0.75rem;
  text-align: center;
  pointer-events: none;
}

.stage-hint > :first-child {
  flex: none;
}

.controls-panel {
  min-width: 0;
  border-left: 1px solid var(--ui-border);
}

.control-section {
  padding: 1.25rem;
}

.control-section + .control-section {
  border-top: 1px solid var(--ui-border);
}

.control-section h2 {
  margin: 0 0 0.9rem;
  color: var(--ui-text-highlighted);
  font-family: var(--font-serif, serif);
  font-size: 1.1rem;
  font-weight: 600;
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem;
  padding: 0.25rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.6rem;
  background: var(--ui-bg-muted);
}

.mode-switch button {
  justify-content: center;
  gap: 0.5rem;
  min-height: 2.4rem;
  padding: 0.5rem;
  border: 0;
  border-radius: 0.4rem;
  color: var(--ui-text-muted);
  background: transparent;
  font-size: 0.8125rem;
  cursor: pointer;
}

.mode-switch button[aria-pressed='true'] {
  color: var(--ui-text-highlighted);
  background: var(--ui-bg);
  box-shadow: 0 1px 3px rgb(0 0 0 / 6%);
}

.mode-switch button:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}

.mode-switch button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.control-description {
  margin: 0.8rem 0 0;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
  line-height: 1.65;
}

.camera-actions,
.model-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.expression-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 1rem;
}

.expression-grid > button {
  justify-content: center;
}

.camera-heading {
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
}

.camera-heading h2 {
  margin: 0;
}

.camera-heading > span {
  color: var(--ui-text-muted);
  font-size: 0.6875rem;
}

.camera-preview {
  position: relative;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: 0.6rem;
  background: var(--ui-bg-muted);
}

.camera-preview video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.camera-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.7rem;
  color: var(--ui-text-muted);
  background: var(--ui-bg-muted);
  font-size: 0.75rem;
}

.camera-empty > :first-child {
  width: 1.5rem;
  height: 1.5rem;
}

.privacy-note > :first-child {
  margin-right: 0.2rem;
  vertical-align: -0.15em;
}

.camera-error {
  margin: 0.8rem 0 0;
  color: var(--ui-error);
  font-size: 0.8125rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.camera-error span {
  display: block;
  margin-top: 0.3rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
}

.model-credit {
  margin-top: 1rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  line-height: 1.65;
}

.model-credit p {
  margin: 0;
}

.model-credit > p:first-child {
  flex-wrap: wrap;
  gap: 0.45rem 1rem;
}

.model-credit a {
  gap: 0.2rem;
  color: var(--ui-text);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.model-credit .sample-disclaimer {
  max-width: 64rem;
  margin-top: 0.45rem;
  font-size: 0.6875rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .lab-frame {
    grid-template-columns: 1fr;
  }

  .avatar-stage {
    min-height: 36rem;
  }

  .controls-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-top: 1px solid var(--ui-border);
    border-left: 0;
  }

  .control-section + .control-section {
    border-top: 0;
    border-left: 1px solid var(--ui-border);
  }

  .camera-section {
    grid-column: 1 / -1;
  }

  .control-section.camera-section {
    border-top: 1px solid var(--ui-border);
    border-left: 0;
  }

  .camera-preview {
    max-width: 28rem;
  }
}

@media (max-width: 600px) {
  .lab-intro h1 {
    font-size: clamp(2.25rem, 12vw, 3.25rem);
  }

  .avatar-stage {
    min-height: 30rem;
  }

  .controls-panel {
    display: block;
  }

  .control-section {
    padding: 1rem;
  }

  .control-section + .control-section {
    border-top: 1px solid var(--ui-border);
    border-left: 0;
  }

  .stage-hint {
    right: 0.75rem;
    left: 0.75rem;
    font-size: 0.6875rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .loading-icon {
    animation: none;
  }
}
</style>
