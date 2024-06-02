---
title: Use mermaid in nuxt
description: 在 Nuxt3 中使用 mermaid
published: 2024/06/01
categories:
  - web
tags:
  - mermaid
  - nuxt content
---

## 效果

因为写成了 vue 组件，在 template 里或在 mdc 中写都行

```md
<mermaid>
sequenceDiagram
    participant Alice
    participant Bob
    Alice->>John: Hello John, how are you?
    loop HealthCheck
        John->>John: Fight against hypochondria
    end
    Note right of John: Rational thoughts <br/>prevail!
    John-->>Alice: Great!
    John->>Bob: How about you?
    Bob-->>John: Jolly good!
</mermaid>
```

<mermaid>
sequenceDiagram
    participant Alice
    participant Bob
    Alice->>John: Hello John, how are you?
    loop HealthCheck
        John->>John: Fight against hypochondria
    end
    Note right of John: Rational thoughts <br/>prevail!
    John-->>Alice: Great!
    John->>Bob: How about you?
    Bob-->>John: Jolly good!
</mermaid>

## Install

```ts [plugins/mermaid.client.ts]
import mermaid from 'mermaid'

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.provide('mermaid', () => mermaid)
})

```
```ts [index.d.ts]
import type { Mermaid } from 'mermaid'

declare module '#app' {
  interface NuxtApp {
    $mermaid(): Mermaid
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $mermaid(): Mermaid
  }
}

export {}
```
```vue [components/global/mermaid.vue]
<script setup lang="ts">
let show = ref(false)

const { $mermaid } = useNuxtApp()

onMounted(async () => {
  show.value = true
  $mermaid().initialize({ startOnLoad: true })
  await nextTick()
  $mermaid().init()
})
</script>

<template>
  <div class="mermaid" v-if="show">
    <slot></slot>
  </div>
</template>

```