<script setup lang="ts">
type EntityCardItem = {
  title: string
  slug: string
  summary?: string
  kind: string
  status: string
  tags?: string[]
  updated: string
  aliases?: string[]
}

const props = defineProps<{
  entity: EntityCardItem
}>()

const localePath = useLocalePath()
const { locale, t } = useI18n()

const updatedDate = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(
    new Date(props.entity.updated),
  ),
)
</script>

<template>
  <NuxtLink :to="localePath(`/entities/${entity.slug}`)" class="group block">
    <article
      class="h-full rounded-lg border border-gray-200 px-4 py-4 transition-colors hover:border-primary-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-primary-800 dark:hover:bg-gray-900/60"
    >
      <div class="mb-3 flex items-center gap-3">
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600 dark:bg-gray-900 dark:text-gray-300"
        >
          <UIcon name="i-lucide-box" class="size-4" />
        </span>
        <div class="min-w-0">
          <h2
            class="truncate font-serif text-xl font-semibold text-gray-900 group-hover:text-primary-600 dark:text-gray-50"
          >
            {{ entity.title }}
          </h2>
          <p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            {{ t(`entities.kinds.${entity.kind}`) }} · {{ updatedDate }}
          </p>
        </div>
      </div>

      <p
        v-if="entity.summary"
        class="text-sm leading-6 text-gray-600 dark:text-gray-400"
      >
        {{ entity.summary }}
      </p>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <UBadge color="primary" variant="subtle" size="sm">
          {{ t(`entities.status.${entity.status}`) }}
        </UBadge>
        <UBadge
          v-for="tag in entity.tags"
          :key="tag"
          color="neutral"
          variant="outline"
          size="sm"
        >
          {{ tag }}
        </UBadge>
      </div>

      <div
        v-if="entity.aliases?.length"
        class="mt-3 flex flex-wrap gap-1.5 text-xs text-gray-500 dark:text-gray-400"
      >
        <span v-for="alias in entity.aliases.slice(0, 3)" :key="alias">
          {{ alias }}
        </span>
      </div>
    </article>
  </NuxtLink>
</template>
