<script setup lang="ts">
import type {
  GalleryCameraMeta,
  GalleryEntry,
  GalleryMedia,
  GalleryOpenEvent,
} from '~/typings/gallery'

const { locale, t } = useI18n()

const { data: galleryDocs } = await useAsyncData(
  'gallery-collection',
  () => queryCollection('gallery').order('published', 'DESC').all(),
  { lazy: false },
)

type GalleryDoc = NonNullable<typeof galleryDocs.value>[number]

const pickLocalized = <T extends { lang?: string }>(group: T[]) => {
  const localeCode = normalizeContentLocale(locale.value)

  return (
    group.find((item) => item.lang?.toLowerCase() === localeCode) ??
    group.find((item) => item.lang?.toLowerCase() === 'en') ??
    group[0]
  )
}

const toMedia = (
  item: GalleryDoc['media'][number],
  location?: string,
): GalleryMedia => ({
  id: item.id,
  title: item.title ?? item.id,
  alt: item.alt ?? '',
  image: item.imageUrl ?? item.image,
  liveVideo: item.liveVideoUrl ?? item.liveVideo,
  width: item.width,
  height: item.height,
  takenAt: item.takenAt,
  camera: {
    model: item.camera?.model ?? 'Unknown',
    lens: item.camera?.lens,
    focalLength: item.camera?.focalLength,
    aperture: item.camera?.aperture,
    iso: item.camera?.iso,
    shutter: item.camera?.shutter,
    ev: item.camera?.ev,
    resolution: item.camera?.resolution,
    colorProfile: item.camera?.colorProfile,
    liveDuration: item.camera?.liveDuration,
    format: item.camera?.format,
    location,
  } satisfies GalleryCameraMeta,
})

const entries = computed<GalleryEntry[]>(() => {
  const groups = new Map<string, NonNullable<typeof galleryDocs.value>>()

  for (const doc of galleryDocs.value ?? []) {
    if (!groups.has(doc.slug)) groups.set(doc.slug, [])
    groups.get(doc.slug)!.push(doc)
  }

  return Array.from(groups.values())
    .map((group) => {
      const primary = pickLocalized(group)

      return {
        id: primary.slug,
        title: primary.title,
        date: primary.date ?? '',
        time: primary.time,
        location: primary.location,
        caption: primary.caption,
        media: primary.media.map((media) => toMedia(media, primary.location)),
      } satisfies GalleryEntry
    })
    .toSorted(
      (a, b) =>
        new Date(b.media[0]?.takenAt ?? '').getTime() -
        new Date(a.media[0]?.takenAt ?? '').getTime(),
    )
})

const activeSelection = ref<GalleryOpenEvent | null>(null)

const openLightbox = (payload: GalleryOpenEvent) => {
  activeSelection.value = payload
}

const closeLightbox = () => {
  activeSelection.value = null
}

useHead({
  title: () => t('gallery.title'),
})
</script>

<template>
  <main class="gallery-page min-h-[calc(100vh-7rem)] px-4 py-9 sm:px-6">
    <GalleryTimeline
      :entries="entries"
      :label="t('gallery.label')"
      :title="t('gallery.title')"
      :description="t('gallery.description')"
      @open="openLightbox"
    />

    <GalleryLightbox
      v-if="activeSelection"
      :entry="activeSelection.entry"
      :media="activeSelection.media"
      :media-index="activeSelection.mediaIndex"
      :source-rect="activeSelection.sourceRect"
      @close="closeLightbox"
    />
  </main>
</template>

<style scoped>
.gallery-page {
  background:
    linear-gradient(
      to right,
      color-mix(in srgb, var(--ui-border) 34%, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      color-mix(in srgb, var(--ui-border) 28%, transparent) 1px,
      transparent 1px
    ),
    var(--ui-bg);
  background-size:
    48px 48px,
    48px 48px,
    auto;
}
</style>
