<script setup lang="ts">
const { locale, t } = useI18n()

const { data: columnVariants } = await useAsyncData<SiteColumn[]>(
  'columns-index',
  () => queryCollection('columns').order('updated', 'DESC').all(),
)

const columns = computed(() =>
  mergeLocalizedColumns(columnVariants.value ?? [], locale.value),
)

useHead(() => ({ title: t('columns.title') }))
useSeoMeta({ description: () => t('columns.description') })
</script>

<template>
  <BlogOverviewShell
    :title="t('columns.title')"
    :description="t('columns.description')"
    narrow
  >
    <div v-if="columns.length">
      <ColumnCard
        v-for="column in columns"
        :key="column.slug"
        :column="column"
      />
    </div>

    <UEmpty
      v-else
      icon="i-lucide-list-tree"
      :title="t('columns.emptyTitle')"
      :description="t('columns.emptyDescription')"
      size="lg"
    />
  </BlogOverviewShell>
</template>
