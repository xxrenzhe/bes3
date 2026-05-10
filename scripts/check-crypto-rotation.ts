#!/usr/bin/env tsx

import assert from 'node:assert/strict'
import { decryptSecret, encryptSecret, isEncryptedWithCurrentKey, reencryptToCurrentKey } from '../src/lib/crypto'

function withEncryptionEnv<T>(env: {
  ENCRYPTION_KEY: string
  ENCRYPTION_PREVIOUS_KEYS?: string
}, task: () => T): T {
  const previousCurrent = process.env.ENCRYPTION_KEY
  const previousKeys = process.env.ENCRYPTION_PREVIOUS_KEYS
  process.env.ENCRYPTION_KEY = env.ENCRYPTION_KEY
  if (env.ENCRYPTION_PREVIOUS_KEYS === undefined) {
    delete process.env.ENCRYPTION_PREVIOUS_KEYS
  } else {
    process.env.ENCRYPTION_PREVIOUS_KEYS = env.ENCRYPTION_PREVIOUS_KEYS
  }

  try {
    return task()
  } finally {
    if (previousCurrent === undefined) {
      delete process.env.ENCRYPTION_KEY
    } else {
      process.env.ENCRYPTION_KEY = previousCurrent
    }
    if (previousKeys === undefined) {
      delete process.env.ENCRYPTION_PREVIOUS_KEYS
    } else {
      process.env.ENCRYPTION_PREVIOUS_KEYS = previousKeys
    }
  }
}

const oldPassphrase = 'old-passphrase-for-rotation'
const newPassphrase = 'new-passphrase-for-rotation'
const hexKey = 'a'.repeat(64)

const oldCiphertext = withEncryptionEnv({ ENCRYPTION_KEY: oldPassphrase }, () => {
  const encrypted = encryptSecret('sensitive-value')
  assert.equal(decryptSecret(encrypted), 'sensitive-value')
  assert.equal(isEncryptedWithCurrentKey(encrypted), true)
  return encrypted
})

withEncryptionEnv({
  ENCRYPTION_KEY: newPassphrase,
  ENCRYPTION_PREVIOUS_KEYS: oldPassphrase
}, () => {
  assert.equal(decryptSecret(oldCiphertext), 'sensitive-value')
  assert.equal(isEncryptedWithCurrentKey(oldCiphertext), false)
  const rotated = reencryptToCurrentKey(oldCiphertext)
  assert.equal(decryptSecret(rotated), 'sensitive-value')
  assert.equal(isEncryptedWithCurrentKey(rotated), true)
})

withEncryptionEnv({ ENCRYPTION_KEY: hexKey }, () => {
  const encrypted = encryptSecret('hex-key-value')
  assert.equal(decryptSecret(encrypted), 'hex-key-value')
  assert.equal(isEncryptedWithCurrentKey(encrypted), true)
})

console.log('Crypto rotation check passed')
