<script setup lang="ts">
const MaterialWithSlot = resolveComponent('DemoMaterialWithSlots')
</script>

<template>
  <BaseDashWrapper class="bg-teal-300">
    <div>this is dynamic component</div>
    <component :is="MaterialWithSlot">
      <template #left>
        <slot name="left"></slot>
      </template>
      <template #right>
        <slot name="right"></slot>
      </template>
      <slot></slot>
    </component>
  </BaseDashWrapper>
</template>

<style scope></style>
