import { rubyHook } from './utils/rubyHook'
import { withLifecycleStatus } from './utils/contentLifecycle.mjs'
import { fileURLToPath } from 'node:url'

const cloudflarePreview =
  process.env.BLOG_DEPLOY_TARGET === 'cloudflare-preview'

// Nuxt Content's development checksum does not include `content:file:*` hooks.
// Version this marker path when syntax hooks change so previously parsed
// documents cannot leave stale wiki links in the development cache.
const contentSyntaxCacheMarker = new URL(
  './utils/contentSyntaxV2.mjs',
  import.meta.url,
).href
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/content',
    '@nuxt/devtools',
    '@nuxtjs/device',
    '@nuxt/ui',
    '@nuxtjs/i18n',
  ],

  ui: {
    fonts: false,
  },

  vite: {
    worker: {
      format: 'es',
    },
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
        'three',
        'three/addons/capabilities/WebGL.js',
        'three/addons/controls/OrbitControls.js',
        'three/addons/loaders/GLTFLoader.js',
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
    baseUrl: 'https://parz1.minerei.dev',
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
          [contentSyntaxCacheMarker]: {
            src: '~/utils/contentSyntaxV2.mjs',
            options: {},
          },
          'remark-math': {},
          'remark-emoji': {},
          'remark-gfm': {},
        },
        rehypePlugins: {
          'rehype-katex': { output: 'html' },
        },
        highlight: {
          theme: {
            default: 'github-light',
            light: 'github-light',
            dark: 'github-dark-high-contrast',
          },
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
    'components:extend'(components) {
      // Runtime releases may use MDC components absent from the build snapshot.
      for (const component of components) {
        if (/[/\\]components[/\\]content[/\\]/i.test(component.filePath))
          component.global = true
      }
    },
    'content:file:beforeParse'({ file }) {
      rubyHook(file)
    },
    'content:file:afterParse'({ content }) {
      Object.assign(content, withLifecycleStatus(content))
    },
  },

  css: [
    'katex/dist/katex.min.css',
    '~/assets/css/main.css',
    '~/assets/css/line-numbers.css',
    'maplibre-gl/dist/maplibre-gl.css',
  ],

  runtimeConfig: {
    folioOrigin: '',
    githubToken: cloudflarePreview
      ? ''
      : process.env.NUXT_GITHUB_TOKEN || process.env.GITHUB_TOKEN,
    public: {
      folioRuntime: Boolean(process.env.NUXT_FOLIO_ORIGIN),
      analyticsProvider: cloudflarePreview ? 'cloudflare' : 'vercel',
      cloudflareAnalyticsToken: '',
    },
  },

  devtools: {
    enabled: true,
  },

  nitro: {
    serverAssets: [
      {
        baseName: 'folio',
        dir: fileURLToPath(new URL('./.local/folio-runtime', import.meta.url)),
      },
    ],
    ...(cloudflarePreview
      ? {
          preset: 'cloudflare-module',
          cloudflare: { nodeCompat: true, deployConfig: false },
          ignore: [
            '**/__local/**',
            '**/localContentWorkspace.*',
          ],
          routeRules: {
            '/**': { headers: { 'X-Robots-Tag': 'noindex, nofollow' } },
          },
        }
      : {}),
    prerender: {
      crawlLinks: false,
      ignore: cloudflarePreview ? [] : ['/', '/zh-CN', '/ja', '/sitemap.xml'],
      routes: cloudflarePreview
        ? [
            '/',
            '/zh-CN',
            '/ja',
            '/sitemap.xml',
            ...JSON.parse(process.env.BLOG_PREVIEW_PRERENDER_ROUTES || '[]'),
          ]
        : [],
    },
  },

  compatibilityDate: '2024-12-05',
})
