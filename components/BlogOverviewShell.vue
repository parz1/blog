<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description: string
    kicker?: string
    narrow?: boolean
    hideMasthead?: boolean
  }>(),
  {
    narrow: false,
    hideMasthead: false,
  },
)
</script>

<template>
  <main
    class="mx-auto w-full px-4 pb-10 sm:px-6 lg:px-0"
    :class="[
      narrow ? 'max-w-3xl' : 'max-w-[68rem]',
      hideMasthead ? '' : 'pt-10 sm:pt-12',
    ]"
  >
    <header v-if="!hideMasthead" class="relative mb-8">
      <div class="max-w-3xl">
        <p
          v-if="kicker"
          class="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
        >
          {{ kicker }}
        </p>
        <h1
          class="font-serif text-4xl font-semibold leading-tight text-gray-950 dark:text-gray-50"
        >
          {{ title }}
        </h1>
        <p
          class="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-400"
        >
          {{ description }}
        </p>
      </div>

      <div
        v-if="$slots.meta"
        class="mt-5 text-sm text-gray-400 dark:text-gray-500 md:absolute md:right-0 md:top-0 md:mt-0"
      >
        <slot name="meta" />
      </div>
    </header>

    <div>
      <slot />
    </div>
  </main>
</template>
