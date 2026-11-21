param(
  [switch]$Execute,
  [string]$BackupDirectory = (Join-Path (Split-Path -Parent $PSScriptRoot) '.local/payload-cutover')
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$state = Get-Content -LiteralPath (Join-Path $BackupDirectory 'rollback.json') -Raw | ConvertFrom-Json
if ($state.projectId -ne 'prj_L5fWIlbP7X9US9GXNaPv2TrvmSwh' -or $state.deploymentId -notmatch '^dpl_[A-Za-z0-9]+$') {
  throw 'Invalid rollback target.'
}
Write-Output "Rollback target: $($state.deploymentId) (blog-osvo, GoderStudio)"
if (-not $Execute) {
  Write-Output 'Dry run. Add -Execute to restore the previous deployment and its three content settings.'
  return
}

& pnpm dlx vercel@65.16.0 rollback $state.deploymentId --cwd $projectRoot --scope goder-studio --yes
if ($LASTEXITCODE -ne 0) { throw 'Deployment rollback failed; no configuration was changed.' }
foreach ($key in @('NUXT_FOLIO_ORIGIN', 'BLOG_CONTENT_RELEASE_URL', 'BLOG_CONTENT_RELEASE_SHA256')) {
  $value = $state.environment.$key
  if (-not $value) { throw "Missing backup setting: $key" }
  & pnpm dlx vercel@65.16.0 env update $key --project $state.projectId --environment production --value $value --type config --scope goder-studio --yes
  if ($LASTEXITCODE -ne 0) { throw "Old deployment restored; manually restore project setting $key." }
}
Write-Output 'Previous deployment and content configuration restored. Verify the domain, sitemap and old Folio source.'
