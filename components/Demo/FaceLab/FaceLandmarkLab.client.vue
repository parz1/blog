<script setup lang="ts">
import { FaceLandmarker } from '@mediapipe/tasks-vision'

import { useFaceCamera } from '~/composables/face-lab/useFaceCamera.client'
import { useFaceLandmarker } from '~/composables/face-lab/useFaceLandmarker.client'
import type { FaceDetectionSnapshot } from '~/typings/face-lab'

const { t } = useI18n()
const camera = useFaceCamera()
const detector = useFaceLandmarker()

const video = ref<HTMLVideoElement>()
const overlay = ref<HTMLCanvasElement>()
const starting = ref(false)
const uiError = ref('')

const active = computed(() => camera.state.value === 'streaming')
const qualityPercent = computed(() =>
  Math.round((detector.snapshot.value?.signalQuality ?? 0) * 100),
)
const landmarkCount = computed(
  () => (detector.snapshot.value?.landmarks?.length ?? 0) / 3,
)

const statusKey = computed(() => {
  if (uiError.value || camera.state.value === 'error') return 'error'
  if (starting.value || detector.state.value === 'loading') return 'loading'
  if (!active.value) return 'idle'
  return detector.tracked.value ? 'tracking' : 'searching'
})

const statusLabel = computed(() =>
  t(`faceLandmarkLab.status.${statusKey.value}`),
)

const formatNumber = (value: number, digits = 1) =>
  Number.isFinite(value) ? value.toFixed(digits) : '—'

const clearOverlay = () => {
  const canvas = overlay.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return
  context.clearRect(0, 0, canvas.width, canvas.height)
}

const drawConnections = (
  context: CanvasRenderingContext2D,
  landmarks: Float32Array,
  connections: readonly { start: number; end: number }[],
  width: number,
  height: number,
) => {
  context.beginPath()
  connections.forEach(({ start, end }) => {
    const startOffset = start * 3
    const endOffset = end * 3
    const startX = landmarks[startOffset]
    const startY = landmarks[startOffset + 1]
    const endX = landmarks[endOffset]
    const endY = landmarks[endOffset + 1]
    if (
      startX === undefined ||
      startY === undefined ||
      endX === undefined ||
      endY === undefined
    ) {
      return
    }
    context.moveTo(startX * width, startY * height)
    context.lineTo(endX * width, endY * height)
  })
  context.stroke()
}

const drawSnapshot = (snapshot?: FaceDetectionSnapshot) => {
  const canvas = overlay.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return

  const width = snapshot?.sourceWidth || video.value?.videoWidth || 640
  const height = snapshot?.sourceHeight || video.value?.videoHeight || 480
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  context.clearRect(0, 0, width, height)

  const landmarks = snapshot?.landmarks
  if (!landmarks) return

  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.lineWidth = Math.max(0.45, width / 1500)
  context.strokeStyle = 'rgb(120 226 222 / 20%)'
  drawConnections(
    context,
    landmarks,
    FaceLandmarker.FACE_LANDMARKS_TESSELATION,
    width,
    height,
  )

  context.lineWidth = Math.max(1.1, width / 620)
  context.strokeStyle = 'rgb(204 255 249 / 82%)'
  drawConnections(
    context,
    landmarks,
    FaceLandmarker.FACE_LANDMARKS_CONTOURS,
    width,
    height,
  )

  context.lineWidth = Math.max(1.8, width / 420)
  context.strokeStyle = 'rgb(255 111 69 / 92%)'
  drawConnections(
    context,
    landmarks,
    FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
    width,
    height,
  )
  drawConnections(
    context,
    landmarks,
    FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
    width,
    height,
  )

  context.fillStyle = 'rgb(225 255 251 / 72%)'
  const pointRadius = Math.max(0.6, width / 1200)
  for (let index = 0; index < landmarks.length; index += 9) {
    const x = landmarks[index]
    const y = landmarks[index + 1]
    if (x === undefined || y === undefined) continue
    context.beginPath()
    context.arc(x * width, y * height, pointRadius, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()
}

watch(
  () => detector.snapshot.value,
  (snapshot) => drawSnapshot(snapshot),
)

const start = async () => {
  if (!video.value || starting.value) return
  starting.value = true
  uiError.value = ''

  try {
    await Promise.all([camera.start(video.value), detector.start(video.value)])
  } catch (error) {
    detector.dispose()
    camera.stop()
    uiError.value =
      camera.errorMessage.value ||
      detector.errorMessage.value ||
      (error instanceof Error ? error.message : String(error))
  } finally {
    starting.value = false
  }
}

const stop = () => {
  detector.dispose()
  camera.stop()
  uiError.value = ''
  clearOverlay()
}

onBeforeUnmount(stop)
</script>

<template>
  <section class="landmark-lab" aria-labelledby="face-landmark-lab-title">
    <header class="lab-intro">
      <div class="intro-copy">
        <h1 id="face-landmark-lab-title">
          {{ t('faceLandmarkLab.title') }}
        </h1>
        <p class="intro-description">
          {{ t('faceLandmarkLab.description') }}
        </p>
      </div>

      <div class="intro-actions">
        <UButton
          v-if="!active"
          icon="i-lucide-camera"
          size="lg"
          :loading="starting"
          @click="start"
        >
          {{ t('faceLandmarkLab.actions.start') }}
        </UButton>
        <UButton
          v-else
          icon="i-lucide-square"
          color="error"
          variant="soft"
          size="lg"
          @click="stop"
        >
          {{ t('faceLandmarkLab.actions.stop') }}
        </UButton>
      </div>
    </header>

    <div class="lab-console">
      <div class="console-bar">
        <div class="status-cluster" aria-live="polite">
          <span class="status-dot" :data-state="statusKey" />
          <span>{{ statusLabel }}</span>
        </div>
      </div>

      <div class="console-grid">
        <section class="camera-panel" :aria-label="t('faceLandmarkLab.camera')">
          <div class="panel-heading">
            <span>{{ t('faceLandmarkLab.camera') }}</span>
            <span v-if="active" class="live-label"> <i /> LIVE </span>
          </div>

          <div class="camera-stage">
            <video
              ref="video"
              class="camera-feed"
              autoplay
              muted
              playsinline
              aria-label="Mirrored local camera preview"
            />
            <canvas ref="overlay" class="landmark-overlay" aria-hidden="true" />

            <div v-if="!active" class="camera-empty">
              <span class="empty-icon">
                <UIcon name="i-lucide-scan-face" />
              </span>
              <strong>{{ t('faceLandmarkLab.empty.title') }}</strong>
              <p>{{ t('faceLandmarkLab.empty.description') }}</p>
            </div>

            <div v-else-if="!detector.tracked.value" class="searching-face">
              <UIcon name="i-lucide-focus" />
              <span>{{ t('faceLandmarkLab.searching') }}</span>
            </div>
          </div>

          <div class="camera-caption">
            <span>
              {{ camera.settings.value.width || '—' }} ×
              {{ camera.settings.value.height || '—' }}
            </span>
            <span>{{ landmarkCount || '—' }} LANDMARKS</span>
            <span>MIRRORED</span>
          </div>
        </section>

        <aside class="instrument-panel">
          <section class="instrument-section">
            <p class="instrument-kicker">01 / DETECTION</p>
            <div class="tracking-heading">
              <div>
                <span>{{ t('faceLandmarkLab.signalQuality') }}</span>
                <small>{{ t('faceLandmarkLab.derived') }}</small>
              </div>
              <strong>{{ qualityPercent }}<small>%</small></strong>
            </div>
            <div
              class="quality-track"
              role="meter"
              :aria-label="t('faceLandmarkLab.signalQuality')"
              :aria-valuenow="qualityPercent"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <i :style="{ width: `${qualityPercent}%` }" />
            </div>
          </section>

          <section class="instrument-section">
            <p class="instrument-kicker">02 / PERFORMANCE</p>
            <dl class="metric-list">
              <div>
                <dt>{{ t('faceLandmarkLab.metrics.cameraFps') }}</dt>
                <dd>{{ formatNumber(detector.stats.value.cameraFps) }}</dd>
              </div>
              <div>
                <dt>{{ t('faceLandmarkLab.metrics.inferenceFps') }}</dt>
                <dd>{{ formatNumber(detector.stats.value.inferenceFps) }}</dd>
              </div>
              <div>
                <dt>{{ t('faceLandmarkLab.metrics.inferenceTime') }}</dt>
                <dd>
                  {{ formatNumber(detector.stats.value.inferenceMs) }}
                  <small>ms</small>
                </dd>
              </div>
              <div>
                <dt>{{ t('faceLandmarkLab.metrics.faces') }}</dt>
                <dd>{{ detector.snapshot.value?.faceCount ?? 0 }}</dd>
              </div>
            </dl>
          </section>
        </aside>
      </div>

      <p v-if="uiError" class="error-message" role="alert">
        <UIcon name="i-lucide-triangle-alert" />
        {{ uiError }}
      </p>

      <footer class="privacy-strip">
        <UIcon name="i-lucide-lock-keyhole" />
        <div>
          <strong>{{ t('faceLandmarkLab.privacy.title') }}</strong>
          <p>{{ t('faceLandmarkLab.privacy.description') }}</p>
        </div>
        <span>{{ t('faceLandmarkLab.privacy.network') }}</span>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.landmark-lab {
  --lab-bg: #0e100f;
  --lab-surface: #151716;
  --lab-border: rgb(235 230 215 / 14%);
  --lab-text: #f1eee6;
  --lab-muted: #999b94;
  --lab-accent: #60a5fa;
  --lab-cyan: #7ee2de;

  color: var(--lab-text);
}

.lab-intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 2rem;
}

.intro-copy {
  max-width: 49rem;
}

.eyebrow,
.instrument-kicker,
.console-bar,
.panel-heading,
.camera-caption,
.metric-list,
.pipeline-section,
.privacy-strip > span {
  font-family: var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.eyebrow {
  margin-bottom: 0.75rem;
  color: var(--lab-accent);
  font-size: 0.75rem;
}

.lab-intro h1 {
  font-family: var(--font-serif);
  font-size: clamp(2.5rem, 6vw, 5.5rem);
  font-weight: 400;
  letter-spacing: -0.045em;
  line-height: 0.96;
}

.intro-description {
  max-width: 42rem;
  margin-top: 1.25rem;
  color: #afb0aa;
  font-size: 0.9375rem;
  line-height: 1.75;
}

.lab-console {
  overflow: hidden;
  border: 1px solid var(--lab-border);
  background: var(--lab-bg);
}

.console-bar,
.panel-heading,
.camera-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--lab-muted);
  font-size: 0.6875rem;
}

.console-bar {
  min-height: 3.25rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--lab-border);
}

.status-cluster,
.console-meta,
.live-label {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.console-meta {
  gap: 1.5rem;
}

.status-dot,
.live-label i {
  display: inline-block;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: #676963;
}

.status-dot[data-state='loading'],
.status-dot[data-state='searching'] {
  background: #e5ad5a;
  box-shadow: 0 0 0.8rem rgb(229 173 90 / 55%);
}

.status-dot[data-state='tracking'] {
  background: var(--lab-cyan);
  box-shadow: 0 0 0.8rem rgb(126 226 222 / 55%);
}

.status-dot[data-state='error'] {
  background: #ff6b62;
}

.console-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(17rem, 23rem);
  min-height: 38rem;
}

.camera-panel {
  min-width: 0;
  border-right: 1px solid var(--lab-border);
}

.panel-heading,
.camera-caption {
  min-height: 2.75rem;
  padding: 0.65rem 0.9rem;
}

.panel-heading {
  border-bottom: 1px solid var(--lab-border);
}

.live-label {
  color: var(--lab-cyan);
}

.live-label i {
  width: 0.35rem;
  height: 0.35rem;
  background: currentcolor;
}

.camera-stage {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  background: #090b0a;
}

.camera-feed,
.landmark-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: scaleX(-1);
}

.camera-feed {
  object-fit: cover;
  filter: saturate(0.55) contrast(1.08) brightness(0.78);
}

.landmark-overlay {
  z-index: 1;
  pointer-events: none;
}

.camera-empty,
.searching-face {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 2rem;
  text-align: center;
}

.camera-empty strong {
  margin-top: 1rem;
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 500;
}

.camera-empty p {
  max-width: 23rem;
  margin-top: 0.55rem;
  color: var(--lab-muted);
  font-size: 0.8125rem;
  line-height: 1.6;
}

.empty-icon {
  display: grid;
  width: 4rem;
  height: 4rem;
  place-items: center;
  border: 1px solid var(--lab-border);
  color: var(--lab-cyan);
  font-size: 1.5rem;
}

.searching-face {
  gap: 0.75rem;
  pointer-events: none;
  color: rgb(241 238 230 / 72%);
  background: rgb(9 11 10 / 18%);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.searching-face .iconify {
  font-size: 2rem;
}

.camera-caption {
  border-top: 1px solid var(--lab-border);
}

.instrument-panel {
  background: var(--lab-surface);
}

.instrument-section {
  padding: 1.35rem 1.25rem;
  border-bottom: 1px solid var(--lab-border);
}

.instrument-kicker {
  margin-bottom: 1.25rem;
  color: var(--lab-muted);
  font-size: 0.625rem;
}

.tracking-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
}

.tracking-heading div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8125rem;
}

.tracking-heading small,
.metric-list small {
  color: var(--lab-muted);
  font-size: 0.625rem;
}

.tracking-heading strong {
  color: var(--lab-cyan);
  font-family: var(--font-mono);
  font-size: 2.3rem;
  font-weight: 400;
  line-height: 1;
}

.tracking-heading strong small {
  color: currentcolor;
  font-size: 0.875rem;
}

.quality-track {
  height: 0.25rem;
  margin-top: 1rem;
  background: rgb(238 235 225 / 10%);
}

.quality-track i {
  display: block;
  height: 100%;
  background: var(--lab-cyan);
  transition: width 160ms ease-out;
}

.metric-list {
  display: grid;
  gap: 0.8rem;
  font-size: 0.6875rem;
}

.metric-list > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.metric-list dt {
  color: var(--lab-muted);
}

.metric-list dd {
  color: var(--lab-text);
  font-size: 0.875rem;
}

.pipeline-section ol {
  display: grid;
  gap: 0.9rem;
}

.pipeline-section li {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.pipeline-section li > span {
  color: var(--lab-accent);
  font-size: 0.625rem;
}

.pipeline-section li div {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.pipeline-section strong {
  font-size: 0.6875rem;
  font-weight: 500;
}

.pipeline-section small {
  color: var(--lab-muted);
  font-size: 0.625rem;
  letter-spacing: 0;
  text-transform: none;
}

.privacy-strip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--lab-border);
}

.privacy-strip > .iconify {
  color: var(--lab-cyan);
  font-size: 1.25rem;
}

.privacy-strip strong {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.privacy-strip p {
  margin-top: 0.2rem;
  color: var(--lab-muted);
  font-size: 0.6875rem;
  line-height: 1.5;
}

.privacy-strip > span {
  color: var(--lab-muted);
  font-size: 0.625rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.8rem 1rem;
  border-top: 1px solid rgb(255 107 98 / 28%);
  color: #ffaaa4;
  background: rgb(255 107 98 / 7%);
  font-size: 0.75rem;
}

@media (max-width: 900px) {
  .lab-intro {
    align-items: flex-start;
    flex-direction: column;
  }

  .console-grid {
    grid-template-columns: 1fr;
  }

  .camera-panel {
    border-right: 0;
  }

  .instrument-panel {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    border-top: 1px solid var(--lab-border);
  }

  .instrument-section {
    border-right: 1px solid var(--lab-border);
    border-bottom: 0;
  }
}

@media (max-width: 640px) {
  .console-meta span:first-child,
  .privacy-strip > span,
  .pipeline-section {
    display: none;
  }

  .console-grid {
    min-height: 0;
  }

  .instrument-panel {
    grid-template-columns: 1fr 1fr;
  }

  .instrument-section {
    min-width: 0;
    padding: 1rem;
  }

  .privacy-strip {
    grid-template-columns: auto 1fr;
  }

  .camera-caption {
    gap: 0.75rem;
    overflow: auto;
    white-space: nowrap;
  }
}

@media (prefers-reduced-motion: reduce) {
  .quality-track i {
    transition: none;
  }
}
</style>

<style scoped src="../../../assets/css/lab-experiments.css"></style>
