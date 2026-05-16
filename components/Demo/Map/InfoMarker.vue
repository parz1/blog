<script setup lang="ts">
import { type Ref } from 'vue'
// Tooltip 外层需要一层 Provider，因为是脱离UApp独立渲染
import { TooltipProvider } from 'reka-ui'

const props = defineProps<{
  active: ComputedRef<boolean>
  data: Ref<SiteArticle> | SiteArticle
}>()

const emits = defineEmits(['click', 'focus', 'recover'])

const dataValue = computed(() =>
  isRef(props.data) ? props.data.value : props.data,
)

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
  <TooltipProvider>
    <div
      class="bg-white p-1 w-40 rounded-md cursor-pointer border-dashed border-2 shadow-sm hover:shadow-2xl hover:bg-teal-50 transition-all"
      :class="{
        'border-teal-500 bg-teal-50 shadow-2xl z-10': active.value,
      }"
      @click="$emit('click')"
    >
      <div class="p-2">
        <div class="flex justify-between">
          <div class="text-gray-500 text-sm">{{ dataValue.published }}</div>
          <UTooltip v-if="!isFocused" text="Focus me">
            <UIcon
              name="i-carbon-circle-measurement"
              class="text-teal-500"
              @click="handleFocus"
            />
          </UTooltip>
          <UTooltip v-else text="Recover">
            <UIcon
              name="i-carbon-fit-to-screen"
              class="text-neutral-500"
              @click="recover"
            />
          </UTooltip>
        </div>
        <div class="font-medium">{{ dataValue.title }}</div>
      </div>
      <UButton color="neutral" block :to="dataValue.path">前往</UButton>
    </div>
  </TooltipProvider>
</template>

<style scoped></style>
