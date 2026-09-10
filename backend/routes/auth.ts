import { Router } from 'express';
import { hashPassword, getUserByUsername, updateUserPassword, verifyPassword } from '../database/index.js';
import { createSession, destroySession, requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  try {
    const user = await getUserByUsername(username);
    if (!user || typeof user.password_hash !== 'string' || !verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    // Upgrade legacy unsalted SHA-256 hashes to salted scrypt on successful login
    if (!user.password_hash.startsWith('scrypt$')) {
      updateUserPassword(user.username, hashPassword(password)).catch(() => {
        // Non-fatal: the user can still log in; the hash will be retried next login
      });
    }

    const token = createSession(user.username, user.role);
    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch {
    res.status(500).json({ error: 'Database error during authentication' });
  }
});

router.post('/logout', requireAuth, (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) destroySession(token);
  res.json({ message: 'Logged out successfully' });
});

export default router;