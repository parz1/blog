<script setup lang="ts">
const localePath = useLocalePath()
</script>

<template>
  <main class="p-4 md:p-8">
    <section class="mx-auto max-w-6xl">
      <div class="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold md:text-3xl">Hangzhou to Tokyo</h1>
          <p class="mt-1 text-sm text-gray-500">MapLibre GL JS + deck.gl</p>
        </div>
        <ULink
          :to="localePath('/demo')"
          class="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          Demos
        </ULink>
      </div>

      <ClientOnly>
        <DemoMapHangzhouTokyoArc />
      </ClientOnly>
    </section>
  </main>
</template>
