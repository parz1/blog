<script setup lang="ts">
import { SpeedInsights } from '@vercel/speed-insights/vue'
import type { I18nHeadOptions } from '@nuxtjs/i18n'

// i18n <html> attrs / hreflang / meta
const head = useLocaleHead({
  dir: true,
  seo: true,
  lang: true,
})

// 可选：canonical
const route = useRoute()
const url = useRequestURL()
const canonical = computed(() => {
  // 去掉 hash，保留查询串；如需去掉 query 就用 route.path
  const pathname = route.fullPath.split('#')[0]
  return `${url.origin}${pathname}`
})
</script>

<template>
  <div>
    <Html
      :lang="head.htmlAttrs?.lang || 'en'"
      :dir="head.htmlAttrs?.dir || 'ltr'"
    >
      <Head>
        <!-- i18n 生成的 alternate / og:locale 等 -->
        <template v-for="link in head.link" :key="link.id || link.href">
          <Link v-bind="link" />
        </template>
        <template
          v-for="meta in head.meta"
          :key="meta.id || meta.hid || meta.name || meta.property"
        >
          <Meta v-bind="meta" />
        </template>

        <!-- canonical（可选；nuxt-i18n 的 seo 里有时不会自动加） -->
        <Link rel="canonical" :href="canonical" />
      </Head>

      <Body class="overflow-x-hidden">
        <Header />
        <BaseMain>
          <slot />
        </BaseMain>
        <BaseFooter />
      </Body>
    </Html>
  </div>
</template>
