import {
  createMarkdownParser,
  createShikiHighlighter,
  rehypeHighlight,
} from '@nuxtjs/mdc/runtime'
import { bundledLanguages, bundledThemes } from 'shiki'
import remarkMath from 'remark-math'
import remarkEmoji from 'remark-emoji'
import rehypeKatex from 'rehype-katex'
import { fromHast, toHast } from 'minimark/hast'
import { rubyHook } from '../utils/rubyHook.ts'
import { contentSchemas } from './content-schema.ts'
import { validateContentRelease, publicMetadata } from './blog-content.mjs'

export const rendererContract = 'folio-nuxt-1'
export const collectionNames = Object.keys(contentSchemas)
let parser
function getParser() {
  return (parser ||= createMarkdownParser({
    toc: { depth: 2, searchDepth: 2 },
    highlight: {},
    remark: {
      plugins: {
        'remark-math': { instance: remarkMath },
        'remark-emoji': { instance: remarkEmoji },
      },
    },
    rehype: {
      plugins: {
        'rehype-katex': { instance: rehypeKatex, options: { output: 'html' } },
        highlight: {
          instance: rehypeHighlight,
          options: {
            highlighter: createShikiHighlighter({
              bundledLangs: bundledLanguages,
              bundledThemes,
            }),
            theme: {
              default: 'github-light',
              light: 'github-light',
              dark: 'github-dark-high-contrast',
            },
          },
        },
      },
    },
  }))
}
function collectionFor(path) {
  if (!path.includes('/')) return 'pages'
  if (path.startsWith('blog/articles/')) return 'articles'
  if (path.startsWith('blog/columns/')) return 'columns'
  return path.split('/')[0]
}
const textOf = (node) =>
  typeof node === 'string'
    ? node
    : ['style', 'script'].includes(node?.tag)
      ? ''
      : (node?.value || '') + (node?.children || []).map(textOf).join(' ')
export function searchSections(doc) {
  const sections = [
    {
      id: doc.path,
      title: doc.title,
      titles: [],
      level: 1,
      content: doc.description || doc.summary || '',
    },
  ]
  for (const node of toHast(doc.body).children || []) {
    if (/^h[1-6]$/.test(node.tag) && node.props?.id)
      sections.push({
        id: `${doc.path}#${node.props.id}`,
        title: textOf(node),
        titles: [doc.title],
        level: Number(node.tag[1]),
        content: '',
      })
    else sections.at(-1).content += ' ' + textOf(node)
  }
  return sections
}
function checkAst(node) {
  if (!node || typeof node !== 'object') return
  if (
    ['script', 'iframe', 'object', 'embed', 'link', 'meta', 'base'].includes(
      node.tag,
    )
  )
    throw new Error('Unsupported active content')
  for (const [key, value] of Object.entries(node.props || {})) {
    if (key.startsWith(':')) JSON.parse(value)

    if (
      /^on|^v-|^@/.test(key) ||
      (['href', 'src', 'xlink:href'].includes(key) &&
        /^(?:javascript|vbscript|data):/i.test(String(value).trim()))
    )
      throw new Error('Unsupported active attributes: ' + node.tag + '/' + key)
  }
  for (const child of node.children || []) checkAst(child)
}
export async function compileRelease(release, previous) {
  validateContentRelease(release)
  const collections = Object.fromEntries(
    collectionNames.map((name) => [name, []]),
  )
  const reusable = new Map(
    Object.values(
      previous?.contract === rendererContract ? previous.collections : {},
    )
      .flat()
      .map((doc) => [doc.id, doc]),
  )
  const parse = await getParser()
  const identities = new Set()
  for (const entry of release.entries) {
    const collection = collectionFor(entry.path)
    if (!contentSchemas[collection]) throw new Error('Unsupported collection')
    const metadata = contentSchemas[collection].parse(
      publicMetadata(entry.markdown),
    )
    if (metadata.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.slug))
      throw new Error('Unsafe slug')
    const identity = `${collection}:${metadata.slug || entry.path}:${metadata.lang || 'cn'}`
    if (identities.has(identity)) throw new Error('Duplicate localized slug')
    identities.add(identity)
    const id = `${collection}/${entry.path}:${entry.sha256}`
    const cached = reusable.get(id)
    if (cached) {
      collections[collection].push(cached)
      continue
    }
    const file = { id: entry.path, body: entry.markdown }
    rubyHook(file)
    const parsed = await parse(file.body)
    checkAst(parsed.body)
    const stem = entry.path.slice(0, -3)
    const doc = {
      ...metadata,
      id,
      path: '/' + stem,
      stem,
      extension: 'md',
      body: { ...fromHast(parsed.body), toc: parsed.toc },
      description: metadata.description || parsed.data.description || '',
    }
    collections[collection].push(doc)
  }
  const result = { contract: rendererContract, id: release.id, collections }
  if (Buffer.byteLength(JSON.stringify(result)) > 3_000_000)
    throw new Error('Compiled release too large')
  return result
}
