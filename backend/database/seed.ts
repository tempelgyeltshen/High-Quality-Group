import { hashPassword } from './connection.js';

export const defaultUsers = [
  { id: 1, username: 'admin', password_hash: hashPassword('admin123'), role: 'admin' },
  { id: 2, username: 'cashier', password_hash: hashPassword('cashier123'), role: 'cashier' },
];

export const defaultProducts = [
  { item_code: '900113', product_name: 'Bosch Armature GWS 6-100', retail_price: 1950, stock_qty: 15 },
  { item_code: '900114', product_name: 'Bosch Carbon Brush', retail_price: 180, stock_qty: 50 },
  { item_code: '900115', product_name: 'Makita Angle Grinder 4"', retail_price: 3200, stock_qty: 8 },
  { item_code: '880120', product_name: 'Dewalt Cordless Drill 18V', retail_price: 4500, stock_qty: 12 },
  { item_code: '880121', product_name: 'Screwdriver Set 6pcs', retail_price: 650, stock_qty: 25 },
  { item_code: '501221', product_name: 'WD-40 Multi-Use Spray 400ml', retail_price: 420, stock_qty: 40 },
  { item_code: '302450', product_name: 'Measuring Tape 5m Heavy Duty', retail_price: 250, stock_qty: 30 },
];

export const defaultEmployees = [
  { employee_code: 'HQG-BLHT-T001', employee_name: 'Dorji', discount_rate: 0.20 },
  { employee_code: 'EMP102', employee_name: 'Karma', discount_rate: 0.20 },
  { employee_code: 'EMP103', employee_name: 'Pema', discount_rate: 0.15 },
];
