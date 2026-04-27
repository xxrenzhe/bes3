export type RuntimeSecretSource = 'env' | 'missing'

export interface RuntimeSecretState {
  value: string
  source: RuntimeSecretSource
}

export const ADMIN_PASSWORD_PLACEHOLDERS = new Set([
  'replace-before-first-run',
  'replace-with-a-random-admin-password-before-first-run'
])

export const JWT_SECRET_PLACEHOLDERS = new Set([
  'change-me-to-a-long-random-secret',
  'dev-only-jwt-secret-change-me',
  'dev-only-jwt-secret-change-me-before-production',
  'replace-with-a-long-random-secret-at-least-32-chars'
])

export const ENCRYPTION_KEY_PLACEHOLDERS = new Set([
  'your-32-byte-hex-encryption-key-here-64-chars',
  'replace-with-a-random-32-byte-hex-encryption-key'
])

if (typeof window !== 'undefined') {
  throw new Error('Runtime secrets are server-only and cannot be imported in the browser.')
}

function normalizeSecretValue(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isUsableSecret(value: string, placeholders: Set<string>, minLength: number): boolean {
  return Boolean(value) && !placeholders.has(value) && value.length >= minLength
}

function resolveRuntimeSecret(options: {
  envKey: string
  placeholders: Set<string>
  minLength: number
}): RuntimeSecretState {
  const envValue = normalizeSecretValue(process.env[options.envKey])
  if (isUsableSecret(envValue, options.placeholders, options.minLength)) {
    return { value: envValue, source: 'env' }
  }
  return { value: '', source: 'missing' }
}

export function getRuntimeAdminPasswordState(): RuntimeSecretState {
  return resolveRuntimeSecret({
    envKey: 'DEFAULT_ADMIN_PASSWORD',
    placeholders: ADMIN_PASSWORD_PLACEHOLDERS,
    minLength: 16
  })
}

export function getRuntimeJwtSecretState(): RuntimeSecretState {
  return resolveRuntimeSecret({
    envKey: 'JWT_SECRET',
    placeholders: JWT_SECRET_PLACEHOLDERS,
    minLength: 32
  })
}

export function getRuntimeEncryptionKeyState(): RuntimeSecretState {
  const envValue = normalizeSecretValue(process.env.ENCRYPTION_KEY)
  if (
    envValue &&
    !ENCRYPTION_KEY_PLACEHOLDERS.has(envValue) &&
    /^[0-9a-fA-F]{64}$/.test(envValue)
  ) {
    return { value: envValue, source: 'env' }
  }
  return { value: '', source: 'missing' }
}
