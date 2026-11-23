<script setup lang="ts">
const { t } = useI18n()

useHead({ title: () => t('jellyfishDemo.title') })
</script>

<template>
  <main class="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[#020a14]">
    <ThreeScene
      class="absolute inset-0"
      :alpha="false"
      :fov="42"
      :near="0.1"
      :far="400"
      :max-pixel-ratio="1.75"
      :camera-position="[0, 0.5, 17]"
    >
      <DemoJellyfishSea />
    </ThreeScene>

    <div
      class="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#020a14]/70 to-transparent p-6 text-white sm:p-10"
    >
      <p
        class="text-xs font-medium uppercase tracking-[0.24em] text-cyan-200/70"
      >
        {{ t('jellyfishDemo.eyebrow') }}
      </p>
      <h1 class="mt-2 font-serif text-3xl font-semibold sm:text-4xl">
        {{ t('jellyfishDemo.title') }}
      </h1>
      <p class="mt-2 max-w-md text-sm leading-6 text-cyan-50/70">
        {{ t('jellyfishDemo.hint') }}
      </p>
    </div>
  </main>
</template>
