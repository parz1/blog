<script setup lang="ts">
const props = defineProps<{
  name: string
  icon: string
  size: string
}>()
</script>

<template>
  <UTooltip :text="name" :popper="{ arrow: true }">
    <img
      class="rounded-md"
      :style="{
        width: props.size,
        height: props.size,
      }"
      :src="props.icon"
      alt="javascript"
    />
  </UTooltip>
</template>

<style scope></style>
