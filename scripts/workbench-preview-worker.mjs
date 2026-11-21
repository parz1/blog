import { previewMarkdown } from '../lib/folio-compiler.mjs'

let queue = Promise.resolve()
process.on('message', (message) => {
  queue = queue
    .then(async () => {
      if (
        !message?.id ||
        typeof message.source !== 'string' ||
        Buffer.byteLength(message.source) > 2_000_000
      )
        return
      try {
        process.send?.({
          id: message.id,
          result: await previewMarkdown(message.source),
        })
      } catch {
        process.send?.({
          id: message.id,
          error: '预览未通过，请检查 Markdown 内容。',
        })
      }
      return null
    })
    .catch(() => {})
})
