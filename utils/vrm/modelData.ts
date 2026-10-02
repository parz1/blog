export const MAX_VRM_BYTES = 64 * 1024 * 1024

// A local avatar must carry its textures and buffers with it. GLTFLoader would
// otherwise request remote resources named inside the file.
export const assertEmbeddedVrm = (buffer: ArrayBuffer) => {
  if (buffer.byteLength < 20 || buffer.byteLength > MAX_VRM_BYTES) {
    throw new Error('invalidFile')
  }
  const header = new DataView(buffer)
  const jsonLength = header.getUint32(12, true)
  if (
    header.getUint32(0, true) !== 0x46546c67 ||
    header.getUint32(4, true) !== 2 ||
    header.getUint32(8, true) !== buffer.byteLength ||
    header.getUint32(16, true) !== 0x4e4f534a ||
    jsonLength > buffer.byteLength - 20
  ) {
    throw new Error('invalidFile')
  }

  const json: unknown = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)),
  )
  if (!json || typeof json !== 'object' || !('extensions' in json)) {
    throw new Error('invalidFile')
  }
  const extensions = json.extensions
  if (
    !extensions ||
    typeof extensions !== 'object' ||
    !('VRM' in extensions || 'VRMC_vrm' in extensions)
  ) {
    throw new Error('invalidFile')
  }
  const pending: unknown[] = [json]
  while (pending.length) {
    const value = pending.pop()
    if (!value || typeof value !== 'object') continue
    for (const [key, child] of Object.entries(value)) {
      if (
        key === 'uri' &&
        typeof child === 'string' &&
        !child.startsWith('data:')
      ) {
        throw new Error('externalResources')
      }
      if (child && typeof child === 'object') pending.push(child)
    }
  }
}
