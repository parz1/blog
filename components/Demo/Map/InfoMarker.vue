<script setup lang="ts">
import type { ParsedContent } from '@nuxt/content/types'
import { type Ref } from 'vue'

const props = defineProps<{
  active: ComputedRef<boolean>
  data: Ref<ParsedContent> | ParsedContent
}>()

const emits = defineEmits(['up', 'focus', 'recover'])

const dataValue = computed(() => (isRef(props.data) ? props.data.value : props.data))

const isFocused = ref(false)
const handleFocus = () => {
  isFocused.value = true
  emits('focus')
}
const recover = () => {
  isFocused.value = false
  emits('recover')
}
</script>

<template>
  <div
    class="bg-white p-1 w-40 rounded-md cursor-pointer border-dashed border-2 shadow hover:shadow-2xl hover:bg-teal-50 transition-all"
    :class="{
      'border-teal-500 shadow-2xl z-10': active.value,
    }"
  >
    <div class="p-2">
      <div class="flex justify-between">
        <div class="text-gray-500 text-sm">{{ dataValue.published }}</div>
        <UTooltip v-if="!isFocused" text="Focus me">
          <UIcon name="i-carbon-circle-measurement" class="text-teal-500" @click="handleFocus" />
        </UTooltip>
        <UTooltip v-else text="Recover">
          <UIcon name="i-carbon-fit-to-screen" class="text-neutral-500" @click="recover" />
        </UTooltip>
      </div>
      <div class="font-medium">{{ dataValue.title }}</div>
    </div>
    <UButton color="black" block :to="dataValue._path">前往</UButton>
  </div>
</template>

<style scoped></style>
