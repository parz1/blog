<script setup lang="ts">
import type { CSSProperties } from 'vue'
import type {
  GalleryEntry,
  GalleryMedia,
  GallerySourceRect,
} from '~/typings/gallery'

const props = defineProps<{
  entry: GalleryEntry
  media: GalleryMedia
  mediaIndex: number
  sourceRect: GallerySourceRect | null
}>()

const emit = defineEmits<{
  close: []
}>()

const activeIndex = ref(props.mediaIndex)
const frameEl = ref<HTMLElement | null>(null)
const frameStyle = ref<CSSProperties>({})
const overlayStyle = ref<CSSProperties>({ opacity: '0' })
const isClosing = ref(false)

const activeMedia = computed(
  () => props.entry.media[activeIndex.value] ?? props.media,
)
const canNavigate = computed(() => props.entry.media.length > 1)

const getSourceTransform = () => {
  const source = props.sourceRect
  const target = frameEl.value?.getBoundingClientRect()

  if (!source || !target || target.width === 0 || target.height === 0) {
    return null
  }

  const dx = source.left - target.left
  const dy = source.top - target.top
  const scaleX = source.width / target.width
  const scaleY = source.height / target.height

  return `translate3d(${dx}px, ${dy}px, 0) scale(${scaleX}, ${scaleY})`
}

const animateIn = async () => {
  await nextTick()

  const sourceTransform = getSourceTransform()
  overlayStyle.value = { opacity: '0' }
  frameStyle.value = sourceTransform
    ? {
        opacity: '0.82',
        transform: sourceTransform,
        transformOrigin: 'top left',
      }
    : {
        opacity: '0',
        transform: 'scale(0.96)',
        transformOrigin: 'center',
      }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlayStyle.value = {
        opacity: '1',
        transition: 'opacity 260ms ease',
      }
      frameStyle.value = {
        opacity: '1',
        transform: 'translate3d(0, 0, 0) scale(1)',
        transformOrigin: sourceTransform ? 'top left' : 'center',
        transition:
          'transform 380ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 240ms ease',
      }
    })
  })
}

const close = () => {
  if (isClosing.value) return
  isClosing.value = true

  const sourceTransform = getSourceTransform()

  overlayStyle.value = {
    opacity: '0',
    transition: 'opacity 240ms ease',
  }
  frameStyle.value = {
    opacity: '0',
    transform: sourceTransform ?? 'scale(0.96)',
    transformOrigin: sourceTransform ? 'top left' : 'center',
    transition:
      'transform 280ms cubic-bezier(0.4, 0, 1, 1), opacity 220ms ease',
  }

  window.setTimeout(() => emit('close'), 280)
}

const previous = () => {
  if (!canNavigate.value) return
  activeIndex.value =
    (activeIndex.value - 1 + props.entry.media.length) %
    props.entry.media.length
}

const next = () => {
  if (!canNavigate.value) return
  activeIndex.value = (activeIndex.value + 1) % props.entry.media.length
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') close()
  if (event.key === 'ArrowLeft') previous()
  if (event.key === 'ArrowRight') next()
}

onMounted(() => {
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
  animateIn()
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="gallery-lightbox"
      :style="overlayStyle"
      role="dialog"
      aria-modal="true"
      :aria-label="`${entry.title} photo viewer`"
      @click.self="close"
    >
      <header class="lightbox-header">
        <div class="min-w-0">
          <p>{{ entry.title }}</p>
          <h2>{{ activeMedia.title }}</h2>
        </div>

        <button
          type="button"
          class="icon-button"
          aria-label="Close"
          @click="close"
        >
          <UIcon name="i-lucide-x" class="size-5" />
        </button>
      </header>

      <main class="lightbox-main">
        <button
          v-if="canNavigate"
          type="button"
          class="nav-button nav-button-left"
          aria-label="Previous photo"
          @click="previous"
        >
          <UIcon name="i-lucide-chevron-left" class="size-5" />
        </button>

        <div ref="frameEl" class="lightbox-frame" :style="frameStyle">
          <GalleryMediaStage :media="activeMedia" />
        </div>

        <button
          v-if="canNavigate"
          type="button"
          class="nav-button nav-button-right"
          aria-label="Next photo"
          @click="next"
        >
          <UIcon name="i-lucide-chevron-right" class="size-5" />
        </button>

        <GalleryCameraMetaCard class="lightbox-meta" :media="activeMedia" />
      </main>
    </div>
  </Teleport>
</template>

<style scoped>
.gallery-lightbox {
  position: fixed;
  inset: 0;
  z-index: 80;
  min-height: 100dvh;
  overflow: auto;
  color: white;
  background:
    radial-gradient(
      circle at 50% 20%,
      rgb(255 255 255 / 0.08),
      transparent 28rem
    ),
    #020204;
}

.lightbox-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  min-height: 4.25rem;
  padding: 1rem clamp(1rem, 3vw, 2rem);
  pointer-events: none;
}

.lightbox-header > * {
  pointer-events: auto;
}

.lightbox-header p {
  color: rgb(255 255 255 / 0.48);
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0;
  text-transform: uppercase;
}

.lightbox-header h2 {
  margin-top: 0.12rem;
  overflow: hidden;
  color: white;
  font-family: var(--font-serif, serif);
  font-size: clamp(1.35rem, 3vw, 2rem);
  font-weight: 600;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-button,
.nav-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(255 255 255 / 0.12);
  color: white;
  background: rgb(255 255 255 / 0.08);
  backdrop-filter: blur(18px);
  transition:
    background 180ms ease,
    transform 180ms ease;
}

.icon-button {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
}

.icon-button:hover,
.nav-button:hover {
  background: rgb(255 255 255 / 0.16);
  transform: translateY(-1px);
}

.lightbox-main {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 20rem);
  gap: clamp(1rem, 2.6vw, 1.75rem);
  align-items: center;
  min-height: calc(100dvh - 5rem);
  padding: 0 clamp(1rem, 3vw, 2rem) 2rem;
}

.lightbox-frame {
  width: min(100%, 76rem);
  height: min(72dvh, 52rem);
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 0.55rem;
  background: #030408;
  box-shadow: 0 28px 100px rgb(0 0 0 / 0.42);
  will-change: transform, opacity;
}

.lightbox-meta {
  width: min(100%, 20rem);
  align-self: center;
}

.nav-button {
  position: absolute;
  z-index: 15;
  width: 2.7rem;
  height: 2.7rem;
  border-radius: 999px;
}

.nav-button-left {
  left: clamp(1rem, 3vw, 2rem);
}

.nav-button-right {
  right: calc(clamp(1rem, 3vw, 2rem) + 21rem);
}

@media (max-width: 1080px) {
  .lightbox-main {
    grid-template-columns: 1fr;
    align-items: start;
    min-height: 0;
  }

  .lightbox-frame {
    width: 100%;
    height: min(66dvh, 42rem);
  }

  .lightbox-meta {
    width: min(100%, 28rem);
  }

  .nav-button-right {
    right: clamp(1rem, 3vw, 2rem);
  }
}

@media (max-width: 700px) {
  .lightbox-header {
    min-height: 3.75rem;
  }

  .lightbox-main {
    padding-bottom: 1rem;
  }

  .lightbox-frame {
    height: min(62dvh, 34rem);
  }
}
</style>
