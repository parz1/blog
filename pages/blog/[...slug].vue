<script setup lang="ts">
const route = useRoute()
const { locale } = useI18n()

const slug = route.params.slug

const { data: variants, refresh } = await useAsyncData(
  'slug-variants',
  async () => {
    if (!slug) return []
    // Query strictly by slug; frontend will handle variants
    return await queryCollection('blog').where('slug', '=', slug).all()
  },
  // lazy load may cause SEO issue and get some trouble for toc comp
  { lazy: false },
)

// chose the variant based on locale or default to first
const doc = computed(() => {
  if (!variants.value || variants.value.length === 0) return null
  const byLocale = variants.value.find((item) => item.lang === locale.value)
  return byLocale || variants.value[0]
})

const publishedDate = computed(() => {
  // localize date display
  if (!doc.value || !doc.value.published) return null
  return new Date(doc.value.published as unknown as string).toLocaleDateString(
    locale.value,
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  )
})

useSeoMeta({
  ogImage: doc.value?.cover,
  twitterCard: 'summary_large_image',
  articleAuthor: ['parz1'],
})

useHead({
  link: [
    {
      rel: 'stylesheet',
      href: 'https://cdn.jsdelivr.net/npm/katex@0.11.0/dist/katex.min.css',
    },
  ],
  title: doc.value?.title,
})
</script>

<template>
  <div class="relative lg:pt-8">
    <section class="mt-8 min-w-0 overflow-x-hidden pb-24">
      <div v-if="!doc">
        <UEmpty
          icon="i-lucide-file"
          :title="$t('base.noBlogPosts')"
          size="lg"
          :description="$t('base.contentYouAreLookingForDoesNotExist')"
          :actions="[
            {
              icon: 'i-lucide-arrow-left',
              label: $t('base.backToHome'),
              to: '/',
            },
            {
              icon: 'i-lucide-refresh-cw',
              label: $t('base.refresh'),
              color: 'neutral',
              variant: 'subtle',
              onClick: () => refresh(),
            },
          ]"
        />
      </div>
      <template v-else>
        <div class="w-full min-w-0">
          <div class="mx-auto w-full min-w-0 max-w-2xl px-0 md:px-6 lg:px-0">
            <article class="min-w-0 max-w-full">
              <div class="mb-6">
                <div
                  class="text-3xl sm:text-4xl font-semibold font-serif leading-tight text-black dark:text-white break-words"
                >
                  {{ doc?.title }}
                </div>
                <div class="text-lg mb-3 wrap-break-word">
                  {{ doc?.description }}
                </div>
                <div class="text-gray-500 flex flex-wrap gap-4 items-center">
                  {{ publishedDate }}
                  <div class="flex flex-wrap gap-2">
                    <UBadge
                      v-for="tag in doc?.tags"
                      :key="tag"
                      color="neutral"
                      variant="solid"
                    >
                      {{ tag }}
                    </UBadge>
                  </div>
                  <!-- Variants by same slug can be handled by the page UI if needed -->
                </div>
              </div>
              <ContentRenderer
                v-if="doc"
                :value="doc"
                :lang="locale"
                class="nuxt-content prose dark:prose-invert min-w-0 max-w-full"
              >
                <template #empty>
                  <div class="text-xl">Document is empty</div>
                  <p>maybe I will write it tomorrow... :)</p>
                </template>
              </ContentRenderer>
            </article>
          </div>
        </div>
      </template>
    </section>

    <aside
      v-if="doc?.body?.toc?.links?.length"
      class="absolute top-14 bottom-0 left-[calc(50%+21rem+1rem)] hidden w-56 min-[1040px]:block min-[1040px]:pt-36 min-[1040px]:pb-8"
    >
      <div
        class="min-[1040px]:sticky min-[1040px]:top-[calc(var(--ui-header-height,4rem)+0.75rem)]"
      >
        <div class="mb-3 text-2xl font-medium text-gray-900 dark:text-gray-50">
          {{ $t('base.tocTitle') }}
        </div>
        <ClientOnly>
          <TableOfContents :doc="doc" />
        </ClientOnly>
      </div>
    </aside>
  </div>
</template>

<style></style>
