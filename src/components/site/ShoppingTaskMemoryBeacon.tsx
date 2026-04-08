'use client'

import { useEffect } from 'react'
import { sanitizeInternalHref } from '@/lib/resume-context'
import { SHOPPING_TASK_MEMORY_KEY, type StoredShoppingTask } from '@/lib/task-memory'

export function ShoppingTaskMemoryBeacon({
  href,
  label,
  description,
  source
}: {
  href: string
  label: string
  description: string
  source?: string
}) {
  useEffect(() => {
    const safeHref = sanitizeInternalHref(href)
    if (!safeHref) return

    const payload: StoredShoppingTask = {
      href: safeHref,
      label: label.trim() || 'Resume this task',
      description: description.trim() || 'Return to the same shopping task instead of reopening broad browsing.',
      source,
      updatedAt: new Date().toISOString()
    }

    try {
      window.localStorage.setItem(SHOPPING_TASK_MEMORY_KEY, JSON.stringify(payload))
    } catch {}
  }, [description, href, label, source])

  return null
}
