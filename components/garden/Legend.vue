<script setup lang="ts">
import type { GardenStroke } from '~/utils/gardenSketch'

// Legend, note count and the replay link shown at the end of the garden.
defineProps<{
  entries: Array<{ key: string; label: string; strokes: GardenStroke[] }>
  count: string
  replayLabel: string
}>()

defineEmits<{ replay: [] }>()
</script>

<template>
  <footer
    class="garden-fade flex flex-col items-center gap-2 px-4 text-center"
    style="--garden-delay: 2.2s"
  >
    <ul
      class="flex flex-wrap items-end justify-center gap-x-3 gap-y-2 sm:gap-x-5"
    >
      <li
        v-for="entry in entries"
        :key="entry.key"
        class="flex items-end gap-1.5 text-gray-500 dark:text-gray-400"
      >
        <svg
          viewBox="0 0 44 84"
          class="block h-10 w-auto overflow-visible"
          aria-hidden="true"
        >
          <g transform="translate(22 80)" class="garden-pencil">
            <GardenInk :strokes="entry.strokes" :delay="2.2" />
          </g>
        </svg>
        <span class="pb-0.5 font-serif text-xs">{{ entry.label }}</span>
      </li>
    </ul>

    <p
      class="flex flex-wrap items-center justify-center gap-x-2 text-xs text-gray-400 dark:text-gray-500"
    >
      <span>{{ count }}</span>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        class="underline decoration-dotted underline-offset-4 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
        @click="$emit('replay')"
      >
        {{ replayLabel }}
      </button>
    </p>

    <slot />
  </footer>
</template>
