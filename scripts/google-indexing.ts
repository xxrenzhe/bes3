#!/usr/bin/env tsx

import './load-env'
import { rerunGoogleIndexing } from '../src/lib/seo-ops'

async function main() {
  const result = await rerunGoogleIndexing()
  console.log('[seo:index]', result)
}

main().catch((error) => {
  console.error('[seo:index] failed', error)
  process.exit(1)
})
