import { resolve } from 'path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/devtools', '@nuxtjs/device', '@nuxt/ui'],
  app: {
    head: {
      title: 'Ivor Zhou',
    },
  },
  content: {
    markdown: {
      anchorLinks: true,
    },
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
    sources: {
      github: {
        driver: 'github', // Driver used to fetch contents (view unstorage documentation)
        token: process.env.NUXT_GITHUB_TOKEN,
        prefix: '/posts', // Prefix for routes used to query contents
        repo: 'parz1/posts',
        branch: 'main',
        dir: 'posts',
      },
    },
  },
  css: ['@/assets/css/main.css'],
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
