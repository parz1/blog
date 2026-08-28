<script setup lang="ts">
import { useFaceCamera } from '~/composables/face-lab/useFaceCamera.client'
import { useFaceLandmarker } from '~/composables/face-lab/useFaceLandmarker.client'
import { useFaceState } from '~/composables/face-lab/useFaceState.client'
import { usePuppetPerformance } from '~/composables/face-lab/usePuppetPerformance.client'

const { t } = useI18n()
const camera = useFaceCamera()
const detector = useFaceLandmarker()
const face = useFaceState()
const performer = usePuppetPerformance(face.state)

const video = ref<HTMLVideoElement>()
const mode = ref<'debug' | 'clean'>('debug')
const starting = ref(false)
const uiError = ref('')

const active = computed(() => camera.state.value === 'streaming')
const signalQuality = computed(() =>
  Math.round((detector.snapshot.value?.signalQuality ?? 0) * 100),
)

const statusKey = computed(() => {
  if (uiError.value || camera.state.value === 'error') return 'error'
  if (starting.value || detector.state.value === 'loading') return 'loading'
  if (!active.value) return 'idle'
  if (!face.tracked.value) return 'searching'
  return face.calibrated.value ? 'performing' : 'uncalibrated'
})

const signalRows = computed(() => [
  {
    label: 'HEAD YAW',
    input: `${face.state.value.head.yaw.toFixed(1)}°`,
    output: performer.pose.value.headX.toFixed(2),
  },
  {
    label: 'GAZE X / Y',
    input: `${face.state.value.gaze.x.toFixed(2)} / ${face.state.value.gaze.y.toFixed(2)}`,
    output: `${performer.pose.value.gazeX.toFixed(2)} / ${performer.pose.value.gazeY.toFixed(2)}`,
  },
  {
    label: 'BLINK L / R',
    input: `${face.state.value.expression.blinkL.toFixed(2)} / ${face.state.value.expression.blinkR.toFixed(2)}`,
    output: `${performer.pose.value.blinkL.toFixed(2)} / ${performer.pose.value.blinkR.toFixed(2)}`,
  },
  {
    label: 'MOUTH / SMILE',
    input: `${face.state.value.expression.mouthOpen.toFixed(2)} / ${face.state.value.expression.smile.toFixed(2)}`,
    output: `${performer.pose.value.mouthOpen.toFixed(2)} / ${performer.pose.value.smile.toFixed(2)}`,
  },
])

watch(
  () => detector.snapshot.value,
  (snapshot) => face.update(snapshot, globalThis.performance.now()),
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
    performer.reset()
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

onBeforeUnmount(stop)
</script>

<template>
  <section
    class="puppet-lab"
    :class="{ 'is-clean-active': mode === 'clean' && active }"
    :data-mode="mode"
    aria-labelledby="puppet-lab-title"
  >
    <header class="lab-intro">
      <div class="intro-copy">
        <h1 id="puppet-lab-title">{{ t('puppetLab.title') }}</h1>
        <p>{{ t('puppetLab.description') }}</p>
      </div>

      <div class="intro-actions">
        <div class="mode-switch" :aria-label="t('puppetLab.mode.label')">
          <button
            type="button"
            :aria-pressed="mode === 'debug'"
            @click="mode = 'debug'"
          >
            DEBUG
          </button>
          <button
            type="button"
            :aria-pressed="mode === 'clean'"
            @click="mode = 'clean'"
          >
            CLEAN
          </button>
        </div>

        <UButton
          v-if="!active"
          icon="i-lucide-camera"
          size="lg"
          :loading="starting"
          @click="start"
        >
          {{ t('puppetLab.actions.start') }}
        </UButton>
        <template v-else>
          <UButton
            icon="i-lucide-crosshair"
            size="lg"
            :disabled="!face.gaze.tracked.value"
            @click="face.calibrate"
          >
            {{ t('puppetLab.actions.calibrate') }}
          </UButton>
          <UButton
            icon="i-lucide-square"
            color="error"
            variant="soft"
            size="lg"
            @click="stop"
          >
            {{ t('puppetLab.actions.stop') }}
          </UButton>
        </template>
      </div>
    </header>

    <div class="lab-frame">
      <div class="frame-bar">
        <div class="status-cluster" aria-live="polite">
          <i :data-state="statusKey" />
          <span>{{ t(`puppetLab.status.${statusKey}`) }}</span>
        </div>
      </div>

      <div class="workbench">
        <section class="puppet-stage" :aria-label="t('puppetLab.stage')">
          <DemoFaceLabPaperPuppet
            class="puppet"
            :pose="performer.pose.value"
            :active="face.tracked.value"
          />

          <div v-if="!active" class="stage-empty">
            <span><UIcon name="i-lucide-sparkles" /></span>
            <strong>{{ t('puppetLab.empty.title') }}</strong>
            <p>{{ t('puppetLab.empty.description') }}</p>
          </div>
        </section>

        <aside class="debug-panel" aria-label="Puppet performance debug panel">
          <section class="camera-module">
            <div class="module-heading">
              <span>Camera</span>
              <b>{{ detector.stats.value.inferenceFps.toFixed(1) }} FPS</b>
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
              <span v-if="active" class="camera-quality">
                {{ signalQuality }}% SIGNAL
              </span>
              <div v-if="!active" class="camera-offline">CAMERA OFFLINE</div>
            </div>
          </section>

          <section class="mapping-module">
            <div class="module-heading">
              <span>Signal mapping</span>
              <b>INPUT → POSE</b>
            </div>
            <div class="mapping-table">
              <div class="mapping-header">
                <span>SIGNAL</span><span>FACE_STATE</span><span>SPRING</span>
              </div>
              <div v-for="row in signalRows" :key="row.label">
                <span>{{ row.label }}</span>
                <code>{{ row.input }}</code>
                <code>{{ row.output }}</code>
              </div>
            </div>
          </section>

          <section class="dynamics-module">
            <div class="module-heading">
              <span>Response</span>
              <b>ASYNC RESPONSE</b>
            </div>
            <ol>
              <li>
                <i class="fast" /><span>{{ t('puppetLab.layers.eyes') }}</span
                ><small>FAST / 235</small>
              </li>
              <li>
                <i class="medium" /><span>{{ t('puppetLab.layers.face') }}</span
                ><small>MEDIUM / 150</small>
              </li>
              <li>
                <i class="slow" /><span>{{ t('puppetLab.layers.hair') }}</span
                ><small>SLOW / 54</small>
              </li>
            </ol>
          </section>
        </aside>
      </div>

      <p v-if="uiError" class="error-message" role="alert">
        <UIcon name="i-lucide-triangle-alert" />
        {{ uiError }}
      </p>
    </div>

    <div v-if="mode === 'clean' && active" class="clean-caption">
      <span>PARALLAX PERSONA</span>
      <small>3D INPUT / 2D PERSONALITY</small>
    </div>
  </section>
</template>

<style scoped>
.puppet-lab {
  --surface: #141817;
  --surface-deep: #090c0c;
  --border: rgb(235 230 215 / 14%);
  --text: #f1eee6;
  --muted: #919792;
  --orange: #60a5fa;
  --cyan: #7ee2de;
  color: var(--text);
}

.lab-intro,
.intro-actions,
.frame-bar,
.status-cluster,
.module-heading,
.lab-note {
  display: flex;
  align-items: center;
}

.lab-intro {
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 2rem;
}

.intro-copy {
  max-width: 52rem;
}

.eyebrow {
  margin: 0 0 0.65rem;
  color: var(--orange);
  font-family: var(--font-mono, monospace);
  font-size: 0.7rem;
  letter-spacing: 0.17em;
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

.intro-copy > p:last-child {
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

.mode-switch {
  display: flex;
  align-self: stretch;
  padding: 0.2rem;
  border: 1px solid var(--border);
  background: var(--surface-deep);
}

.mode-switch button {
  min-width: 4.3rem;
  padding: 0.4rem 0.65rem;
  color: var(--muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  border: 0;
  background: transparent;
}

.mode-switch button[aria-pressed='true'] {
  color: #111514;
  background: var(--cyan);
}

.lab-frame {
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--surface);
  box-shadow: 0 32px 90px rgb(0 0 0 / 27%);
}

.frame-bar {
  min-height: 2.8rem;
  justify-content: space-between;
  padding: 0 1rem;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono, monospace);
  font-size: 0.62rem;
  letter-spacing: 0.09em;
}

.status-cluster {
  gap: 0.55rem;
}

.status-cluster i {
  width: 0.43rem;
  height: 0.43rem;
  border-radius: 50%;
  background: var(--muted);
}

.status-cluster i[data-state='performing'] {
  background: var(--cyan);
  box-shadow: 0 0 0.65rem rgb(126 226 222 / 65%);
}

.status-cluster i[data-state='loading'],
.status-cluster i[data-state='searching'],
.status-cluster i[data-state='uncalibrated'] {
  background: #efc56f;
}

.status-cluster i[data-state='error'] {
  background: #ff746c;
}

.workbench {
  display: grid;
  grid-template-columns: minmax(32rem, 1.45fr) minmax(21rem, 0.55fr);
  min-height: 43rem;
}

.puppet-stage {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 43rem;
  place-items: center;
  overflow: hidden;
  border-right: 1px solid var(--border);
  background:
    radial-gradient(circle at 50% 44%, rgb(126 226 222 / 8%), transparent 41%),
    #0a0d0c;
}

.stage-grid {
  position: absolute;
  inset: 0;
  opacity: 0.5;
  background-image:
    linear-gradient(rgb(126 226 222 / 5%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(126 226 222 / 5%) 1px, transparent 1px);
  background-size: 2rem 2rem;
  mask-image: radial-gradient(circle, #000 15%, transparent 72%);
}

.stage-orbit {
  position: absolute;
  top: 50%;
  left: 50%;
  border: 1px solid rgb(126 226 222 / 12%);
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.stage-orbit-a {
  width: 31rem;
  height: 31rem;
}

.stage-orbit-b {
  width: 24rem;
  height: 24rem;
  border-style: dashed;
}

.stage-label {
  position: absolute;
  z-index: 3;
  color: var(--muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.56rem;
  letter-spacing: 0.1em;
}

.stage-label-top {
  top: 1rem;
  left: 1rem;
}

.stage-label-bottom {
  right: 1rem;
  bottom: 1rem;
  color: var(--cyan);
}

.puppet {
  position: relative;
  z-index: 2;
  width: min(90%, 39rem);
  height: min(90%, 39rem);
  filter: drop-shadow(0 25px 22px rgb(0 0 0 / 32%));
}

.stage-empty {
  position: absolute;
  z-index: 4;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  padding: 2rem;
  text-align: center;
  background: rgb(9 12 12 / 72%);
  backdrop-filter: blur(5px);
}

.stage-empty > span {
  display: grid;
  width: 3.4rem;
  height: 3.4rem;
  margin-bottom: 1.1rem;
  place-items: center;
  color: var(--cyan);
  border: 1px solid rgb(126 226 222 / 28%);
  border-radius: 50%;
}

.stage-empty strong {
  font-family: var(--font-serif, serif);
  font-size: 1.25rem;
  font-weight: 500;
}

.stage-empty p {
  max-width: 27rem;
  margin: 0.55rem 0 0;
  color: var(--muted);
  font-size: 0.78rem;
  line-height: 1.65;
}

.debug-panel {
  min-width: 0;
  background: #111413;
}

.debug-panel > section {
  border-bottom: 1px solid var(--border);
}

.module-heading {
  min-height: 2.7rem;
  justify-content: space-between;
  padding: 0 0.9rem;
  color: var(--muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.56rem;
  letter-spacing: 0.08em;
}

.module-heading b {
  color: var(--cyan);
  font-weight: 400;
}

.camera-stage {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  background: #080a0a;
}

.camera-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.4) contrast(1.1) brightness(0.65);
  transform: scaleX(-1);
}

.camera-quality {
  position: absolute;
  right: 0.6rem;
  bottom: 0.5rem;
  padding: 0.25rem 0.4rem;
  color: var(--cyan);
  background: rgb(7 10 9 / 76%);
  font-family: var(--font-mono, monospace);
  font-size: 0.52rem;
}

.camera-offline {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #59605c;
  font-family: var(--font-mono, monospace);
  font-size: 0.6rem;
  letter-spacing: 0.12em;
}

.mapping-table {
  padding: 0 0.9rem 1rem;
}

.mapping-table > div {
  display: grid;
  grid-template-columns: 1.1fr 1fr 1fr;
  gap: 0.4rem;
  padding: 0.58rem 0;
  border-top: 1px solid var(--border);
  font-family: var(--font-mono, monospace);
  font-size: 0.55rem;
}

.mapping-table > div > :first-child {
  color: var(--muted);
}

.mapping-table code {
  color: var(--text);
  white-space: nowrap;
}

.mapping-table .mapping-header {
  color: #5f6863;
  font-size: 0.49rem;
}

.dynamics-module ol {
  display: grid;
  gap: 0.55rem;
  margin: 0;
  padding: 0 0.9rem 1rem;
  list-style: none;
}

.dynamics-module li {
  display: grid;
  grid-template-columns: 2.5rem 1fr auto;
  align-items: center;
  gap: 0.65rem;
  font-size: 0.68rem;
}

.dynamics-module li i {
  display: block;
  height: 3px;
  background: var(--orange);
}

.dynamics-module li i.medium {
  width: 70%;
  background: #e2b86b;
}

.dynamics-module li i.slow {
  width: 42%;
  background: var(--cyan);
}

.dynamics-module li small {
  color: var(--muted);
  font-family: var(--font-mono, monospace);
  font-size: 0.5rem;
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

.clean-caption {
  position: fixed;
  z-index: 102;
  bottom: 1.5rem;
  left: 1.5rem;
  display: flex;
  flex-direction: column;
  color: rgb(241 238 230 / 55%);
  font-family: var(--font-mono, monospace);
  font-size: 0.58rem;
  letter-spacing: 0.14em;
  pointer-events: none;
}

.clean-caption small {
  margin-top: 0.2rem;
  font-size: 0.45rem;
}

.is-clean-active .lab-intro {
  position: fixed;
  z-index: 110;
  top: 1.25rem;
  right: 1rem;
  margin: 0;
}

.is-clean-active .intro-copy,
.is-clean-active .intro-actions > :not(.mode-switch) {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

.is-clean-active .lab-frame {
  position: fixed;
  z-index: 100;
  inset: 0;
  border: 0;
}

.is-clean-active .frame-bar,
.is-clean-active .lab-note {
  display: none;
}

.is-clean-active .workbench,
.is-clean-active .puppet-stage {
  width: 100%;
  height: 100%;
  min-height: 100vh;
}

.is-clean-active .workbench {
  display: block;
}

.is-clean-active .puppet-stage {
  border: 0;
}

.is-clean-active .puppet {
  width: min(90vw, 44rem);
  height: min(90vh, 44rem);
}

.is-clean-active .debug-panel {
  position: fixed;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}

@media (max-width: 1000px) {
  .workbench {
    grid-template-columns: 1fr;
  }

  .puppet-stage {
    min-height: 38rem;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .debug-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .dynamics-module {
    grid-column: 1 / -1;
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

  .frame-bar > span,
  .lab-note > span {
    display: none;
  }

  .workbench,
  .puppet-stage {
    min-height: 31rem;
  }

  .puppet {
    width: min(98%, 31rem);
    height: min(98%, 31rem);
  }

  .stage-orbit-a {
    width: 24rem;
    height: 24rem;
  }

  .stage-orbit-b {
    width: 19rem;
    height: 19rem;
  }

  .debug-panel {
    grid-template-columns: 1fr;
  }

  .dynamics-module {
    grid-column: auto;
  }

  .is-clean-active .lab-intro {
    align-items: flex-end;
    width: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .puppet {
    filter: none;
  }
}
</style>

<style scoped src="../../../assets/css/lab-experiments.css"></style>
