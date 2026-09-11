import { Router } from 'express';
import {
  getUsers, createUser, deleteUser, updateUserPassword,
  getUserByUsername, hashPassword,
} from '../database/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { LocalDbWriteProhibitedError } from '../database/connection.js';

const router = Router();

// User account management is strictly admin-only
router.use(requireAdmin);

router.get('/', async (_req, res) => {
  try {
    const users = await getUsers();
    res.json(users);
  } catch {
    res.status(500).json({ error: 'Failed to retrieve user accounts' });
  }
});

router.post('/', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    res.status(400).json({ error: 'Username, password and role are required' });
    return;
  }
  if (role !== 'admin' && role !== 'cashier') {
    res.status(400).json({ error: 'Role must be either "admin" or "cashier"' });
    return;
  }

  try {
    const existing = await getUserByUsername(username);
    if (existing) {
      res.status(400).json({ error: 'Username already exists' });
      return;
    }
    const newUser = await createUser(username, hashPassword(password), role);
    res.status(201).json(newUser);
  } catch (err: any) {
    if (err instanceof LocalDbWriteProhibitedError) {
      res.status(503).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message || 'Failed to create user account' });
  }
});

router.put('/:username/password', async (req, res) => {
  const { password } = req.body;
  if (!password) {
    res.status(400).json({ error: 'New password is required' });
    return;
  }

  try {
    const success = await updateUserPassword(req.params.username, hashPassword(password));
    if (!success) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ message: 'Password updated successfully' });
  } catch (err: any) {
    if (err instanceof LocalDbWriteProhibitedError) {
      res.status(503).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to update user password' });
  }
});

router.delete('/:username', async (req, res) => {
  try {
    const success = await deleteUser(req.params.username);
    if (!success) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ message: 'User deleted successfully' });
  } catch (err: any) {
    if (err instanceof LocalDbWriteProhibitedError) {
      res.status(503).json({ error: err.message });
      return;
    }
    res.status(400).json({ error: err.message || 'Failed to delete user' });
  }
});

export default router;
