import { defineConfig, presetAttributify, presetIcons, presetUno } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons(),
  ],
  theme: {
    colors: {
      primary: '#0066ff',
      success: '#21ba45',
    },
  },
  rules: [
    [/^elva-(\d+)$/, match => ({
      'box-shadow': `0 ${Number(match[1]) / 4}rem ${Number(match[1]) / 2}rem rgba(0, 0, 0, 0.12)`,
    })],
  ],
})
