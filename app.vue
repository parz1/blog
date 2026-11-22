<script setup>
// import { SpeedInsights } from '@vercel/speed-insights/vue'

// The page declares its language, so that browsers, screen readers and the
// font stacks (see main.css) know which one the interface is written in.
const { localeProperties } = useI18n()

useHead({
  htmlAttrs: { lang: () => localeProperties.value.language },
})

// The garden is a centred composition, so its footer line is centred too.
const route = useRoute()
const footerSlot = computed(() =>
  String(route.name ?? '').startsWith('garden') ? 'default' : 'left',
)
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
      <template #[footerSlot]>
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
