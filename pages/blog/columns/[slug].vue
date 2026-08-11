<script setup lang="ts">
const route = useRoute()
const localePath = useLocalePath()
const { locale, t } = useI18n()

const slug = computed(() => String(route.params.slug ?? ''))

const { data: columnVariants, refresh } = await useAsyncData<SiteColumn[]>(
  () => `column-${slug.value}`,
  () => queryCollection('columns').where('slug', '=', slug.value).all(),
)

const { data: articleVariants } = await useAsyncData<SiteArticle[]>(
  'column-article-sources',
  () => queryCollection('articles').order('published', 'DESC').all(),
)

const column = computed(
  () =>
    mergeLocalizedColumns(columnVariants.value ?? [], locale.value)[0] ?? null,
)
const articles = computed(() =>
  mergeLocalizedArticles(articleVariants.value ?? [], locale.value),
)
const articlesBySlug = computed(
  () =>
    new Map(
      articles.value.flatMap((article) =>
        article.slug ? [[article.slug, article] as const] : [],
      ),
    ),
)

const resolvedSections = computed(() => {
  let position = 0

  return (column.value?.sections ?? []).map((section, sectionIndex) => ({
    ...section,
    numeral:
      ['I', 'II', 'III', 'IV', 'V', 'VI'][sectionIndex] ??
      `${sectionIndex + 1}`,
    chapters: section.chapters.map((chapter) => ({
      ...chapter,
      position: (position += 1),
      article: chapter.articleSlug
        ? articlesBySlug.value.get(chapter.articleSlug)
        : undefined,
    })),
  }))
})

const renderedLang = computed(() =>
  toHtmlLang(column.value?.lang ?? locale.value),
)
const author = computed(() => column.value?.author ?? 'parz1')
const startedYear = computed(
  () =>
    column.value?.started ??
    new Date(column.value?.updated ?? '').getFullYear(),
)
const publicationStatus = computed(() =>
  column.value?.status === 'completed'
    ? t('columns.status.completed')
    : t('columns.continuouslyRevised'),
)

const chapterSummary = (
  chapter: SiteColumnChapter & { article?: SiteArticle },
) => chapter.article?.description ?? chapter.summary

const chapterPublication = (
  chapter: SiteColumnChapter & { article?: SiteArticle },
) =>
  chapter.article?.published
    ? chapter.article.published.slice(0, 10).replaceAll('-', '.')
    : t('columns.forthcoming')

if (!column.value) setResponseStatus(404)

useHead(() => ({ title: column.value?.title ?? t('columns.title') }))
useSeoMeta({ description: () => column.value?.description })
</script>

<template>
  <main
    class="mx-auto w-full max-w-7xl px-4 pb-10 pt-14 sm:px-6 lg:px-12 lg:pt-16"
  >
    <div v-if="!column">
      <UEmpty
        icon="i-lucide-list-tree"
        :title="t('columns.notFound')"
        :description="t('base.contentYouAreLookingForDoesNotExist')"
        size="lg"
        :actions="[
          {
            icon: 'i-lucide-arrow-left',
            label: t('columns.backToColumns'),
            to: localePath('/blog/columns'),
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
      <header :lang="renderedLang">
        <p
          class="mb-7 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400"
        >
          <NuxtLink
            :to="localePath('/blog/columns')"
            class="transition-colors hover:text-primary-600"
          >
            {{ t('columns.researchSeries') }}
          </NuxtLink>
          <span aria-hidden="true">/</span>
          <span>{{ column.title }}</span>
        </p>

        <h1
          class="font-serif text-6xl font-semibold leading-none tracking-tight text-gray-950 dark:text-gray-50 sm:text-7xl"
        >
          {{ column.title }}
        </h1>
        <p
          class="mt-5 max-w-4xl font-serif text-xl leading-relaxed text-gray-800 dark:text-gray-200 sm:text-[1.35rem]"
        >
          {{ column.description }}
        </p>
        <div
          class="mt-5 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-gray-500 dark:text-gray-400"
        >
          <span>{{ author }}</span>
          <span>{{ t('columns.started', { year: startedYear }) }}</span>
          <span>{{ publicationStatus }}</span>
        </div>
      </header>

      <section
        v-if="column.question || column.thesis"
        class="mt-10"
        aria-labelledby="column-question-title"
      >
        <p
          class="mb-4 text-sm tracking-[0.14em] text-gray-500 dark:text-gray-400"
        >
          {{ t('columns.editorialQuestion') }}
        </p>
        <h2
          v-if="column.question"
          id="column-question-title"
          class="max-w-5xl whitespace-pre-line font-serif text-3xl font-normal leading-[1.35] tracking-tight text-gray-950 dark:text-gray-50 sm:text-4xl lg:text-[2.75rem]"
        >
          {{ column.question }}
        </h2>
        <div
          class="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"
        >
          <p
            v-if="column.thesis"
            class="max-w-3xl font-serif text-base leading-7 text-gray-700 dark:text-gray-300"
          >
            {{ column.thesis }}
          </p>
          <p
            v-if="column.scope?.length"
            class="flex shrink-0 items-center gap-3 text-xs tracking-wide text-gray-500 dark:text-gray-400"
          >
            <span
              class="w-7 border-t border-gray-400 dark:border-gray-600"
              aria-hidden="true"
            />
            <span>{{ t('columns.discussionScope') }}</span>
            <span>{{ column.scope.join(' / ') }}</span>
          </p>
        </div>
      </section>

      <section class="mt-8" aria-labelledby="column-essays-title">
        <div class="mb-1 flex items-end justify-between gap-4">
          <h2
            id="column-essays-title"
            class="font-serif text-3xl font-semibold text-gray-950 dark:text-gray-50"
          >
            {{ t('columns.articlesAndArguments') }}
          </h2>
        </div>

        <div>
          <section
            v-for="section in resolvedSections"
            :key="section.id"
            class="grid border-b border-gray-300 py-3 dark:border-gray-700 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.45fr)] lg:gap-10"
            :aria-labelledby="`column-section-${section.id}`"
          >
            <div class="flex gap-5 pb-5 lg:pb-0">
              <span
                class="w-9 shrink-0 font-serif text-3xl leading-none text-gray-400 dark:text-gray-500"
                aria-hidden="true"
              >
                {{ section.numeral }}
              </span>
              <div>
                <h3
                  :id="`column-section-${section.id}`"
                  class="font-serif text-lg font-medium leading-7 text-gray-950 dark:text-gray-100"
                >
                  {{ section.title }}
                </h3>
                <p
                  v-if="section.description"
                  class="mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400"
                >
                  {{ section.description }}
                </p>
              </div>
            </div>

            <ol
              class="border-t border-gray-200 dark:border-gray-800 lg:border-t-0"
            >
              <li
                v-for="chapter in section.chapters"
                :key="chapter.id"
                class="border-b border-gray-200 last:border-b-0 dark:border-gray-800"
              >
                <NuxtLink
                  v-if="chapter.article"
                  :to="localePath(`/blog/${chapter.article.slug}`)"
                  class="group grid gap-x-4 py-2.5 sm:grid-cols-[2rem_minmax(0,1fr)_auto]"
                >
                  <span class="text-sm text-gray-400 dark:text-gray-500">
                    {{ String(chapter.position).padStart(2, '0') }}
                  </span>
                  <span>
                    <span
                      class="block font-serif text-lg font-medium text-gray-950 transition-colors group-hover:text-primary-600 dark:text-gray-100"
                    >
                      {{ chapter.article.title }}
                    </span>
                    <span
                      v-if="chapterSummary(chapter)"
                      class="mt-1 block text-sm leading-6 text-gray-500 dark:text-gray-400"
                    >
                      {{ chapterSummary(chapter) }}
                    </span>
                  </span>
                  <span
                    class="col-start-2 mt-2 text-xs text-gray-400 dark:text-gray-500 sm:col-start-auto sm:mt-1"
                  >
                    {{ chapterPublication(chapter) }}
                  </span>
                </NuxtLink>

                <div
                  v-else
                  class="grid gap-x-4 py-2.5 sm:grid-cols-[2rem_minmax(0,1fr)_auto]"
                >
                  <span class="text-sm text-gray-400 dark:text-gray-500">
                    {{ String(chapter.position).padStart(2, '0') }}
                  </span>
                  <span>
                    <span
                      class="block font-serif text-lg font-medium text-gray-800 dark:text-gray-200"
                    >
                      {{ chapter.workingTitle }}
                    </span>
                    <span
                      v-if="chapterSummary(chapter)"
                      class="mt-1 block text-sm leading-6 text-gray-500 dark:text-gray-400"
                    >
                      {{ chapterSummary(chapter) }}
                    </span>
                  </span>
                  <span
                    class="col-start-2 mt-2 text-xs text-gray-400 dark:text-gray-500 sm:col-start-auto sm:mt-1"
                  >
                    {{ chapterPublication(chapter) }}
                  </span>
                </div>
              </li>
            </ol>
          </section>
        </div>
      </section>

      <p class="mt-6 text-sm text-gray-400 dark:text-gray-500">
        {{ t('columns.evolvingNote') }}
      </p>
    </template>
  </main>
</template>
