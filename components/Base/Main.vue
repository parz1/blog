<script setup lang="ts"></script>

<template>
  <div class="main-body">
    <slot />
  </div>
</template>

<style scope>
.main-body {
  min-height: calc(100vh - 6.5rem);
  width: 100vw;
}
</style>
