import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { getDatabase } from '@/lib/db'
import {
  extractAsins,
  matchVideoEntity,
  resolveAmazonAsinsFromDescription,
  type ProductIdentityCandidate
} from '@/lib/entity-resolution'

interface ReviewVideoRow {
  id: number
  youtube_id: string
  title: string
  transcript: string | null
  description: string | null
}

interface ProductIdentityRow extends ProductIdentityCandidate {
  product_name?: string | null
}

function readNumberFlag(name: string, fallback: number) {
  const prefix = `--${name}=`
  const raw = process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length)
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

async function main() {
  await bootstrapApplication()
  const db = await getDatabase()
  const limit = readNumberFlag('limit', 50)
  const dryRun = hasFlag('dry-run')
  const resolveRedirects = hasFlag('resolve-redirects')
  const productRows = await db.query<ProductIdentityRow>(
    `
      SELECT id, brand, product_name, product_name AS productName, COALESCE(asin, '') AS asin
      FROM products
      WHERE slug IS NOT NULL
      ORDER BY updated_at DESC, id DESC
    `
  )
  const products = productRows.map((product) => ({
    id: product.id,
    brand: product.brand,
    productName: product.productName || product.product_name || '',
    asin: product.asin
  }))
  const videos = await db.query<ReviewVideoRow>(
    `
      SELECT id, youtube_id, title, transcript, description
      FROM review_videos
      WHERE processed_status IN ('success', 'pending')
      ORDER BY COALESCE(updated_at, created_at) DESC, id DESC
      LIMIT ?
    `,
    [limit]
  )
  const results = []

  for (const video of videos) {
    const transcriptIntro = video.transcript?.slice(0, 1800) || null
    const directAsins = extractAsins([video.title, video.description || '', transcriptIntro || ''].join('\n'))
    const resolvedAsins = resolveRedirects && video.description ? await resolveAmazonAsinsFromDescription(video.description) : directAsins
    const match = matchVideoEntity({
      title: video.title,
      transcriptIntro,
      description: [video.description || '', resolvedAsins.join(' ')].join('\n'),
      products
    })
    const payload = {
      matchedAt: new Date().toISOString(),
      youtubeId: video.youtube_id,
      directAsins,
      resolvedAsins,
      ...match
    }

    if (!dryRun) {
      await db.exec(
        `
          UPDATE review_videos
          SET entity_match_json = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [JSON.stringify(payload), video.id]
      )
    }
    results.push(payload)
  }

  console.log(JSON.stringify({
    dryRun,
    resolveRedirects,
    scanned: videos.length,
    matched: results.filter((result) => result.productId).length,
    results
  }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
