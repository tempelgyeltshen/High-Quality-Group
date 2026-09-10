import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { hashPassword, verifyPassword } from '../database/connection.js';

test('hashPassword returns a salted scrypt hash with the expected format', () => {
  const hash = hashPassword('secret123');
  assert.ok(hash.startsWith('scrypt$'), 'hash must use the scrypt$ prefix');
  const parts = hash.split('$');
  assert.equal(parts.length, 3, 'hash must be scrypt$<salt>$<digest>');
});

test('correct password verifies against its own hash', () => {
  const hash = hashPassword('correct horse battery');
  assert.equal(verifyPassword('correct horse battery', hash), true);
});

test('wrong password does not verify', () => {
  const hash = hashPassword('right-password');
  assert.equal(verifyPassword('wrong-password', hash), false);
});

test('the same password hashes differently each time (unique salt)', () => {
  assert.notEqual(hashPassword('same-password'), hashPassword('same-password'));
});

test('legacy unsalted SHA-256 hashes still verify', () => {
  const legacyHash = crypto.createHash('sha256').update('legacy-pass').digest('hex');
  assert.equal(verifyPassword('legacy-pass', legacyHash), true);
  assert.equal(verifyPassword('wrong-pass', legacyHash), false);
});

test('malformed or empty stored hashes never verify', () => {
  assert.equal(verifyPassword('anything', ''), false);
  assert.equal(verifyPassword('anything', 'not-a-hash'), false);
  assert.equal(verifyPassword('anything', 'scrypt$onlytwo'), false);
  assert.equal(verifyPassword('anything', 'scrypt$AQID$$'), false); // bad digest length
});

test('verifyPassword throws nothing on empty password', () => {
  const hash = hashPassword('some-password');
  assert.doesNotThrow(() => verifyPassword('', hash));
  assert.equal(verifyPassword('', hash), false);
});
