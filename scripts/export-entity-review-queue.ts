import './load-env'
import { bootstrapApplication } from '@/lib/bootstrap'
import { getDatabase } from '@/lib/db'
import { buildProductEntityExtractionPrompt } from '@/lib/hardcore-prompts'
import type { ProductIdentityCandidate } from '@/lib/entity-resolution'

interface ReviewVideoRow {
  id: number
  youtube_id: string
  title: string
  transcript: string | null
  description: string | null
  entity_match_json: string | null
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

function parseMatch(value: string | null) {
  if (!value) return null
  try {
    return JSON.parse(value) as { productId?: number | null; confidence?: number | null; reason?: string | null }
  } catch {
    return null
  }
}

async function main() {
  await bootstrapApplication()
  const db = await getDatabase()
  const limit = readNumberFlag('limit', 50)
  const includePrompts = hasFlag('include-prompts')
  const minConfidence = Number(process.argv.find((item) => item.startsWith('--min-confidence='))?.slice('--min-confidence='.length) || 0.9)
  const products = await db.query<ProductIdentityCandidate>(
    `
      SELECT id, brand, product_name AS productName, COALESCE(asin, '') AS asin
      FROM products
      WHERE slug IS NOT NULL
      ORDER BY updated_at DESC, id DESC
    `
  )
  const videos = await db.query<ReviewVideoRow>(
    `
      SELECT id, youtube_id, title, transcript, description, entity_match_json
      FROM review_videos
      WHERE processed_status IN ('success', 'pending')
      ORDER BY COALESCE(updated_at, created_at) DESC, id DESC
      LIMIT ?
    `,
    [limit]
  )

  const queue = videos
    .map((video) => {
      const match = parseMatch(video.entity_match_json)
      const transcriptIntro = video.transcript?.slice(0, 1800) || null
      const needsReview = !match?.productId || Number(match.confidence || 0) < minConfidence
      return {
        videoId: video.id,
        youtubeId: video.youtube_id,
        title: video.title,
        currentMatch: match,
        reason: match?.reason || 'No stored high-confidence entity match.',
        transcriptIntro,
        prompt: includePrompts
          ? buildProductEntityExtractionPrompt({
              products,
              title: video.title,
              transcriptIntro,
              description: video.description
            })
          : undefined
      }
    })
    .filter((item) => item.currentMatch == null || !item.currentMatch.productId || Number(item.currentMatch.confidence || 0) < minConfidence)

  console.log(JSON.stringify({
    minConfidence,
    scanned: videos.length,
    queued: queue.length,
    queue
  }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
