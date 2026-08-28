<script setup lang="ts">
import { useFaceCamera } from '~/composables/face-lab/useFaceCamera.client'
import { useFaceLandmarker } from '~/composables/face-lab/useFaceLandmarker.client'
import { useFaceState } from '~/composables/face-lab/useFaceState.client'

const { t } = useI18n()
const camera = useFaceCamera()
const detector = useFaceLandmarker()
const face = useFaceState()

const video = ref<HTMLVideoElement>()
const starting = ref(false)
const uiError = ref('')

const active = computed(() => camera.state.value === 'streaming')
const landmarkCount = computed(
  () => (detector.snapshot.value?.landmarks?.length ?? 0) / 3,
)
const blendshapeCount = computed(
  () => detector.snapshot.value?.blendshapeNames?.length ?? 0,
)
const signalQuality = computed(() =>
  Math.round((detector.snapshot.value?.signalQuality ?? 0) * 100),
)

const statusKey = computed(() => {
  if (uiError.value || camera.state.value === 'error') return 'error'
  if (starting.value || detector.state.value === 'loading') return 'loading'
  if (!active.value) return 'idle'
  if (!face.tracked.value) return 'searching'
  return face.calibrated.value ? 'tracking' : 'uncalibrated'
})

const statusLabel = computed(() => t(`faceStateLab.status.${statusKey.value}`))

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

const rounded = (value: number, digits = 3) => Number(value.toFixed(digits))

const faceStateJson = computed(() =>
  JSON.stringify(
    {
      tracked: face.state.value.tracked,
      head: {
        yaw: rounded(face.state.value.head.yaw, 2),
        pitch: rounded(face.state.value.head.pitch, 2),
        roll: rounded(face.state.value.head.roll, 2),
      },
      gaze: {
        x: rounded(face.state.value.gaze.x),
        y: rounded(face.state.value.gaze.y),
        confidence: rounded(face.state.value.gaze.confidence),
      },
      expression: {
        blinkL: rounded(face.state.value.expression.blinkL),
        blinkR: rounded(face.state.value.expression.blinkR),
        mouthOpen: rounded(face.state.value.expression.mouthOpen),
        smile: rounded(face.state.value.expression.smile),
      },
    },
    null,
    2,
  ),
)

const expressionRows = computed(() => [
  {
    key: 'blinkL',
    label: 'BLINK L',
    value: face.state.value.expression.blinkL,
  },
  {
    key: 'blinkR',
    label: 'BLINK R',
    value: face.state.value.expression.blinkR,
  },
  {
    key: 'mouthOpen',
    label: 'MOUTH OPEN',
    value: face.state.value.expression.mouthOpen,
  },
  {
    key: 'smile',
    label: 'SMILE',
    value: face.state.value.expression.smile,
  },
])

watch(
  () => detector.snapshot.value,
  (snapshot) => face.update(snapshot, performance.now()),
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
    face.clear()
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
  face.clear()
  uiError.value = ''
}

const calibrate = () => {
  face.calibrate()
}

onBeforeUnmount(stop)
</script>

<template>
  <section class="state-lab" aria-labelledby="face-state-lab-title">
    <header class="lab-intro">
      <div>
        <h1 id="face-state-lab-title">{{ t('faceStateLab.title') }}</h1>
        <p class="intro-description">{{ t('faceStateLab.description') }}</p>
      </div>
      <div class="intro-actions">
        <UButton
          v-if="!active"
          icon="i-lucide-camera"
          size="lg"
          :loading="starting"
          @click="start"
        >
          {{ t('faceStateLab.actions.start') }}
        </UButton>
        <template v-else>
          <UButton
            icon="i-lucide-crosshair"
            size="lg"
            :disabled="!face.gaze.tracked.value"
            @click="calibrate"
          >
            {{ t('faceStateLab.actions.calibrate') }}
          </UButton>
          <UButton
            icon="i-lucide-rotate-ccw"
            variant="soft"
            size="lg"
            :disabled="!face.calibrated.value"
            @click="face.resetCalibration"
          >
            {{ t('faceStateLab.actions.reset') }}
          </UButton>
          <UButton
            icon="i-lucide-square"
            color="error"
            variant="soft"
            size="lg"
            @click="stop"
          >
            {{ t('faceStateLab.actions.stop') }}
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

      <div class="upper-grid">
        <section class="camera-panel" :aria-label="t('faceStateLab.camera')">
          <div class="panel-heading">
            <span>{{ t('faceStateLab.camera') }}</span>
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
            <div class="camera-reticle" aria-hidden="true">
              <i /><i /><span />
            </div>
            <div v-if="!active" class="camera-empty">
              <UIcon name="i-lucide-braces" />
              <strong>{{ t('faceStateLab.empty.title') }}</strong>
              <p>{{ t('faceStateLab.empty.description') }}</p>
            </div>
          </div>
          <div class="camera-caption">
            <span>
              {{ camera.settings.value.width || '—' }} ×
              {{ camera.settings.value.height || '—' }}
            </span>
            <span>{{ landmarkCount || '—' }} LANDMARKS</span>
            <span>{{ blendshapeCount || '—' }} BLENDSHAPES</span>
          </div>
        </section>

        <section class="state-monitor">
          <div class="instrument-heading">
            <div>
              <p class="instrument-kicker">01 / NORMALIZED STATE</p>
              <h2>{{ t('faceStateLab.monitor.title') }}</h2>
            </div>
            <span :data-tracked="face.state.value.tracked">
              {{ face.state.value.tracked ? 'TRACKED' : 'IDLE' }}
            </span>
          </div>

          <div class="monitor-grid">
            <div class="debug-proxy" aria-label="FaceState diagnostic proxy">
              <span class="proxy-axis proxy-axis-x" />
              <span class="proxy-axis proxy-axis-y" />
              <div
                class="proxy-head"
                :style="{
                  '--yaw': `${clamp(face.state.value.head.yaw, -35, 35) * 0.45}px`,
                  '--pitch': `${clamp(face.state.value.head.pitch, -25, 25) * 0.35}px`,
                  '--roll': `${clamp(face.state.value.head.roll, -30, 30)}deg`,
                }"
              >
                <span
                  class="proxy-eye proxy-eye-left"
                  :style="{
                    '--blink': `${clamp(1 - face.state.value.expression.blinkL * 0.92, 0.08, 1)}`,
                  }"
                >
                  <i
                    :style="{
                      transform: `translate(${face.state.value.gaze.x * 7}px, ${face.state.value.gaze.y * 4}px)`,
                    }"
                  />
                </span>
                <span
                  class="proxy-eye proxy-eye-right"
                  :style="{
                    '--blink': `${clamp(1 - face.state.value.expression.blinkR * 0.92, 0.08, 1)}`,
                  }"
                >
                  <i
                    :style="{
                      transform: `translate(${face.state.value.gaze.x * 7}px, ${face.state.value.gaze.y * 4}px)`,
                    }"
                  />
                </span>
                <span
                  class="proxy-nose"
                  :style="{
                    transform: `translateX(${clamp(face.state.value.head.yaw, -30, 30) * 0.25}px)`,
                  }"
                />
                <span
                  class="proxy-mouth"
                  :style="{
                    width: `${25 + face.state.value.expression.smile * 14}px`,
                    height: `${3 + face.state.value.expression.mouthOpen * 18}px`,
                    borderRadius: `${4 + face.state.value.expression.smile * 16}px`,
                  }"
                />
              </div>
              <small>DIRECT DEBUG PROXY / NO CHARACTER MAPPING</small>
            </div>

            <div class="signal-stack">
              <div class="head-readout">
                <div>
                  <span>YAW</span>
                  <strong>{{ face.state.value.head.yaw.toFixed(1) }}°</strong>
                </div>
                <div>
                  <span>PITCH</span>
                  <strong>{{ face.state.value.head.pitch.toFixed(1) }}°</strong>
                </div>
                <div>
                  <span>ROLL</span>
                  <strong>{{ face.state.value.head.roll.toFixed(1) }}°</strong>
                </div>
              </div>

              <div class="gaze-readout">
                <div>
                  <span>GAZE XY</span>
                  <strong>
                    {{ face.state.value.gaze.x.toFixed(2) }} /
                    {{ face.state.value.gaze.y.toFixed(2) }}
                  </strong>
                </div>
                <div class="gaze-track">
                  <i
                    :style="{
                      left: `${50 + face.state.value.gaze.x * 44}%`,
                      top: `${50 + face.state.value.gaze.y * 44}%`,
                    }"
                  />
                </div>
              </div>

              <div class="expression-list">
                <div v-for="row in expressionRows" :key="row.key">
                  <span>{{ row.label }}</span>
                  <div><i :style="{ width: `${row.value * 100}%` }" /></div>
                  <strong>{{ row.value.toFixed(2) }}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="lower-grid">
        <section class="contract-panel">
          <div class="section-heading">
            <div>
              <p class="instrument-kicker">02 / PUBLIC CONTRACT</p>
              <h2>{{ t('faceStateLab.contract.title') }}</h2>
            </div>
            <span>FaceState</span>
          </div>
          <pre><code>{{ faceStateJson }}</code></pre>
        </section>

        <section class="detection-panel">
          <div class="section-heading">
            <div>
              <p class="instrument-kicker">03 / DETECTION LAYER</p>
              <h2>{{ t('faceStateLab.detection.title') }}</h2>
            </div>
            <span>PRIVATE INPUT</span>
          </div>
          <dl>
            <div>
              <dt>{{ t('faceStateLab.detection.quality') }}</dt>
              <dd>{{ signalQuality }}%</dd>
            </div>
            <div>
              <dt>{{ t('faceStateLab.detection.landmarks') }}</dt>
              <dd>{{ landmarkCount || 0 }}</dd>
            </div>
            <div>
              <dt>{{ t('faceStateLab.detection.blendshapes') }}</dt>
              <dd>{{ blendshapeCount }}</dd>
            </div>
            <div>
              <dt>{{ t('faceStateLab.detection.matrix') }}</dt>
              <dd>
                {{ detector.snapshot.value?.transformMatrix ? '4 × 4' : '—' }}
              </dd>
            </div>
            <div>
              <dt>{{ t('faceStateLab.detection.inference') }}</dt>
              <dd>{{ detector.stats.value.inferenceMs.toFixed(1) }} ms</dd>
            </div>
            <div>
              <dt>{{ t('faceStateLab.detection.fps') }}</dt>
              <dd>{{ detector.stats.value.inferenceFps.toFixed(1) }}</dd>
            </div>
          </dl>
        </section>
      </div>

      <p v-if="uiError" class="error-message" role="alert">
        <UIcon name="i-lucide-triangle-alert" />
        {{ uiError }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.state-lab {
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
.contract-note {
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
  max-width: 50rem;
  margin-bottom: 0;
  color: var(--muted);
  line-height: 1.75;
}

.intro-actions {
  display: flex;
  flex: none;
  gap: 0.6rem;
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
  font-size: 0.65rem;
  letter-spacing: 0.09em;
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
.live-label i {
  width: 0.44rem;
  height: 0.44rem;
  border-radius: 50%;
  background: var(--muted);
}

.status-dot[data-state='tracking'],
.live-label i {
  background: var(--cyan);
  box-shadow: 0 0 0.65rem rgb(126 226 222 / 60%);
}

.status-dot[data-state='loading'],
.status-dot[data-state='searching'],
.status-dot[data-state='uncalibrated'] {
  background: #f4c56a;
}

.status-dot[data-state='error'] {
  background: #ff6d67;
}

.upper-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(32rem, 1.15fr);
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

.camera-feed {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.5) contrast(1.08) brightness(0.72);
  transform: scaleX(-1);
}

.camera-reticle {
  position: absolute;
  inset: 12%;
  pointer-events: none;
  border: 1px solid rgb(126 226 222 / 12%);
}

.camera-reticle i:first-child,
.camera-reticle i:nth-child(2) {
  position: absolute;
  background: rgb(126 226 222 / 18%);
}

.camera-reticle i:first-child {
  top: 50%;
  right: 0;
  left: 0;
  height: 1px;
}

.camera-reticle i:nth-child(2) {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
}

.camera-reticle span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5.5rem;
  height: 7rem;
  border: 1px solid rgb(96 165 250 / 35%);
  border-radius: 48%;
  transform: translate(-50%, -50%);
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
  color: var(--cyan);
}

.camera-empty p {
  max-width: 25rem;
  margin: 0.55rem 0 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.6;
}

.camera-caption {
  border-top: 1px solid var(--border);
  border-bottom: 0;
}

.state-monitor {
  padding: clamp(1.3rem, 2.5vw, 2rem);
  background: var(--surface-2);
}

.instrument-heading > span {
  padding: 0.32rem 0.55rem;
  color: var(--muted);
  border: 1px solid var(--border);
  font-family: var(--font-mono, monospace);
  font-size: 0.58rem;
}

.instrument-heading > span[data-tracked='true'] {
  color: var(--cyan);
  border-color: rgb(126 226 222 / 38%);
}

.monitor-grid {
  display: grid;
  grid-template-columns: minmax(15rem, 0.8fr) minmax(18rem, 1.2fr);
  gap: 1.2rem;
  margin-top: 1.5rem;
}

.debug-proxy {
  position: relative;
  display: grid;
  min-height: 22rem;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--border);
  background:
    linear-gradient(rgb(126 226 222 / 5%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(126 226 222 / 5%) 1px, transparent 1px), #090b0a;
  background-size: 2rem 2rem;
}

.debug-proxy > small {
  position: absolute;
  right: 0.65rem;
  bottom: 0.55rem;
  color: var(--muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.52rem;
}

.proxy-axis {
  position: absolute;
  background: rgb(241 238 230 / 10%);
}

.proxy-axis-x {
  top: 50%;
  right: 8%;
  left: 8%;
  height: 1px;
}

.proxy-axis-y {
  top: 8%;
  bottom: 8%;
  left: 50%;
  width: 1px;
}

.proxy-head {
  position: relative;
  width: 9rem;
  height: 11.5rem;
  border: 1px solid rgb(126 226 222 / 65%);
  border-radius: 48% 48% 44% 44%;
  box-shadow: inset 0 0 2.5rem rgb(126 226 222 / 5%);
  transform: translate(var(--yaw), var(--pitch)) rotate(var(--roll));
}

.proxy-eye {
  position: absolute;
  top: 40%;
  width: 2.2rem;
  height: 1rem;
  overflow: hidden;
  border: 1px solid rgb(241 238 230 / 60%);
  border-radius: 50%;
  transform: scaleY(var(--blink));
}

.proxy-eye-left {
  left: 1.15rem;
}

.proxy-eye-right {
  right: 1.15rem;
}

.proxy-eye i {
  position: absolute;
  top: calc(50% - 0.25rem);
  left: calc(50% - 0.25rem);
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--orange);
}

.proxy-nose {
  position: absolute;
  top: 49%;
  left: calc(50% - 1px);
  width: 2px;
  height: 2rem;
  background: rgb(126 226 222 / 45%);
}

.proxy-mouth {
  position: absolute;
  bottom: 20%;
  left: 50%;
  border: 1px solid var(--orange);
  transform: translateX(-50%);
}

.signal-stack {
  display: grid;
  align-content: start;
  gap: 1rem;
}

.head-readout {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-top: 1px solid var(--border);
  border-right: 1px solid var(--border);
}

.head-readout div {
  padding: 0.75rem;
  border-bottom: 1px solid var(--border);
  border-left: 1px solid var(--border);
}

.head-readout span,
.head-readout strong,
.gaze-readout span,
.gaze-readout strong {
  display: block;
  font-family: var(--font-mono, monospace);
}

.head-readout span,
.gaze-readout span {
  margin-bottom: 0.3rem;
  color: var(--muted);
  font-size: 0.56rem;
}

.head-readout strong,
.gaze-readout strong {
  font-size: 0.85rem;
  font-weight: 400;
}

.gaze-readout {
  display: grid;
  grid-template-columns: 1fr 4.5rem;
  align-items: center;
  gap: 0.8rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
}

.gaze-track {
  position: relative;
  aspect-ratio: 1;
  border: 1px solid var(--border);
  background:
    linear-gradient(
      transparent 49%,
      rgb(241 238 230 / 12%) 50%,
      transparent 51%
    ),
    linear-gradient(
      90deg,
      transparent 49%,
      rgb(241 238 230 / 12%) 50%,
      transparent 51%
    );
}

.gaze-track i {
  position: absolute;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 50%;
  background: var(--orange);
  transform: translate(-50%, -50%);
}

.expression-list {
  display: grid;
  gap: 0.65rem;
}

.expression-list > div {
  display: grid;
  grid-template-columns: 5rem minmax(0, 1fr) 2.2rem;
  align-items: center;
  gap: 0.55rem;
  font-family: var(--font-mono, monospace);
  font-size: 0.56rem;
}

.expression-list > div > span {
  color: var(--muted);
}

.expression-list > div > div {
  height: 3px;
  background: rgb(241 238 230 / 9%);
}

.expression-list i {
  display: block;
  height: 100%;
  background: var(--orange);
}

.expression-list strong {
  font-weight: 400;
  text-align: right;
}

.lower-grid {
  display: grid;
  grid-template-columns: minmax(20rem, 1.05fr) minmax(17rem, 0.75fr) minmax(
      17rem,
      0.7fr
    );
  border-top: 1px solid var(--border);
}

.contract-panel,
.detection-panel,
.boundary-panel {
  min-width: 0;
  padding: 1.3rem;
  border-right: 1px solid var(--border);
}

.boundary-panel {
  border-right: 0;
}

.section-heading {
  margin-bottom: 1.1rem;
}

.section-heading > span {
  color: var(--muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.58rem;
}

.contract-panel pre {
  max-height: 23rem;
  margin: 0;
  padding: 1rem;
  overflow: auto;
  color: var(--cyan);
  border: 1px solid var(--border);
  background: #090b0a;
  font-family: var(--font-mono, monospace);
  font-size: 0.68rem;
  line-height: 1.55;
}

.detection-panel dl {
  display: grid;
  gap: 0.72rem;
}

.detection-panel dl div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 0.55rem;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono, monospace);
  font-size: 0.65rem;
}

.detection-panel dt {
  color: var(--muted);
}

.detection-panel dd {
  color: var(--cyan);
}

.boundary-panel ol {
  display: grid;
  gap: 0.85rem;
}

.boundary-panel li {
  display: grid;
  grid-template-columns: 1.8rem minmax(0, 1fr);
  gap: 0.65rem;
  padding: 0.65rem;
  border: 1px solid var(--border);
}

.boundary-panel li > span {
  color: var(--orange);
  font-family: var(--font-mono, monospace);
  font-size: 0.58rem;
}

.boundary-panel li div {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.boundary-panel strong {
  font-size: 0.7rem;
  font-weight: 500;
}

.boundary-panel small {
  color: var(--muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.55rem;
}

.boundary-panel .future-step {
  border-style: dashed;
  opacity: 0.58;
}

.boundary-panel > p {
  margin: 0.9rem 0 0;
  color: var(--muted);
  font-size: 0.68rem;
  line-height: 1.55;
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

.contract-note {
  gap: 0.85rem;
  padding: 1rem 1.2rem;
  border-top: 1px solid var(--border);
  background: #111312;
}

.contract-note > :first-child {
  flex: none;
  color: var(--cyan);
}

.contract-note div {
  flex: 1;
}

.contract-note strong,
.contract-note p {
  font-size: 0.72rem;
}

.contract-note p {
  margin: 0.25rem 0 0;
  color: var(--muted);
}

.contract-note > span {
  color: var(--muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.6rem;
}

@media (max-width: 1080px) {
  .upper-grid,
  .lower-grid {
    grid-template-columns: 1fr;
  }

  .camera-panel,
  .contract-panel,
  .detection-panel {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
}

@media (max-width: 700px) {
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
  .contract-note > span {
    display: none;
  }

  .state-monitor {
    padding: 1rem;
  }

  .monitor-grid {
    grid-template-columns: 1fr;
  }

  .debug-proxy {
    min-height: 18rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .proxy-head,
  .gaze-track i,
  .expression-list i {
    transition: none;
  }
}
</style>

<style scoped src="../../../assets/css/lab-experiments.css"></style>
