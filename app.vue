<script setup>
useSeoMeta({
  title: 'Ivor Zhou',
})

//<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
useHead({
  title: 'Ivor Zhou',
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, user-scalable=no' }],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
/* .page-enter-active,
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
} */
</style>
