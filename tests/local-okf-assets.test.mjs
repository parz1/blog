import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, symlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { localOkfAsset, localAssetRange } from '../lib/local-okf-assets.mjs'
test('local OKF assets serve only known media within the workspace', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'okf-assets-'))
  await mkdir(path.join(root, 'content/assets'), { recursive: true })
  await writeFile(path.join(root, 'content/assets/photo.jpg'), 'fixture')
  assert.equal((await localOkfAsset(root, 'photo.jpg')).type, 'image/jpeg')
  const outside = await mkdtemp(path.join(os.tmpdir(), 'okf-outside-'))
  await writeFile(path.join(outside, 'private.jpg'), 'outside')
  await symlink(outside, path.join(root, 'content/assets/escape'), 'junction')
  await assert.rejects(localOkfAsset(root, 'escape/private.jpg'), /outside/)
  for (const name of [
    '../photo.jpg',
    '/photo.jpg',
    '%2e%2e/photo.jpg',
    'test.svg',
    'x\\photo.jpg',
  ])
    await assert.rejects(localOkfAsset(root, name))
  assert.deepEqual(localAssetRange('bytes=0-99', 1000), {
    start: 0,
    end: 99,
    partial: true,
  })
  assert.deepEqual(localAssetRange('bytes=-100', 1000), {
    start: 900,
    end: 999,
    partial: true,
  })
  assert.throws(() => localAssetRange('bytes=1000-', 1000))
  assert.throws(() => localAssetRange('bytes=0-1,4-5', 1000))
})
