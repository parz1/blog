// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/devtools', '@nuxtjs/device', '@nuxt/ui', '@nuxtjs/i18n'],
  app: {
    // pageTransition: { name: 'page', mode: 'out-in' },
  },
  vue: {
    compilerOptions: {
      isCustomElement: tag => /^(swiper|swiper-slide|swiper-container)$/.test(tag),
    },
  },
  i18n: {
    baseUrl: 'https://parz1.goder.club',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root', // recommended
      cookieCrossOrigin: true,
    },
    lazy: true,
    langDir: 'lang',
    defaultLocale: 'en',
    locales: [
      {
        code: 'en',
        name: 'English',
        iso: 'en-US',
        file: 'en-US.json',
      },
      {
        code: 'zh-CN',
        name: '简体中文',
        iso: 'zh-CN',
        file: 'zh-CN.json',
      },
      {
        code: 'ja',
        name: '日本語',
        iso: 'ja-JP',
        file: 'ja-JP.json',
      },
    ],
  },
  content: {
    navigation: {
      fields: ['title', 'description', 'published', 'slug', 'tags'],
    },
    markdown: {
      anchorLinks: true,
      remarkPlugins: ['remark-math', 'remark-emoji'],
      rehypePlugins: [['rehype-katex', { output: 'html' }]],
    },
    highlight: {
      theme: 'github-dark',
      langs: ['zsh', 'c', 'cpp', 'rust', 'vue', 'ts', 'js', 'json', 'python', 'asm', 'md'],
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
  css: ['~/assets/css/main.scss', '~/assets/css/line-numbers.css'],
  ui: {
    icons: ['carbon'],
  },
  runtimeConfig: {
    githubToken: process.env.NUXT_GITHUB_TOKEN,
  },
  devtools: {
    enabled: true,
  },

  nitro: {
    prerender: {
      routes: ['/', '/sitemap.xml'],
    },
  },
})
