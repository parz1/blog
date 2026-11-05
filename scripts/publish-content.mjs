import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { parseArgs } from 'node:util'
import { join, resolve } from 'node:path'
import { contentWorkspaceRoot } from '../lib/blog-content.mjs'
import { compileRelease } from '../lib/folio-compiler.mjs'
import {
  publishContent,
  defaultDeliveryOrigin,
} from '../lib/content-publishing.mjs'

const run = promisify(execFile)
async function loadToken(root) {
  if (process.env.CONTENT_OWNER_TOKEN) return process.env.CONTENT_OWNER_TOKEN
  if (process.platform !== 'win32')
    throw new Error('Set CONTENT_OWNER_TOKEN in the publishing shell.')
  // Child process only: no token in command arguments or persistent shell env.
  const script =
    "$s = Get-Content -LiteralPath $env:FOLIO_CREDENTIAL_FILE -ErrorAction Stop | ConvertTo-SecureString; [Console]::Write([System.Net.NetworkCredential]::new('', $s).Password)"
  try {
    const { stdout } = await run(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      {
        env: {
          ...process.env,
          FOLIO_CREDENTIAL_FILE: join(
            root,
            '.local/credentials/delivery-owner.dpapi',
          ),
        },
        timeout: 10000,
        windowsHide: true,
        maxBuffer: 8192,
      },
    )
    return stdout.trim()
  } catch {
    throw new Error(
      'Cannot load the local publishing credential. Use the original Windows account or configure CONTENT_OWNER_TOKEN.',
    )
  }
}

try {
  const { values } = parseArgs({
    options: {
      workspace: { type: 'string' },
      origin: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  })
  const result = await publishContent({
    root: values.workspace ? resolve(values.workspace) : contentWorkspaceRoot(),
    origin:
      values.origin || process.env.CONTENT_SERVICE_URL || defaultDeliveryOrigin,
    dryRun: values['dry-run'],
    compile: compileRelease,
    loadToken,
  })
  console.log(JSON.stringify(result, null, 2))
  console.log(
    values['dry-run']
      ? 'Validated locally. No credentials loaded or content uploaded.'
      : 'Published. The blog normally refreshes within 15–40 seconds; no rebuild needed.',
  )
} catch (error) {
  // Never print native errors that could contain provider URLs or credentials.
  const safe =
    /^(Folio |Cannot |Invalid |Missing |Release |Publish |Set CONTENT_OWNER_TOKEN|Unsupported |Content |Drafts|Invalid or empty)/.test(
      error.message,
    )
  console.error(
    safe
      ? error.message
      : 'Content validation or preparation failed; check Markdown/frontmatter and retry with --dry-run. No automatic publication retry.',
  )
  process.exitCode = 1
}
