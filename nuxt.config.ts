// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/devtools', '@nuxtjs/device', '@nuxt/ui', '@nuxtjs/i18n'],

  colorMode: {
    preference: 'system', // default theme
    fallback: 'light', // fallback theme if system preference can't be detected
    classSuffix: '',
    storageKey: 'nuxt-color-mode'
  },

  app: {
    // pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        // 无需 user-scalable=no —— 影响可访问性，不建议关缩放
      ],
      titleTemplate: 'parz1 ZHOU',
    },
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
    bundle: {
      optimizeTranslationDirective: false,
    },
  },

  content: {
    database: {
      type: 'postgres',
      url: process.env.POSTGRES_URL || '',
      /* Other options for `pg` */
    },
    preview: {
      api: 'https://api.nuxt.studio',
      // dev: true,
    },
    build: {
      markdown: {
        remarkPlugins: {
          'remark-math': {},
          'remark-emoji': {},
        },
        rehypePlugins: {
          'rehype-katex': { output: 'html' },
        },
        highlight: {
          theme: 'github-dark',
          langs: ['zsh', 'c', 'cpp', 'rust', 'vue', 'ts', 'js', 'json', 'python', 'asm', 'md'],
        },
        toc: {
          depth: 3,
          searchDepth: 2,
        },
      },
    },
    renderer: {
      anchorLinks: true,
    },
    // TODO: check if this is needed
    // navigation: {
    //   fields: ['title', 'description', 'published', 'slug', 'tags'],
    // },

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

  css: ['~/assets/css/main.css', '~/assets/css/line-numbers.css'],

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

  compatibilityDate: '2024-12-05',
})
