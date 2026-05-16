<script setup lang="ts">
import type { Elements } from '@vue-flow/core'
import { VueFlow } from '@vue-flow/core'

type ConceptNode = {
  title: string
  slug: string
  state: string
}

type ConceptRelation = {
  concept: string
  type: string
}

const props = defineProps<{
  current: ConceptNode
  concepts: ConceptNode[]
  linkedConcepts?: string[]
  relations?: ConceptRelation[]
  orientation?: 'horizontal' | 'vertical'
  size?: 'compact' | 'expanded'
}>()

const { t } = useI18n()

const elements = ref<Elements>([])

const relationByConcept = computed(() => {
  const map = new Map<string, string>()

  for (const linkedConcept of props.linkedConcepts ?? []) {
    map.set(linkedConcept, 'relates')
  }

  for (const relation of props.relations ?? []) {
    map.set(relation.concept, relation.type)
  }

  return map
})

const relatedConcepts = computed(() =>
  Array.from(relationByConcept.value.keys())
    .map((slug) => props.concepts.find((concept) => concept.slug === slug))
    .filter((concept): concept is ConceptNode => Boolean(concept)),
)

watchEffect(() => {
  const orientation = props.orientation ?? 'horizontal'
  const expanded = props.size === 'expanded'
  const currentX = orientation === 'vertical' ? (expanded ? 310 : 64) : 220
  const currentY = orientation === 'vertical' ? 36 : 125
  const relatedX = orientation === 'vertical' ? currentX : 35
  const relatedSpacing =
    orientation === 'vertical'
      ? expanded
        ? 86
        : 64
      : relatedConcepts.value.length > 1
        ? Math.min(76, 210 / (relatedConcepts.value.length - 1))
        : 0
  const relatedStartY =
    orientation === 'vertical'
      ? expanded
        ? 160
        : 120
      : currentY - (relatedSpacing * (relatedConcepts.value.length - 1)) / 2

  const nodes: Elements = [
    {
      id: props.current.slug,
      label: props.current.title,
      position: { x: currentX, y: currentY },
      class: 'concept-graph-node concept-graph-node-current',
    },
  ]

  relatedConcepts.value.forEach((concept, index) => {
    nodes.push({
      id: concept.slug,
      label: concept.title,
      position: {
        x: relatedX,
        y: relatedStartY + relatedSpacing * index,
      },
      class: 'concept-graph-node',
    })
  })

  const edges: Elements = relatedConcepts.value.map((concept) => ({
    id: `${props.current.slug}-${concept.slug}`,
    source: props.current.slug,
    target: concept.slug,
    label: relationByConcept.value.get(concept.slug),
    class: 'concept-graph-edge',
  }))

  elements.value = [...nodes, ...edges]
})
</script>

<template>
  <div
    class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
    :class="size === 'expanded' ? 'h-[34rem]' : 'h-72'"
  >
    <VueFlow
      v-if="relatedConcepts.length"
      v-model="elements"
      :nodes-draggable="false"
      :nodes-connectable="false"
      :elements-selectable="false"
      :pan-on-drag="false"
      :zoom-on-scroll="false"
      :zoom-on-pinch="false"
      :zoom-on-double-click="false"
      :fit-view-on-init="false"
      :default-viewport="{
        x: 0,
        y: 0,
        zoom: size === 'expanded' ? 1 : 0.9,
      }"
      class="concept-local-graph"
    />
    <div
      v-else
      class="flex h-full items-center justify-center px-6 text-center text-sm text-gray-500 dark:text-gray-400"
    >
      {{ t('concepts.detail.noGraphLinks') }}
    </div>
  </div>
</template>

<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';

.concept-local-graph .vue-flow__node {
  width: auto;
  min-width: 8rem;
  border: 1px solid rgb(229 231 235);
  border-radius: 0.5rem;
  background: rgb(255 255 255);
  color: rgb(31 41 55);
  font-family: var(--font-sans);
  font-size: 0.8rem;
  box-shadow: none;
}

.dark .concept-local-graph .vue-flow__node {
  border-color: rgb(55 65 81);
  background: rgb(17 24 39);
  color: rgb(229 231 235);
}

.concept-local-graph .concept-graph-node-current {
  border-color: rgb(59 130 246);
  font-weight: 600;
}

.concept-local-graph .vue-flow__edge-path {
  stroke: rgb(156 163 175);
}

.concept-local-graph .vue-flow__edge-text {
  fill: rgb(107 114 128);
  font-family: var(--font-sans);
  font-size: 0.7rem;
}

.dark .concept-local-graph .vue-flow__edge-text {
  fill: rgb(156 163 175);
}
</style>
