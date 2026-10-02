<script setup lang="ts">
import { useFaceCamera } from '~/composables/face-lab/useFaceCamera.client'
import { useFaceLandmarker } from '~/composables/face-lab/useFaceLandmarker.client'
import { useFaceState } from '~/composables/face-lab/useFaceState.client'
import { useVrmStage } from '~/composables/vrm/useVrmStage.client'

const { t } = useI18n()
const container = ref<HTMLElement>()
const video = ref<HTMLVideoElement>()
const fileInput = ref<HTMLInputElement>()
const mode = ref<'preview' | 'camera'>('preview')
const camera = useFaceCamera()
const detector = useFaceLandmarker()
const face = useFaceState()
const stage = useVrmStage({
  container,
  face: face.state,
  mode: readonly(mode),
})

const expressionPresets = [
  'happy',
  'angry',
  'sad',
  'relaxed',
  'surprised',
] as const
const viewPresets = ['full', 'portrait'] as const
const starting = ref(false)
const cameraError = ref('')
const actionPending = ref(false)
const actionError = ref('')
let disposed = false
let cameraRequest = 0

const active = computed(() => camera.state.value === 'streaming')
const ready = computed(() => stage.status.value === 'ready')
const loading = computed(() => stage.status.value === 'loading')
const loadingPercent = computed(() =>
  Math.round(Math.max(0, Math.min(1, stage.progress.value)) * 100),
)
const modelOrigin = computed(() =>
  t(`vrmLab.model.${stage.imported.value ? 'local' : 'sample'}`),
)
const modelIdentity = computed(() =>
  [stage.modelName.value || modelOrigin.value, stage.modelAuthors.value]
    .filter(Boolean)
    .join(' · '),
)
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
    cameraError.value = detector.errorMessage.value || t('vrmLab.camera.error')
    clearCamera()
  },
)

const stopCamera = () => {
  cameraRequest += 1
  clearCamera()
  cameraError.value = ''
  mode.value = 'preview'
}

const selectPreview = () => {
  if (starting.value) return
  stopCamera()
}

const startCamera = async () => {
  const preview = video.value
  if (!preview || starting.value || disposed || !ready.value) return

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

const runStageAction = async (action: () => void | Promise<void>) => {
  if (actionPending.value || loading.value || disposed) return
  actionPending.value = true
  actionError.value = ''
  try {
    await action()
  } catch (error) {
    if (!disposed) {
      actionError.value = error instanceof Error ? error.message : String(error)
    }
  } finally {
    actionPending.value = false
  }
}

const chooseFile = () => {
  if (actionPending.value || loading.value || disposed) return
  fileInput.value?.click()
}

const loadFile = (event: Event) => {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return
  const file = input.files?.[0]
  input.value = ''
  if (file) void runStageAction(() => stage.loadFile(file))
}

onBeforeUnmount(() => {
  disposed = true
  stopCamera()
})
</script>

<template>
  <section class="vrm-lab" aria-labelledby="vrm-lab-title">
    <header class="lab-intro">
      <h1 id="vrm-lab-title">{{ t('vrmLab.title') }}</h1>
      <p>{{ t('vrmLab.description') }}</p>
    </header>

    <div class="lab-frame">
      <section class="stage-panel" :aria-label="t('vrmLab.stage')">
        <div class="stage-toolbar">
          <div class="stage-status" aria-live="polite">
            <i :data-state="stage.status.value" aria-hidden="true" />
            <span>{{ t(`vrmLab.status.${stage.status.value}`) }}</span>
          </div>
          <span class="fps">{{
            t('vrmLab.fps', { value: stage.fps.value.toFixed(0) })
          }}</span>
        </div>

        <div
          ref="container"
          class="avatar-stage"
          :aria-label="t('vrmLab.stage')"
          :aria-busy="loading"
        >
          <div v-if="!ready" class="stage-message" aria-live="polite">
            <UIcon
              :name="
                stage.status.value === 'error'
                  ? 'i-lucide-triangle-alert'
                  : 'i-lucide-loader-circle'
              "
              :class="{ 'loading-icon': loading }"
              aria-hidden="true"
            />
            <strong>{{ t(`vrmLab.status.${stage.status.value}`) }}</strong>
            <template v-if="loading">
              <div class="loading-progress" aria-hidden="true">
                <span :style="{ width: `${loadingPercent}%` }" />
              </div>
              <p>
                {{ t('vrmLab.loadingProgress', { value: loadingPercent }) }}
              </p>
            </template>
            <p v-if="stage.errorMessage.value || actionError" role="alert">
              {{ stage.errorMessage.value || actionError }}
            </p>
            <UButton
              v-if="stage.status.value === 'error'"
              icon="i-lucide-refresh-cw"
              variant="soft"
              :loading="actionPending"
              @click="runStageAction(stage.retry)"
            >
              {{ t('vrmLab.actions.retry') }}
            </UButton>
          </div>

          <p v-if="ready" class="stage-hint">
            <UIcon
              :name="mode === 'preview' ? 'i-lucide-orbit' : 'i-lucide-camera'"
              aria-hidden="true"
            />
            {{ t(`vrmLab.mode.${mode}Hint`) }}
          </p>
        </div>
      </section>

      <aside class="controls-panel" :aria-label="t('vrmLab.controls')">
        <p
          v-if="ready && (stage.errorMessage.value || actionError)"
          class="stage-error"
          role="alert"
        >
          {{ stage.errorMessage.value || actionError }}
        </p>
        <section class="control-section mode-section">
          <h2>{{ t('vrmLab.mode.label') }}</h2>
          <div
            class="mode-switch"
            role="group"
            :aria-label="t('vrmLab.mode.label')"
          >
            <button
              type="button"
              :aria-pressed="mode === 'preview'"
              :disabled="starting"
              @click="selectPreview"
            >
              <UIcon name="i-lucide-orbit" aria-hidden="true" />
              {{ t('vrmLab.mode.preview') }}
            </button>
            <button
              type="button"
              :aria-pressed="mode === 'camera'"
              :disabled="starting"
              @click="mode = 'camera'"
            >
              <UIcon name="i-lucide-camera" aria-hidden="true" />
              {{ t('vrmLab.mode.camera') }}
            </button>
          </div>
          <p class="control-description">
            {{ t(`vrmLab.mode.${mode}Hint`) }}
          </p>

          <div v-if="mode === 'camera'" class="camera-actions">
            <UButton
              v-if="!active"
              icon="i-lucide-camera"
              :loading="starting"
              :disabled="!ready || actionPending"
              @click="startCamera"
            >
              {{ t('vrmLab.actions.startCamera') }}
            </UButton>
            <template v-else>
              <UButton
                icon="i-lucide-crosshair"
                :disabled="starting || !face.tracked.value"
                @click="face.calibrate"
              >
                {{
                  t(
                    `vrmLab.actions.${face.calibrated.value ? 'calibrated' : 'calibrate'}`,
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
                {{ t('vrmLab.actions.stopCamera') }}
              </UButton>
            </template>
          </div>
        </section>

        <section class="control-section view-section">
          <h2>{{ t('vrmLab.view.label') }}</h2>
          <div
            class="mode-switch"
            role="group"
            :aria-label="t('vrmLab.view.label')"
          >
            <button
              v-for="view in viewPresets"
              :key="view"
              type="button"
              :aria-pressed="stage.view.value === view"
              :disabled="!ready || actionPending"
              @click="runStageAction(() => stage.setView(view))"
            >
              <UIcon
                :name="
                  view === 'full'
                    ? 'i-lucide-person-standing'
                    : 'i-lucide-scan-face'
                "
                aria-hidden="true"
              />
              {{ t(`vrmLab.actions.${view}`) }}
            </button>
          </div>
        </section>

        <section class="control-section expression-section">
          <h2>{{ t('vrmLab.expressions.title') }}</h2>
          <p class="control-description">
            {{ t('vrmLab.expressions.description') }}
          </p>
          <div class="expression-grid">
            <UButton
              :color="
                stage.currentExpression.value === null ? 'primary' : 'neutral'
              "
              :variant="
                stage.currentExpression.value === null ? 'soft' : 'outline'
              "
              :aria-pressed="stage.currentExpression.value === null"
              :disabled="!ready || actionPending"
              @click="runStageAction(() => stage.setExpression(null))"
            >
              {{ t('vrmLab.expressions.neutral') }}
            </UButton>
            <UButton
              v-for="expression in expressionPresets"
              :key="expression"
              :color="
                stage.currentExpression.value === expression
                  ? 'primary'
                  : 'neutral'
              "
              :variant="
                stage.currentExpression.value === expression
                  ? 'soft'
                  : 'outline'
              "
              :aria-pressed="stage.currentExpression.value === expression"
              :disabled="
                !ready ||
                actionPending ||
                !stage.expressions.value.includes(expression)
              "
              @click="runStageAction(() => stage.setExpression(expression))"
            >
              {{ t(`vrmLab.expressions.${expression}`) }}
            </UButton>
          </div>
          <div class="model-actions">
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
              {{ t('vrmLab.actions.resetExpression') }}
            </UButton>
          </div>
        </section>

        <section class="control-section model-section">
          <h2>{{ t('vrmLab.model.title') }}</h2>
          <p class="model-info">
            <strong>{{ stage.modelName.value || modelOrigin }}</strong>
            <span v-if="stage.modelAuthors.value">{{
              stage.modelAuthors.value
            }}</span>
            <span class="model-origin">{{ modelOrigin }}</span>
          </p>
          <div class="model-actions">
            <input
              ref="fileInput"
              type="file"
              accept=".vrm"
              hidden
              :aria-label="t('vrmLab.actions.chooseFile')"
              @change="loadFile"
            />
            <UButton
              icon="i-lucide-folder-open"
              variant="soft"
              :disabled="loading || actionPending"
              @click="chooseFile"
            >
              {{ t('vrmLab.actions.chooseFile') }}
            </UButton>
            <UButton
              icon="i-lucide-rotate-ccw"
              color="neutral"
              variant="outline"
              :disabled="
                loading ||
                actionPending ||
                (!stage.imported.value && !stage.errorMessage.value)
              "
              @click="runStageAction(stage.loadSample)"
            >
              {{ t('vrmLab.actions.useSample') }}
            </UButton>
          </div>
          <p class="control-description privacy-note">
            <UIcon name="i-lucide-shield-check" aria-hidden="true" />
            {{ t('vrmLab.model.importHint') }}
          </p>
        </section>

        <section
          v-show="mode === 'camera'"
          class="control-section camera-section"
          aria-labelledby="vrm-camera-title"
        >
          <div class="camera-heading">
            <h2 id="vrm-camera-title">{{ t('vrmLab.camera.title') }}</h2>
            <span aria-live="polite">{{
              t(`vrmLab.camera.${cameraStatus}`)
            }}</span>
          </div>
          <div class="camera-preview">
            <video
              ref="video"
              autoplay
              muted
              playsinline
              :aria-label="t('vrmLab.camera.preview')"
            />
            <div v-if="!active" class="camera-empty">
              <UIcon name="i-lucide-camera-off" aria-hidden="true" />
              <span>{{
                t(`vrmLab.camera.${starting ? 'loading' : 'idle'}`)
              }}</span>
            </div>
          </div>
          <p class="control-description privacy-note">
            <UIcon name="i-lucide-shield-check" aria-hidden="true" />
            {{ t('vrmLab.camera.privacy') }}
          </p>
          <p
            v-if="cameraError || detector.errorMessage.value"
            class="camera-error"
            role="alert"
          >
            {{ t('vrmLab.camera.error') }}
            <span>{{ cameraError || detector.errorMessage.value }}</span>
          </p>
        </section>
      </aside>
    </div>

    <footer class="model-credit">
      <p>
        <span>{{ modelIdentity }}</span>
        <span v-if="stage.imported.value">{{ t('vrmLab.model.local') }}</span>
        <a
          v-else
          href="https://github.com/pixiv/three-vrm/tree/v3.5.5/packages/three-vrm/examples/models"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('vrmLab.model.credit') }}
          <UIcon name="i-lucide-arrow-up-right" aria-hidden="true" />
        </a>
      </p>
    </footer>
  </section>
</template>

<style scoped>
.vrm-lab {
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

.avatar-stage :deep(canvas) {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

.stage-message {
  position: absolute;
  inset: 0;
  z-index: 2;
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
  z-index: 1;
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

.loading-progress {
  width: min(16rem, 100%);
  height: 0.3rem;
  overflow: hidden;
  border-radius: 1rem;
  background: var(--ui-border);
}

.loading-progress > span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--ui-primary);
  transition: width 0.2s ease;
}

.model-info {
  margin: 0;
}

.model-info strong {
  display: block;
  color: var(--ui-text-highlighted);
  font-size: 0.9375rem;
  font-weight: 500;
  overflow-wrap: anywhere;
}

.model-info > span {
  display: block;
  margin-top: 0.3rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.model-info .model-origin {
  display: inline-block;
  padding: 0.15rem 0.45rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.3rem;
  font-size: 0.6875rem;
}

.stage-error {
  grid-column: 1 / -1;
  margin: 0;
  padding: 1rem 1.25rem;
  color: var(--ui-error);
  font-size: 0.8125rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.stage-error + .control-section {
  border-top: 1px solid var(--ui-border);
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
  }

  .control-section.view-section,
  .control-section.model-section {
    border-left: 1px solid var(--ui-border);
  }

  .control-section.expression-section,
  .control-section.model-section {
    border-top: 1px solid var(--ui-border);
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

  .control-section.view-section,
  .control-section.model-section {
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
