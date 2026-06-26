<script setup lang="ts">
type LinkableContent = {
  title: string
  slug: string
  lang?: string
}

const route = useRoute()
const localePath = useLocalePath()
const { locale, t } = useI18n()

const slug = computed(() => {
  const value = route.params.slug
  return Array.isArray(value) ? value[0] : value
})

const { data: entities, refresh } = await useAsyncData(
  `entity-detail-${slug.value}`,
  () => queryCollection('entities').where('slug', '=', slug.value).all(),
  { lazy: false },
)

const { data: allEntities } = await useAsyncData(
  'entities-detail-all',
  () => queryCollection('entities').order('updated', 'DESC').all(),
  { lazy: false },
)

const { data: concepts } = await useAsyncData(
  'entities-detail-concepts',
  () => queryCollection('concepts').order('updated', 'DESC').all(),
  { lazy: false },
)

const pickLocalized = <T extends { lang?: string }>(group: T[]) => {
  const localeCode = normalizeContentLocale(locale.value)

  return (
    group.find((item) => item.lang?.toLowerCase() === localeCode) ??
    group.find((item) => item.lang?.toLowerCase() === 'en') ??
    group[0]
  )
}

const groupBySlug = <T extends LinkableContent>(items: T[]) => {
  const groups = new Map<string, T[]>()

  for (const item of items) {
    if (!groups.has(item.slug)) groups.set(item.slug, [])
    groups.get(item.slug)!.push(item)
  }

  return groups
}

const entity = computed(() => pickLocalized(entities.value ?? []))
const renderedLang = computed(() =>
  toHtmlLang(entity.value?.lang ?? locale.value),
)

const entityGroups = computed(() => groupBySlug(allEntities.value ?? []))
const conceptGroups = computed(() => groupBySlug(concepts.value ?? []))

const relatedEntities = computed(() =>
  (entity.value?.relatedEntities ?? [])
    .map((relatedSlug) => {
      const group = entityGroups.value.get(relatedSlug)
      return group ? pickLocalized(group) : undefined
    })
    .filter((item): item is LinkableContent => Boolean(item)),
)

const relatedConcepts = computed(() =>
  (entity.value?.relatedConcepts ?? [])
    .map((relatedSlug) => {
      const group = conceptGroups.value.get(relatedSlug)
      return group ? pickLocalized(group) : undefined
    })
    .filter((item): item is LinkableContent => Boolean(item)),
)

const updatedDate = computed(() => {
  if (!entity.value?.updated) return ''

  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(
    new Date(entity.value.updated),
  )
})

useHead(() => ({
  title: entity.value?.title
    ? `${entity.value.title} · ${t('menu.entities')}`
    : t('menu.entities'),
}))
</script>

<template>
  <main
    class="mx-auto w-full max-w-[66.5rem] px-4 py-10 sm:px-6 lg:px-0 xl:max-w-[69.5rem]"
  >
    <div v-if="!entity">
      <UEmpty
        icon="i-lucide-box"
        :title="t('entities.detail.notFound.title')"
        :description="t('entities.detail.notFound.description')"
        size="lg"
        :actions="[
          {
            icon: 'i-lucide-arrow-left',
            label: t('entities.detail.backToEntities'),
            to: localePath('/entities'),
          },
          {
            icon: 'i-lucide-refresh-cw',
            label: t('base.refresh'),
            color: 'neutral',
            variant: 'subtle',
            onClick: () => refresh(),
          },
        ]"
      />
    </div>

    <template v-else>
      <NuxtLink
        :to="localePath('/entities')"
        class="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
        {{ t('menu.entities') }}
      </NuxtLink>

      <header :lang="renderedLang" class="mb-8 max-w-[49.5rem]">
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <UBadge color="primary" variant="subtle">
            {{ t(`entities.kinds.${entity.kind}`) }}
          </UBadge>
          <UBadge color="neutral" variant="outline">
            {{ t(`entities.status.${entity.status}`) }}
          </UBadge>
        </div>

        <h1
          class="font-serif text-4xl font-semibold leading-tight text-gray-950 dark:text-gray-50"
        >
          {{ entity.title }}
        </h1>
        <p
          v-if="entity.summary"
          class="mt-4 text-lg leading-8 text-gray-600 dark:text-gray-400"
        >
          {{ entity.summary }}
        </p>
      </header>

      <div
        class="grid gap-10 lg:grid-cols-[minmax(0,47rem)_17rem] xl:grid-cols-[minmax(0,49.5rem)_17.5rem]"
      >
        <article class="min-w-0">
          <ContentRenderer
            :value="entity"
            :lang="renderedLang"
            class="nuxt-content prose dark:prose-invert min-w-0 max-w-full"
          >
            <template #empty>
              <div class="text-xl">{{ t('entities.detail.emptyBody') }}</div>
            </template>
          </ContentRenderer>
        </article>

        <aside
          class="min-w-0 space-y-6 pt-3 pr-1 text-sm lg:sticky lg:top-[calc(var(--ui-header-height,4rem)+1.75rem)]"
        >
          <section>
            <h2
              class="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
            >
              {{ t('entities.detail.details') }}
            </h2>
            <dl
              class="space-y-2 border-y border-gray-200 py-4 dark:border-gray-800"
            >
              <div class="flex justify-between gap-3">
                <dt class="text-gray-500 dark:text-gray-400">
                  {{ t('entities.detail.kind') }}
                </dt>
                <dd
                  class="text-right font-medium text-gray-800 dark:text-gray-100"
                >
                  {{ t(`entities.kinds.${entity.kind}`) }}
                </dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-gray-500 dark:text-gray-400">
                  {{ t('entities.detail.status') }}
                </dt>
                <dd
                  class="text-right font-medium text-gray-800 dark:text-gray-100"
                >
                  {{ t(`entities.status.${entity.status}`) }}
                </dd>
              </div>
              <div v-if="updatedDate" class="flex justify-between gap-3">
                <dt class="text-gray-500 dark:text-gray-400">
                  {{ t('entities.detail.updated') }}
                </dt>
                <dd
                  class="text-right font-medium text-gray-800 dark:text-gray-100"
                >
                  {{ updatedDate }}
                </dd>
              </div>
            </dl>
          </section>

          <section v-if="entity.aliases?.length">
            <h2
              class="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
            >
              {{ t('entities.detail.aliases') }}
            </h2>
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="alias in entity.aliases"
                :key="alias"
                color="neutral"
                variant="subtle"
                size="sm"
              >
                {{ alias }}
              </UBadge>
            </div>
          </section>

          <section v-if="relatedConcepts.length">
            <h2
              class="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
            >
              {{ t('entities.detail.relatedConcepts') }}
            </h2>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="concept in relatedConcepts"
                :key="concept.slug"
                color="neutral"
                variant="ghost"
                size="xs"
                :to="localePath(`/concepts/${concept.slug}`)"
              >
                [[{{ concept.title }}]]
              </UButton>
            </div>
          </section>

          <section v-if="relatedEntities.length">
            <h2
              class="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
            >
              {{ t('entities.detail.relatedEntities') }}
            </h2>
            <div class="flex flex-wrap gap-2">
              <UButton
                v-for="relatedEntity in relatedEntities"
                :key="relatedEntity.slug"
                color="neutral"
                variant="ghost"
                size="xs"
                :to="localePath(`/entities/${relatedEntity.slug}`)"
              >
                {{ relatedEntity.title }}
              </UButton>
            </div>
          </section>

          <section v-if="entity.externalLinks?.length">
            <h2
              class="mb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-600"
            >
              {{ t('entities.detail.externalLinks') }}
            </h2>
            <div class="space-y-2">
              <UButton
                v-for="link in entity.externalLinks"
                :key="link.url"
                icon="i-lucide-external-link"
                color="neutral"
                variant="ghost"
                size="xs"
                :to="link.url"
                target="_blank"
              >
                {{ link.label }}
              </UButton>
            </div>
          </section>
        </aside>
      </div>
    </template>
  </main>
</template>
