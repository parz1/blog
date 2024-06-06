import type { Mermaid } from 'mermaid'

declare module 'maptalks'

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
