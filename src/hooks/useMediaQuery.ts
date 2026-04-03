'use client'

import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const getMatches = () => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  }

  const [matches, setMatches] = useState(getMatches)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    const listener = () => setMatches(mediaQuery.matches)
    listener()
    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [query])

  return matches
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)')
}
