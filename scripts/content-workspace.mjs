import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { resolve } from 'node:path'
import {
  initializeWorkspace,
  inspectWorkspace,
  checkpoint,
} from '../lib/content-workspace.mjs'

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    workspace: { type: 'string' },
    source: { type: 'string' },
    summary: { type: 'string' },
  },
})
try {
  if (!values.workspace)
    throw new Error(
      'Use --workspace ABSOLUTE_PATH. Commands: init, status, checkpoint.',
    )
  const workspace = resolve(values.workspace)
  if (positionals[0] === 'init') {
    if (!values.source) throw new Error('init requires --source MARKDOWN_PATH.')
    await initializeWorkspace(
      workspace,
      await readFile(resolve(values.source), 'utf8'),
    )
  } else if (positionals[0] === 'checkpoint') {
    const state = await inspectWorkspace(workspace)
    await checkpoint(workspace, {
      expectedHead: state.headRevisionId,
      expectedWorkingDigest: state.workingDigest,
      summary: values.summary,
      actorId: 'agent',
      origin: 'agent',
    })
  } else if (positionals[0] !== 'status')
    throw new Error('Unknown command. Use init, status or checkpoint.')
  const state = await inspectWorkspace(workspace)
  console.log(
    JSON.stringify(
      {
        workspace,
        headRevisionId: state.headRevisionId,
        revisions: state.revisions.length,
        threads: state.threads.length,
        dirty: state.dirty,
        sourcePath: state.sourcePath,
      },
      null,
      2,
    ),
  )
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
