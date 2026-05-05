export type ParsedProxyEndpoint = {
  host: string
  port: number
  username?: string
  password?: string
  protocol: 'http' | 'https' | 'socks5'
  originalUrl: string
  provider: 'kookeey' | 'generic'
  countryCode?: string
}

function detectProxyProvider(host: string): ParsedProxyEndpoint['provider'] {
  return host.toLowerCase().includes('kookeey.info') ? 'kookeey' : 'generic'
}

function extractKookeeyCountryCode(password: string | undefined): string | undefined {
  const match = String(password || '').match(/-([A-Z]{2})$/i)
  return match?.[1] ? match[1].toUpperCase() : undefined
}

function withDerivedFields(endpoint: Omit<ParsedProxyEndpoint, 'provider' | 'countryCode'>): ParsedProxyEndpoint {
  const provider = detectProxyProvider(endpoint.host)
  return {
    ...endpoint,
    provider,
    countryCode: provider === 'kookeey' ? extractKookeeyCountryCode(endpoint.password) : undefined
  }
}

export function parseProxyEndpoint(proxyUrl: string): ParsedProxyEndpoint | null {
  const trimmed = String(proxyUrl || '').trim()
  if (!trimmed) return null

  const schemeMatch = trimmed.match(/^(https?|socks5):\/\//i)
  const protocol = schemeMatch
    ? schemeMatch[1].toLowerCase() === 'socks5' ? 'socks5' : schemeMatch[1].toLowerCase() === 'https' ? 'https' : 'http'
    : 'http'
  const direct = trimmed.replace(/^(https?|socks5):\/\//i, '')
  const directParts = direct.split(':')

  if (!direct.includes('@') && directParts.length >= 4) {
    const port = Number.parseInt(directParts[1], 10)
    if (Number.isFinite(port)) {
      return withDerivedFields({
        host: directParts[0],
        port,
        username: directParts[2] || undefined,
        password: directParts.slice(3).join(':') || undefined,
        protocol,
        originalUrl: trimmed
      })
    }
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('socks5://')) {
    try {
      const url = new URL(trimmed)
      return withDerivedFields({
        host: url.hostname,
        port: url.port ? Number.parseInt(url.port, 10) : url.protocol === 'https:' ? 443 : 80,
        username: url.username || undefined,
        password: url.password || undefined,
        protocol: url.protocol === 'https:' ? 'https' : url.protocol === 'socks5:' ? 'socks5' : 'http',
        originalUrl: trimmed
      })
    } catch {
      return null
    }
  }

  const parts = trimmed.split(':')
  if (parts.length === 2) {
    const port = Number.parseInt(parts[1], 10)
    if (Number.isFinite(port)) {
      return withDerivedFields({
        host: parts[0],
        port,
        protocol: 'http',
        originalUrl: trimmed
      })
    }
  }

  return null
}

export function buildProxyUrl(proxy: ParsedProxyEndpoint): string {
  const auth =
    proxy.username || proxy.password
      ? `${encodeURIComponent(proxy.username || '')}:${encodeURIComponent(proxy.password || '')}@`
      : ''
  return `${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`
}

export function describeProxyEndpoint(proxy: ParsedProxyEndpoint): string {
  const authState = proxy.username || proxy.password ? 'auth=yes' : 'auth=no'
  const country = proxy.countryCode ? `country=${proxy.countryCode}` : 'country=unknown'
  return `${proxy.host}:${proxy.port} (${proxy.provider}, ${country}, ${authState})`
}
