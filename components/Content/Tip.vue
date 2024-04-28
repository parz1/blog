<script setup>
defineProps({
  title: {
    type: String,
    required: false,
  },
  icon: {
    type: String,
    required: false,
  },
})
</script>

<template>
  <ClientOnly>
    <section class="text-xs content-tip">
      <UAlert :title="title" :icon="icon">
        <template #description>
          <ContentSlot />
        </template>
      </UAlert>
    </section>
  </ClientOnly>
</template>

<style>
.prose .content-tip p {
  @apply my-0;
}
</style>
