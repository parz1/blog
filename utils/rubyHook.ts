// utils/rubyHook.ts
export function rubyHook(file: { id: string; body: string }) {
  if (!file.id.endsWith('.md')) return
  const vault: string[] = []
  const stash = (m: string) => {
    const key = `__CODE_BLOCK_${vault.length}__`
    vault.push(m)
    return key
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

  // 3) 还原代码块
  file.body = file.body.replace(
    /__CODE_BLOCK_(\d+)__/g,
    (_m, i) => vault[+i] ?? '',
  )
  console.log('[rubyHook] stashed blocks =', vault.length)
}
