import { defineNuxtConfig } from 'nuxt/config'
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/content',
    '@nuxt/devtools',
    '@unocss/nuxt',
  ],
  app: {
    head: {
      title: 'parz1\s playground',
    },
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
