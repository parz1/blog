<script setup lang="ts">
type ConceptCardItem = {
  title: string
  slug: string
  summary?: string
  state: string
  tags?: string[]
  updated: string
  linkedConcepts?: string[]
}

const props = defineProps<{
  concept: ConceptCardItem
}>()

const localePath = useLocalePath()
const { locale } = useI18n()

const updatedDate = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(
    new Date(props.concept.updated),
  ),
)
</script>

<template>
  <NuxtLink :to="localePath(`/concepts/${concept.slug}`)" class="group block">
    <article
      class="rounded-lg border border-transparent px-3 py-4 transition-colors hover:border-gray-200 hover:bg-gray-50 dark:hover:border-gray-800 dark:hover:bg-gray-900/60"
    >
      <div class="flex flex-wrap items-center gap-3 text-sm">
        <ConceptStateBadge :state="concept.state" />
        <time class="text-gray-500 dark:text-gray-400">
          {{ updatedDate }}
        </time>
      </div>

      <h2
        class="mt-2 font-serif text-2xl font-semibold leading-snug text-gray-900 group-hover:text-primary-600 dark:text-gray-50"
      >
        {{ concept.title }}
      </h2>

      <p
        v-if="concept.summary"
        class="mt-1 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400"
      >
        {{ concept.summary }}
      </p>

      <div
        v-if="concept.tags?.length || concept.linkedConcepts?.length"
        class="mt-3 flex flex-wrap gap-2"
      >
        <UBadge
          v-for="tag in concept.tags"
          :key="tag"
          color="neutral"
          variant="subtle"
          size="sm"
        >
          {{ tag }}
        </UBadge>
        <UBadge
          v-for="linkedConcept in concept.linkedConcepts"
          :key="linkedConcept"
          color="neutral"
          variant="outline"
          size="sm"
        >
          [[{{ linkedConcept }}]]
        </UBadge>
      </div>
    </article>
  </NuxtLink>
</template>
