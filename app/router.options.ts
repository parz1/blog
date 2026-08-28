import type { RouterConfig } from '@nuxt/schema'

export default {
  scrollBehavior(to, from, savedPosition) {
    // Keep the browser's native position when navigating through history.
    if (savedPosition) return savedPosition

    // Let article heading links continue to target their anchors.
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'auto',
      }
    }

    // A new page should never inherit the previous page's scroll offset.
    if (to.path !== from.path) {
      return {
        left: 0,
        top: 0,
        behavior: 'auto',
      }
    }

    return false
  },
} satisfies RouterConfig
