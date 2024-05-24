<script setup lang="ts">
const { data: navigation } = await useAsyncData('navigation', async () => {
  const res = await fetchContentNavigation('/blog')
  if (res.length > 0) {
    const navis = res[0].children

    // flatten the navigation, get the leaf nodes
    const flatten = navis => {
      return navis.reduce((acc, nav) => {
        if (nav.children) {
          return acc.concat(flatten(nav.children))
        }
        return acc.concat(nav)
      }, [])
    }
    const _navis = flatten(navis).sort((a, b) => {
      console.log(a.published, b.published)
      return a.published > b.published ? -1 : 1
    })
    return _navis
  }
  return []
})
</script>

<template>
  <div class="py-8">
    <BlogListTitle />
    <ul class="space-y-4">
      <li v-for="(article, index) in navigation" :key="index">
        <BaseArticleCard :article="article" />
      </li>
    </ul>
  </div>
</template>
