import { getDatabase } from '@/lib/db'
import { normalizeMerchantSource } from '@/lib/merchant-links'
import { normalizeNewsletterIntent } from '@/lib/newsletter-intent'
import { slugify } from '@/lib/slug'

export const VALID_NEWSLETTER_CADENCES = new Set(['weekly', 'priority'])

export interface NewsletterSubscriptionInput {
  email: string
  source?: string | null
  intent?: string | null
  cadence?: string | null
  categorySlug?: string | null
  notes?: string | null
}

export interface NewsletterSubscriptionRecord {
  email: string
  source: string
  intent: string
  cadence: string
  categorySlug: string | null
  notes: string | null
}

export function normalizeNewsletterSubscriptionInput(input: NewsletterSubscriptionInput): NewsletterSubscriptionRecord {
  return {
    email: String(input.email || '').trim().toLowerCase(),
    source: normalizeMerchantSource(input.source || 'site'),
    intent: normalizeNewsletterIntent(input.intent),
    cadence: VALID_NEWSLETTER_CADENCES.has(String(input.cadence || '')) ? String(input.cadence) : 'weekly',
    categorySlug: slugify(String(input.categorySlug || '')) || null,
    notes: String(input.notes || '').trim().slice(0, 240) || null
  }
}

export async function upsertNewsletterSubscriber(input: NewsletterSubscriptionInput): Promise<NewsletterSubscriptionRecord> {
  const normalized = normalizeNewsletterSubscriptionInput(input)

  const db = await getDatabase()
  const existing = await db.queryOne<{ id: number }>('SELECT id FROM newsletter_subscribers WHERE email = ? LIMIT 1', [normalized.email])

  if (existing?.id) {
    await db.exec(
      `
        UPDATE newsletter_subscribers
        SET source = ?, intent = ?, category_slug = ?, cadence = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        normalized.source,
        normalized.intent,
        normalized.categorySlug,
        normalized.cadence,
        normalized.notes,
        existing.id
      ]
    )
  } else {
    await db.exec(
      'INSERT INTO newsletter_subscribers (email, source, intent, category_slug, cadence, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [
        normalized.email,
        normalized.source,
        normalized.intent,
        normalized.categorySlug,
        normalized.cadence,
        normalized.notes
      ]
    )
  }

  return normalized
}
