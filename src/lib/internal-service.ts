type HeaderBag = {
  get(name: string): string | null | undefined
}

export function getInternalServiceToken() {
  return process.env.JWT_SECRET || ''
}

export function hasValidInternalServiceToken(headers: HeaderBag) {
  const expectedToken = getInternalServiceToken()
  if (!expectedToken) return false

  const providedToken = headers.get('x-bes3-internal-token') || ''
  return providedToken === expectedToken
}
