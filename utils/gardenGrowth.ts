import type { GardenState } from '~/utils/gardenSketch'

// How far along a note is, read from the note itself rather than declared.
//
// A note's `state` is the author's own word and always wins once it says
// anything other than `seed`. But `seed` is also what every note starts as and
// what is left when nobody has come back to set it, so a seed is looked at
// instead: how much has been written in it, how many other notes it is tied
// to, and whether it was tended lately.

const CJK = /[　-鿿＀-￯]/

// The amount of text in a parsed body. A CJK character counts double, since
// one says about as much as two Latin letters.
export const gardenTextWeight = (node: unknown): number => {
  if (typeof node === 'string') {
    let weight = 0

    for (const char of node) if (char.trim()) weight += CJK.test(char) ? 2 : 1

    return weight
  }

  if (Array.isArray(node)) {
    // a minimark element is [tag, props, ...children]: only children are text
    const isElement =
      typeof node[0] === 'string' &&
      typeof node[1] === 'object' &&
      node[1] !== null &&
      !Array.isArray(node[1])

    return (isElement ? node.slice(2) : node).reduce<number>(
      (sum, child) => sum + gardenTextWeight(child),
      0,
    )
  }

  if (node && typeof node === 'object') {
    const { value, children } = node as { value?: unknown; children?: unknown }

    return gardenTextWeight(value ?? children ?? [])
  }

  return 0
}

const DAY = 86_400_000
// tended within this long counts as still moving
const RECENT = 30 * DAY
const WRITTEN_OUT = 4500
const UNDER_WAY = 2400

export const gardenGrowth = (note: {
  state?: string
  // text weight of the body, from gardenTextWeight
  size: number
  // how many links tie it to other notes, in either direction
  ties: number
  updated: string
  now: number
}): GardenState => {
  if (
    note.state === 'growing' ||
    note.state === 'mature' ||
    note.state === 'shifting'
  )
    return note.state

  const tended = new Date(note.updated).getTime()

  if (Number.isFinite(tended) && note.now - tended < RECENT) return 'shifting'
  if (note.size >= WRITTEN_OUT && note.ties >= 3) return 'mature'
  if (note.size >= UNDER_WAY || note.ties >= 4) return 'growing'

  return 'seed'
}
