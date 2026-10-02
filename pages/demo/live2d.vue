<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => t('live2dLab.title'),
  titleTemplate: '%s · parz1 ZHOU',
})
useSeoMeta({ description: () => t('live2dLab.description') })
</script>

<template>
  <main class="live2d-page">
    <ClientOnly>
      <DemoLive2DLab />
      <template #fallback>
        <div class="live2d-fallback" aria-live="polite">
          {{ t('live2dLab.status.loading') }}
        </div>
      </template>
    </ClientOnly>
  </main>
</template>

<style scoped>
.live2d-page {
  width: 100%;
  min-height: calc(100vh - var(--ui-header-height, 4rem));
  padding: clamp(2rem, 5vw, 4rem) 1rem 4rem;
}

.live2d-page > :deep(*) {
  width: min(100%, 76rem);
  margin-inline: auto;
}

.live2d-fallback {
  display: grid;
  min-height: 38rem;
  place-items: center;
  border: 1px solid var(--ui-border);
  border-radius: 1rem;
  background: var(--ui-bg-muted);
  color: var(--ui-text-muted);
}
</style>
