import { getSettingValueOrEnv } from '@/lib/settings'

type ProxySettingItem = {
  country?: string
  url?: string
}

type ParsedProxyEndpoint = {
  host: string
  port: number
  username?: string
  password?: string
  protocol: 'http' | 'https' | 'socks5'
  originalUrl: string
}

type BrowserProxyFetchOptions = {
  strict?: boolean
}

const COUNTRY_ALIAS_MAP: Readonly<Record<string, string[]>> = {
  GB: ['UK'],
  UK: ['GB']
}

function normalizeCountryCode(value: string | null | undefined): string | null {
  const text = String(value || '').trim().toUpperCase()
  return text || null
}

function getCountryCandidates(country: string | null | undefined): Set<string> {
  const normalized = normalizeCountryCode(country)
  const candidates = new Set<string>()
  if (!normalized) return candidates

  candidates.add(normalized)
  for (const alias of COUNTRY_ALIAS_MAP[normalized] || []) {
    candidates.add(alias)
  }

  return candidates
}

function parseProxyEndpoint(proxyUrl: string): ParsedProxyEndpoint | null {
  const trimmed = String(proxyUrl || '').trim()
  if (!trimmed) return null

  const direct = trimmed.replace(/^https?:\/\//, '')
  const directParts = direct.split(':')
  if (directParts.length >= 4) {
    const port = Number.parseInt(directParts[1], 10)
    if (Number.isFinite(port)) {
      return {
        host: directParts[0],
        port,
        username: directParts[2] || undefined,
        password: directParts.slice(3).join(':') || undefined,
        protocol: 'http',
        originalUrl: trimmed
      }
    }
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('socks5://')) {
    try {
      const url = new URL(trimmed)
      return {
        host: url.hostname,
        port: url.port ? Number.parseInt(url.port, 10) : url.protocol === 'https:' ? 443 : 80,
        username: url.username || undefined,
        password: url.password || undefined,
        protocol: url.protocol === 'https:' ? 'https' : url.protocol === 'socks5:' ? 'socks5' : 'http',
        originalUrl: trimmed
      }
    } catch {
      return null
    }
  }

  const parts = trimmed.split(':')
  if (parts.length === 2) {
    const port = Number.parseInt(parts[1], 10)
    if (Number.isFinite(port)) {
      return {
        host: parts[0],
        port,
        protocol: 'http',
        originalUrl: trimmed
      }
    }
  }

  return null
}

async function loadBrowserProxySettings(): Promise<ProxySettingItem[]> {
  const raw = await getSettingValueOrEnv('proxy', 'browserProxyUrlsJson', 'BROWSER_PROXY_URLS_JSON', '[]')
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    const normalized = parsed
      .map<ProxySettingItem | null>((item) => {
        if (typeof item === 'string') {
          return { url: item }
        }
        if (item && typeof item === 'object') {
          return {
            country: String((item as { country?: unknown }).country || '').trim() || undefined,
            url: String((item as { url?: unknown }).url || '').trim() || undefined
          }
        }
        return null
      })
      .filter((item): item is ProxySettingItem => Boolean(item?.url))

    return normalized
  } catch {
    return []
  }
}

async function getDefaultProxyCountry(): Promise<string | null> {
  const value = await getSettingValueOrEnv('proxy', 'defaultCountryCode', 'PROXY_DEFAULT_COUNTRY', '')
  return normalizeCountryCode(value)
}

let proxyAgentConstructorPromise: Promise<((url: string) => unknown) | null> | null = null

async function getProxyAgentConstructor(): Promise<((url: string) => unknown) | null> {
  if (!proxyAgentConstructorPromise) {
    proxyAgentConstructorPromise = import('undici')
      .then((module) => {
        if (typeof module.ProxyAgent !== 'function') return null
        return (url: string) => new module.ProxyAgent(url)
      })
      .catch(() => null)
  }

  return proxyAgentConstructorPromise
}

export async function resolveBrowserProxy(countryCode?: string | null): Promise<ParsedProxyEndpoint | null> {
  const proxies = await loadBrowserProxySettings()
  if (!proxies.length) return null

  const candidates = getCountryCandidates(countryCode || await getDefaultProxyCountry())
  const preferred =
    proxies.find((item) => item.country && candidates.has(String(item.country).toUpperCase())) ||
    proxies.find((item) => !item.country) ||
    proxies[0]

  return preferred?.url ? parseProxyEndpoint(preferred.url) : null
}

export async function fetchWithBrowserProxy(
  input: string,
  init?: RequestInit,
  countryCode?: string | null,
  options: BrowserProxyFetchOptions = {}
): Promise<Response> {
  const proxy = await resolveBrowserProxy(countryCode)
  if (!proxy || proxy.protocol === 'socks5') {
    if (options.strict) {
      throw new Error(`Browser proxy is required but no supported HTTP proxy is configured for ${countryCode || 'default'}`)
    }
    return fetch(input, init)
  }

  const createProxyAgent = await getProxyAgentConstructor()
  if (!createProxyAgent) {
    if (options.strict) {
      throw new Error('Browser proxy is required but undici ProxyAgent is unavailable')
    }
    return fetch(input, init)
  }

  const auth =
    proxy.username || proxy.password
      ? `${encodeURIComponent(proxy.username || '')}:${encodeURIComponent(proxy.password || '')}@`
      : ''
  const dispatcher = createProxyAgent(`${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`)

  try {
    return await fetch(input, {
      ...(init || {}),
      dispatcher
    } as RequestInit & { dispatcher: unknown })
  } catch (error: any) {
    if (options.strict) {
      throw new Error(`Proxy request via ${proxy.host}:${proxy.port} failed: ${error?.message || error}`)
    }
    console.warn(`[proxy] request via ${proxy.host}:${proxy.port} failed, falling back to direct fetch: ${error?.message || error}`)
    return fetch(input, init)
  }
}

export async function getPlaywrightProxy(countryCode?: string | null): Promise<{
  server: string
  username?: string
  password?: string
} | undefined> {
  const proxy = await resolveBrowserProxy(countryCode)
  if (!proxy) return undefined

  return {
    server: `${proxy.protocol}://${proxy.host}:${proxy.port}`,
    username: proxy.username,
    password: proxy.password
  }
}
