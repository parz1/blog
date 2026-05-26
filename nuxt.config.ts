import { rubyHook } from './utils/rubyHook'
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/content',
    'nuxt-studio',
    '@nuxt/devtools',
    '@nuxtjs/device',
    '@nuxt/ui',
    '@nuxtjs/i18n',
  ],

  ui: {
    fonts: false,
  },

  studio: {
    route: '/_studio',
    repository: {
      provider: 'github',
      owner: 'parz1',
      repo: 'blog',
      branch: process.env.STUDIO_BRANCH_NAME || 'main',
      private: false,
    },
    i18n: {
      defaultLocale: 'zh',
    },
    editor: {
      iconLibraries: ['carbon', 'lucide'],
    },
  },

  vite: {
    optimizeDeps: {
      include: [
        '@deck.gl/layers',
        '@deck.gl/mapbox',
        '@vercel/analytics',
        '@vue-flow/core',
        '@vue/devtools-core',
        '@vue/devtools-kit',
        '@vueuse/core',
        'd3-geo',
        'maplibre-gl',
        'mermaid',
        'vue3-marquee',
      ],
    },
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
      isCustomElement: (tag) =>
        /^(swiper|swiper-slide|swiper-container)$/.test(tag),
    },
  },

  i18n: {
    baseUrl: 'https://parz1.goder.club',
    // strategy: 'no_prefix',
    // detectBrowserLanguage: {
    //   useCookie: true,
    //   cookieKey: 'i18n_redirected',
    //   redirectOn: 'root', // recommended
    //   cookieCrossOrigin: true,
    // },
    // lazy: true,
    defaultLocale: 'en',
    locales: [
      {
        code: 'en',
        name: 'English',
        iso: 'en-US',
        language: 'en-US',
        file: 'en-US.json',
      },
      {
        code: 'zh-CN',
        name: '简体中文',
        iso: 'zh-CN',
        language: 'zh-CN',
        file: 'zh-CN.json',
      },
      {
        code: 'ja',
        name: '日本語',
        iso: 'ja-JP',
        language: 'ja-JP',
        file: 'ja-JP.json',
      },
    ],
    bundle: {
      // optimizeTranslationDirective: false,
    },
  },

  content: {
    build: {
      markdown: {
        remarkPlugins: {
          'remark-math': {},
          'remark-emoji': {},
          'remark-gfm': {},
        },
        rehypePlugins: {
          'rehype-katex': { output: 'html' },
        },
        highlight: {
          theme: 'github-dark-high-contrast',
          langs: [
            'zsh',
            'c',
            'cpp',
            'rust',
            'vue',
            'ts',
            'js',
            'json',
            'python',
            'asm',
            'md',
            'html',
            'css',
            'yaml',
            'markdown',
          ],
        },
        toc: {
          depth: 2,
          searchDepth: 2,
        },
      },
    },
    renderer: {
      anchorLinks: {
        h1: true,
        h2: true,
        h3: true,
      },
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

  hooks: {
    'content:file:beforeParse'({ file }) {
      rubyHook(file)
    },
  },

  css: [
    '~/assets/css/main.css',
    '~/assets/css/line-numbers.css',
    'maplibre-gl/dist/maplibre-gl.css',
  ],

  runtimeConfig: {
    githubToken: process.env.NUXT_GITHUB_TOKEN || process.env.GITHUB_TOKEN,
  },

  devtools: {
    enabled: true,
  },

  nitro: {
    prerender: {
      routes: ['/', '/zh-CN', '/ja', '/sitemap.xml'],
    },
  },

  compatibilityDate: '2024-12-05',
})
