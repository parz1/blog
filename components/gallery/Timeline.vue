<script setup lang="ts">
import type { GalleryEntry, GalleryOpenEvent } from '~/typings/gallery'

defineProps<{
  entries: GalleryEntry[]
  label: string
  title: string
  description: string
}>()

defineEmits<{
  open: [payload: GalleryOpenEvent]
}>()
</script>

<template>
  <section class="gallery-timeline">
    <header class="timeline-header">
      <p>{{ label }}</p>
      <h1>{{ title }}</h1>
      <p class="timeline-description">{{ description }}</p>
    </header>

    <div class="timeline-list">
      <GalleryTimelineItem
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        @open="$emit('open', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.gallery-timeline {
  width: min(100%, 64rem);
  margin: 0 auto;
}

.timeline-header {
  margin-bottom: clamp(1.8rem, 5vw, 3.5rem);
}

.timeline-header p {
  margin-bottom: 0.45rem;
  color: rgb(var(--ui-color-cyan-600));
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0;
  text-transform: uppercase;
}

.timeline-header .timeline-description {
  max-width: 34rem;
  margin: 1rem 0 0;
  color: var(--ui-text-muted);
  font-size: clamp(0.95rem, 2vw, 1.08rem);
  font-weight: 400;
  line-height: 1.8;
  text-transform: none;
}

.timeline-header h1 {
  color: var(--ui-text-highlighted);
  font-family: var(--font-serif, serif);
  font-size: clamp(2.45rem, 7vw, 5.4rem);
  font-weight: 600;
  line-height: 0.95;
}

.timeline-list {
  position: relative;
  display: grid;
  gap: 0.4rem;
}

.timeline-list::before {
  position: absolute;
  top: 0.35rem;
  bottom: 0.35rem;
  left: clamp(9.5rem, 18vw, 13rem);
  width: 1px;
  pointer-events: none;
  content: '';
  background: linear-gradient(
    to bottom,
    transparent,
    var(--ui-border) 8%,
    var(--ui-border) 92%,
    transparent
  );
}

@media (max-width: 700px) {
  .timeline-list::before {
    display: none;
  }
}
</style>
