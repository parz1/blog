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
  <section class="relative">
    <p class="absolute top-0">
      {{ filename }}
    </p>
    <p
      :class="{
        'pt-1': filename,
      }"
    >
      <!-- TODO -->
      <!-- <div class="absolute right-0">Copy</div> -->
      <ContentSlot />
    </p>
  </section>
</template>
