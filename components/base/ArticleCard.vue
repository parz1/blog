<script setup lang="ts">
const { locale, t } = useI18n()
const localePath = useLocalePath()

const props = defineProps<{
  article: SiteArticle
}>()

const publishedDate = computed(() =>
  props.article.published
    ? new Date(props.article.published as unknown as string)
    : null,
)

const i18nTime = computed(() => {
  if (!publishedDate.value) return ''
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(
    publishedDate.value,
  )
})

// 供 <time datetime> 使用，确保是有效 ISO
const datetimeAttr = computed(() => publishedDate.value?.toISOString?.() ?? '')

const languageBadges = computed(() => {
  const languages = [
    ...(props.article.availableLangs ?? []),
    (props.article.lang as string | undefined) ?? undefined,
  ]

  const normalized = Array.from(
    new Set(
      languages
        .filter((lang): lang is string => Boolean(lang))
        .map((lang) => lang.toUpperCase()),
    ),
  )

  const current = (props.article.lang as string | undefined)?.toUpperCase()

  return normalized.map((code) => ({
    code,
    isCurrent: code === current,
  }))
})

const activityBadge = computed(() => {
  switch (props.article.activityKind) {
    case 'post':
      return {
        color: 'primary',
        label: t('contentKind.post'),
      }
    case 'log':
      return {
        color: 'neutral',
        label: t('contentKind.log'),
      }
    case 'crap':
      return {
        color: 'warning',
        label: t('contentKind.crap'),
      }
    default:
      return null
  }
})

const articleLang = computed(() => toHtmlLang(props.article.lang))
</script>

<template>
  <NuxtLink
    :to="
      localePath(
        `/blog/${article.slug ?? (article.path || '').split('/').pop()}`,
      )
    "
    class="group"
  >
    <article
      :lang="articleLang"
      class="rounded-lg border border-transparent px-3 py-4 transition-colors duration-200 hover:border-gray-200 hover:bg-gray-50/70 dark:hover:border-gray-800 dark:hover:bg-gray-900/50"
    >
      <div class="mb-2 flex flex-wrap items-center gap-3">
        <time
          class="relative flex items-center pl-3.5 text-sm text-gray-400 dark:text-gray-500"
          :datetime="datetimeAttr"
        >
          <span
            class="absolute inset-y-0 left-0 flex items-center"
            aria-hidden="true"
          >
            <span
              class="h-4 w-1 rounded-full bg-gray-200 dark:bg-gray-500"
            ></span>
          </span>
          {{ i18nTime }}
        </time>
        <div
          v-if="activityBadge || languageBadges.length"
          class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400"
        >
          <UBadge
            v-if="activityBadge"
            :color="activityBadge.color"
            size="sm"
            variant="soft"
          >
            {{ activityBadge.label }}
          </UBadge>
          <UBadge
            v-for="lang in languageBadges"
            :key="lang.code"
            :color="lang.isCurrent ? 'primary' : 'neutral'"
            size="sm"
            variant="subtle"
          >
            {{ lang.code }}
          </UBadge>
        </div>
      </div>
      <h2
        class="content-title font-serif text-xl font-medium leading-snug text-gray-900 group-hover:text-primary-600 dark:text-gray-100"
      >
        {{ article.title }}
      </h2>
      <p
        v-if="article.description"
        class="content-description relative z-10 mt-1 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-400"
      >
        {{ article.description }}
      </p>
      <div
        v-if="article.tags?.length"
        class="mt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400"
      >
        <UBadge
          v-for="tag in article.tags"
          :key="tag"
          color="neutral"
          size="md"
          variant="soft"
        >
          {{ tag }}
        </UBadge>
      </div>
    </article>
  </NuxtLink>
</template>
