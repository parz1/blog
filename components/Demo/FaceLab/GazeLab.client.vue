<script setup lang="ts">
import { useFaceCamera } from '~/composables/face-lab/useFaceCamera.client'
import { useFaceLandmarker } from '~/composables/face-lab/useFaceLandmarker.client'
import { useGazeSignal } from '~/composables/face-lab/useGazeSignal.client'
import { useHeadPoseSignal } from '~/composables/face-lab/useHeadPoseSignal.client'
import type { EyeGazeEstimate } from '~/typings/face-lab'
import { getEyeOverlayLandmarks } from '~/utils/face-lab/gaze'

const { t } = useI18n()
const camera = useFaceCamera()
const detector = useFaceLandmarker()
const gaze = useGazeSignal()
const pose = useHeadPoseSignal()
const eyeSides = ['left', 'right'] as const

const video = ref<HTMLVideoElement>()
const overlay = ref<HTMLCanvasElement>()
const starting = ref(false)
const uiError = ref('')

const active = computed(() => camera.state.value === 'streaming')
const gazeX = computed(() => gaze.filtered.value.x)
const gazeY = computed(() => gaze.filtered.value.y)
const headYaw = computed(() => pose.relative.value.yaw)
const confidencePercent = computed(() =>
  Math.round(gaze.confidence.value * 100),
)

const statusKey = computed(() => {
  if (uiError.value || camera.state.value === 'error') return 'error'
  if (starting.value || detector.state.value === 'loading') return 'loading'
  if (!active.value) return 'idle'
  if (!detector.tracked.value) return 'searching'
  if (!gaze.calibrated.value) return 'uncalibrated'
  return gaze.tracked.value ? 'tracking' : 'low'
})

const statusLabel = computed(() => t(`gazeLab.status.${statusKey.value}`))

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const formatSigned = (value: number) => {
  const normalized = Math.abs(value) < 0.005 ? 0 : value
  return `${normalized >= 0 ? '+' : '−'}${Math.abs(normalized).toFixed(2)}`
}

const formatAngle = (value: number) => {
  const normalized = Math.abs(value) < 0.05 ? 0 : value
  return `${normalized >= 0 ? '+' : '−'}${Math.abs(normalized).toFixed(1)}°`
}

const percent = (value: number) => `${Math.round(clamp(value, 0, 1) * 100)}%`

const eyeState = (eye: EyeGazeEstimate) => {
  if (eye.blink > 0.55 || eye.openness < 0.18) return 'blink'
  if (eye.confidence < gaze.config.minConfidence) return 'low'
  return 'ready'
}

const drawPolyline = (
  context: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  width: number,
  height: number,
  close = false,
) => {
  const first = points[0]
  if (!first) return
  context.beginPath()
  context.moveTo(first.x * width, first.y * height)
  points
    .slice(1)
    .forEach((point) => context.lineTo(point.x * width, point.y * height))
  if (close) context.closePath()
  context.stroke()
}

const clearOverlay = () => {
  const canvas = overlay.value
  const context = canvas?.getContext('2d')
  if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height)
}

const drawEyeOverlay = () => {
  const canvas = overlay.value
  const context = canvas?.getContext('2d')
  const snapshot = detector.snapshot.value
  if (!canvas || !context) return

  const width = snapshot?.sourceWidth || video.value?.videoWidth || 640
  const height = snapshot?.sourceHeight || video.value?.videoHeight || 480
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  context.clearRect(0, 0, width, height)

  const eyes = getEyeOverlayLandmarks(snapshot?.landmarks)
  if (!eyes) return
  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.lineWidth = Math.max(1.3, width / 520)
  context.strokeStyle = 'rgb(137 232 225 / 86%)'
  drawPolyline(context, eyes.leftEye, width, height, true)
  drawPolyline(context, eyes.rightEye, width, height, true)
  context.lineWidth = Math.max(2, width / 360)
  context.strokeStyle = 'rgb(255 118 76 / 95%)'
  drawPolyline(context, eyes.leftIris, width, height, true)
  drawPolyline(context, eyes.rightIris, width, height, true)
  context.restore()
}

watch(
  () => detector.snapshot.value,
  (snapshot) => {
    const now = performance.now()
    gaze.update(snapshot, now)
    pose.update(snapshot, now)
    drawEyeOverlay()
  },
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
    gaze.clear()
    pose.clear()
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
  gaze.clear()
  pose.clear()
  clearOverlay()
  uiError.value = ''
}

const calibrate = () => {
  if (!gaze.calibrate()) return
  pose.calibrate()
}

const resetCalibration = () => {
  gaze.resetCalibration()
  pose.resetCalibration()
}

onBeforeUnmount(stop)
</script>

<template>
  <section class="gaze-lab" aria-labelledby="gaze-lab-title">
    <header class="lab-intro">
      <div>
        <h1 id="gaze-lab-title">{{ t('gazeLab.title') }}</h1>
        <p class="intro-description">{{ t('gazeLab.description') }}</p>
      </div>

      <div class="intro-actions">
        <UButton
          v-if="!active"
          icon="i-lucide-camera"
          size="lg"
          :loading="starting"
          @click="start"
        >
          {{ t('gazeLab.actions.start') }}
        </UButton>
        <template v-else>
          <UButton
            icon="i-lucide-crosshair"
            size="lg"
            :disabled="!gaze.tracked.value"
            @click="calibrate"
          >
            {{ t('gazeLab.actions.calibrate') }}
          </UButton>
          <UButton
            icon="i-lucide-square"
            color="error"
            variant="soft"
            size="lg"
            @click="stop"
          >
            {{ t('gazeLab.actions.stop') }}
          </UButton>
        </template>
      </div>
    </header>

    <div class="lab-console">
      <div class="console-bar">
        <div class="status-cluster" aria-live="polite">
          <span class="status-dot" :data-state="statusKey" />
          <span>{{ statusLabel }}</span>
        </div>
      </div>

      <div class="primary-grid">
        <section class="camera-panel" :aria-label="t('gazeLab.camera')">
          <div class="panel-heading">
            <span>{{ t('gazeLab.camera') }}</span>
            <span v-if="active" class="live-label"><i /> LIVE</span>
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
            <canvas ref="overlay" class="eye-overlay" aria-hidden="true" />
            <div v-if="!active" class="camera-empty">
              <UIcon name="i-lucide-eye" />
              <strong>{{ t('gazeLab.empty.title') }}</strong>
              <p>{{ t('gazeLab.empty.description') }}</p>
            </div>
          </div>
          <div class="camera-caption">
            <span>
              {{ camera.settings.value.width || '—' }} ×
              {{ camera.settings.value.height || '—' }}
            </span>
            <span>{{ detector.tracked.value ? '2 EYES' : 'NO EYES' }}</span>
            <span>MIRRORED</span>
          </div>
        </section>

        <section class="gaze-panel" aria-label="Smoothed gaze field">
          <div class="instrument-heading">
            <div>
              <p class="instrument-kicker">01 / GAZE OUTPUT</p>
              <h2>{{ t('gazeLab.field.title') }}</h2>
            </div>
            <span>{{ confidencePercent }}%</span>
          </div>

          <div class="gaze-field">
            <div class="field-grid" aria-hidden="true" />
            <i class="field-center" aria-hidden="true" />
            <span
              class="gaze-raw"
              :style="{
                left: `${50 + gaze.raw.value.x * 38}%`,
                top: `${50 + gaze.raw.value.y * 38}%`,
              }"
              aria-hidden="true"
            />
            <span
              class="gaze-point"
              :data-tracked="gaze.tracked.value"
              :style="{
                left: `${50 + gazeX * 38}%`,
                top: `${50 + gazeY * 38}%`,
              }"
            >
              <i />
            </span>
            <div class="field-axis field-axis-x">
              <span>−X</span><span>+X</span>
            </div>
            <div class="field-axis field-axis-y">
              <span>−Y</span><span>+Y</span>
            </div>
          </div>

          <div class="output-values">
            <div>
              <span>GAZE X</span><strong>{{ formatSigned(gazeX) }}</strong>
            </div>
            <div>
              <span>GAZE Y</span><strong>{{ formatSigned(gazeY) }}</strong>
            </div>
            <div>
              <span>CONFIDENCE</span><strong>{{ confidencePercent }}%</strong>
            </div>
          </div>
        </section>
      </div>

      <div class="diagnostic-grid">
        <section class="eye-panel">
          <div class="section-heading">
            <div>
              <p class="instrument-kicker">02 / BINOCULAR FUSION</p>
              <h2>{{ t('gazeLab.eyes.title') }}</h2>
            </div>
          </div>
          <div class="eye-cards">
            <article
              v-for="side in eyeSides"
              :key="side"
              :data-state="eyeState(gaze.rawFrame.value[side])"
            >
              <div class="eye-card-heading">
                <span>{{ t(`gazeLab.eyes.${side}`) }}</span>
                <i />
              </div>
              <div class="eye-schematic" aria-hidden="true">
                <span
                  :style="{
                    transform: `translate(${clamp(-gaze.rawFrame.value[side].x * 85, -18, 18)}px, ${clamp(gaze.rawFrame.value[side].y * 150, -10, 10)}px) scaleY(${clamp(gaze.rawFrame.value[side].openness, 0.08, 1)})`,
                  }"
                />
              </div>
              <dl>
                <div>
                  <dt>{{ t('gazeLab.eyes.confidence') }}</dt>
                  <dd>{{ percent(gaze.rawFrame.value[side].confidence) }}</dd>
                </div>
                <div>
                  <dt>{{ t('gazeLab.eyes.openness') }}</dt>
                  <dd>{{ percent(gaze.rawFrame.value[side].openness) }}</dd>
                </div>
                <div>
                  <dt>{{ t('gazeLab.eyes.blink') }}</dt>
                  <dd>{{ percent(gaze.rawFrame.value[side].blink) }}</dd>
                </div>
              </dl>
              <div class="confidence-track">
                <i
                  :style="{
                    width: percent(gaze.rawFrame.value[side].confidence),
                  }"
                />
              </div>
            </article>
          </div>
        </section>

        <section class="separation-panel">
          <div class="section-heading">
            <div>
              <p class="instrument-kicker">03 / SEPARATION</p>
              <h2>{{ t('gazeLab.separation.title') }}</h2>
            </div>
          </div>
          <div class="comparison-row">
            <div>
              <span>HEAD YAW</span>
              <strong>{{ formatAngle(headYaw) }}</strong>
            </div>
            <div class="comparison-track">
              <i />
              <span
                class="head-marker"
                :style="{
                  left: `${50 + clamp(headYaw / 35, -1, 1) * 44}%`,
                }"
              />
            </div>
          </div>
          <div class="comparison-row gaze-comparison">
            <div>
              <span>GAZE X</span>
              <strong>{{ formatSigned(gazeX) }}</strong>
            </div>
            <div class="comparison-track">
              <i />
              <span
                class="gaze-marker"
                :style="{ left: `${50 + gazeX * 44}%` }"
              />
            </div>
          </div>
          <p>{{ t('gazeLab.separation.description') }}</p>
        </section>

        <aside class="controls-panel">
          <div class="section-heading">
            <div>
              <p class="instrument-kicker">04 / CONDITIONING</p>
              <h2>{{ t('gazeLab.controls.title') }}</h2>
            </div>
            <button
              type="button"
              :disabled="!gaze.calibrated.value"
              @click="resetCalibration"
            >
              {{ t('gazeLab.actions.reset') }}
            </button>
          </div>
          <label>
            <span>
              <strong>{{ t('gazeLab.controls.sensitivity') }}</strong>
              <small>{{ gaze.config.sensitivity.toFixed(1) }}×</small>
            </span>
            <input
              v-model.number="gaze.config.sensitivity"
              type="range"
              min="0.5"
              max="2"
              step="0.1"
            />
          </label>
          <label>
            <span>
              <strong>{{ t('gazeLab.controls.smoothing') }}</strong>
              <small>{{ gaze.config.smoothingMs }} ms</small>
            </span>
            <input
              v-model.number="gaze.config.smoothingMs"
              type="range"
              min="40"
              max="360"
              step="5"
            />
          </label>
          <label>
            <span>
              <strong>{{ t('gazeLab.controls.threshold') }}</strong>
              <small>{{ Math.round(gaze.config.minConfidence * 100) }}%</small>
            </span>
            <input
              v-model.number="gaze.config.minConfidence"
              type="range"
              min="0.05"
              max="0.55"
              step="0.01"
            />
          </label>
        </aside>
      </div>

      <p v-if="uiError" class="error-message" role="alert">
        <UIcon name="i-lucide-triangle-alert" />
        {{ uiError }}
      </p>

      <footer class="accuracy-note">
        <UIcon name="i-lucide-info" />
        <div>
          <strong>{{ t('gazeLab.note.title') }}</strong>
          <p>{{ t('gazeLab.note.description') }}</p>
        </div>
        <span>{{ detector.stats.value.inferenceMs.toFixed(1) }} MS</span>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.gaze-lab {
  --surface: #151716;
  --surface-2: #0d100f;
  --border: rgb(235 230 215 / 14%);
  --text: #f1eee6;
  --muted: #949791;
  --orange: #60a5fa;
  --cyan: #7ee2de;
  color: var(--text);
}

.lab-intro,
.console-bar,
.panel-heading,
.camera-caption,
.instrument-heading,
.section-heading,
.eye-card-heading,
.controls-panel label > span,
.accuracy-note {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lab-intro {
  gap: 2rem;
  margin-bottom: 2rem;
}

.eyebrow,
.instrument-kicker {
  margin: 0 0 0.65rem;
  color: var(--orange);
  font-family: var(--font-mono, monospace);
  font-size: 0.7rem;
  letter-spacing: 0.17em;
  text-transform: uppercase;
}

h1,
h2,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 0.8rem;
  font-family: var(--font-serif, serif);
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 500;
  line-height: 0.96;
}

h2 {
  margin-bottom: 0;
  font-family: var(--font-serif, serif);
  font-size: 1.25rem;
  font-weight: 500;
}

.intro-description {
  max-width: 49rem;
  margin-bottom: 0;
  color: var(--muted);
  line-height: 1.75;
}

.intro-actions {
  display: flex;
  flex: none;
  gap: 0.65rem;
}

.lab-console {
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 28px 80px rgb(0 0 0 / 24%);
}

.console-bar,
.panel-heading,
.camera-caption {
  min-height: 2.8rem;
  padding: 0 1rem;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono, monospace);
  font-size: 0.66rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.status-cluster,
.console-meta,
.live-label {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.status-dot,
.live-label i,
.eye-card-heading i {
  width: 0.44rem;
  height: 0.44rem;
  border-radius: 50%;
  background: var(--muted);
}

.status-dot[data-state='tracking'],
.live-label i,
.eye-cards article[data-state='ready'] .eye-card-heading i {
  background: var(--cyan);
  box-shadow: 0 0 0.65rem rgb(126 226 222 / 60%);
}

.status-dot[data-state='loading'],
.status-dot[data-state='searching'],
.status-dot[data-state='uncalibrated'] {
  background: #f4c56a;
}

.status-dot[data-state='low'],
.eye-cards article[data-state='blink'] .eye-card-heading i {
  background: var(--orange);
}

.status-dot[data-state='error'] {
  background: #ff6d67;
}

.primary-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(24rem, 0.95fr);
}

.camera-panel {
  min-width: 0;
  border-right: 1px solid var(--border);
}

.live-label {
  color: var(--cyan);
}

.camera-stage {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  background: #090b0a;
}

.camera-feed,
.eye-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: scaleX(-1);
}

.camera-feed {
  object-fit: cover;
  filter: saturate(0.58) contrast(1.08) brightness(0.78);
}

.eye-overlay {
  z-index: 1;
  pointer-events: none;
}

.camera-empty {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-content: center;
  justify-items: center;
  padding: 2rem;
  text-align: center;
}

.camera-empty > :first-child {
  width: 2rem;
  height: 2rem;
  margin-bottom: 1rem;
  color: var(--cyan);
}

.camera-empty p {
  max-width: 27rem;
  margin: 0.55rem 0 0;
  color: var(--muted);
  font-size: 0.8rem;
}

.camera-caption {
  border-top: 1px solid var(--border);
  border-bottom: 0;
}

.gaze-panel {
  padding: clamp(1.4rem, 3vw, 2.4rem);
  background: var(--surface-2);
}

.instrument-heading > span {
  color: var(--cyan);
  font-family: var(--font-mono, monospace);
  font-size: 1.35rem;
}

.gaze-field {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1.5;
  margin-top: 1.7rem;
  border: 1px solid var(--border);
  background: #090b0a;
}

.field-grid {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(rgb(126 226 222 / 7%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(126 226 222 / 7%) 1px, transparent 1px);
  background-size: 12.5% 12.5%;
}

.field-center {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 1.2rem;
  height: 1.2rem;
  border: 1px solid rgb(241 238 230 / 24%);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.gaze-raw,
.gaze-point {
  position: absolute;
  transform: translate(-50%, -50%);
  transition: opacity 140ms ease;
}

.gaze-raw {
  width: 1.25rem;
  height: 1.25rem;
  border: 1px solid rgb(126 226 222 / 48%);
  border-radius: 50%;
}

.gaze-point {
  display: grid;
  width: 2.2rem;
  height: 2.2rem;
  place-items: center;
  border: 1px solid var(--orange);
  border-radius: 50%;
  box-shadow: 0 0 1.2rem rgb(96 165 250 / 38%);
  opacity: 0.35;
}

.gaze-point[data-tracked='true'] {
  opacity: 1;
}

.gaze-point i {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  background: var(--orange);
}

.field-axis {
  position: absolute;
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.58rem;
}

.field-axis-x {
  right: 0.5rem;
  bottom: 0.35rem;
  left: 0.5rem;
}

.field-axis-y {
  top: 0.5rem;
  right: 0.35rem;
  bottom: 0.5rem;
  flex-direction: column;
}

.output-values {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.output-values div {
  padding: 0.85rem;
  border-left: 1px solid var(--border);
}

.output-values span,
.output-values strong {
  display: block;
  font-family: var(--font-mono, monospace);
}

.output-values span {
  margin-bottom: 0.35rem;
  color: var(--muted);
  font-size: 0.58rem;
}

.output-values strong {
  color: var(--orange);
  font-size: 1rem;
  font-weight: 400;
}

.diagnostic-grid {
  display: grid;
  grid-template-columns: minmax(20rem, 1fr) minmax(18rem, 0.8fr) minmax(
      18rem,
      0.7fr
    );
  border-top: 1px solid var(--border);
}

.eye-panel,
.separation-panel,
.controls-panel {
  min-width: 0;
  padding: 1.35rem;
  border-right: 1px solid var(--border);
}

.controls-panel {
  border-right: 0;
}

.section-heading {
  margin-bottom: 1.1rem;
}

.section-heading button {
  border: 0;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  font-family: var(--font-mono, monospace);
  font-size: 0.62rem;
  text-transform: uppercase;
}

.section-heading button:disabled {
  cursor: default;
  opacity: 0.35;
}

.eye-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.8rem;
}

.eye-cards article {
  padding: 0.85rem;
  border: 1px solid var(--border);
  background: rgb(9 11 10 / 42%);
}

.eye-card-heading {
  color: var(--muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.eye-schematic {
  position: relative;
  height: 3.8rem;
  margin: 0.8rem 0;
  overflow: hidden;
  border: 1px solid rgb(241 238 230 / 16%);
  border-radius: 50%;
}

.eye-schematic span {
  position: absolute;
  top: calc(50% - 0.65rem);
  left: calc(50% - 0.65rem);
  width: 1.3rem;
  height: 1.3rem;
  border: 1px solid var(--orange);
  border-radius: 50%;
  background: rgb(96 165 250 / 18%);
}

.eye-cards dl {
  display: grid;
  gap: 0.35rem;
}

.eye-cards dl div {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-family: var(--font-mono, monospace);
  font-size: 0.58rem;
}

.eye-cards dt {
  color: var(--muted);
}

.confidence-track {
  height: 2px;
  margin-top: 0.75rem;
  background: rgb(241 238 230 / 9%);
}

.confidence-track i {
  display: block;
  height: 100%;
  background: var(--cyan);
}

.comparison-row > div:first-child {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.comparison-row span,
.comparison-row strong {
  font-family: var(--font-mono, monospace);
  font-size: 0.65rem;
}

.comparison-row span {
  color: var(--muted);
}

.comparison-row strong {
  font-weight: 400;
}

.comparison-track {
  position: relative;
  height: 2.4rem;
  margin-top: 0.45rem;
  border-block: 1px solid var(--border);
}

.comparison-track > i {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: rgb(241 238 230 / 24%);
}

.head-marker,
.gaze-marker {
  position: absolute;
  top: 50%;
  width: 0.7rem;
  height: 0.7rem;
  transform: translate(-50%, -50%) rotate(45deg);
}

.head-marker {
  border: 1px solid var(--cyan);
}

.gaze-marker {
  background: var(--orange);
}

.gaze-comparison {
  margin-top: 1rem;
}

.separation-panel > p {
  margin: 1rem 0 0;
  color: var(--muted);
  font-size: 0.69rem;
  line-height: 1.6;
}

.controls-panel label {
  display: block;
  margin-top: 1rem;
}

.controls-panel label > span {
  margin-bottom: 0.5rem;
}

.controls-panel strong,
.controls-panel small {
  font-size: 0.7rem;
  font-weight: 500;
}

.controls-panel small {
  color: var(--muted);
  font-family: var(--font-mono, monospace);
}

.controls-panel input {
  width: 100%;
  accent-color: var(--orange);
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin: 0;
  padding: 0.85rem 1rem;
  border-top: 1px solid rgb(255 109 103 / 25%);
  color: #ff8b86;
  background: rgb(255 109 103 / 6%);
  font-size: 0.8rem;
}

.accuracy-note {
  gap: 0.85rem;
  padding: 1rem 1.2rem;
  border-top: 1px solid var(--border);
  background: #111312;
}

.accuracy-note > :first-child {
  flex: none;
  color: #f4c56a;
}

.accuracy-note div {
  flex: 1;
}

.accuracy-note strong,
.accuracy-note p {
  font-size: 0.72rem;
}

.accuracy-note p {
  margin: 0.25rem 0 0;
  color: var(--muted);
}

.accuracy-note > span {
  color: var(--muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.62rem;
}

@media (max-width: 1080px) {
  .diagnostic-grid {
    grid-template-columns: 1fr 1fr;
  }

  .eye-panel {
    grid-column: 1 / -1;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
}

@media (max-width: 900px) {
  .primary-grid {
    grid-template-columns: 1fr;
  }

  .camera-panel {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
}

@media (max-width: 640px) {
  .lab-intro {
    align-items: flex-start;
    flex-direction: column;
  }

  .intro-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .console-meta,
  .camera-caption span:nth-child(2),
  .accuracy-note > span {
    display: none;
  }

  .gaze-panel {
    padding: 1.1rem;
  }

  .diagnostic-grid {
    grid-template-columns: 1fr;
  }

  .eye-panel {
    grid-column: auto;
  }

  .eye-panel,
  .separation-panel,
  .controls-panel {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .eye-cards {
    grid-template-columns: 1fr;
  }

  .output-values strong {
    font-size: 0.82rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .gaze-raw,
  .gaze-point {
    transition: none;
  }
}
</style>

<style scoped src="../../../assets/css/lab-experiments.css"></style>
