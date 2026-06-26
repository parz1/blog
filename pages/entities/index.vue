<script setup lang="ts">
type EntityKind =
  | 'format'
  | 'software'
  | 'tool'
  | 'library'
  | 'standard'
  | 'dataset'
  | 'instrument'
  | 'organization'
  | 'person'
  | 'product'
  | 'protocol'
  | 'other'

const { locale, t } = useI18n()

const { data: entities } = await useAsyncData(
  'entities-index',
  () => queryCollection('entities').order('updated', 'DESC').all(),
  { lazy: false },
)

const activeKind = ref<EntityKind | 'all'>('all')
const activeTag = ref('all')

const pickLocalizedEntity = <T extends { lang?: string }>(group: T[]) => {
  const localeCode = normalizeContentLocale(locale.value)

  return (
    group.find((entity) => entity.lang?.toLowerCase() === localeCode) ??
    group.find((entity) => entity.lang?.toLowerCase() === 'en') ??
    group[0]
  )
}

const visibleEntities = computed(() => {
  const groups = new Map<string, NonNullable<typeof entities.value>>()

  for (const entity of entities.value ?? []) {
    if (!groups.has(entity.slug)) groups.set(entity.slug, [])
    groups.get(entity.slug)!.push(entity)
  }

  return Array.from(groups.values())
    .map((group) => pickLocalizedEntity(group))
    .toSorted(
      (a, b) =>
        new Date(b.updated ?? '').getTime() -
        new Date(a.updated ?? '').getTime(),
    )
})

const kinds = computed(() =>
  Array.from(
    new Set(visibleEntities.value.map((entity) => entity.kind)),
  ).sort(),
)

const tags = computed(() =>
  Array.from(
    new Set(visibleEntities.value.flatMap((entity) => entity.tags ?? [])),
  ).toSorted(),
)

const filteredEntities = computed(() =>
  visibleEntities.value.filter((entity) => {
    const matchesKind =
      activeKind.value === 'all' || entity.kind === activeKind.value
    const matchesTag =
      activeTag.value === 'all' || entity.tags?.includes(activeTag.value)

    return matchesKind && matchesTag
  }),
)

const kindLabel = (kind: EntityKind | 'all') =>
  kind === 'all' ? t('blog.all') : t(`entities.kinds.${kind}`)

useHead({
  title: () => t('menu.entities'),
})
</script>

<template>
  <main class="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-0">
    <header class="mb-10">
      <p
        class="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400"
      >
        {{ t('entities.kicker') }}
      </p>
      <h1
        class="font-serif text-4xl font-semibold leading-tight text-gray-950 dark:text-gray-50"
      >
        {{ t('menu.entities') }}
      </h1>
      <p
        class="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-400"
      >
        {{ t('entities.description') }}
      </p>
    </header>

    <section
      class="mb-8 space-y-4 border-y border-gray-200 py-4 dark:border-gray-800"
      aria-label="Entity filters"
    >
      <div class="flex flex-wrap items-center gap-2">
        <span class="mr-2 text-sm text-gray-500 dark:text-gray-400">
          {{ t('entities.filters.kind') }}
        </span>
        <UButton
          :color="activeKind === 'all' ? 'primary' : 'neutral'"
          :variant="activeKind === 'all' ? 'soft' : 'ghost'"
          size="xs"
          @click="activeKind = 'all'"
        >
          {{ t('blog.all') }}
        </UButton>
        <UButton
          v-for="kind in kinds"
          :key="kind"
          :color="activeKind === kind ? 'primary' : 'neutral'"
          :variant="activeKind === kind ? 'soft' : 'ghost'"
          size="xs"
          @click="activeKind = kind"
        >
          {{ kindLabel(kind) }}
        </UButton>
      </div>

      <div v-if="tags.length" class="flex flex-wrap items-center gap-2">
        <span class="mr-2 text-sm text-gray-500 dark:text-gray-400">
          {{ t('entities.filters.tag') }}
        </span>
        <UButton
          :color="activeTag === 'all' ? 'primary' : 'neutral'"
          :variant="activeTag === 'all' ? 'soft' : 'ghost'"
          size="xs"
          @click="activeTag = 'all'"
        >
          {{ t('blog.all') }}
        </UButton>
        <UButton
          v-for="tag in tags"
          :key="tag"
          :color="activeTag === tag ? 'primary' : 'neutral'"
          :variant="activeTag === tag ? 'soft' : 'ghost'"
          size="xs"
          @click="activeTag = tag"
        >
          {{ tag }}
        </UButton>
      </div>
    </section>

    <ul class="grid gap-3 sm:grid-cols-2">
      <li v-for="entity in filteredEntities" :key="entity.slug">
        <EntityCard :entity="entity" />
      </li>
    </ul>

    <UEmpty
      v-if="!filteredEntities.length"
      icon="i-lucide-box"
      :title="t('entities.empty.title')"
      :description="t('entities.empty.description')"
      size="lg"
    />
  </main>
</template>
