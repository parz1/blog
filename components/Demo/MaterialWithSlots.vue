<script setup lang="ts"></script>

<template>
  <BaseDashWrapper class="bg-white">
    Material with slots
    <div class="flex gap-4">
      <slot name="left"></slot>
      <slot></slot>
      <slot name="right"></slot>
    </div>
  </BaseDashWrapper>
</template>

<style scope></style>
