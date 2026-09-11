import { Router } from 'express';
import {
  getProducts, getProductByCode, addProduct, updateProduct, deleteProduct,
} from '../database/index.js';
import { requireAdmin } from '../middleware/auth.js';
import { LocalDbWriteProhibitedError } from '../database/connection.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch {
    res.status(500).json({ error: 'Failed to retrieve products' });
  }
});

router.get('/:code', async (req, res) => {
  try {
    const product = await getProductByCode(req.params.code);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json(product);
  } catch {
    res.status(500).json({ error: 'Failed to retrieve product' });
  }
});

// Inventory modifications are admin-only (reads are available to any logged-in user)
router.post('/', requireAdmin, async (req, res) => {
  const { item_code, product_name, retail_price, stock_qty } = req.body;
  if (!item_code || !product_name || retail_price === undefined || stock_qty === undefined) {
    res.status(400).json({ error: 'All product fields are required' });
    return;
  }

  const price = Number(retail_price);
  const qty = Number(stock_qty);
  if (!Number.isFinite(price) || price < 0) {
    res.status(400).json({ error: 'retail_price must be a non-negative number' });
    return;
  }
  if (!Number.isInteger(qty) || qty < 0) {
    res.status(400).json({ error: 'stock_qty must be a non-negative integer' });
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
      retail_price: price,
      stock_qty: qty,
    };
    await addProduct(p);
    res.status(201).json(p);
  } catch (err: any) {
    if (err instanceof LocalDbWriteProhibitedError) {
      res.status(503).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to add product' });
  }
});

router.put('/:code', requireAdmin, async (req, res) => {
  const { product_name, retail_price, stock_qty } = req.body;
  if (!product_name || retail_price === undefined || stock_qty === undefined) {
    res.status(400).json({ error: 'All fields are required to update' });
    return;
  }

  const price = Number(retail_price);
  const qty = Number(stock_qty);
  if (!Number.isFinite(price) || price < 0) {
    res.status(400).json({ error: 'retail_price must be a non-negative number' });
    return;
  }
  if (!Number.isInteger(qty) || qty < 0) {
    res.status(400).json({ error: 'stock_qty must be a non-negative integer' });
    return;
  }

  try {
    const updated = await updateProduct(req.params.code, {
      product_name: product_name.trim(),
      retail_price: price,
      stock_qty: qty,
    });
    if (!updated) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({ item_code: req.params.code, product_name, retail_price: price, stock_qty: qty });
  } catch (err: any) {
    if (err instanceof LocalDbWriteProhibitedError) {
      res.status(503).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to update product' });
  }
});

router.delete('/:code', requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteProduct(req.params.code);
    if (!deleted) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (err: any) {
    if (err instanceof LocalDbWriteProhibitedError) {
      res.status(503).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
