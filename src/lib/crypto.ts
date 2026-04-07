import bcrypt from 'bcryptjs'
import { getRuntimeJwtSecretState } from '@/lib/runtime-secrets'

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
      'JWT_SECRET is required in production. Maintain it in your local .env or .env.production. For local development, the app can also generate an ignored secret under ./secrets/jwt-secret.txt.'
    )
  }
  return new TextEncoder().encode(jwtSecretState.value)
}
