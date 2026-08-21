<script setup lang="ts">
withDefaults(
  defineProps<{
    preset: string
    interactive?: boolean
  }>(),
  {
    interactive: true,
  },
)
</script>

<template>
  <MathFigure3D :preset="preset" :interactive="interactive" />
</template>
