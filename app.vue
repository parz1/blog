<script setup>
// import { SpeedInsights } from '@vercel/speed-insights/vue'
</script>

<template>
  <UApp>
    <Header />
    <ClientOnly>
      <LazySiteSearch />
    </ClientOnly>

    <UMain>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-muted text-sm">
          Copyright © {{ new Date().getFullYear() }}
          <span class="font-serif">parz1</span> • MIT License
        </p>
      </template>
    </UFooter>
  </UApp>
  <!-- 避免 SSR 时的告警 -->
  <!-- <ClientOnly>
    <SpeedInsights />
  </ClientOnly> -->
</template>

<style>
/* .page-enter-active,
.page-leave-active {
  transition: all 0.2s;
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(5px);
} */
</style>
