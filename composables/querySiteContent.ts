import type { Collections } from '@nuxt/content'
import { createFolioQuery } from '~/utils/folioQuery'
import { toHast } from 'minimark/hast'

export function querySiteContent<K extends keyof Collections>(name: K) {
  if (import.meta.dev && !useRuntimeConfig().public.folioRuntime)
    return queryCollection(name)
  const app = useNuxtApp()
  return createFolioQuery(name, () => app.$folioSnapshot())
}
export async function querySiteContentSearchSections(name: keyof Collections) {
  if (import.meta.dev && !useRuntimeConfig().public.folioRuntime)
    return queryCollectionSearchSections(name)
  const docs = await querySiteContent(name).all()
  const text = (node: {
    tag?: string
    value?: string
    children?: unknown[]
  }): string =>
    ['script', 'style'].includes(node.tag || '')
      ? ''
      : (node.value || '') +
        (node.children || [])
          .map((child) => text(child as typeof node))
          .join(' ')
  return docs.flatMap((doc) => {
    const sections = [
      {
        id: doc.path,
        title: doc.title || '',
        titles: [] as string[],
        level: 1,
        content: doc.description || '',
      },
    ]
    for (const node of toHast(doc.body).children || []) {
      if (/^h[1-6]$/.test(node.tag || '') && node.props?.id)
        sections.push({
          id: `${doc.path}#${node.props.id}`,
          title: text(node),
          titles: [doc.title || ''],
          level: Number(node.tag![1]),
          content: '',
        })
      else sections.at(-1)!.content += ' ' + text(node)
    }
    return sections
  })
}
