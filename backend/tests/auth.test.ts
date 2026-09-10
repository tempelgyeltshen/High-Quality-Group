import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSession,
  getSessionUser,
  requireAuth,
  requireAdmin,
} from '../middleware/auth.js';

function makeRequest(token?: string | null) {
  const headers: Record<string, string> = {};
  if (token) headers.authorization = `Bearer ${token}`;
  if (token === null) headers.authorization = 'Basic abc123'; // non-bearer scheme
  return { headers };
}

function makeResponse() {
  const state: { statusCode: number; body: any } = { statusCode: 0, body: null };
  const res: any = {
    state,
    locals: {},
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(body: any) {
      state.body = body;
      return this;
    },
  };
  return res;
}

function makeNext() {
  let called = false;
  const next = () => {
    called = true;
  };
  return { called: () => called, next };
}

test('createSession issues a token that getSessionUser accepts', () => {
  const token = createSession('dorji', 'admin');
  assert.equal(typeof token, 'string');
  assert.ok(token.includes('.'), 'token must contain a payload and signature');
  const session = getSessionUser(token);
  assert.ok(session);
  assert.equal(session!.username, 'dorji');
  assert.equal(session!.role, 'admin');
  assert.ok(session!.expiresAt > Date.now());
});

test('tampered tokens are rejected', () => {
  const token = createSession('dorji', 'cashier');
  const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
  assert.equal(getSessionUser(tampered), null);
});

test('garbage and empty tokens are rejected', () => {
  assert.equal(getSessionUser(''), null);
  assert.equal(getSessionUser('not.a.token'), null);
  assert.equal(getSessionUser('justonepart'), null);
});

test('expired tokens are rejected', () => {
  const token = createSession('dorji', 'cashier');
  const realNow = Date.now;
  try {
    Date.now = () => realNow() + 13 * 60 * 60 * 1000; // advance past the 12h TTL
    assert.equal(getSessionUser(token), null);
  } finally {
    Date.now = realNow;
  }
});

test('requireAuth passes a valid bearer token through to next()', () => {
  const token = createSession('dorji', 'cashier');
  const res = makeResponse();
  const { next, called } = makeNext();
  requireAuth(makeRequest(token) as any, res, next as any);
  assert.equal(called(), true);
  assert.equal(res.locals.session.username, 'dorji');
  assert.equal(res.state.statusCode, 0);
});

test('requireAuth rejects missing or non-bearer tokens with 401', () => {
  for (const req of [makeRequest(), makeRequest(undefined), makeRequest(null)]) {
    const res = makeResponse();
    const { next, called } = makeNext();
    requireAuth(req as any, res, next as any);
    assert.equal(called(), false, 'next() must not be called');
    assert.equal(res.state.statusCode, 401);
    assert.ok(res.state.body.error);
  }
});

test('requireAuth rejects invalid tokens with 401', () => {
  const res = makeResponse();
  const { next, called } = makeNext();
  requireAuth(makeRequest('forged.invalid') as any, res, next as any);
  assert.equal(called(), false);
  assert.equal(res.state.statusCode, 401);
});

test('requireAdmin allows admin sessions through', () => {
  const res = makeResponse();
  res.locals.session = { username: 'admin', role: 'admin', expiresAt: Date.now() + 1000 };
  const { next, called } = makeNext();
  requireAdmin({} as any, res, next as any);
  assert.equal(called(), true);
});

test('requireAdmin blocks cashier sessions with 403', () => {
  const res = makeResponse();
  res.locals.session = { username: 'cashier', role: 'cashier', expiresAt: Date.now() + 1000 };
  const { next, called } = makeNext();
  requireAdmin({} as any, res, next as any);
  assert.equal(called(), false);
  assert.equal(res.state.statusCode, 403);
});

test('requireAdmin without a prior session returns 401', () => {
  const res = makeResponse();
  const { next, called } = makeNext();
  requireAdmin({} as any, res, next as any);
  assert.equal(called(), false);
  assert.equal(res.state.statusCode, 401);
});
