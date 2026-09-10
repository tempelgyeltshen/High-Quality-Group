import { Router } from 'express';
import {
  createSale, getSaleByNo, getSales, recordCreditPayment, processSaleReturn, validateSaleData,
} from '../database/index.js';
import { LocalDbWriteProhibitedError } from '../database/connection.js';

const router = Router();

router.get('/report/day-end', async (req, res) => {
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
      if (sale.payment_method === 'Cash') total_cash += sale.net_amount || 0;
      else if (sale.payment_method === 'Online' || sale.payment_method === 'Bank') total_bank += sale.net_amount || 0;
      else if (sale.payment_method === 'Credit') total_credit += sale.net_amount || 0;
    });

    res.json({
      sales,
      summary: {
        total_cash_sales: total_cash,
        total_bank_sales: total_bank,
        total_credit_sales: total_credit,
        total_discount_claims: total_discount,
        net_revenue: total_net,
        total_transactions: sales.length,
      },
    });
  } catch {
    res.status(500).json({ error: 'Failed to aggregate Day End report' });
  }
});

router.get('/', async (req, res) => {
  const { from, to, id } = req.query;
  try {
    if (id) {
      const sale = await getSaleByNo(id as string);
      res.json(sale ? [sale] : []);
      return;
    }
    const sales = await getSales(from as string, to as string);
    res.json(sales);
  } catch {
    res.status(500).json({ error: 'Failed to retrieve sales' });
  }
});

router.get('/:sale_no', async (req, res) => {
  try {
    const sale = await getSaleByNo(req.params.sale_no);
    if (!sale) {
      res.status(404).json({ error: 'Sale not found' });
      return;
    }
    res.json(sale);
  } catch {
    res.status(500).json({ error: 'Database error retrieving sale' });
  }
});

router.post('/', async (req, res) => {
  const body = req.body || {};
  const validationError = validateSaleData(body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const { items, total_amount, discount_applied, net_amount, payment_method, customer_name } = body;

  try {
    const result = await createSale({ items, total_amount, discount_applied, net_amount, payment_method, customer_name });
    res.status(201).json(result);
  } catch (err: any) {
    const message = err?.message || 'Unknown error';
    if (message.includes('Insufficient stock') || message.includes('not found in inventory')) {
      res.status(400).json({ error: message });
      return;
    }
    // Firestore is down in production and local writes are guarded: the sale was
    // NOT recorded. Signal service unavailability so the client retries later.
    if (err instanceof LocalDbWriteProhibitedError) {
      res.status(503).json({ error: message });
      return;
    }
    res.status(500).json({ error: 'Failed to process sale transaction: ' + message });
  }
});

router.put('/:sale_no/payment', async (req, res) => {
  try {
    const updated = await recordCreditPayment(req.params.sale_no);
    if (!updated) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.json({ message: 'Credit payment recorded successfully', sale_no: req.params.sale_no });
  } catch (err: any) {
    if (err instanceof LocalDbWriteProhibitedError) {
      res.status(503).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Database error recording payment' });
  }
});

router.put('/:sale_no/return', async (req, res) => {
  try {
    const success = await processSaleReturn(req.params.sale_no);
    if (!success) {
      res.status(400).json({ error: 'Invoice not found or already marked as returned' });
      return;
    }
    res.json({ message: 'Return processed and inventory restocked successfully', sale_no: req.params.sale_no });
  } catch (err: any) {
    if (err instanceof LocalDbWriteProhibitedError) {
      res.status(503).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Database error processing sales return' });
  }
});

export default router;
