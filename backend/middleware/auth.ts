import { NextFunction, Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface Session {
  username: string;
  role: string;
  expiresAt: number;
}

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const SECRET_FILE = '.session-secret';

/**
 * Stateless signed tokens (HMAC-SHA256 over a base64url JSON payload) so that
 * sessions survive server restarts. The signing secret is taken from the
 * SESSION_SECRET environment variable when set (recommended for production /
 * serverless deploys), otherwise persisted to a gitignored .session-secret file
 * next to the working directory, otherwise generated per boot (tokens then
 * only live as long as the process).
 */
function loadSecret(): Buffer {
  const envSecret = process.env.SESSION_SECRET;
  if (envSecret) return Buffer.from(envSecret, 'utf8');

  const candidates = [
    path.resolve(process.cwd(), SECRET_FILE),
    path.resolve(process.cwd(), 'backend', SECRET_FILE),
  ];

  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) {
        const value = fs.readFileSync(file, 'utf8').trim();
        if (value) return Buffer.from(value, 'utf8');
      }
    } catch {
      // ignore and try the next candidate
    }
  }

  const secret = crypto.randomBytes(32);
  for (const file of candidates) {
    try {
      fs.writeFileSync(file, secret.toString('hex'), { mode: 0o600 });
      break;
    } catch {
      // file system not writable (e.g. serverless) - keep the in-memory secret
    }
  }
  return secret;
}

const secret = loadSecret();

function sign(body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('base64url');
}

/** Issues a signed token encoding the user's username, role and expiry. */
export function createSession(username: string, role: string): string {
  const payload = { username, role, exp: Date.now() + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

/**
 * Verifies a token's signature and expiry. Returns the decoded session, or
 * null when the token is missing, malformed, tampered with, or expired.
 */
export function getSessionUser(token: string): Session | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(body);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (
      !payload ||
      typeof payload.username !== 'string' ||
      (payload.role !== 'admin' && payload.role !== 'cashier') ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }
    if (Date.now() > payload.exp) return null;
    return { username: payload.username, role: payload.role, expiresAt: payload.exp };
  } catch {
    return null;
  }
}

/** No-op for stateless tokens: nothing is stored server-side to revoke. */
export function destroySession(_token: string): void {
  // Sessions end when the client discards the token or its expiry passes.
}

/** Requires a valid bearer token; attaches the session to res.locals.session. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const session = token ? getSessionUser(token) : null;
  if (!session) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }
  res.locals.session = session;
  next();
}

/** Must be mounted after requireAuth. Requires the session role to be admin. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = res.locals.session as Session | undefined;
  if (!session) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }
  if (session.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required for this operation' });
    return;
  }
  next();
}