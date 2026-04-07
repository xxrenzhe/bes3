#!/usr/bin/env tsx

import './load-env'
import { runLinkInspector } from '../src/lib/seo-ops'

async function main() {
  const summary = await runLinkInspector()
  console.log('[seo:inspect-links]', summary)
}

main().catch((error) => {
  console.error('[seo:inspect-links] failed', error)
  process.exit(1)
})
