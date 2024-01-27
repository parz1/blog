// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@unocss/nuxt', '@nuxt/content', '@nuxt/devtools', '@nuxtjs/device', '@nuxt/ui'],
  app: {
    head: {
      title: 'parz1s playground',
    },
    pageTransition: {
      name: 'fade',
      mode: 'out-in',
    },
  },
  devtools: {
    enabled: true,
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
