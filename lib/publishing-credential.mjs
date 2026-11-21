import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'

const runPowerShell = promisify(execFile)
export async function loadPublishingToken(
  root,
  { env = process.env, platform = process.platform, run = runPowerShell } = {},
) {
  if (env.CONTENT_OWNER_TOKEN) return env.CONTENT_OWNER_TOKEN
  if (platform !== 'win32')
    throw new Error('Set CONTENT_OWNER_TOKEN in the publishing shell.')
  const childEnv = {
    ...env,
    FOLIO_CREDENTIAL_FILE: join(
      root,
      '.local/credentials/delivery-owner.dpapi',
    ),
  }
  // pwsh 7's inherited module path can break Windows PowerShell 5 autoloading.
  // Let the child reconstruct its own defaults; never change the parent shell.
  for (const key of Object.keys(childEnv))
    if (key.toLowerCase() === 'psmodulepath') delete childEnv[key]
  const script =
    "$ErrorActionPreference='Stop'; $s=Get-Content -LiteralPath $env:FOLIO_CREDENTIAL_FILE | ConvertTo-SecureString; [Console]::Write([System.Net.NetworkCredential]::new('', $s).Password)"
  try {
    const { stdout } = await run(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      {
        env: childEnv,
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
