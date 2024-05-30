<script setup lang="ts">
const model = defineModel<string | number>()
const id = useId()
</script>

<template>
  <div>
    <label :for="id">{{ $attrs.label }}</label>
    <UInput :id="id" v-bind="$attrs" v-model="model" />
  </div>
</template>

<style scope></style>
