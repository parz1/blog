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
  <div
    class="relative"
    :class="{
      'pt-2': filename,
    }"
  >
    <div class="absolute top-0">
      {{ filename }}
    </div>
    <div>
      <!-- TODO -->
      <!-- <div class="absolute right-0">Copy</div> -->
      <slot />
    </div>
  </div>
</template>
