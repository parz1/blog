<script setup lang="ts">
import type { ContentCredit } from '~/utils/contentAuthors'
const props = defineProps<{ authors?: ContentCredit[]; compact?: boolean }>()
const { t } = useI18n()
const localePath = useLocalePath()
const credits = computed(() => resolveContentCredits(props.authors))
const positionLabel = (position: number) =>
  t(
    position === 1
      ? 'contentAuthors.first'
      : position === 2
        ? 'contentAuthors.second'
        : 'contentAuthors.nth',
    { position },
  )
</script>

<template>
  <span
    role="list"
    :aria-label="t('contentAuthors.label')"
    class="inline-flex flex-wrap items-baseline gap-x-4 gap-y-1"
  >
    <span
      v-for="credit in credits"
      :key="credit.id"
      role="listitem"
      class="inline-flex flex-wrap items-baseline gap-x-1.5"
    >
      <span class="text-muted">{{
        credits.length > 1
          ? positionLabel(credit.position)
          : t('contentAuthors.single')
      }}</span>
      <NuxtLink
        v-if="credit.path"
        :to="localePath(credit.path)"
        :aria-label="t('profilePages.open', { name: credit.name })"
        class="relative z-10 decoration-primary-300 underline-offset-4 hover:text-primary-600 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
      >
        {{ credit.name }}
      </NuxtLink>
      <span v-else>{{ credit.name }}</span>
      <span v-if="credit.kind === 'character'" class="text-xs text-muted"
        >· {{ t('contentAuthors.virtual') }}</span
      >
      <span v-if="!compact && credit.roles.length" class="text-xs text-muted">
        ({{
          credit.roles
            .map((role) => t(`contentAuthors.roles.${role}`))
            .join(' · ')
        }})
      </span>
    </span>
  </span>
</template>
