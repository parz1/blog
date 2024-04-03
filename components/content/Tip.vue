<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <UAlert :title="title" :icon="icon">
    <template #description>
      <ContentSlot />
    </template>
  </UAlert>
</template>
