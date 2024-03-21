// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/devtools', '@nuxtjs/device', '@nuxt/ui'],
  app: {
    head: {
      title: 'Ivor Zhou',
    },
  },
  content: {
    highlight: {
      theme: {
        // Default theme (same as single string)
        default: 'github-light',
        // Theme used if `html.dark`
        dark: 'github-dark',
        // Theme used if `html.sepia`
        sepia: 'monokai',
      },
    },
  },
  css: ['@/assets/css/main.css'],
  ui: {
    icons: ['carbon'],
  },
  devtools: {
    enabled: true,
  },
})
