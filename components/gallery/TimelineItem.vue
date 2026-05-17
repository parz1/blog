<script setup lang="ts">
import type {
  GalleryEntry,
  GalleryMedia,
  GalleryOpenEvent,
  GallerySourceRect,
} from '~/typings/gallery'

const props = defineProps<{
  entry: GalleryEntry
}>()

const emit = defineEmits<{
  open: [payload: GalleryOpenEvent]
}>()

const toSourceRect = (target: EventTarget | null): GallerySourceRect => {
  const element = target instanceof HTMLElement ? target : null
  const rect = element?.getBoundingClientRect()

  return {
    left: rect?.left ?? window.innerWidth / 2,
    top: rect?.top ?? window.innerHeight / 2,
    width: rect?.width ?? 1,
    height: rect?.height ?? 1,
  }
}

const openMedia = (event: MouseEvent, media: GalleryMedia, index: number) => {
  emit('open', {
    entry: props.entry,
    media,
    mediaIndex: index,
    sourceRect: toSourceRect(event.currentTarget),
  })
}
</script>

<template>
  <article class="timeline-item">
    <div class="timeline-copy">
      <time class="timeline-date">{{ entry.date }}</time>
      <h2>{{ entry.title }}</h2>
      <p v-if="entry.caption">{{ entry.caption }}</p>
    </div>

    <div class="media-strip" :aria-label="`${entry.title} photos`">
      <button
        v-for="(media, index) in entry.media"
        :key="media.id"
        type="button"
        class="media-thumb"
        :class="media.width > media.height ? 'is-wide' : 'is-tall'"
        :aria-label="`Open ${media.title}`"
        @click="openMedia($event, media, index)"
      >
        <img
          :src="media.image"
          :alt="media.alt"
          :width="media.width"
          :height="media.height"
          draggable="false"
        />

        <span v-if="media.liveVideo" class="thumb-live">Live</span>
        <span class="thumb-title">{{ media.title }}</span>
      </button>
    </div>
  </article>
</template>

<style scoped>
.timeline-item {
  display: grid;
  grid-template-columns: minmax(8.5rem, 12rem) minmax(0, 1fr);
  gap: clamp(1rem, 3vw, 2.5rem);
  align-items: start;
  padding: 1.15rem 0;
}

.timeline-copy {
  position: sticky;
  top: 5.25rem;
  min-width: 0;
}

.timeline-date {
  display: block;
  margin-bottom: 0.35rem;
  color: rgb(var(--ui-color-neutral-500));
  font-size: 0.74rem;
  line-height: 1.3;
}

.timeline-copy h2 {
  color: var(--ui-text-highlighted);
  font-family: var(--font-serif, serif);
  font-size: clamp(1.25rem, 3vw, 1.9rem);
  font-weight: 600;
  line-height: 1.05;
  overflow-wrap: anywhere;
}

.timeline-copy p {
  margin-top: 0.55rem;
  color: var(--ui-text-muted);
  font-size: 0.82rem;
  line-height: 1.6;
}

.media-strip {
  display: flex;
  gap: 0.75rem;
  min-width: 0;
  padding: 0.25rem 0 0.5rem;
  overflow-x: auto;
  scroll-snap-type: x proximity;
}

.media-strip::-webkit-scrollbar {
  height: 0.4rem;
}

.media-strip::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: color-mix(in srgb, var(--ui-text-muted) 22%, transparent);
}

.media-thumb {
  position: relative;
  flex: 0 0 auto;
  height: clamp(8.6rem, 22vw, 13rem);
  overflow: hidden;
  border: 1px solid var(--ui-border);
  border-radius: 0.5rem;
  color: white;
  text-align: left;
  background: #030408;
  outline: none;
  scroll-snap-align: start;
  box-shadow: 0 14px 42px rgb(15 23 42 / 0.09);
  transition:
    border-color 220ms ease,
    box-shadow 220ms ease,
    transform 220ms ease;
}

.media-thumb.is-wide {
  width: clamp(12rem, 34vw, 19rem);
}

.media-thumb.is-tall {
  width: clamp(7rem, 19vw, 10rem);
}

.media-thumb::after {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background:
    linear-gradient(to bottom, rgb(0 0 0 / 0.1), transparent 34%),
    linear-gradient(to top, rgb(0 0 0 / 0.4), transparent 46%);
  opacity: 0.86;
  transition: opacity 220ms ease;
}

.media-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.001);
  transition:
    transform 520ms ease,
    filter 220ms ease;
}

.media-thumb:hover,
.media-thumb:focus-visible {
  border-color: color-mix(in srgb, var(--ui-primary) 42%, var(--ui-border));
  box-shadow: 0 24px 70px rgb(15 23 42 / 0.16);
  transform: translateY(-2px);
}

.media-thumb:hover img,
.media-thumb:focus-visible img {
  filter: saturate(1.04) contrast(1.03);
  transform: scale(1.045);
}

.media-thumb:hover::after,
.media-thumb:focus-visible::after {
  opacity: 1;
}

.thumb-live,
.thumb-title {
  position: absolute;
  z-index: 5;
  color: rgb(255 255 255 / 0.9);
  text-shadow: 0 1px 18px rgb(0 0 0 / 0.36);
}

.thumb-live {
  top: 0.7rem;
  left: 0.7rem;
  padding: 0.28rem 0.58rem;
  border: 1px solid rgb(255 255 255 / 0.14);
  border-radius: 999px;
  font-size: 0.66rem;
  font-weight: 600;
  line-height: 1;
  text-transform: uppercase;
  background: rgb(0 0 0 / 0.3);
  backdrop-filter: blur(14px);
}

.thumb-title {
  right: 0.75rem;
  bottom: 0.7rem;
  left: 0.75rem;
  overflow: hidden;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 700px) {
  .timeline-item {
    grid-template-columns: 1fr;
    gap: 0.8rem;
    padding: 1.25rem 0;
  }

  .timeline-copy {
    position: static;
  }

  .timeline-copy h2 {
    font-size: 1.55rem;
  }
}
</style>
