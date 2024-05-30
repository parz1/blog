<script setup lang="ts">
const model = defineModel<boolean>({
  set(val) {
    // if (typeof val === 'string') {
    //   return val === 'true'
    // }
    return !!val
  },
})
const id = useId()
</script>

<template>
  <div class="flex items-center gap-1 justify-between">
    <label :for="id">{{ $attrs.label }}</label>
    <UToggle :id="id" v-bind="$attrs" v-model="model" />
  </div>
</template>

<style scope></style>
