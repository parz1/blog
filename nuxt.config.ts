// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/devtools', '@nuxtjs/device', '@nuxt/ui'],
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: {
        class: 'h-full',
      },
      bodyAttrs: {
        class: 'antialiased bg-gray-50 dark:bg-black min-h-screen',
      },
    },
  },
  content: {
    markdown: {
      anchorLinks: true,
    },
    highlight: {
      theme: 'github-dark',
    },
    // sources: {
    //   github: {
    //     driver: 'github', // Driver used to fetch contents (view unstorage documentation)
    //     token: process.env.NUXT_GITHUB_TOKEN,
    //     prefix: '/posts', // Prefix for routes used to query contents
    //     repo: 'parz1/posts',
    //     branch: 'main',
    //     dir: 'posts',
    //   },
    // },
  },
  css: ['~/assets/css/main.scss'],
  ui: {
    icons: ['carbon'],
  },
  runtimeConfig: {
    githubToken: process.env.NUXT_GITHUB_TOKEN,
  },
  devtools: {
    enabled: true,
  },
})
