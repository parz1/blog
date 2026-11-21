<script setup lang="ts">
// The label beside the work, as in a gallery: what it is, what it is made of
// and what it owes to others. Shown at the end of the night garden.
defineProps<{
  title: string
  medium: string
  materials: string
  inspirationLabel: string
  inspirations: string[]
  replayLabel: string
}>()

defineEmits<{ replay: [] }>()
</script>

<template>
  <footer class="flex flex-col items-center gap-1.5 px-6 text-center">
    <p class="font-serif text-lg font-semibold text-slate-100">
      {{ title }}
    </p>
    <p class="text-xs tracking-[0.18em] text-slate-300">
      {{ medium }}
    </p>
    <p class="max-w-md text-xs leading-5 text-slate-400">
      {{ materials }}
    </p>
    <p class="mt-1 max-w-lg text-xs leading-5 text-slate-500">
      <span class="mr-2 uppercase tracking-[0.18em]">{{
        inspirationLabel
      }}</span>
      <span>{{ inspirations.join(' · ') }}</span>
    </p>

    <div class="mt-1 flex items-center gap-3 text-xs text-slate-500">
      <button
        type="button"
        class="underline decoration-dotted underline-offset-4 transition-colors hover:text-slate-200"
        @click="$emit('replay')"
      >
        {{ replayLabel }}
      </button>
      <slot />
    </div>
  </footer>
</template>
