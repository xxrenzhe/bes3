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

export async function getRequestLocale() {
  const headerStore = await headers()
  const cookieStore = await cookies()

  return normalizeLocale(
    headerStore.get(REQUEST_LOCALE_HEADER) ||
      cookieStore.get(LOCALE_COOKIE_NAME)?.value ||
      DEFAULT_LOCALE
  )
}

export async function getRequestDisplayPath() {
  const headerStore = await headers()
  return headerStore.get(REQUEST_DISPLAY_PATH_HEADER) || '/'
}

export async function getRequestBasePath() {
  return stripLocaleFromPath(await getRequestDisplayPath())
}

export async function getLocalizedRequestPath(pathname?: string | null) {
  return addLocaleToPath(pathname || (await getRequestBasePath()), await getRequestLocale())
}
