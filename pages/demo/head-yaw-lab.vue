<script setup lang="ts">
const { t } = useI18n()

useHead({ title: () => t('headYawLab.metaTitle') })
</script>

<template>
  <main class="head-yaw-page">
    <ClientOnly>
      <DemoFaceLabHeadYawLab />
      <template #fallback>
        <div class="lab-fallback" aria-hidden="true" />
      </template>
    </ClientOnly>
  </main>
</template>

<style scoped>
.head-yaw-page {
  width: 100%;
  min-height: calc(100vh - var(--ui-header-height, 4rem));
  padding: clamp(2.5rem, 5vw, 4rem) 1rem 4rem;
  background: var(--ui-bg);
}

.head-yaw-page > :deep(*) {
  width: min(100%, 80rem);
  margin-inline: auto;
}

.lab-fallback {
  min-height: 50rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.75rem;
  background: var(--ui-bg-muted);
}
</style>
