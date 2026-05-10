#!/usr/bin/env tsx

import assert from 'node:assert/strict'
import { normalizeDatabaseUrl, isPostgresDatabaseUrl } from '../src/lib/db/database-url'

const shorthand = 'txpggood:May10-35Post5#Db@10.0.0.10:5432/bes3'
const normalizedShorthand = normalizeDatabaseUrl(shorthand)
const parsedShorthand = new URL(normalizedShorthand)

assert.equal(parsedShorthand.protocol, 'postgres:')
assert.equal(parsedShorthand.username, 'txpggood')
assert.equal(parsedShorthand.password, 'May10-35Post5%23Db')
assert.equal(decodeURIComponent(parsedShorthand.password), 'May10-35Post5#Db')
assert.equal(parsedShorthand.hostname, '10.0.0.10')
assert.equal(parsedShorthand.port, '5432')
assert.equal(parsedShorthand.pathname, '/bes3')
assert.equal(isPostgresDatabaseUrl(shorthand), true)

const standard = 'postgres://txpggood:May10-35Post5#Db@10.0.0.10:5432/bes3'
const normalizedStandard = normalizeDatabaseUrl(standard)
assert.equal(normalizedStandard, normalizedShorthand)
assert.equal(isPostgresDatabaseUrl(standard), true)
assert.equal(isPostgresDatabaseUrl('file:data/bes3.db'), false)

console.log('Database URL normalization check passed')
