<script setup lang="ts">
const route = useRoute()
const localePath = useLocalePath()
const id = String(route.params.id ?? '')
if (!isContentAuthorId(id))
  throw createError({ statusCode: 404, statusMessage: 'Profile not found' })
await navigateTo(localePath(resolveContentAuthor(id).path!), {
  redirectCode: 301,
  replace: true,
})
</script>

<template>
  <div />
</template>
