<script setup lang="ts">
const route = useRoute()
const localePath = useLocalePath()
const { t } = useI18n()
const id = String(route.params.id ?? '')
const profile = resolveContentAuthor(id)
if (!isContentAuthorId(id) || profile.kind !== 'character')
  throw createError({ statusCode: 404, statusMessage: 'Character not found' })
const copy = (key: string) => t(`profilePages.characters.${id}.${key}`)
const canonical = computed(
  () => new URL(localePath(profile.path!), 'https://parz1.minerei.dev').href,
)
const portrait = new URL(profile.avatar!, 'https://parz1.minerei.dev').href
useSeoMeta({
  title: () => t('profilePages.pageTitle', { name: profile.name }),
  description: () => copy('tagline'),
  ogTitle: () => profile.name,
  ogDescription: () => copy('tagline'),
  ogType: 'profile',
  ogUrl: () => canonical.value,
  ogImage: portrait,
  ogImageAlt: profile.name,
  twitterCard: 'summary',
  twitterTitle: profile.name,
  twitterDescription: () => copy('tagline'),
  twitterImage: portrait,
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: [
    {
      type: 'application/ld+json',
      textContent: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        url: canonical.value,
        mainEntity: {
          '@type': 'Person',
          '@id': `${canonical.value}#character`,
          name: profile.name,
          description: `${t('profilePages.virtual')}. ${copy('identity')} ${copy('tagline')}`,
          image: portrait,
          url: canonical.value,
        },
      }).replaceAll('<', '\\u003c'),
    },
  ],
}))
</script>

<template>
  <div class="mx-auto max-w-[56.5rem] px-5 py-10 sm:px-6 sm:py-16 lg:px-0">
    <NuxtLink
      :to="localePath('/blog')"
      class="inline-flex items-center gap-2 text-sm text-muted hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <UIcon name="i-lucide-arrow-left" class="size-4" />
      {{ t('profilePages.back') }}
    </NuxtLink>
    <article
      class="mt-10 grid items-start gap-8 sm:mt-14 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-12"
    >
      <img
        :src="profile.avatar"
        :alt="t('profilePages.avatarAlt', { name: profile.name })"
        width="208"
        height="208"
        fetchpriority="high"
        class="size-36 rounded-xl object-cover sm:size-52"
      />
      <div class="min-w-0">
        <header>
          <h1
            class="font-serif text-4xl font-semibold leading-tight text-highlighted sm:text-5xl"
          >
            {{ profile.name }}
          </h1>
          <p class="mt-3 text-sm text-muted">{{ copy('identity') }}</p>
          <p
            class="mt-7 max-w-lg font-serif text-xl leading-9 text-highlighted sm:text-2xl sm:leading-10"
          >
            {{ copy('tagline') }}
          </p>
        </header>
        <div class="mt-8 max-w-lg space-y-5 text-base leading-8 text-toned">
          <p>{{ copy('introduction') }}</p>
          <p>{{ copy('temperament') }}</p>
          <p>{{ copy('relationship') }}</p>
        </div>
      </div>
    </article>
  </div>
</template>
