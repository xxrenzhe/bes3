#!/usr/bin/env tsx

import { rerunSyndication } from '../src/lib/seo-ops'

async function main() {
  const result = await rerunSyndication()
  console.log('[seo:syndicate]', result)
}

main().catch((error) => {
  console.error('[seo:syndicate] failed', error)
  process.exit(1)
})
