<script setup>
defineProps({
  filename: {
    type: String,
    required: false,
  },
  description: {
    type: String,
    required: false,
  },
})
</script>
<template>
  <section
    class="relative"
    :class="{
      'pt-0.2': !!filename,
    }"
  >
    <span class="absolute filename">
      {{ filename }}
    </span>
    <span>
      <ContentSlot />
    </span>
  </section>
</template>

<style scoped>
.filename {
  top: -1.4rem;
}
</style>
