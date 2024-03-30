<script setup>
useHead({
  title: 'Ivor Zhou',
})
</script>

<template>
  <NuxtLayout>
    <UContainer>
      <NuxtPage />
    </UContainer>
  </NuxtLayout>
</template>

<style>
.page-enter-active,
.page-leave-active {
  transition: all 0.2s;
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

.page-enter-from {
  opacity: 0;
  transform: translateY(5px);
}
</style>
