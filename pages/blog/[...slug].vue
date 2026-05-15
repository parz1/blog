<script setup lang="ts">
const route = useRoute()
const { locales, locale, setLocale } = useI18n()

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

const activeTocId = ref<string | null>(null)
const nuxtContent = ref(null)

const observer: Ref<IntersectionObserver | null | undefined> = ref(null)
const observerOptions = reactive({
  root: nuxtContent.value,
  threshold: 0.5,
})

onMounted(() => {
  observer.value = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const id = entry.target.getAttribute('id')
      if (entry.isIntersecting) {
        activeTocId.value = id
      }
    })
  }, observerOptions)

  document
    .querySelectorAll('.nuxt-content h2[id], .nuxt-content h3[id]')
    .forEach((section) => {
      observer.value?.observe(section)
    })
})

onUnmounted(() => {
  observer.value?.disconnect()
})
</script>

<template>
  <UPage class="lg:pt-8">
    <UPageBody>
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
        <div class="flex justify-center lg:block">
          <div class="w-full max-w-3xl px-0 md:px-6 lg:px-8">
            <article>
              <div class="mb-6">
                <div
                  class="text-4xl font-semibold font-serif leading-tight text-black dark:text-white"
                >
                  {{ doc?.title }}
                </div>
                <div class="text-lg mb-3">{{ doc?.description }}</div>
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
                ref="nuxtContent"
                :value="doc"
                class="prose dark:prose-invert"
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
    </UPageBody>

    <template #left>
      <UPageAside>
        <!-- <div class="text-xl font-normal mb-2">{{ $t('base.tocTitle') }}</div> -->
        <UContentToc
          class=""
          :title="$t('base.tocTitle')"
          :links="doc?.body?.toc?.links"
        />
        <!-- <ClientOnly>
            <TableOfContents :active-toc-id="activeTocId" :doc="doc" />
          </ClientOnly> -->
      </UPageAside>
    </template>
  </UPage>
</template>

<style></style>
