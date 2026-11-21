import path from 'node:path'
import { realpath, stat } from 'node:fs/promises'
const types = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
}
export async function localOkfAsset(workspace, relative) {
  if (
    typeof relative !== 'string' ||
    !relative ||
    /[\\%?#:]/.test(relative) ||
    [...relative].some((character) => character.charCodeAt(0) < 32) ||
    relative.split('/').some((p) => !p || p === '.' || p === '..')
  )
    throw Error('Invalid asset path')
  const type = types[path.extname(relative).toLowerCase()]
  if (!type) throw Error('Unsupported asset')
  const root = await realpath(path.resolve(workspace, 'content/assets'))
  const file = await realpath(path.resolve(root, ...relative.split('/')))
  if (!file.startsWith(root + path.sep)) throw Error('Asset outside workspace')
  const info = await stat(file)
  if (!info.isFile() || info.size === 0) throw Error('Not a file')
  return { file, type, size: info.size }
}
export function localAssetRange(header, size) {
  if (!header) return { start: 0, end: size - 1, partial: false }
  const match = /^bytes=(\d*)-(\d*)$/.exec(header)
  if (!match || (!match[1] && !match[2])) throw Error('Invalid range')
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, size - Number(match[2]))
  const end =
    match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  )
    throw Error('Invalid range')
  return { start, end, partial: true }
}
