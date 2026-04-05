import { cookies, headers } from 'next/headers'
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  REQUEST_DISPLAY_PATH_HEADER,
  REQUEST_LOCALE_HEADER,
  addLocaleToPath,
  normalizeLocale,
  stripLocaleFromPath
} from '@/lib/i18n'

export function getRequestLocale() {
  const headerStore = headers()
  const cookieStore = cookies()

  return normalizeLocale(
    headerStore.get(REQUEST_LOCALE_HEADER) ||
      cookieStore.get(LOCALE_COOKIE_NAME)?.value ||
      DEFAULT_LOCALE
  )
}

export function getRequestDisplayPath() {
  const headerStore = headers()
  return headerStore.get(REQUEST_DISPLAY_PATH_HEADER) || '/'
}

export function getRequestBasePath() {
  return stripLocaleFromPath(getRequestDisplayPath())
}

export function getLocalizedRequestPath(pathname?: string | null) {
  return addLocaleToPath(pathname || getRequestBasePath(), getRequestLocale())
}
