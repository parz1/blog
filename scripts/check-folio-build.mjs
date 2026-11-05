import { spawnSync } from 'node:child_process'
if (process.env.VERCEL || process.env.NITRO_PRESET === 'vercel') {
  const env = { ...process.env, NUXT_FOLIO_ORIGIN: '' }
  for (const key of [
    'FOLIO_CACHE_DATABASE_URL',
    'POSTGRES_URL',
    'DATABASE_URL',
    'KV_REST_API_URL',
    'KV_REST_API_TOKEN',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
  ])
    delete env[key]
  // The fallback must also survive an invalid optional cache configuration.
  env.FOLIO_CACHE_DATABASE_URL = 'invalid-cache-url'
  const script = `
    import {createServer} from 'node:http';
    import handler from './.vercel/output/functions/__fallback.func/index.mjs';
    const server=createServer(handler);server.listen(0,'127.0.0.1',async()=>{
      try{const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/folio/snapshot');const data=await r.json();if(r.status!==200||!/^[a-f0-9]{64}$/.test(data.id)||!data.collections?.articles?.length)throw Error();console.log('Verified bundled fallback without Folio, Redis or Postgres access.')}
      catch{console.error('Build rejected: runtime fallback is unavailable.');process.exitCode=1}
      finally{server.closeAllConnections();server.close()}
    });
  `
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script],
    { env, stdio: 'inherit', timeout: 15000 },
  )
  process.exitCode = result.status ?? 1
}
