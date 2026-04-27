import bcrypt from 'bcryptjs'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { getRuntimeEncryptionKeyState, getRuntimeJwtSecretState } from '@/lib/runtime-secrets'

const SECRET_ENCRYPTION_VERSION = 'v1'
const SECRET_ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const SECRET_ENCRYPTION_IV_BYTES = 12

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

function getEncryptionKey(): Buffer {
  const encryptionKeyState = getRuntimeEncryptionKeyState()
  if (!encryptionKeyState.value) {
    throw new Error(
      'ENCRYPTION_KEY is required for encrypted settings. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  return Buffer.from(encryptionKeyState.value, 'hex')
}

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(SECRET_ENCRYPTION_IV_BYTES)
  const cipher = createCipheriv(SECRET_ENCRYPTION_ALGORITHM, getEncryptionKey(), iv)
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
  const [version, ivHex, authTagHex, encryptedHex] = encryptedText.split(':')
  if (version !== SECRET_ENCRYPTION_VERSION || !ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Encrypted setting has an unsupported format.')
  }

  const decipher = createDecipheriv(
    SECRET_ENCRYPTION_ALGORITHM,
    getEncryptionKey(),
    Buffer.from(ivHex, 'hex')
  )
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final()
  ]).toString('utf8')
}
