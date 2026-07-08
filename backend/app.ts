import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  initDatabase,
  hashPassword,
  getProducts,
  getProductByCode,
  addProduct,
  updateProduct,
  deleteProduct,
  getEmployees,
  getEmployeeByCode,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  getUserByUsername,
  createSale,
  getSaleByNo,
  getSales,
  recordCreditPayment,
  processSaleReturn,
  getUsers,
  createUser,
  deleteUser,
  updateUserPassword
} from './database.js';

async function attachRoutes(app: express.Express) {
  // 1. Authentication
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    try {
      const hashedPassword = hashPassword(password);
      const user = await getUserByUsername(username);
      if (!user || user.password_hash !== hashedPassword) {
        res.status(401).json({ error: 'Invalid username or password' });
        return;
      }
      res.json({ message: 'Login successful', user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) {
      res.status(500).json({ error: 'Database error during authentication' });
    }
  });

  // User Management endpoints
  app.get('/api/users', async (req, res) => {
    try {
      const users = await getUsers();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve user accounts' });
    }
  });

  app.post('/api/users', async (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      res.status(400).json({ error: 'Username, password and role are required' });
      return;
    }

    try {
      const existing = await getUserByUsername(username);
      if (existing) {
        res.status(400).json({ error: 'Username already exists' });
        return;
      }

      const passwordHash = hashPassword(password);
      const newUser = await createUser(username, passwordHash, role);
      res.status(201).json(newUser);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create user account' });
    }
  });

  app.put('/api/users/:username/password', async (req, res) => {
    const { username } = req.params;
    const { password } = req.body;
    if (!password) {
      res.status(400).json({ error: 'New password is required' });
      return;
    }

    try {
      const passwordHash = hashPassword(password);
      const success = await updateUserPassword(username, passwordHash);
      if (!success) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update user password' });
    }
  });

  app.delete('/api/users/:username', async (req, res) => {
    const { username } = req.params;
    try {
      const success = await deleteUser(username);
      if (!success) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json({ message: 'User deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to delete user' });
    }
  });

  // 2. Products APIs
  app.get('/api/products', async (req, res) => {
    try {
      const products = await getProducts();
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve products' });
    }
  });

  app.get('/api/products/:code', async (req, res) => {
    const code = req.params.code;
    try {
      const product = await getProductByCode(code);
      if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json(product);
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve product' });
    }
  });

  app.post('/api/products', async (req, res) => {
    const { item_code, product_name, retail_price, stock_qty } = req.body;
    if (!item_code || !product_name || retail_price === undefined || stock_qty === undefined) {
      res.status(400).json({ error: 'All product fields are required' });
      return;
    }

    try {
      const existing = await getProductByCode(item_code);
      if (existing) {
        res.status(400).json({ error: 'Product with this item code already exists' });
        return;
      }

      const p = {
        item_code: item_code.trim(),
        product_name: product_name.trim(),
        retail_price: parseFloat(retail_price),
        stock_qty: parseInt(stock_qty)
      };
      await addProduct(p);
      res.status(201).json(p);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add product' });
    }
  });

  app.put('/api/products/:code', async (req, res) => {
    const code = req.params.code;
    const { product_name, retail_price, stock_qty } = req.body;
    if (!product_name || retail_price === undefined || stock_qty === undefined) {
      res.status(400).json({ error: 'All fields are required to update' });
      return;
    }

    try {
      const updated = await updateProduct(code, {
        product_name: product_name.trim(),
        retail_price: parseFloat(retail_price),
        stock_qty: parseInt(stock_qty)
      });
      if (!updated) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json({ item_code: code, product_name, retail_price, stock_qty });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update product' });
    }
  });

  app.delete('/api/products/:code', async (req, res) => {
    const code = req.params.code;
    try {
      const deleted = await deleteProduct(code);
      if (!deleted) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      res.json({ message: 'Product deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  // 3. Employees APIs
  app.get('/api/employees', async (req, res) => {
    try {
      const employees = await getEmployees();
      res.json(employees);
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve employees' });
    }
  });

  app.get('/api/employees/:code', async (req, res) => {
    const code = req.params.code;
    try {
      const employee = await getEmployeeByCode(code);
      if (!employee) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }
      res.json(employee);
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve employee' });
    }
  });

  app.post('/api/employees', async (req, res) => {
    const { employee_code, employee_name, discount_rate, avatar_url } = req.body;
    if (!employee_code || !employee_name) {
      res.status(400).json({ error: 'Employee code and name are required' });
      return;
    }

    const rate = discount_rate !== undefined ? parseFloat(discount_rate) : 0.20;

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
        avatar_url: avatar_url ? avatar_url.trim() : ''
      };
      await addEmployee(emp);
      res.status(201).json(emp);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add employee' });
    }
  });

  app.put('/api/employees/:code', async (req, res) => {
    const code = req.params.code;
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

      const updated = await updateEmployee(code, {
        employee_name: employee_name.trim(),
        discount_rate: rate,
        avatar_url: avatar_url ? avatar_url.trim() : ''
      });

      if (!updated) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }
      res.json({ employee_code: code, employee_name, discount_rate: rate, avatar_url: avatar_url || '' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update employee' });
    }
  });

  app.delete('/api/employees/:code', async (req, res) => {
    const code = req.params.code;
    try {
      const deleted = await deleteEmployee(code);
      if (!deleted) {
        res.status(404).json({ error: 'Employee not found' });
        return;
      }
      res.json({ message: 'Employee deleted successfully' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete employee' });
    }
  });

  // 4. Sales and Checkout APIs
  app.post('/api/sales', async (req, res) => {
    const { items, total_amount, discount_applied, net_amount, payment_method, customer_name } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Cannot process an empty sale cart' });
      return;
    }

    try {
      const result = await createSale({
        items,
        total_amount,
        discount_applied,
        net_amount,
        payment_method,
        customer_name
      });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to process sale transaction: ' + err.message });
    }
  });

  app.put('/api/sales/:sale_no/payment', async (req, res) => {
    const sale_no = req.params.sale_no;
    try {
      const updated = await recordCreditPayment(sale_no);
      if (!updated) {
        res.status(404).json({ error: 'Invoice not found' });
        return;
      }
      res.json({ message: 'Credit payment recorded successfully', sale_no });
    } catch (err) {
      res.status(500).json({ error: 'Database error recording payment' });
    }
  });

  app.put('/api/sales/:sale_no/return', async (req, res) => {
    const sale_no = req.params.sale_no;
    try {
      const success = await processSaleReturn(sale_no);
      if (!success) {
        res.status(400).json({ error: 'Invoice not found or already marked as returned' });
        return;
      }
      res.json({ message: 'Return processed and inventory restocked successfully', sale_no });
    } catch (err) {
      res.status(500).json({ error: 'Database error processing sales return' });
    }
  });

  app.get('/api/sales/:sale_no', async (req, res) => {
    const sale_no = req.params.sale_no;
    try {
      const sale = await getSaleByNo(sale_no);
      if (!sale) {
        res.status(404).json({ error: 'Sale not found' });
        return;
      }
      res.json(sale);
    } catch (err) {
      res.status(500).json({ error: 'Database error retrieving sale' });
    }
  });

  app.get('/api/sales', async (req, res) => {
    const { from, to, id } = req.query;
    try {
      if (id) {
        const sale = await getSaleByNo(id as string);
        res.json(sale ? [sale] : []);
        return;
      }
      const sales = await getSales(from as string, to as string);
      res.json(sales);
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve sales' });
    }
  });

  app.get('/api/sales/report/day-end', async (req, res) => {
    const { from, to } = req.query;
    try {
      const sales = await getSales(from as string, to as string);

      let total_cash = 0;
      let total_bank = 0;
      let total_credit = 0;
      let total_discount = 0;
      let total_net = 0;

      sales.forEach((sale) => {
        total_discount += sale.discount_applied || 0;
        total_net += sale.net_amount || 0;

        if (sale.payment_method === 'Cash') {
          total_cash += sale.net_amount || 0;
        } else if (sale.payment_method === 'Online' || sale.payment_method === 'Bank') {
          total_bank += sale.net_amount || 0;
        } else if (sale.payment_method === 'Credit') {
          total_credit += sale.net_amount || 0;
        }
      });

      res.json({
        sales,
        summary: {
          total_cash_sales: total_cash,
          total_bank_sales: total_bank,
          total_credit_sales: total_credit,
          total_discount_claims: total_discount,
          net_revenue: total_net,
          total_transactions: sales.length
        }
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to aggregate Day End report' });
    }
  });
}

export async function createApp(isProduction = false) {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  await initDatabase();
  await attachRoutes(app);

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  return app;
}
