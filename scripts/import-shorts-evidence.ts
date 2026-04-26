import './load-env'
import fs from 'node:fs'
import { bootstrapApplication } from '@/lib/bootstrap'
import { getDatabase } from '@/lib/db'
import { shortsEvidenceSchema, type ShortsEvidenceOutput } from '@/lib/hardcore-prompts'
import { slugify } from '@/lib/slug'

interface ShortsImportRow {
  youtubeId?: string
  youtube_id?: string
  productId?: number | string | null
  productSlug?: string | null
  categorySlug?: string | null
  category?: string | null
  tagSlug?: string | null
  tag?: string | null
  output?: unknown
  verdict_type?: string
  killer_feature?: string | null
  fatal_flaw?: string | null
  vibe_quote?: string
}

function readFlag(name: string) {
  const prefix = `--${name}=`
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length) || ''
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function readRows(filePath: string): ShortsImportRow[] {
  const content = fs.readFileSync(filePath, 'utf8')
  const parsed = JSON.parse(content)
  return Array.isArray(parsed) ? parsed : parsed.rows || parsed.items || []
}

function normalizeOutput(row: ShortsImportRow): ShortsEvidenceOutput {
  return shortsEvidenceSchema.parse(row.output || {
    verdict_type: row.verdict_type,
    killer_feature: row.killer_feature || null,
    fatal_flaw: row.fatal_flaw || null,
    vibe_quote: row.vibe_quote
  })
}

function ratingFromShort(output: ShortsEvidenceOutput) {
  if (output.verdict_type === 'Strong Buy') return output.killer_feature ? 'Excellent' : 'Good'
  if (output.verdict_type === 'Warning/Avoid') return output.fatal_flaw ? 'Fails' : 'Struggles'
  return 'Average'
}

function quoteFromShort(output: ShortsEvidenceOutput) {
  return output.vibe_quote || output.killer_feature || output.fatal_flaw || 'Short-form verdict captured without a longer quote.'
}

async function main() {
  const filePath = readFlag('file')
  const dryRun = hasFlag('dry-run')
  if (!filePath) {
    throw new Error('Usage: npm run hardcore:import-shorts-evidence -- --file=./shorts-evidence.json [--dry-run]')
  }

  await bootstrapApplication()
  const db = await getDatabase()
  const rows = readRows(filePath)
  const imported = []
  const skipped = []

  for (const row of rows) {
    const youtubeId = String(row.youtubeId || row.youtube_id || '').trim()
    const categorySlug = slugify(row.categorySlug || row.category || '')
    const tagSlug = slugify(row.tagSlug || row.tag || '')
    const productId = Number(row.productId || 0)
    const output = normalizeOutput(row)
    const video = youtubeId
      ? await db.queryOne<{ id: number }>('SELECT id FROM review_videos WHERE youtube_id = ? LIMIT 1', [youtubeId])
      : null
    const product = productId > 0
      ? { id: productId }
      : row.productSlug
        ? await db.queryOne<{ id: number }>('SELECT id FROM products WHERE slug = ? LIMIT 1', [row.productSlug])
        : video?.id
          ? await db.queryOne<{ id: number }>(
              `
                SELECT p.id
                FROM products p
                JOIN review_videos rv ON rv.entity_match_json LIKE '%' || '"productId":' || p.id || '%'
                WHERE rv.id = ?
                LIMIT 1
              `,
              [video.id]
            )
          : null
    const tag = categorySlug && tagSlug
      ? await db.queryOne<{ id: number }>(
          'SELECT id FROM taxonomy_tags WHERE category_slug = ? AND slug = ? LIMIT 1',
          [categorySlug, tagSlug]
        )
      : null

    if (!video?.id || !product?.id || !tag?.id) {
      skipped.push({ youtubeId, productId: product?.id || null, tagSlug, reason: 'video_product_or_tag_missing' })
      continue
    }

    const rating = ratingFromShort(output)
    const evidenceQuote = quoteFromShort(output)
    const existing = await db.queryOne<{ id: number }>(
      'SELECT id FROM analysis_reports WHERE product_id = ? AND video_id = ? AND tag_id = ? AND evidence_type = ? LIMIT 1',
      [product.id, video.id, tag.id, 'shorts']
    )

    if (!dryRun) {
      if (existing?.id) {
        await db.exec(
          `
            UPDATE analysis_reports
            SET rating = ?, evidence_quote = ?, context_snippet = ?, evidence_confidence = ?, quality_flags_json = ?
            WHERE id = ?
          `,
          [rating, evidenceQuote, output.vibe_quote, 0.7, JSON.stringify({ shorts: output }), existing.id]
        )
      } else {
        await db.exec(
          `
            INSERT INTO analysis_reports (
              product_id,
              video_id,
              tag_id,
              rating,
              evidence_quote,
              context_snippet,
              evidence_confidence,
              evidence_type,
              is_advertorial,
              quality_flags_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'shorts', 0, ?)
          `,
          [product.id, video.id, tag.id, rating, evidenceQuote, output.vibe_quote, 0.7, JSON.stringify({ shorts: output })]
        )
      }
    }

    imported.push({ youtubeId, productId: product.id, tagId: tag.id, rating, updated: Boolean(existing?.id) })
  }

  console.log(JSON.stringify({
    dryRun,
    imported: imported.length,
    skipped: skipped.length,
    rows: imported,
    skippedRows: skipped
  }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
