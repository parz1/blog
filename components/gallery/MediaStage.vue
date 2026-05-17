<script setup lang="ts">
import type { GalleryMedia } from '~/typings/gallery'

const props = defineProps<{
  media: GalleryMedia
}>()

const videoEl = ref<HTMLVideoElement | null>(null)
const isLivePlaying = ref(false)
const liveFailed = ref(false)

const hasLive = computed(() => Boolean(props.media.liveVideo))

const resetLive = () => {
  isLivePlaying.value = false

  const video = videoEl.value
  if (!video) return
  video.pause()
  video.currentTime = 0
}

const playLive = async () => {
  const video = videoEl.value
  if (!video) return

  liveFailed.value = false
  isLivePlaying.value = true
  video.currentTime = 0

  try {
    await video.play()
  } catch {
    resetLive()
    liveFailed.value = true
  }
}

watch(
  () => props.media.id,
  () => {
    liveFailed.value = false
    resetLive()
  },
)

onBeforeUnmount(resetLive)
</script>

<template>
  <figure class="media-stage">
    <img
      :src="media.image"
      :alt="media.alt"
      class="stage-image"
      :style="{ opacity: isLivePlaying ? 0 : 1 }"
      :width="media.width"
      :height="media.height"
      draggable="false"
    />

    <video
      v-if="media.liveVideo"
      ref="videoEl"
      :src="media.liveVideo"
      :poster="media.image"
      class="stage-video"
      :style="{ opacity: isLivePlaying ? 1 : 0 }"
      preload="none"
      playsinline
      @ended="resetLive"
    />

    <span v-if="hasLive" class="live-label">Live</span>

    <button
      v-if="hasLive"
      type="button"
      class="live-button"
      :style="{
        opacity: isLivePlaying ? 0 : 1,
        pointerEvents: isLivePlaying ? 'none' : 'auto',
      }"
      aria-label="Play Live Photo"
      @click.stop="playLive"
    >
      <UIcon name="i-lucide-play" class="size-3.5" />
      <span>Play Live</span>
    </button>

    <figcaption
      v-if="liveFailed"
      class="absolute inset-x-4 bottom-4 z-30 rounded-md border border-amber-300/30 bg-black/70 px-3 py-2 text-sm text-amber-100 backdrop-blur"
    >
      This browser cannot play the local MOV preview.
    </figcaption>
  </figure>
</template>

<style scoped>
.media-stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 18rem;
  overflow: hidden;
  background: #030408;
}

.stage-image,
.stage-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  object-fit: contain;
  transition: opacity 240ms ease;
}

.stage-image {
  z-index: 1;
}

.stage-video {
  z-index: 2;
}

.media-stage::after {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  content: '';
  background:
    linear-gradient(to bottom, rgb(0 0 0 / 0.34), transparent 22%),
    linear-gradient(to top, rgb(0 0 0 / 0.4), transparent 30%);
}

.live-label {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 10;
  padding: 0.3rem 0.65rem;
  border: 1px solid rgb(255 255 255 / 0.14);
  border-radius: 999px;
  color: rgb(255 255 255 / 0.84);
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0;
  text-transform: uppercase;
  background: rgb(0 0 0 / 0.34);
  backdrop-filter: blur(16px);
}

.live-button {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  z-index: 12;
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  min-height: 2.2rem;
  padding: 0 0.78rem;
  border: 1px solid rgb(255 255 255 / 0.16);
  border-radius: 999px;
  color: white;
  font-size: 0.78rem;
  font-weight: 600;
  background: rgb(0 0 0 / 0.42);
  box-shadow: 0 14px 40px rgb(0 0 0 / 0.24);
  backdrop-filter: blur(18px);
  transition:
    opacity 180ms ease,
    transform 180ms ease,
    background 180ms ease;
}

.live-button:hover {
  background: rgb(255 255 255 / 0.14);
  transform: translateY(-1px);
}
</style>
