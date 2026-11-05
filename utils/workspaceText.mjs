const normalize = (text) => text.replaceAll('\r\n', '\n')

// Blank-line blocks, keeping fenced code together. This pilot anchors plain prose.
export function splitBlocks(body) {
  const lines = normalize(body).split('\n')
  const blocks = []
  let buffer = []
  let fence = null
  const flush = () => {
    if (buffer.length)
      blocks.push({ markdown: buffer.join('\n'), index: blocks.length })
    buffer = []
  }
  for (const line of lines) {
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1]
    if (marker) {
      if (!fence) fence = marker
      else if (marker[0] === fence[0] && marker.length >= fence.length)
        fence = null
    }
    if (!line.trim() && !fence) flush()
    else buffer.push(line)
  }
  flush()
  return blocks
}

export function locateAnchor(revision, anchor) {
  const candidate = revision.blocks.find((block) => block.id === anchor.blockId)
  const matches = (text) => {
    const positions = []
    for (
      let at = text.indexOf(anchor.exact);
      at !== -1;
      at = text.indexOf(anchor.exact, at + 1)
    )
      positions.push(at)
    return positions
  }
  if (candidate && matches(candidate.markdown).length === 1)
    return { status: 'anchored', blockId: candidate.id }
  const found = revision.blocks.flatMap((block) =>
    matches(block.markdown).flatMap((at) => {
      const prefix = block.markdown.slice(0, at)
      const suffix = block.markdown.slice(at + anchor.exact.length)
      return prefix.endsWith(anchor.prefix) && suffix.startsWith(anchor.suffix)
        ? [block]
        : []
    }),
  )
  return found.length === 1
    ? { status: 'anchored', blockId: found[0].id }
    : { status: found.length ? 'ambiguous' : 'outdated', blockId: null }
}

export function lineDiff(before, after) {
  const a = normalize(before).split('\n')
  const b = normalize(after).split('\n')
  // Bound memory and worst-case work for unexpectedly large Markdown inputs.
  if (a.length * b.length > 1_000_000)
    return [
      ...a.map((text) => ({ kind: 'remove', text })),
      ...b.map((text) => ({ kind: 'add', text })),
    ]
  const table = Array.from(
    { length: a.length + 1 },
    () => new Uint32Array(b.length + 1),
  )
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      table[i][j] =
        a[i] === b[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1])
  const result = []
  let i = 0,
    j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j])
      result.push({ kind: 'same', text: a[i++], before: i, after: ++j })
    else if (
      j < b.length &&
      (i === a.length || table[i][j + 1] > table[i + 1][j])
    )
      result.push({ kind: 'add', text: b[j++], after: j })
    else result.push({ kind: 'remove', text: a[i++], before: i })
  }
  return result
}
