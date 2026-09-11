import { Router } from 'express';
import {
  getEmployees, getEmployeeByCode, addEmployee, updateEmployee, deleteEmployee,
} from '../database/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { LocalDbWriteProhibitedError } from '../database/connection.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const employees = await getEmployees();
    res.json(employees);
  } catch {
    res.status(500).json({ error: 'Failed to retrieve employees' });
  }
});

router.get('/:code', async (req, res) => {
  try {
    const employee = await getEmployeeByCode(req.params.code);
    if (!employee) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }
    res.json(employee);
  } catch {
    res.status(500).json({ error: 'Failed to retrieve employee' });
  }
});

// Employee record changes are admin-only (reads are available to any logged-in user)
router.post('/', requireAdmin, async (req, res) => {
  const { employee_code, employee_name, discount_rate, avatar_url } = req.body;
  if (!employee_code || !employee_name) {
    res.status(400).json({ error: 'Employee code and name are required' });
    return;
  }

  const rate = discount_rate !== undefined ? Number(discount_rate) : 0.20;
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    res.status(400).json({ error: 'Discount rate must be between 0 and 1 (e.g. 0.20 for 20%)' });
    return;
  }

  try {
    const existing = await getEmployeeByCode(employee_code);
    if (existing) {
      res.status(400).json({ error: 'Employee with this code already exists' });
      return;
    }
    const emp = {
      employee_code: employee_code.trim(),
      employee_name: employee_name.trim(),
      discount_rate: rate,
      avatar_url: avatar_url ? avatar_url.trim() : '',
    };
    await addEmployee(emp);
    res.status(201).json(emp);
  } catch (err: any) {
    if (err instanceof LocalDbWriteProhibitedError) {
      res.status(503).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to add employee' });
  }
});

router.put('/:code', requireAdmin, async (req, res) => {
  const { employee_name, discount_rate, avatar_url } = req.body;
  if (!employee_name || discount_rate === undefined) {
    res.status(400).json({ error: 'Employee name and discount rate are required to update' });
    return;
  }

  try {
    const rate = parseFloat(discount_rate);
    if (isNaN(rate) || rate < 0 || rate > 1) {
      res.status(400).json({ error: 'Discount rate must be between 0 and 1 (e.g. 0.20 for 20%)' });
      return;
    }
    const updated = await updateEmployee(req.params.code, {
      employee_name: employee_name.trim(),
      discount_rate: rate,
      avatar_url: avatar_url ? avatar_url.trim() : '',
    });
    if (!updated) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }
    res.json({ employee_code: req.params.code, employee_name, discount_rate: rate, avatar_url: avatar_url || '' });
  } catch (err: any) {
    if (err instanceof LocalDbWriteProhibitedError) {
      res.status(503).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

router.delete('/:code', requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteEmployee(req.params.code);
    if (!deleted) {
      res.status(404).json({ error: 'Employee not found' });
      return;
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (err: any) {
    if (err instanceof LocalDbWriteProhibitedError) {
      res.status(503).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

export default router;
