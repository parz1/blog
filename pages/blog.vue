<template>
  <NuxtPage
    :transition="{
      name: 'blog-section',
      mode: 'out-in',
    }"
  />
</template>

<style>
.blog-section-enter-active,
.blog-section-leave-active {
  transition:
    opacity 180ms ease,
    transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.blog-section-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.blog-section-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

@media (prefers-reduced-motion: reduce) {
  .blog-section-enter-active,
  .blog-section-leave-active {
    transition: none;
  }
}
</style>
