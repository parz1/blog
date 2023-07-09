// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@unocss/nuxt',
    '@nuxt/content',
    '@nuxt/devtools',
    'nuxt-icon',
    '@nuxtjs/device',
  ],
  app: {
    head: {
      title: 'parz1\s playground',
    },
    pageTransition: {
      name: 'fade',
      mode: 'out-in',
    },
  },
  devtools: {
    enabled: true,
    host: 'localhost',
  },
  css: ['@/assets/css/global.scss'],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@import "@/assets/css/_variables.scss";',
        },
      },
    },
  },
})
