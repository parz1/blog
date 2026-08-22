// utils/rubyHook.ts
const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const toConceptSlug = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, '-')

const toArticleSlug = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, '-')

export function rubyHook(file: { id: string; body: string }) {
  if (!file.id.endsWith('.md')) return
  const vault: string[] = []
  const stash = (m: string) => {
    const key = `__CODE_BLOCK_${vault.length}__`
    vault.push(m)
    return key
  }

  const renderWikilink = (content: string, strong = false) => {
    const [rawTarget, rawLabel] = content.split('|')
    const target = (rawTarget ?? '').trim()
    const articleMatch = target.match(/^(?:blog|article|post|log|crap):(.+)$/)

    if (articleMatch?.[1]) {
      const slug = toArticleSlug(articleMatch[1])
      if (!slug) return

      const label = (rawLabel ?? articleMatch[1]).trim()
      const className = strong
        ? 'article-wikilink article-wikilink--strong'
        : 'article-wikilink'

      return `<a href="/blog/${encodeURIComponent(slug)}" class="${className}">${escapeHtml(label)}</a>`
    }

    const slug = toConceptSlug(target)
    if (!slug) return

    const label = (rawLabel ?? target).trim()
    const className = strong
      ? 'concept-wikilink concept-wikilink--strong'
      : 'concept-wikilink'

    return `<a href="/concepts/${encodeURIComponent(slug)}" class="${className}">${escapeHtml(label)}</a>`
  }

  // 1) 保护 “恰好三个反引号”的代码块：```lang\n ... \n```（不匹配 ````）
  //    - 支持可选语言标记、可选行尾空格、Win/Unix 换行
  const tripleFence =
    /(^|\r?\n)```[^\r\n]*\r?\n[\s\S]*?\r?\n```(?=\s*(\r?\n|$))/g
  file.body = file.body.replace(tripleFence, stash)

  // 2) 正文替换：支持 \{…|…} 转义
  file.body = file.body.replace(/\\?\{(.*?)\s*\|\s*(.*?)}/g, (m, p1, p2) => {
    if (m.startsWith('\\')) return m.slice(1)
    return `<ruby>${p1}<rt>${p2}</rt></ruby>`
  })

  file.body = file.body.replace(
    /(\*\*|__)\[\[([^\]\n]+)\]\]\1/g,
    (match, _marker: string, content: string) =>
      renderWikilink(content, true) ?? match,
  )

  file.body = file.body.replace(
    /\\?\[\[([^\]\n]+)\]\]/g,
    (match, content: string) => {
      if (match.startsWith('\\')) return match.slice(1)
      return renderWikilink(content) ?? match
    },
  )

  // 3) 还原代码块
  file.body = file.body.replace(
    /__CODE_BLOCK_(\d+)__/g,
    (_m, i) => vault[+i] ?? '',
  )
}
