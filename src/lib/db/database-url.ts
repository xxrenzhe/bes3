const POSTGRES_SCHEME_PATTERN = /^(postgres(?:ql)?):\/\//i

function decodeCredential(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function buildPostgresUrl(protocol: string, remainder: string): string {
  const atIndex = remainder.lastIndexOf('@')
  if (atIndex < 0) {
    return new URL(`${protocol}://${remainder}`).toString()
  }

  const userInfo = remainder.slice(0, atIndex)
  const hostAndPath = remainder.slice(atIndex + 1)
  const separatorIndex = userInfo.indexOf(':')
  const username = separatorIndex >= 0 ? userInfo.slice(0, separatorIndex) : userInfo
  const password = separatorIndex >= 0 ? userInfo.slice(separatorIndex + 1) : ''
  const url = new URL(`${protocol}://${hostAndPath}`)

  url.username = decodeCredential(username)
  if (password) {
    url.password = decodeCredential(password)
  }

  return url.toString()
}

export function normalizeDatabaseUrl(value: string | undefined): string {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const schemeMatch = raw.match(POSTGRES_SCHEME_PATTERN)
  if (schemeMatch) {
    return buildPostgresUrl(schemeMatch[1].toLowerCase(), raw.slice(schemeMatch[0].length))
  }

  if (/^[^/\s:]+:.+@[^/\s]+\/.+/.test(raw)) {
    return buildPostgresUrl('postgres', raw)
  }

  return raw
}

export function isPostgresDatabaseUrl(value: string | undefined): boolean {
  const normalized = normalizeDatabaseUrl(value)
  if (!normalized) return false

  try {
    const parsed = new URL(normalized)
    return parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:'
  } catch {
    return false
  }
}
