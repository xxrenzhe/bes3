import 'server-only'

import { randomBytes } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export type RuntimeSecretSource = 'env' | 'file' | 'generated' | 'missing'

export interface RuntimeSecretState {
  value: string
  source: RuntimeSecretSource
}

const RUNTIME_SECRETS_DIR = path.join(process.cwd(), 'secrets')
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

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

function normalizeSecretValue(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isUsableSecret(value: string, placeholders: Set<string>, minLength: number): boolean {
  return Boolean(value) && !placeholders.has(value) && value.length >= minLength
}

function readSecretFile(fileName: string): string {
  const filePath = path.join(RUNTIME_SECRETS_DIR, fileName)
  if (!fs.existsSync(filePath)) return ''
  return normalizeSecretValue(fs.readFileSync(filePath, 'utf8'))
}

function writeSecretFile(fileName: string, value: string): void {
  fs.mkdirSync(RUNTIME_SECRETS_DIR, { recursive: true })
  fs.writeFileSync(path.join(RUNTIME_SECRETS_DIR, fileName), `${value}\n`, {
    encoding: 'utf8',
    mode: 0o600
  })
}

function generateSecret(byteLength: number): string {
  return randomBytes(byteLength).toString('base64url')
}

function resolveRuntimeSecret(options: {
  envKey: string
  fileName: string
  placeholders: Set<string>
  minLength: number
  byteLength: number
}): RuntimeSecretState {
  const envValue = normalizeSecretValue(process.env[options.envKey])
  if (isUsableSecret(envValue, options.placeholders, options.minLength)) {
    return { value: envValue, source: 'env' }
  }

  const fileValue = readSecretFile(options.fileName)
  if (isUsableSecret(fileValue, options.placeholders, options.minLength)) {
    return { value: fileValue, source: 'file' }
  }

  if (IS_PRODUCTION) {
    return { value: '', source: 'missing' }
  }

  const generatedValue = generateSecret(options.byteLength)
  writeSecretFile(options.fileName, generatedValue)
  return { value: generatedValue, source: 'generated' }
}

export function getRuntimeAdminPasswordState(): RuntimeSecretState {
  return resolveRuntimeSecret({
    envKey: 'DEFAULT_ADMIN_PASSWORD',
    fileName: 'bootstrap-admin-password.txt',
    placeholders: ADMIN_PASSWORD_PLACEHOLDERS,
    minLength: 16,
    byteLength: 24
  })
}

export function getRuntimeJwtSecretState(): RuntimeSecretState {
  return resolveRuntimeSecret({
    envKey: 'JWT_SECRET',
    fileName: 'jwt-secret.txt',
    placeholders: JWT_SECRET_PLACEHOLDERS,
    minLength: 32,
    byteLength: 48
  })
}
