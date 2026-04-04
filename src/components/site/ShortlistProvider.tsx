'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { trackDecisionEvent } from '@/lib/decision-tracking'
import { COMPARE_STORAGE_KEY, MAX_COMPARE_ITEMS, SHORTLIST_STORAGE_KEY, type ShortlistItem } from '@/lib/shortlist'

type ShortlistContextValue = {
  shortlist: ShortlistItem[]
  compare: ShortlistItem[]
  shortlistCount: number
  compareCount: number
  hasHydrated: boolean
  isShortlisted: (productId: number) => boolean
  isCompared: (productId: number) => boolean
  toggleShortlist: (item: ShortlistItem, source?: string) => void
  toggleCompare: (item: ShortlistItem, source?: string) => void
  addManyToShortlist: (items: ShortlistItem[], source?: string) => void
  replaceShortlist: (items: ShortlistItem[], source?: string) => void
  setCompareFromItems: (items: ShortlistItem[], source?: string) => void
  removeShortlist: (productId: number, source?: string) => void
  clearShortlist: () => void
  clearCompare: () => void
}

const ShortlistContext = createContext<ShortlistContextValue | null>(null)

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeItem(raw: any): ShortlistItem | null {
  if (!raw || typeof raw !== 'object') return null
  if (!Number.isInteger(Number(raw.id))) return null
  if (!raw.productName) return null

  return {
    id: Number(raw.id),
    slug: typeof raw.slug === 'string' ? raw.slug : null,
    brand: typeof raw.brand === 'string' ? raw.brand : null,
    productName: String(raw.productName),
    category: typeof raw.category === 'string' ? raw.category : null,
    description: typeof raw.description === 'string' ? raw.description : null,
    heroImageUrl: typeof raw.heroImageUrl === 'string' ? raw.heroImageUrl : null,
    priceAmount: toNullableNumber(raw.priceAmount),
    priceCurrency: typeof raw.priceCurrency === 'string' ? raw.priceCurrency : null,
    rating: toNullableNumber(raw.rating),
    reviewCount: toNullableNumber(raw.reviewCount),
    reviewHighlights: Array.isArray(raw.reviewHighlights)
      ? raw.reviewHighlights.filter((item: unknown): item is string => typeof item === 'string').slice(0, 3)
      : [],
    resolvedUrl: typeof raw.resolvedUrl === 'string' ? raw.resolvedUrl : null,
    publishedAt: typeof raw.publishedAt === 'string' ? raw.publishedAt : null,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null
  }
}

function readStoredList(key: string): ShortlistItem[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const items = parsed.map(normalizeItem).filter(Boolean) as ShortlistItem[]
    return items.filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index)
  } catch {
    return []
  }
}

function writeStoredList(key: string, items: ShortlistItem[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(items))
}

function removeById(items: ShortlistItem[], productId: number) {
  return items.filter((item) => item.id !== productId)
}

function mergeItems(priorityItems: ShortlistItem[], existingItems: ShortlistItem[] = []) {
  const merged = [...priorityItems, ...existingItems]
  return merged.filter((item, index, list) => list.findIndex((candidate) => candidate.id === item.id) === index)
}

export function ShortlistProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [shortlist, setShortlist] = useState<ShortlistItem[]>([])
  const [compare, setCompare] = useState<ShortlistItem[]>([])
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    const storedShortlist = readStoredList(SHORTLIST_STORAGE_KEY)
    const storedCompare = readStoredList(COMPARE_STORAGE_KEY).filter((item) => storedShortlist.some((candidate) => candidate.id === item.id))

    setShortlist(storedShortlist)
    setCompare(storedCompare)
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    if (!hasHydrated) return
    writeStoredList(SHORTLIST_STORAGE_KEY, shortlist)
  }, [hasHydrated, shortlist])

  useEffect(() => {
    if (!hasHydrated) return
    writeStoredList(COMPARE_STORAGE_KEY, compare)
  }, [compare, hasHydrated])

  const isShortlisted = (productId: number) => shortlist.some((item) => item.id === productId)
  const isCompared = (productId: number) => compare.some((item) => item.id === productId)

  const removeShortlist = (productId: number, source: string = 'site') => {
    const removedItem = shortlist.find((item) => item.id === productId)
    const removedFromCompare = compare.some((item) => item.id === productId)

    setShortlist((current) => removeById(current, productId))
    setCompare((current) => removeById(current, productId))

    if (removedItem) {
      trackDecisionEvent({
        eventType: 'shortlist_remove',
        source,
        productId,
        metadata: {
          compareRemoved: removedFromCompare
        }
      })
    }
  }

  const toggleShortlist = (item: ShortlistItem, source: string = 'site') => {
    if (isShortlisted(item.id)) {
      removeShortlist(item.id, source)
      toast.message(`${item.productName} removed from shortlist`)
      return
    }

    setShortlist((current) => [item, ...removeById(current, item.id)])
    trackDecisionEvent({
      eventType: 'shortlist_add',
      source,
      productId: item.id,
      metadata: {
        category: item.category || undefined
      }
    })
    toast.success(`${item.productName} saved to your shortlist`)
  }

  const addManyToShortlist = (items: ShortlistItem[], source: string = 'shared-shortlist-page') => {
    if (!items.length) return
    setShortlist((current) => mergeItems(items, current))
    trackDecisionEvent({
      eventType: 'shared_shortlist_import',
      source,
      metadata: {
        itemCount: items.length
      }
    })
    toast.success(`${items.length} shared ${items.length === 1 ? 'pick' : 'picks'} added to your shortlist`)
  }

  const replaceShortlist = (items: ShortlistItem[], source: string = 'shared-shortlist-page') => {
    const nextShortlist = mergeItems(items, [])
    setShortlist(nextShortlist)
    setCompare((current) => current.filter((item) => nextShortlist.some((candidate) => candidate.id === item.id)).slice(0, MAX_COMPARE_ITEMS))
    trackDecisionEvent({
      eventType: 'shared_shortlist_replace',
      source,
      metadata: {
        itemCount: nextShortlist.length
      }
    })
    toast.success(`Shortlist replaced with ${nextShortlist.length} shared ${nextShortlist.length === 1 ? 'pick' : 'picks'}`)
  }

  const toggleCompare = (item: ShortlistItem, source: string = 'site') => {
    if (isCompared(item.id)) {
      setCompare((current) => removeById(current, item.id))
      trackDecisionEvent({
        eventType: 'compare_remove',
        source,
        productId: item.id
      })
      toast.message(`${item.productName} removed from compare queue`)
      return
    }

    let added = false
    let blocked = false

    setCompare((current) => {
      if (current.length >= MAX_COMPARE_ITEMS) {
        blocked = true
        return current
      }

      added = true
      return [item, ...removeById(current, item.id)]
    })

    if (blocked) {
      toast.error(`Compare queue is capped at ${MAX_COMPARE_ITEMS} products`)
      return
    }

    if (added) {
      setShortlist((current) => [item, ...removeById(current, item.id)])
      trackDecisionEvent({
        eventType: 'compare_add',
        source,
        productId: item.id,
        metadata: {
          category: item.category || undefined
        }
      })
      toast.success(`${item.productName} added to compare queue`)
    }
  }

  const setCompareFromItems = (items: ShortlistItem[], source: string = 'shared-shortlist-page') => {
    const nextCompare = mergeItems(items, []).slice(0, MAX_COMPARE_ITEMS)
    if (!nextCompare.length) return

    setShortlist((current) => mergeItems(nextCompare, current))
    setCompare(nextCompare)
    trackDecisionEvent({
      eventType: 'shared_shortlist_compare_load',
      source,
      metadata: {
        itemCount: nextCompare.length
      }
    })
    toast.success(`${nextCompare.length} ${nextCompare.length === 1 ? 'product' : 'products'} loaded into compare`)
  }

  const clearShortlist = () => {
    setShortlist([])
    setCompare([])
    toast.message('Shortlist cleared')
  }

  const clearCompare = () => {
    setCompare([])
    toast.message('Compare queue cleared')
  }

  return (
    <ShortlistContext.Provider
      value={{
        shortlist,
        compare,
        shortlistCount: shortlist.length,
        compareCount: compare.length,
        hasHydrated,
        isShortlisted,
        isCompared,
        toggleShortlist,
        toggleCompare,
        addManyToShortlist,
        replaceShortlist,
        setCompareFromItems,
        removeShortlist,
        clearShortlist,
        clearCompare
      }}
    >
      {children}
    </ShortlistContext.Provider>
  )
}

export function useShortlist() {
  const context = useContext(ShortlistContext)
  if (!context) {
    throw new Error('useShortlist must be used within ShortlistProvider')
  }
  return context
}
