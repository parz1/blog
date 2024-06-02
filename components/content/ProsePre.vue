<script setup lang="ts">
const props = defineProps({
  code: {
    type: String,
    default: '',
  },
  language: {
    type: String,
    default: null,
  },
  filename: {
    type: String,
    default: null,
  },
  highlights: {
    type: Array as () => number[],
    default: () => [],
  },
  meta: {
    type: String,
    default: null,
  },
  class: {
    type: String,
    default: null,
  },
})
</script>

<template>
  <pre
    v-bind="$attrs"
    :class="props.class"
  ><span v-if="language" style="font-weight: 800;">[{{ language }}]</span><span v-if="filename" style="font-weight: 800;">{{ filename }}</span><slot /></pre>
</template>

<style>
pre code .line {
  display: block;
}
</style>
