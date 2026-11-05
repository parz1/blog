export default defineEventHandler((event) => {
  if (process.env.BLOG_DEPLOY_TARGET !== 'cloudflare-preview') return
  // Static assets also receive this header through Nitro's generated _headers.
  setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
  if (event.path === '/robots.txt') {
    setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
    return 'User-agent: *\nDisallow: /\n'
  }
})
