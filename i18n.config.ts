export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      hello: 'hello',
    },
    'zh-CN': {
      hello: '你好',
    },
    ja: {
      hello: 'こんにちは',
    },
  },
}))
