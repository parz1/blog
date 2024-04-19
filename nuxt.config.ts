// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/devtools', '@nuxtjs/device', '@nuxt/ui', '@nuxtjs/i18n'],
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

  i18n: {
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root', // recommended
    },

    locales: [
      {
        code: 'en',
        name: 'English',
      },
      {
        code: 'zh-CN',
        name: '简体中文',
      },
      {
        code: 'ja',
        name: '日本語',
      },
    ],
  },
  content: {
    markdown: {
      anchorLinks: true,
      remarkPlugins: ['remark-math'],
      rehypePlugins: [['rehype-katex', { output: 'html' }]],
    },
    highlight: {
      theme: 'github-dark',
      langs: ['zsh', 'c', 'cpp', 'rust', 'vue', 'ts', 'js', 'python'],
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
