import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  isProductionProcess,
  isLocalWriteProhibited,
  assertLocalWritesAllowed,
  setLocalFallback,
  LocalDbWriteProhibitedError,
} from '../database/connection.js';

const REAL_NODE_ENV = process.env.NODE_ENV;
const REAL_ALLOW_FLAG = process.env.ALLOW_LOCAL_DB_FALLBACK;

/**
 * Restore process-global state after every test so order never matters:
 * NODE_ENV / ALLOW_LOCAL_DB_FALLBACK back to their originals. The fallback
 * latch itself is one-way by design, so tests only ever switch it ON and
 * vary the env vars around it.
 */
beforeEach(() => {
  process.env.NODE_ENV = 'production';
  delete process.env.ALLOW_LOCAL_DB_FALLBACK;
});

afterEach(() => {
  process.env.NODE_ENV = REAL_NODE_ENV;
  if (REAL_ALLOW_FLAG === undefined) delete process.env.ALLOW_LOCAL_DB_FALLBACK;
  else process.env.ALLOW_LOCAL_DB_FALLBACK = REAL_ALLOW_FLAG;
});

test('isProductionProcess detects NODE_ENV=production and Vercel', () => {
  process.env.NODE_ENV = 'production';
  assert.equal(isProductionProcess(), true);

  process.env.NODE_ENV = 'development';
  assert.equal(isProductionProcess(), false);

  const realVercel = process.env.VERCEL;
  process.env.NODE_ENV = 'development';
  process.env.VERCEL = '1';
  assert.equal(isProductionProcess(), true);
  if (realVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = realVercel;
});

test('assertLocalWritesAllowed passes in development even with fallback active', () => {
  process.env.NODE_ENV = 'development';
  setLocalFallback(true);
  assert.doesNotThrow(() => assertLocalWritesAllowed('createSale'));
});

test('assertLocalWritesAllowed throws LocalDbWriteProhibitedError in production fallback', () => {
  process.env.NODE_ENV = 'production';
  setLocalFallback(true);
  assert.throws(() => assertLocalWritesAllowed('createSale'), LocalDbWriteProhibitedError);
});

test('ALLOW_LOCAL_DB_FALLBACK=1 opts back into local writes in production', () => {
  process.env.NODE_ENV = 'production';
  process.env.ALLOW_LOCAL_DB_FALLBACK = '1';
  setLocalFallback(true);
  assert.doesNotThrow(() => assertLocalWritesAllowed('recordCreditPayment'));
  assert.equal(isLocalWriteProhibited(), false);
});

test('isLocalWriteProhibited is false when fallback is off', () => {
  process.env.NODE_ENV = 'production';
  setLocalFallback(false);
  assert.equal(isLocalWriteProhibited(), false);
  assert.doesNotThrow(() => assertLocalWritesAllowed('deleteProduct'));
});

test('guard error message names the blocked operation', () => {
  process.env.NODE_ENV = 'production';
  setLocalFallback(true);
  try {
    assertLocalWritesAllowed('processSaleReturn');
    assert.fail('expected LocalDbWriteProhibitedError');
  } catch (err) {
    assert.ok(err instanceof LocalDbWriteProhibitedError);
    assert.ok(err.message.includes('processSaleReturn'), 'message must name the operation');
    assert.ok(err.message.includes('ALLOW_LOCAL_DB_FALLBACK'), 'message must mention the override flag');
  }
});
