<script setup lang="ts">
import type { GalleryMedia } from '~/typings/gallery'

const props = defineProps<{
  media: GalleryMedia
}>()

const camera = computed(() => props.media.camera)

const exposureItems = computed(() =>
  [
    { label: 'ISO', value: camera.value.iso },
    { label: 'Focal', value: camera.value.focalLength },
    { label: 'EV', value: camera.value.ev ?? '0' },
    { label: 'Aperture', value: camera.value.aperture },
    { label: 'Shutter', value: camera.value.shutter },
  ].filter((item) => item.value),
)

const detailItems = computed(() =>
  [
    {
      icon: 'i-lucide-smartphone',
      label: 'Device',
      value: camera.value.model,
    },
    {
      icon: 'i-lucide-camera',
      label: 'Lens',
      value: camera.value.lens,
    },
    {
      icon: 'i-lucide-scan',
      label: 'Frame',
      value: camera.value.resolution,
    },
    {
      icon: 'i-lucide-palette',
      label: 'Color',
      value: camera.value.colorProfile,
    },
    {
      icon: 'i-lucide-video',
      label: 'Live',
      value: camera.value.liveDuration,
    },
    {
      icon: 'i-lucide-map-pin',
      label: 'Place',
      value: camera.value.location,
    },
  ].filter((item) => item.value),
)

const subtitle = computed(() => {
  const exposure = [camera.value.focalLength, camera.value.aperture]
    .filter(Boolean)
    .join(' ')

  return [camera.value.lens, exposure].filter(Boolean).join(' - ')
})
</script>

<template>
  <aside class="camera-meta space-y-3">
    <section class="meta-card">
      <div class="mb-3 flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="truncate text-sm font-semibold text-white">
            {{ camera.model }}
          </h3>
          <p class="mt-1 truncate text-xs text-white/52">{{ subtitle }}</p>
        </div>

        <span class="format-pill">
          {{ camera.format ?? 'HEIC' }}
        </span>
      </div>

      <dl
        class="grid divide-x divide-white/10 overflow-hidden rounded-md bg-white/[0.07] text-center"
        :style="{ gridTemplateColumns: `repeat(${exposureItems.length}, 1fr)` }"
      >
        <div v-for="item in exposureItems" :key="item.label" class="px-2 py-2">
          <dt class="text-[0.62rem] uppercase tracking-normal text-white/42">
            {{ item.label }}
          </dt>
          <dd class="mt-1 truncate text-[0.72rem] font-semibold text-white">
            {{ item.value }}
          </dd>
        </div>
      </dl>
    </section>

    <section class="meta-card">
      <dl class="grid gap-1">
        <div v-for="item in detailItems" :key="item.label" class="compact-row">
          <dt class="flex items-center gap-2 text-white/48">
            <UIcon :name="item.icon" class="size-4" />
            <span>{{ item.label }}</span>
          </dt>
          <dd class="truncate text-right font-medium text-white">
            {{ item.value }}
          </dd>
        </div>
      </dl>
    </section>
  </aside>
</template>

<style scoped>
.meta-card {
  padding: 0.85rem;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 0.5rem;
  background: rgb(255 255 255 / 0.075);
  box-shadow: 0 20px 70px rgb(0 0 0 / 0.22);
  backdrop-filter: blur(18px);
}

.format-pill {
  flex: 0 0 auto;
  padding: 0.22rem 0.5rem;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 0.4rem;
  color: rgb(255 255 255 / 0.62);
  font-size: 0.68rem;
  line-height: 1;
  text-transform: uppercase;
  background: rgb(255 255 255 / 0.08);
}

.compact-row {
  display: grid;
  grid-template-columns: minmax(0, 5.25rem) minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
  min-height: 2.1rem;
  font-size: 0.8rem;
}

.compact-row dd {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>
