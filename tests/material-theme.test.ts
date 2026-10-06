import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { compileStyle, parse } from '@vue/compiler-sfc'

test('Vue keeps every dark-theme rule inside the material lab', () => {
  const source = readFileSync(
    new URL(
      '../components/Demo/Materials/MaterialLab.client.vue',
      import.meta.url,
    ),
    'utf8',
  )
  const { descriptor } = parse(source)
  const compiled = compileStyle({
    source: descriptor.styles[0]!.content,
    filename: 'MaterialLab.client.vue',
    id: 'data-v-material-test',
    scoped: true,
  })
  assert.deepEqual(compiled.errors, [])
  // A misplaced :global() can silently compile an entire selector to just .dark.
  const darkRules = [...compiled.code.matchAll(/(?:^|\})\s*(\.dark[^{]*)\{/g)]
  assert.ok(darkRules.length > 0)
  for (const match of darkRules) {
    for (const selector of match[1]!.split(',')) {
      assert.match(selector.trim(), /^\.dark \.material-lab(?:\s|$)/)
    }
  }
})
