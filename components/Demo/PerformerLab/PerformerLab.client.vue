<script setup lang="ts">
import { useFaceCamera } from '~/composables/face-lab/useFaceCamera.client'
import { usePerformerState3D } from '~/composables/performer-lab/usePerformerState3D.client'
import { usePerformerTracker } from '~/composables/performer-lab/usePerformerTracker.client'
import PerformerStage from './PerformerStage.client.vue'

const { t } = useI18n()
const camera = useFaceCamera()
const tracker = usePerformerTracker()
const performer = usePerformerState3D()

const video = ref<HTMLVideoElement>()
const starting = ref(false)
const uiError = ref('')
const active = computed(() => camera.state.value === 'streaming')

const statusKey = computed(() => {
  if (uiError.value || camera.state.value === 'error') return 'error'
  if (starting.value || tracker.state.value === 'loading') return 'loading'
  if (!active.value) return 'idle'
  if (!performer.state.value.tracked) return 'searching'
  return performer.calibrated.value ? 'tracking' : 'uncalibrated'
})

const rounded = (value: number, digits = 2) => Number(value.toFixed(digits))
const speed = (vector: [number, number, number]) => Math.hypot(...vector)

const stateJson = computed(() => {
  const state = performer.state.value
  return JSON.stringify(
    {
      tracked: state.tracked,
      head: {
        position: state.head.position.map((value) => rounded(value)),
        rotation: {
          pitch: rounded(state.head.rotation[0], 1),
          yaw: rounded(state.head.rotation[1], 1),
          roll: rounded(state.head.rotation[2], 1),
        },
        forward: state.head.forward.map((value) => rounded(value, 3)),
        angularVelocity: state.head.angularVelocity.map((value) =>
          rounded(value, 1),
        ),
      },
      eyes: {
        confidence: rounded(state.eyes.confidence, 3),
        target: state.eyes.target.map((value) => rounded(value)),
      },
      face: {
        tracked: state.face.tracked,
        signalQuality: rounded(state.face.signalQuality, 3),
        geometry: {
          normalizedXYZ: state.face.normalizedLandmarks.length / 3,
          cameraSpaceXYZ: state.face.cameraLandmarks.length,
          transformMatrixValues: state.face.transformMatrix.length,
        },
        blendshapes: {
          names: state.face.blendshapeNames.length,
          scores: state.face.blendshapeScores.length,
        },
        semantic: {
          blinkL: rounded(state.face.blinkL, 3),
          blinkR: rounded(state.face.blinkR, 3),
          mouthOpen: rounded(state.face.mouthOpen, 3),
          smile: rounded(state.face.smile, 3),
          eyesClosed: state.face.eyesClosed,
          mouthState: state.face.mouthState,
          smileActive: state.face.smileActive,
        },
      },
      hands: {
        left: {
          tracked: state.hands.left.tracked,
          joints: state.hands.left.joints.length,
        },
        right: {
          tracked: state.hands.right.tracked,
          joints: state.hands.right.joints.length,
        },
      },
    },
    null,
    2,
  )
})

watch(
  () => tracker.frame.value,
  (frame) => performer.update(frame),
)

const start = async () => {
  if (!video.value || starting.value) return
  starting.value = true
  uiError.value = ''
  try {
    await Promise.all([camera.start(video.value), tracker.start(video.value)])
  } catch (error) {
    tracker.dispose()
    camera.stop()
    performer.clear()
    uiError.value =
      camera.errorMessage.value ||
      tracker.errorMessage.value ||
      (error instanceof Error ? error.message : String(error))
  } finally {
    starting.value = false
  }
}

const stop = () => {
  tracker.dispose()
  camera.stop()
  performer.clear()
  uiError.value = ''
}

onBeforeUnmount(stop)
</script>

<template>
  <section class="performer-lab" aria-labelledby="performer-lab-title">
    <header class="lab-intro">
      <div>
        <h1 id="performer-lab-title">{{ t('performerLab.title') }}</h1>
        <p class="intro-description">{{ t('performerLab.description') }}</p>
      </div>
      <div class="intro-actions">
        <UButton
          v-if="!active"
          icon="i-lucide-camera"
          size="lg"
          :loading="starting"
          @click="start"
        >
          {{ t('performerLab.actions.start') }}
        </UButton>
        <template v-else>
          <UButton
            icon="i-lucide-crosshair"
            size="lg"
            :disabled="!performer.state.value.head.tracked"
            @click="performer.calibrate"
          >
            {{ t('performerLab.actions.calibrate') }}
          </UButton>
          <UButton
            icon="i-lucide-rotate-ccw"
            variant="soft"
            size="lg"
            :disabled="!performer.calibrated.value"
            @click="performer.resetCalibration"
          >
            {{ t('performerLab.actions.reset') }}
          </UButton>
          <UButton
            icon="i-lucide-square"
            color="error"
            variant="soft"
            size="lg"
            @click="stop"
          >
            {{ t('performerLab.actions.stop') }}
          </UButton>
        </template>
      </div>
    </header>

    <div class="lab-frame">
      <div class="frame-bar">
        <div class="status-cluster" aria-live="polite">
          <i :data-state="statusKey" />
          <span>{{ t(`performerLab.status.${statusKey}`) }}</span>
        </div>
      </div>

      <div class="stage-grid">
        <section class="camera-panel" :aria-label="t('performerLab.camera')">
          <div class="panel-heading">
            <span>{{ t('performerLab.camera') }}</span>
            <strong v-if="active">LOCAL / LIVE</strong>
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
            <div v-if="!active" class="camera-empty">
              <UIcon name="i-lucide-scan-face" />
              <strong>{{ t('performerLab.empty.title') }}</strong>
              <p>{{ t('performerLab.empty.description') }}</p>
            </div>
          </div>
          <div class="camera-meta">
            <span>
              {{ camera.settings.value.width || '—' }} ×
              {{ camera.settings.value.height || '—' }}
            </span>
            <span>{{ tracker.frame.value?.face.faceCount ?? 0 }} FACE</span>
            <span>{{ tracker.handCount.value }} HANDS</span>
          </div>
        </section>

        <section class="three-panel" :aria-label="t('performerLab.stage')">
          <div class="panel-heading">
            <span>{{ t('performerLab.stage') }}</span>
            <strong>CANONICAL CAMERA SPACE</strong>
          </div>
          <PerformerStage :state="performer.state.value" />
          <div class="stage-badges">
            <span :data-on="performer.state.value.face.tracked">
              FACE · {{ performer.state.value.face.landmarkCount }} XYZ
            </span>
            <span :data-on="performer.state.value.head.tracked">HEAD</span>
            <span :data-on="performer.state.value.eyes.confidence > 0.1"
              >GAZE RAYS</span
            >
            <span :data-on="performer.state.value.hands.left.tracked"
              >LEFT HAND</span
            >
            <span :data-on="performer.state.value.hands.right.tracked"
              >RIGHT HAND</span
            >
          </div>
        </section>
      </div>

      <div class="instrument-grid">
        <section class="pose-panel">
          <div class="panel-heading">
            <span>Head pose</span><strong>ROTATION + VELOCITY</strong>
          </div>
          <div class="rotation-readout">
            <div>
              <span>YAW</span>
              <strong
                >{{
                  performer.state.value.head.rotation[1].toFixed(1)
                }}°</strong
              >
            </div>
            <div>
              <span>PITCH</span>
              <strong
                >{{
                  performer.state.value.head.rotation[0].toFixed(1)
                }}°</strong
              >
            </div>
            <div>
              <span>ROLL</span>
              <strong
                >{{
                  performer.state.value.head.rotation[2].toFixed(1)
                }}°</strong
              >
            </div>
            <div>
              <span>ANGULAR SPEED</span>
              <strong
                >{{
                  speed(performer.state.value.head.angularVelocity).toFixed(0)
                }}°/s</strong
              >
            </div>
          </div>
          <div class="vector-row">
            <span>FORWARD</span>
            <code>
              {{
                performer.state.value.head.forward
                  .map((v) => v.toFixed(2))
                  .join(' / ')
              }}
            </code>
          </div>
        </section>

        <section class="hands-panel">
          <div class="panel-heading">
            <span>Hands</span><strong>21 JOINTS EACH</strong>
          </div>
          <div
            v-for="hand in [
              performer.state.value.hands.left,
              performer.state.value.hands.right,
            ]"
            :key="hand.handedness"
            class="hand-row"
            :data-tracked="hand.tracked"
          >
            <i />
            <strong>{{ hand.handedness.toUpperCase() }}</strong>
            <span>{{ hand.joints.length }} JOINTS</span>
            <code>{{ (hand.confidence * 100).toFixed(0) }}%</code>
            <small>{{ speed(hand.velocity).toFixed(2) }} u/s</small>
          </div>
        </section>

        <section class="timing-panel">
          <div class="panel-heading">
            <span>Performance</span><strong>ONE FRAME</strong>
          </div>
          <dl>
            <div>
              <dt>FACE TASK</dt>
              <dd>{{ tracker.stats.value.faceInferenceMs.toFixed(1) }} ms</dd>
            </div>
            <div>
              <dt>HAND TASK</dt>
              <dd>{{ tracker.stats.value.handInferenceMs.toFixed(1) }} ms</dd>
            </div>
            <div>
              <dt>TOTAL</dt>
              <dd>{{ tracker.stats.value.inferenceMs.toFixed(1) }} ms</dd>
            </div>
            <div>
              <dt>OUTPUT FPS</dt>
              <dd>{{ tracker.stats.value.inferenceFps.toFixed(1) }}</dd>
            </div>
          </dl>
        </section>

        <section class="state-panel">
          <div class="panel-heading">
            <span>Performer state</span><strong>READONLY</strong>
          </div>
          <pre><code>{{ stateJson }}</code></pre>
        </section>
      </div>

      <p v-if="uiError" class="error-message" role="alert">
        <UIcon name="i-lucide-triangle-alert" />{{ uiError }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.performer-lab {
  --surface: #141817;
  --deep: #090c0c;
  --border: rgb(235 230 215 / 14%);
  --text: #f1eee6;
  --muted: #909691;
  --orange: #60a5fa;
  --cyan: #7ee2de;
  color: var(--text);
}

.lab-intro,
.intro-actions,
.frame-bar,
.status-cluster,
.pipeline-labels,
.panel-heading,
.camera-meta,
.lab-note {
  display: flex;
  align-items: center;
}

.lab-intro {
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 2rem;
}

.lab-intro > div:first-child {
  max-width: 54rem;
}

.eyebrow {
  margin: 0 0 0.65rem;
  color: var(--orange);
  font-family: var(--font-mono, monospace);
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1,
p {
  margin-top: 0;
}

h1 {
  margin-bottom: 0.8rem;
  font-family: var(--font-serif, serif);
  font-size: clamp(2.7rem, 6vw, 5rem);
  font-weight: 500;
  line-height: 0.96;
}

.intro-description {
  margin-bottom: 0;
  color: var(--muted);
  line-height: 1.75;
}

.intro-actions {
  flex: none;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.55rem;
}

.lab-frame {
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 32px 90px rgb(0 0 0 / 27%);
}

.frame-bar,
.panel-heading,
.camera-meta {
  min-height: 2.75rem;
  justify-content: space-between;
  padding: 0 0.9rem;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono, monospace);
  font-size: 0.56rem;
  letter-spacing: 0.08em;
}

.status-cluster,
.pipeline-labels {
  gap: 0.5rem;
}

.status-cluster i {
  width: 0.43rem;
  height: 0.43rem;
  border-radius: 50%;
  background: var(--muted);
}

.status-cluster i[data-state='tracking'] {
  background: var(--cyan);
  box-shadow: 0 0 0.6rem rgb(126 226 222 / 65%);
}

.status-cluster i[data-state='loading'],
.status-cluster i[data-state='searching'],
.status-cluster i[data-state='uncalibrated'] {
  background: #efc56f;
}

.status-cluster i[data-state='error'] {
  background: #ff746c;
}

.pipeline-labels b {
  color: var(--orange);
  font-weight: 400;
}

.stage-grid {
  display: grid;
  grid-template-columns: minmax(22rem, 0.72fr) minmax(34rem, 1.28fr);
}

.camera-panel,
.three-panel {
  min-width: 0;
}

.camera-panel {
  border-right: 1px solid var(--border);
}

.panel-heading strong {
  color: var(--cyan);
  font-size: inherit;
  font-weight: 400;
}

.camera-stage {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  background: var(--deep);
}

.camera-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.45) contrast(1.12) brightness(0.68);
  transform: scaleX(-1);
}

.camera-guide {
  position: absolute;
  inset: 10%;
  pointer-events: none;
  border: 1px solid rgb(126 226 222 / 12%);
}

.camera-guide i,
.camera-guide span {
  position: absolute;
  background: rgb(126 226 222 / 12%);
}

.camera-guide i {
  top: 50%;
  right: 0;
  left: 0;
  height: 1px;
}

.camera-guide span {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
}

.camera-empty {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  padding: 2rem;
  text-align: center;
  background: rgb(9 12 12 / 80%);
}

.camera-empty > :first-child {
  width: 2rem;
  height: 2rem;
  margin-bottom: 1rem;
  color: var(--cyan);
}

.camera-empty p {
  max-width: 23rem;
  margin: 0.55rem 0 0;
  color: var(--muted);
  font-size: 0.72rem;
  line-height: 1.6;
}

.camera-meta {
  border-top: 1px solid var(--border);
  border-bottom: 0;
}

.three-panel {
  position: relative;
  background: var(--deep);
}

.three-panel > :deep(.performer-stage) {
  height: calc(100% - 2.75rem);
}

.stage-badges {
  position: absolute;
  z-index: 3;
  top: 3.45rem;
  left: 0.7rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  pointer-events: none;
}

.stage-badges span {
  padding: 0.28rem 0.42rem;
  color: #59615d;
  border: 1px solid rgb(235 230 215 / 10%);
  background: rgb(8 11 11 / 70%);
  font-family: var(--font-mono, monospace);
  font-size: 0.48rem;
}

.stage-badges span[data-on='true'] {
  color: var(--cyan);
  border-color: rgb(126 226 222 / 32%);
}

.instrument-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(15rem, 1fr));
  border-top: 1px solid var(--border);
}

.instrument-grid > section {
  min-width: 0;
  border-right: 1px solid var(--border);
}

.state-panel {
  grid-column: span 3;
  border-top: 1px solid var(--border);
  border-right: 0 !important;
}

.rotation-readout {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  padding: 0.9rem;
  gap: 0.55rem;
}

.rotation-readout div {
  padding: 0.6rem;
  border: 1px solid var(--border);
}

.rotation-readout span,
.rotation-readout strong {
  display: block;
  font-family: var(--font-mono, monospace);
}

.rotation-readout span {
  margin-bottom: 0.35rem;
  color: var(--muted);
  font-size: 0.5rem;
}

.rotation-readout strong {
  font-size: 0.85rem;
  font-weight: 400;
}

.vector-row {
  display: flex;
  justify-content: space-between;
  margin: 0 0.9rem 0.9rem;
  padding-top: 0.7rem;
  color: var(--muted);
  border-top: 1px solid var(--border);
  font-family: var(--font-mono, monospace);
  font-size: 0.55rem;
}

.vector-row code {
  color: var(--cyan);
}

.hands-panel {
  padding-bottom: 0.8rem;
}

.hand-row {
  display: grid;
  grid-template-columns: 0.5rem 3rem 1fr 2.2rem 3rem;
  align-items: center;
  gap: 0.45rem;
  margin: 0.8rem 0.9rem 0;
  padding: 0.65rem;
  color: #555d59;
  border: 1px solid var(--border);
  font-family: var(--font-mono, monospace);
  font-size: 0.52rem;
}

.hand-row i {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background: #444a47;
}

.hand-row[data-tracked='true'] {
  color: var(--text);
  border-color: rgb(126 226 222 / 25%);
}

.hand-row[data-tracked='true'] i {
  background: var(--cyan);
}

.hand-row small {
  color: var(--muted);
}

.timing-panel dl {
  display: grid;
  gap: 0.6rem;
  padding: 0 0.9rem 0.9rem;
}

.timing-panel dl div {
  display: flex;
  justify-content: space-between;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono, monospace);
  font-size: 0.58rem;
}

.timing-panel dt {
  color: var(--muted);
}

.timing-panel dd {
  color: var(--cyan);
}

.state-panel pre {
  max-height: 22rem;
  margin: 0;
  padding: 1rem;
  overflow: auto;
  color: var(--cyan);
  background: #080b0b;
  font-family: var(--font-mono, monospace);
  font-size: 0.62rem;
  line-height: 1.55;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0;
  padding: 0.8rem 1rem;
  color: #ff8d86;
  border-top: 1px solid rgb(255 109 103 / 25%);
  background: rgb(255 109 103 / 6%);
  font-size: 0.75rem;
}

.lab-note {
  gap: 0.8rem;
  padding: 1rem 1.2rem;
  border-top: 1px solid var(--border);
}

.lab-note > :first-child {
  flex: none;
  color: var(--cyan);
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
  color: var(--muted);
}

.lab-note > span {
  color: var(--muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.55rem;
}

@media (max-width: 1050px) {
  .stage-grid,
  .instrument-grid {
    grid-template-columns: 1fr;
  }

  .camera-panel,
  .instrument-grid > section {
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .state-panel {
    grid-column: auto;
  }
}

@media (max-width: 700px) {
  .lab-intro {
    align-items: flex-start;
    flex-direction: column;
  }

  .intro-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .pipeline-labels,
  .lab-note > span {
    display: none;
  }

  .stage-grid {
    display: flex;
    flex-direction: column;
  }

  .three-panel {
    min-height: 31rem;
  }

  .camera-meta span:first-child {
    display: none;
  }
}
</style>

<style scoped src="../../../assets/css/lab-experiments.css"></style>
