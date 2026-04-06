#!/usr/bin/env tsx

import { getDatabase } from '../src/lib/db'
import { buildSeoPagePersistencePayload } from '../src/lib/seo-page-payload'

async function main() {
  const db = await getDatabase()
  const rows = await db.query<{
    id: number
    page_type: string
    pathname: string
    title: string
    meta_description: string
    canonical_url: string | null
    open_graph_json: string | null
    schema_json: string | null
    status: string
    article_seo_title: string | null
    article_seo_description: string | null
    article_schema_json: string | null
    hero_image_url: string | null
  }>(
    `
      SELECT sp.id,
        sp.page_type,
        sp.pathname,
        sp.title,
        sp.meta_description,
        sp.canonical_url,
        sp.open_graph_json,
        sp.schema_json,
        sp.status,
        a.seo_title AS article_seo_title,
        a.seo_description AS article_seo_description,
        a.schema_json AS article_schema_json,
        a.hero_image_url
      FROM seo_pages sp
      LEFT JOIN articles a ON a.id = sp.article_id
      ORDER BY sp.id ASC
    `
  )

  let updatedCount = 0

  for (const row of rows) {
    const payload = buildSeoPagePersistencePayload({
      pageType: row.page_type,
      pathname: row.pathname,
      title: row.article_seo_title || row.title,
      description: row.article_seo_description || row.meta_description,
      image: row.hero_image_url,
      schemaJson: row.article_schema_json || row.schema_json
    })

    const needsUpdate =
      row.title !== payload.title ||
      row.meta_description !== payload.metaDescription ||
      row.canonical_url !== payload.canonicalUrl ||
      row.open_graph_json !== payload.openGraphJson ||
      (row.schema_json || null) !== payload.schemaJson

    if (!needsUpdate) continue

    await db.exec(
      `
        UPDATE seo_pages
        SET title = ?,
            meta_description = ?,
            canonical_url = ?,
            open_graph_json = ?,
            schema_json = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [payload.title, payload.metaDescription, payload.canonicalUrl, payload.openGraphJson, payload.schemaJson, row.id]
    )
    updatedCount += 1
  }

  console.log('[seo:repair-pages]', {
    scanned: rows.length,
    updated: updatedCount
  })
}

main().catch((error) => {
  console.error('[seo:repair-pages] failed', error)
  process.exit(1)
})
