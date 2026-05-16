<script setup lang="ts">
type ConceptState = 'seed' | 'growing' | 'mature' | 'shifting'

const props = defineProps<{
  state: ConceptState | string
}>()

const { t } = useI18n()

const meta = computed(() => {
  switch (props.state) {
    case 'seed':
      return { label: t('concepts.states.seed'), color: 'neutral' as const }
    case 'growing':
      return { label: t('concepts.states.growing'), color: 'primary' as const }
    case 'mature':
      return { label: t('concepts.states.mature'), color: 'success' as const }
    case 'shifting':
      return { label: t('concepts.states.shifting'), color: 'warning' as const }
    default:
      return { label: props.state, color: 'neutral' as const }
  }
})
</script>

<template>
  <UBadge :color="meta.color" variant="soft" size="sm">
    {{ meta.label }}
  </UBadge>
</template>
