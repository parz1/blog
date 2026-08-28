<script setup lang="ts">
import { useFaceCamera } from '~/composables/face-lab/useFaceCamera.client'
import { useFaceLandmarker } from '~/composables/face-lab/useFaceLandmarker.client'
import { useHeadPoseSignal } from '~/composables/face-lab/useHeadPoseSignal.client'

const HISTORY_SIZE = 120
const YAW_RANGE = 45

const { t } = useI18n()
const camera = useFaceCamera()
const detector = useFaceLandmarker()
const pose = useHeadPoseSignal()

const video = ref<HTMLVideoElement>()
const starting = ref(false)
const uiError = ref('')
const history = ref<{ raw: number; filtered: number }[]>([])
let lastHistoryAt = 0

const active = computed(() => camera.state.value === 'streaming')
const relativeYaw = computed(() => pose.relative.value.yaw)
const filteredYaw = computed(() => pose.filtered.value.yaw)

const statusKey = computed(() => {
  if (uiError.value || camera.state.value === 'error') return 'error'
  if (starting.value || detector.state.value === 'loading') return 'loading'
  if (!active.value) return 'idle'
  if (!pose.tracked.value) return 'lost'
  return pose.calibrated.value ? 'tracking' : 'uncalibrated'
})

const statusLabel = computed(() => t(`headYawLab.status.${statusKey.value}`))

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const meterPosition = (value: number) =>
  ((clamp(value, -YAW_RANGE, YAW_RANGE) + YAW_RANGE) / (YAW_RANGE * 2)) * 100

const formatAngle = (value: number) => {
  const normalized = Math.abs(value) < 0.05 ? 0 : value
  return `${normalized >= 0 ? '+' : '−'}${Math.abs(normalized).toFixed(1)}°`
}

const historyPoints = (key: 'raw' | 'filtered') => {
  if (!history.value.length) return ''
  const denominator = Math.max(1, HISTORY_SIZE - 1)
  return history.value
    .map((sample, index) => {
      const x = (index / denominator) * 1000
      const y =
        80 - (clamp(sample[key], -YAW_RANGE, YAW_RANGE) / YAW_RANGE) * 58
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

const rawHistoryPoints = computed(() => historyPoints('raw'))
const filteredHistoryPoints = computed(() => historyPoints('filtered'))

watch(
  () => detector.snapshot.value,
  (snapshot) => {
    const now = performance.now()
    pose.update(snapshot, now)
    if (now - lastHistoryAt < 45) return
    lastHistoryAt = now
    history.value.push({
      raw: pose.relative.value.yaw,
      filtered: pose.filtered.value.yaw,
    })
    if (history.value.length > HISTORY_SIZE) history.value.shift()
  },
)

const start = async () => {
  if (!video.value || starting.value) return
  starting.value = true
  uiError.value = ''
  history.value = []
  lastHistoryAt = 0

  try {
    await Promise.all([camera.start(video.value), detector.start(video.value)])
  } catch (error) {
    detector.dispose()
    camera.stop()
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
  pose.clear()
  history.value = []
  uiError.value = ''
}

const calibrate = () => {
  if (!pose.calibrate()) return
  history.value = []
  lastHistoryAt = 0
}

const resetCalibration = () => {
  pose.resetCalibration()
  history.value = []
  lastHistoryAt = 0
}

onBeforeUnmount(stop)
</script>

<template>
  <section class="yaw-lab" aria-labelledby="head-yaw-lab-title">
    <header class="lab-intro">
      <div>
        <h1 id="head-yaw-lab-title">{{ t('headYawLab.title') }}</h1>
        <p class="intro-description">{{ t('headYawLab.description') }}</p>
      </div>

      <div class="intro-actions">
        <UButton
          v-if="!active"
          icon="i-lucide-camera"
          size="lg"
          :loading="starting"
          @click="start"
        >
          {{ t('headYawLab.actions.start') }}
        </UButton>
        <template v-else>
          <UButton
            icon="i-lucide-crosshair"
            size="lg"
            :disabled="!pose.tracked.value"
            @click="calibrate"
          >
            {{ t('headYawLab.actions.calibrate') }}
          </UButton>
          <UButton
            icon="i-lucide-square"
            color="error"
            variant="soft"
            size="lg"
            @click="stop"
          >
            {{ t('headYawLab.actions.stop') }}
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

      <div class="workbench-grid">
        <section class="camera-panel" :aria-label="t('headYawLab.camera')">
          <div class="panel-heading">
            <span>{{ t('headYawLab.camera') }}</span>
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
            <div class="pose-reticle" aria-hidden="true">
              <i class="reticle-y" />
              <i class="reticle-x" />
              <div
                class="pose-proxy"
                :data-tracked="pose.tracked.value"
                :style="{
                  '--yaw': `${clamp(filteredYaw, -35, 35) * 0.7}px`,
                  '--pitch': `${clamp(pose.filtered.value.pitch, -25, 25) * 0.45}px`,
                  '--roll': `${clamp(pose.filtered.value.roll, -30, 30)}deg`,
                }"
              >
                <span class="proxy-face"><i /></span>
              </div>
            </div>

            <div v-if="!active" class="camera-empty">
              <UIcon name="i-lucide-scan-face" />
              <strong>{{ t('headYawLab.empty.title') }}</strong>
              <p>{{ t('headYawLab.empty.description') }}</p>
            </div>
          </div>

          <div class="camera-caption">
            <span>
              {{ camera.settings.value.width || '—' }} ×
              {{ camera.settings.value.height || '—' }}
            </span>
            <span>{{ pose.tracked.value ? 'MATRIX 4×4' : 'NO POSE' }}</span>
            <span>MIRRORED</span>
          </div>
        </section>

        <section class="yaw-instrument" aria-label="Yaw signal instrument">
          <div class="instrument-heading">
            <div>
              <p class="instrument-kicker">01 / HEAD YAW</p>
              <h2>{{ t('headYawLab.instrument.title') }}</h2>
            </div>
            <strong>{{ formatAngle(filteredYaw) }}</strong>
          </div>

          <div class="yaw-meter">
            <div class="meter-labels" aria-hidden="true">
              <span>−45°</span><span>0°</span><span>+45°</span>
            </div>
            <div class="meter-track">
              <i class="meter-center" />
              <i
                class="dead-zone"
                :style="{
                  width: `${(pose.config.deadZone / YAW_RANGE) * 100}%`,
                }"
              />
              <span
                class="marker marker-raw"
                :style="{ left: `${meterPosition(relativeYaw)}%` }"
              />
              <span
                class="marker marker-filtered"
                :style="{ left: `${meterPosition(filteredYaw)}%` }"
              />
            </div>
            <div class="meter-directions">
              <span>{{ t('headYawLab.instrument.left') }}</span>
              <span>{{ t('headYawLab.instrument.neutral') }}</span>
              <span>{{ t('headYawLab.instrument.right') }}</span>
            </div>
          </div>

          <div class="legend-row">
            <span><i class="legend-raw" />{{ t('headYawLab.raw') }}</span>
            <span
              ><i class="legend-filtered" />{{ t('headYawLab.filtered') }}</span
            >
          </div>

          <div class="angle-grid">
            <article>
              <span>YAW / RAW</span>
              <strong>{{ formatAngle(relativeYaw) }}</strong>
            </article>
            <article class="accent-value">
              <span>YAW / OUTPUT</span>
              <strong>{{ formatAngle(filteredYaw) }}</strong>
            </article>
            <article>
              <span>PITCH / OUTPUT</span>
              <strong>{{ formatAngle(pose.filtered.value.pitch) }}</strong>
            </article>
            <article>
              <span>ROLL / OUTPUT</span>
              <strong>{{ formatAngle(pose.filtered.value.roll) }}</strong>
            </article>
          </div>
        </section>
      </div>

      <div class="lower-grid">
        <section class="history-panel">
          <div class="section-heading">
            <div>
              <p class="instrument-kicker">02 / SIGNAL TRACE</p>
              <h2>{{ t('headYawLab.trace') }}</h2>
            </div>
            <span>±{{ YAW_RANGE }}° / 5.4 s</span>
          </div>
          <svg
            viewBox="0 0 1000 160"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line x1="0" y1="80" x2="1000" y2="80" />
            <line x1="0" y1="22" x2="1000" y2="22" />
            <line x1="0" y1="138" x2="1000" y2="138" />
            <polyline class="trace-raw" :points="rawHistoryPoints" />
            <polyline class="trace-filtered" :points="filteredHistoryPoints" />
          </svg>
        </section>

        <aside class="controls-panel">
          <div class="section-heading">
            <div>
              <p class="instrument-kicker">03 / CONDITIONING</p>
              <h2>{{ t('headYawLab.conditioning') }}</h2>
            </div>
            <button
              type="button"
              :disabled="!pose.calibrated.value"
              @click="resetCalibration"
            >
              {{ t('headYawLab.actions.reset') }}
            </button>
          </div>

          <label class="control-row">
            <span>
              <strong>{{ t('headYawLab.controls.deadZone') }}</strong>
              <small>{{ pose.config.deadZone.toFixed(1) }}°</small>
            </span>
            <input
              v-model.number="pose.config.deadZone"
              type="range"
              min="0"
              max="8"
              step="0.5"
            />
          </label>

          <label class="control-row">
            <span>
              <strong>{{ t('headYawLab.controls.smoothing') }}</strong>
              <small>{{ pose.config.smoothingMs }} ms</small>
            </span>
            <input
              v-model.number="pose.config.smoothingMs"
              type="range"
              min="30"
              max="360"
              step="10"
            />
          </label>

          <label class="control-row">
            <span>
              <strong>{{ t('headYawLab.controls.return') }}</strong>
              <small>{{ pose.config.returnMs }} ms</small>
            </span>
            <input
              v-model.number="pose.config.returnMs"
              type="range"
              min="240"
              max="1600"
              step="40"
            />
          </label>

          <div class="calibration-readout">
            <span>{{ t('headYawLab.neutral') }}</span>
            <code>
              Y {{ formatAngle(pose.neutral.value.yaw) }} · P
              {{ formatAngle(pose.neutral.value.pitch) }} · R
              {{ formatAngle(pose.neutral.value.roll) }}
            </code>
          </div>
        </aside>
      </div>

      <p v-if="uiError" class="error-message" role="alert">
        <UIcon name="i-lucide-triangle-alert" />
        {{ uiError }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.yaw-lab {
  --lab-surface: #151716;
  --lab-surface-2: #101211;
  --lab-border: rgb(235 230 215 / 14%);
  --lab-text: #f1eee6;
  --lab-muted: #92958f;
  --lab-accent: #60a5fa;
  --lab-cyan: #7ee2de;

  color: var(--lab-text);
}

.lab-intro,
.console-bar,
.panel-heading,
.camera-caption,
.instrument-heading,
.section-heading,
.legend-row,
.meter-labels,
.meter-directions,
.control-row > span,
.calibration-readout,
.lab-note {
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
  color: var(--lab-accent);
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  letter-spacing: 0.18em;
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
  font-size: clamp(2.4rem, 6vw, 5rem);
  font-weight: 500;
  line-height: 0.96;
}

h2 {
  margin-bottom: 0;
  font-family: var(--font-serif, serif);
  font-size: 1.35rem;
  font-weight: 500;
}

.intro-description {
  max-width: 48rem;
  margin-bottom: 0;
  color: var(--lab-muted);
  line-height: 1.75;
}

.intro-actions {
  display: flex;
  flex: none;
  gap: 0.65rem;
}

.lab-console {
  overflow: hidden;
  border: 1px solid var(--lab-border);
  background: var(--lab-surface);
  box-shadow: 0 28px 80px rgb(0 0 0 / 24%);
}

.console-bar,
.panel-heading,
.camera-caption {
  min-height: 2.8rem;
  padding: 0 1rem;
  border-bottom: 1px solid var(--lab-border);
  font-family: var(--font-mono, monospace);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.status-cluster,
.console-meta,
.live-label,
.legend-row span {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.status-dot,
.live-label i {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--lab-muted);
}

.status-dot[data-state='tracking'],
.live-label i {
  background: var(--lab-cyan);
  box-shadow: 0 0 0.65rem rgb(126 226 222 / 62%);
}

.status-dot[data-state='loading'],
.status-dot[data-state='uncalibrated'] {
  background: #f4c56a;
}

.status-dot[data-state='error'] {
  background: #ff6d67;
}

.console-meta {
  color: var(--lab-muted);
}

.workbench-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(22rem, 0.9fr);
}

.camera-panel {
  min-width: 0;
  border-right: 1px solid var(--lab-border);
}

.panel-heading,
.camera-caption {
  color: var(--lab-muted);
}

.live-label {
  color: var(--lab-cyan);
}

.camera-stage {
  position: relative;
  overflow: hidden;
  min-height: 28rem;
  background:
    linear-gradient(rgb(126 226 222 / 3%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(126 226 222 / 3%) 1px, transparent 1px), #0a0c0b;
  background-size: 2rem 2rem;
}

.camera-feed {
  width: 100%;
  height: 100%;
  min-height: 28rem;
  object-fit: cover;
  transform: scaleX(-1);
}

.pose-reticle {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.reticle-x,
.reticle-y {
  position: absolute;
  background: rgb(241 238 230 / 10%);
}

.reticle-x {
  top: 50%;
  right: 10%;
  left: 10%;
  height: 1px;
}

.reticle-y {
  top: 10%;
  bottom: 10%;
  left: 50%;
  width: 1px;
}

.pose-proxy {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5.5rem;
  height: 7rem;
  opacity: 0;
  transform: translate(calc(-50% + var(--yaw)), calc(-50% + var(--pitch)))
    rotate(var(--roll));
  transition: opacity 180ms ease;
}

.pose-proxy[data-tracked='true'] {
  opacity: 1;
}

.proxy-face {
  position: absolute;
  inset: 0;
  border: 1px solid rgb(126 226 222 / 68%);
  border-radius: 48% 48% 44% 44%;
  box-shadow: inset 0 0 2rem rgb(126 226 222 / 7%);
}

.proxy-face i {
  position: absolute;
  top: 42%;
  left: 50%;
  width: 1.2rem;
  height: 1px;
  background: var(--lab-accent);
  transform: translateX(-50%);
}

.camera-empty {
  position: absolute;
  inset: 0;
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
  color: var(--lab-cyan);
}

.camera-empty p {
  max-width: 28rem;
  margin: 0.55rem 0 0;
  color: var(--lab-muted);
}

.camera-caption {
  border-top: 1px solid var(--lab-border);
  border-bottom: 0;
}

.yaw-instrument {
  padding: clamp(1.5rem, 3vw, 2.5rem);
  background: var(--lab-surface-2);
}

.instrument-heading > strong {
  color: var(--lab-accent);
  font-family: var(--font-mono, monospace);
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 400;
}

.yaw-meter {
  margin: 3.25rem 0 1rem;
}

.meter-labels,
.meter-directions,
.legend-row {
  color: var(--lab-muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.meter-track {
  position: relative;
  height: 4.5rem;
  margin: 0.6rem 0;
  border-block: 1px solid var(--lab-border);
  background: repeating-linear-gradient(
    90deg,
    transparent 0,
    transparent calc(12.5% - 1px),
    rgb(241 238 230 / 8%) calc(12.5% - 1px),
    rgb(241 238 230 / 8%) 12.5%
  );
}

.meter-center {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: rgb(241 238 230 / 38%);
}

.dead-zone {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  background: rgb(244 197 106 / 9%);
  border-inline: 1px solid rgb(244 197 106 / 30%);
  transform: translateX(-50%);
}

.marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
}

.marker-raw {
  width: 1rem;
  height: 1rem;
  border: 1px solid var(--lab-cyan);
  border-radius: 50%;
}

.marker-filtered {
  width: 3px;
  height: 3.1rem;
  background: var(--lab-accent);
  box-shadow: 0 0 0.8rem rgb(96 165 250 / 48%);
}

.legend-row {
  justify-content: flex-start;
  gap: 1.25rem;
  margin: 1.2rem 0 2rem;
}

.legend-row i {
  display: inline-block;
  width: 0.7rem;
  height: 0.7rem;
}

.legend-raw {
  border: 1px solid var(--lab-cyan);
  border-radius: 50%;
}

.legend-filtered {
  background: var(--lab-accent);
}

.angle-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid var(--lab-border);
  border-left: 1px solid var(--lab-border);
}

.angle-grid article {
  padding: 1rem;
  border-right: 1px solid var(--lab-border);
  border-bottom: 1px solid var(--lab-border);
}

.angle-grid span {
  display: block;
  margin-bottom: 0.55rem;
  color: var(--lab-muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.62rem;
  letter-spacing: 0.08em;
}

.angle-grid strong {
  font-family: var(--font-mono, monospace);
  font-size: 1.35rem;
  font-weight: 400;
}

.angle-grid .accent-value strong {
  color: var(--lab-accent);
}

.lower-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(20rem, 0.5fr);
  border-top: 1px solid var(--lab-border);
}

.history-panel,
.controls-panel {
  padding: 1.4rem;
}

.history-panel {
  border-right: 1px solid var(--lab-border);
}

.section-heading {
  margin-bottom: 1.25rem;
}

.section-heading > span,
.section-heading button {
  color: var(--lab-muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.65rem;
  letter-spacing: 0.08em;
}

.section-heading button {
  border: 0;
  background: transparent;
  cursor: pointer;
  text-transform: uppercase;
}

.section-heading button:hover:not(:disabled) {
  color: var(--lab-text);
}

.section-heading button:disabled {
  cursor: default;
  opacity: 0.35;
}

.history-panel svg {
  display: block;
  width: 100%;
  height: 10rem;
  overflow: visible;
}

.history-panel line {
  stroke: rgb(241 238 230 / 9%);
  vector-effect: non-scaling-stroke;
}

.history-panel polyline {
  fill: none;
  vector-effect: non-scaling-stroke;
}

.trace-raw {
  stroke: rgb(126 226 222 / 45%);
  stroke-width: 1;
}

.trace-filtered {
  stroke: var(--lab-accent);
  stroke-width: 2;
}

.control-row {
  display: block;
  margin-top: 1.1rem;
}

.control-row span {
  margin-bottom: 0.55rem;
}

.control-row strong,
.control-row small {
  font-size: 0.75rem;
  font-weight: 500;
}

.control-row small {
  color: var(--lab-muted);
  font-family: var(--font-mono, monospace);
}

.control-row input {
  width: 100%;
  accent-color: var(--lab-accent);
}

.calibration-readout {
  gap: 1rem;
  margin-top: 1.4rem;
  padding-top: 1rem;
  border-top: 1px solid var(--lab-border);
  color: var(--lab-muted);
  font-size: 0.7rem;
}

.calibration-readout code {
  color: var(--lab-text);
  font-size: 0.65rem;
  text-align: right;
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

.lab-note {
  gap: 0.85rem;
  padding: 1rem 1.2rem;
  border-top: 1px solid var(--lab-border);
  background: #111312;
}

.lab-note > :first-child {
  flex: none;
  color: var(--lab-cyan);
}

.lab-note div {
  flex: 1;
}

.lab-note strong,
.lab-note p {
  font-size: 0.72rem;
}

.lab-note p {
  margin: 0.25rem 0 0;
  color: var(--lab-muted);
}

.lab-note > span {
  color: var(--lab-muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.62rem;
}

@media (max-width: 960px) {
  .workbench-grid,
  .lower-grid {
    grid-template-columns: 1fr;
  }

  .camera-panel,
  .history-panel {
    border-right: 0;
    border-bottom: 1px solid var(--lab-border);
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

  .console-meta {
    display: none;
  }

  .camera-stage,
  .camera-feed {
    min-height: 20rem;
  }

  .camera-caption span:nth-child(2) {
    display: none;
  }

  .yaw-instrument {
    padding: 1.25rem;
  }

  .instrument-heading {
    align-items: flex-start;
    gap: 1rem;
  }

  .instrument-heading > strong {
    font-size: 2rem;
  }

  .angle-grid {
    grid-template-columns: 1fr 1fr;
  }

  .calibration-readout {
    align-items: flex-start;
    flex-direction: column;
  }

  .calibration-readout code {
    text-align: left;
  }

  .lab-note > span {
    display: none;
  }
}
</style>

<style scoped src="../../../assets/css/lab-experiments.css"></style>
