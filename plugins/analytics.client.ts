import { inject } from '@vercel/analytics'

export default defineNuxtPlugin(() => {
  if (import.meta.dev) return
  const config = useRuntimeConfig().public
  if (config.analyticsProvider === 'cloudflare') {
    const token = config.cloudflareAnalyticsToken
    if (!token) return
    useHead({
      script: [
        {
          key: 'cloudflare-web-analytics',
          src: 'https://static.cloudflareinsights.com/beacon.min.js',
          defer: true,
          'data-cf-beacon': JSON.stringify({ token }),
        },
      ],
    })
  } else if (config.analyticsProvider === 'vercel') {
    inject()
  }
})
