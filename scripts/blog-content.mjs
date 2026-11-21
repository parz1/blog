import { parseArgs } from 'node:util'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  importPublishedContent,
  createContentRelease,
  contentWorkspaceRoot,
  prepareContentRelease,
  approveContent,
  sha256,
  writeGeneratedPublication,
  migratePublicationStatus,
} from '../lib/blog-content.mjs'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    workspace: { type: 'string' },
    source: { type: 'string' },
    output: { type: 'string' },
    path: { type: 'string' },
    sha256: { type: 'string' },
  },
})
try {
  const root = values.workspace
    ? resolve(values.workspace)
    : contentWorkspaceRoot()
  const command = positionals[0]
  if (command === 'import') {
    if (!values.source)
      throw new Error('import requires --source CONTENT_DIRECTORY')
    console.log(
      JSON.stringify(
        await importPublishedContent(resolve(values.source), root),
      ),
    )
  } else if (command === 'approve') {
    await approveContent(root, values.path, values.sha256)
    console.log(
      'Reviewed content digest selected. No deployment was triggered.',
    )
  } else if (command === 'migrate-status') {
    console.log(JSON.stringify(await migratePublicationStatus(root)))
  } else if (command === 'release') {
    if (!values.output)
      throw new Error('release requires --output NEW_JSON_FILE')
    const release = await createContentRelease(root)
    const bytes = JSON.stringify(release, null, 2) + '\n'
    await writeFile(resolve(values.output), bytes, { flag: 'wx' })
    await writeGeneratedPublication(root, release)
    console.log(
      JSON.stringify({
        id: release.id,
        sha256: sha256(bytes),
        count: release.entries.length,
      }),
    )
  } else if (command === 'prepare')
    console.log(JSON.stringify(await prepareContentRelease({ root })))
  else
    throw new Error(
      'Commands: import, approve (legacy), migrate-status, release, prepare',
    )
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
