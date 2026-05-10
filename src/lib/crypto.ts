import bcrypt from 'bcryptjs'
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto'
import {
  getRuntimeEncryptionKeyState,
  getRuntimeJwtSecretState,
  getRuntimePreviousEncryptionKeyStates,
  type RuntimeSecretState
} from '@/lib/runtime-secrets'

const SECRET_ENCRYPTION_VERSION = 'v1'
const SECRET_ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const SECRET_ENCRYPTION_IV_BYTES = 12
const PASSPHRASE_DERIVATION_SALT = 'bes3:system-settings:v1'

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function getJwtSecret(): Uint8Array {
  const jwtSecretState = getRuntimeJwtSecretState()
  if (!jwtSecretState.value) {
    throw new Error(
      'JWT_SECRET is required. Use a local .env file in development and injected environment variables in production.'
    )
  }
  return new TextEncoder().encode(jwtSecretState.value)
}

type ResolvedEncryptionKey = {
  id: string
  bytes: Buffer
  source: 'current' | 'previous'
  state: RuntimeSecretState
}

function getEncryptionKeyError(state: RuntimeSecretState, label: string): Error {
  if (state.issue === 'too_short') {
    return new Error(`${label} must be a 64-character hex key or a passphrase of at least 12 characters.`)
  }
  if (state.issue === 'placeholder') {
    return new Error(`${label} must be replaced with a strong random value.`)
  }
  return new Error(
    `${label} is required for encrypted settings. Generate a 64-character hex key with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  )
}

function getEncryptionKeyId(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12)
}

function resolveEncryptionKey(state: RuntimeSecretState, source: 'current' | 'previous'): ResolvedEncryptionKey {
  const label = state.envKey || (source === 'current' ? 'ENCRYPTION_KEY' : 'ENCRYPTION_PREVIOUS_KEYS')
  if (!state.value) {
    throw getEncryptionKeyError(state, label)
  }

  const bytes = state.kind === 'hex'
    ? Buffer.from(state.value, 'hex')
    : scryptSync(state.value, PASSPHRASE_DERIVATION_SALT, 32)

  return {
    id: getEncryptionKeyId(state.value),
    bytes,
    source,
    state
  }
}

function getCurrentEncryptionKey(): ResolvedEncryptionKey {
  return resolveEncryptionKey(getRuntimeEncryptionKeyState(), 'current')
}

function getPreviousEncryptionKeys(): ResolvedEncryptionKey[] {
  return getRuntimePreviousEncryptionKeyStates()
    .filter((state) => Boolean(state.value) || Boolean(state.issue))
    .map((state) => resolveEncryptionKey(state, 'previous'))
}

function getAllEncryptionKeys(): ResolvedEncryptionKey[] {
  const current = getCurrentEncryptionKey()
  const previousKeys = getPreviousEncryptionKeys().filter((key) => key.id !== current.id)
  return [current, ...previousKeys]
}

function parseEncryptedSecret(encryptedText: string) {
  const [version, ivHex, authTagHex, encryptedHex] = encryptedText.split(':')
  if (version !== SECRET_ENCRYPTION_VERSION || !ivHex || !authTagHex || !encryptedHex) {
    throw new Error(
      'Encrypted setting has an unsupported format.'
    )
  }
  return {
    iv: Buffer.from(ivHex, 'hex'),
    authTag: Buffer.from(authTagHex, 'hex'),
    encrypted: Buffer.from(encryptedHex, 'hex')
  }
}

function decryptSecretWithKey(encryptedText: string, key: ResolvedEncryptionKey): string {
  const payload = parseEncryptedSecret(encryptedText)
  const decipher = createDecipheriv(SECRET_ENCRYPTION_ALGORITHM, key.bytes, payload.iv)
  decipher.setAuthTag(payload.authTag)
  return Buffer.concat([
    decipher.update(payload.encrypted),
    decipher.final()
  ]).toString('utf8')
}

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(SECRET_ENCRYPTION_IV_BYTES)
  const cipher = createCipheriv(SECRET_ENCRYPTION_ALGORITHM, getCurrentEncryptionKey().bytes, iv)
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [
    SECRET_ENCRYPTION_VERSION,
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex')
  ].join(':')
}

export function decryptSecret(encryptedText: string): string {
  const keys = getAllEncryptionKeys()
  let lastError: unknown
  for (const key of keys) {
    try {
      return decryptSecretWithKey(encryptedText, key)
    } catch (error) {
      lastError = error
    }
  }

  throw new Error(`Encrypted setting could not be decrypted with the configured keys: ${lastError instanceof Error ? lastError.message : 'unknown error'}`)
}

export function isEncryptedWithCurrentKey(encryptedText: string): boolean {
  try {
    decryptSecretWithKey(encryptedText, getCurrentEncryptionKey())
    return true
  } catch {
    return false
  }
}

export function reencryptToCurrentKey(encryptedText: string): string {
  return encryptSecret(decryptSecret(encryptedText))
}
