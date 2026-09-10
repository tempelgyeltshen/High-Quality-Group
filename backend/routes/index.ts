import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import productRoutes from './products.js';
import employeeRoutes from './employees.js';
import saleRoutes from './sales.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Login is public; everything else requires a valid session token.
router.use('/auth', authRoutes);
router.use(requireAuth);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/employees', employeeRoutes);
router.use('/sales', saleRoutes);

export default router;
