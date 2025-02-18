<script setup lang="ts">
import type { ParsedContent } from '@nuxt/content/types'
import { type Ref } from 'vue'

const props = defineProps<{
  active: ComputedRef<boolean>
  data: Ref<ParsedContent> | ParsedContent
}>()

const emits = defineEmits(['click', 'focus', 'recover'])

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
      'border-blue-500 bg-blue-50 shadow-2xl z-10': active.value,
    }"
    @click="$emit('click')"
  >
    <div class="p-2">
      <div class="flex justify-between">
        <div class="text-lg">東京｜日本</div>
      </div>
      <div class="font-medium">{{ dataValue.title }}</div>

      <div>
        | <span class="text-gray-500 text-sm">2024-10</span> <span class="text-sm">到着</span><br />
        | <span class="text-gray-500 text-sm">2024-12</span>
        <div class="text-sm pl-4">日本語能力試験N1合格</div>
        | <span class="text-gray-500 text-sm">2025</span>
        <div class="text-sm text-gray-500 pl-4">続く...</div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
