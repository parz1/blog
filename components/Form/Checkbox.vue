<script setup lang="ts">
const model = defineModel<boolean>()
const id = useId()
</script>

<template>
  <UCheckbox :id="id" v-bind="$attrs" v-model="model" />
</template>

<style scope></style>
