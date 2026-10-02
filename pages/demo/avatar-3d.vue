<script setup lang="ts">
const { t } = useI18n()
useHead({ title: () => t('vrmLab.title'), titleTemplate: '%s · parz1 ZHOU' })
useSeoMeta({ description: () => t('vrmLab.description') })
</script>

<template>
  <main class="vrm-page">
    <ClientOnly>
      <DemoVRMLab />
      <template #fallback>
        <div class="vrm-fallback" aria-live="polite">
          {{ t('vrmLab.status.loading') }}
        </div>
      </template>
    </ClientOnly>
  </main>
</template>

<style scoped>
.vrm-page {
  width: 100%;
  min-height: calc(100vh - var(--ui-header-height, 4rem));
  padding: clamp(2rem, 5vw, 4rem) 1rem 4rem;
}
.vrm-page > :deep(*) {
  width: min(100%, 76rem);
  margin-inline: auto;
}
.vrm-fallback {
  display: grid;
  min-height: 38rem;
  place-items: center;
  border: 1px solid var(--ui-border);
  border-radius: 1rem;
  background: var(--ui-bg-muted);
  color: var(--ui-text-muted);
}
</style>
