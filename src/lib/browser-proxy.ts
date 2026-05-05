import { getSettingValue, getSettingValueOrEnv } from '@/lib/settings'
import { buildProxyUrl, describeProxyEndpoint, parseProxyEndpoint, type ParsedProxyEndpoint } from '@/lib/proxy-url-parser'

type ProxySettingItem = {
  country?: string
  url?: string
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

function parseBrowserProxySettings(raw: string): ProxySettingItem[] {
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

async function loadBrowserProxySettings(): Promise<ProxySettingItem[]> {
  const stored = await getSettingValue('proxy', 'urls')
  const storedProxies = stored && stored.trim() ? parseBrowserProxySettings(stored) : []
  if (storedProxies.length > 0) return storedProxies

  const envRaw = process.env.BROWSER_PROXY_URLS_JSON || '[]'
  return parseBrowserProxySettings(envRaw)
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
  const parsed = proxies
    .map((item) => {
      const proxy = item.url ? parseProxyEndpoint(item.url) : null
      if (!proxy) return null
      const configuredCountry = normalizeCountryCode(item.country)
      return {
        configuredCountry,
        proxy
      }
    })
    .filter((item): item is { configuredCountry: string | null; proxy: ParsedProxyEndpoint } => Boolean(item))
  const preferred =
    parsed.find((item) => item.configuredCountry && candidates.has(item.configuredCountry)) ||
    parsed.find((item) => item.proxy.countryCode && candidates.has(item.proxy.countryCode)) ||
    parsed.find((item) => !item.configuredCountry && !item.proxy.countryCode) ||
    parsed[0]

  return preferred?.proxy || null
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

  const proxyDescription = describeProxyEndpoint(proxy)
  const dispatcher = createProxyAgent(buildProxyUrl(proxy))

  try {
    return await fetch(input, {
      ...(init || {}),
      dispatcher
    } as RequestInit & { dispatcher: unknown })
  } catch (error: any) {
    if (options.strict) {
      throw new Error(`Proxy request via ${proxyDescription} failed: ${error?.message || error}`)
    }
    console.warn(`[proxy] request via ${proxyDescription} failed, falling back to direct fetch: ${error?.message || error}`)
    return fetch(input, init)
  }
}

export async function getBrowserProxyUrl(countryCode?: string | null): Promise<string> {
  const proxy = await resolveBrowserProxy(countryCode)
  if (!proxy || proxy.protocol === 'socks5') return ''

  return buildProxyUrl(proxy)
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
