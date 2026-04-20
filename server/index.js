import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { query, testDbConnection } from './db.js';

dotenv.config();

const app = express();
const port = Number(process.env.API_PORT || 4000);

app.use(cors());
app.use(express.json());

const toDate = (value) => (value ? new Date(value) : undefined);

const mapMenuRow = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  price: Number(row.price),
  image: row.image,
  category: row.category,
  isAvailable: Boolean(row.is_available),
  preparationTime: Number(row.preparation_time),
  ingredients: row.ingredients ? JSON.parse(row.ingredients) : [],
  variants: row.variants ? JSON.parse(row.variants) : [],
  addOns: row.add_ons ? JSON.parse(row.add_ons) : [],
});

const mapOrderRow = (row) => ({
  id: row.id,
  customerName: row.customer_name,
  orderType: row.order_type,
  items: row.items ? JSON.parse(row.items) : [],
  total: Number(row.total),
  status: row.status,
  tableNumber: row.table_number || undefined,
  deliveryAddress: row.delivery_address || undefined,
  kitchenTicketSentAt: toDate(row.kitchen_ticket_sent_at),
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const mapInventoryRow = (row) => ({
  id: row.id,
  name: row.name,
  category: row.category,
  quantity: Number(row.quantity),
  unit: row.unit,
  minStock: Number(row.min_stock),
  maxStock: Number(row.max_stock),
  reorderPoint: Number(row.reorder_point),
  supplier: row.supplier || undefined,
  lastRestocked: toDate(row.last_restocked),
  costPerUnit: Number(row.cost_per_unit),
  purchaseHistory: row.purchase_history ? JSON.parse(row.purchase_history) : [],
});

const mapInvoiceRow = (row) => ({
  id: row.id,
  orderId: row.order_id,
  customerName: row.customer_name,
  amount: Number(row.amount),
  tax: Number(row.tax),
  total: Number(row.total),
  vatRate: row.vat_rate !== null ? Number(row.vat_rate) : undefined,
  serviceChargeRate: row.service_charge_rate !== null ? Number(row.service_charge_rate) : undefined,
  discountRate: row.discount_rate !== null ? Number(row.discount_rate) : undefined,
  discountAmount: row.discount_amount !== null ? Number(row.discount_amount) : undefined,
  serviceChargeAmount: row.service_charge_amount !== null ? Number(row.service_charge_amount) : undefined,
  receiptNumber: row.receipt_number || undefined,
  receiptType: row.receipt_type || undefined,
  status: row.status,
  createdAt: new Date(row.created_at),
  paidAt: toDate(row.paid_at),
  paymentMethod: row.payment_method || undefined,
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'resto-erp-api' });
});

app.get('/api/db/ping', async (_req, res) => {
  try {
    await testDbConnection();
    res.json({ ok: true, message: 'MySQL connection successful' });
  } catch (error) {
    res.status(500).json({ ok: false, message: 'MySQL connection failed', error: error.message });
  }
});

app.get('/api/menu', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT id, name, description, price, image, category, is_available, preparation_time, ingredients, variants, add_ons
       FROM menu_items
       ORDER BY created_at DESC`
    );

    const menu = rows.map(mapMenuRow);

    res.json(menu);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch menu items', error: error.message });
  }
});

app.post('/api/menu', async (req, res) => {
  const item = req.body;

  try {
    const newId = `m${Date.now()}`;

    await query(
      `INSERT INTO menu_items
       (id, name, description, price, image, category, is_available, preparation_time, ingredients, variants, add_ons)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId,
        item.name,
        item.description,
        item.price,
        item.image || null,
        item.category,
        item.isAvailable ? 1 : 0,
        item.preparationTime,
        JSON.stringify(item.ingredients || []),
        JSON.stringify(item.variants || []),
        JSON.stringify(item.addOns || []),
      ]
    );

    res.status(201).json({ ...item, id: newId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create menu item', error: error.message });
  }
});

app.put('/api/menu/:id', async (req, res) => {
  const { id } = req.params;
  const item = req.body;

  try {
    await query(
      `UPDATE menu_items
       SET name = ?, description = ?, price = ?, image = ?, category = ?, is_available = ?, preparation_time = ?, ingredients = ?, variants = ?, add_ons = ?
       WHERE id = ?`,
      [
        item.name,
        item.description,
        item.price,
        item.image || null,
        item.category,
        item.isAvailable ? 1 : 0,
        item.preparationTime,
        JSON.stringify(item.ingredients || []),
        JSON.stringify(item.variants || []),
        JSON.stringify(item.addOns || []),
        id,
      ]
    );

    res.json({ ...item, id });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update menu item', error: error.message });
  }
});

app.delete('/api/menu/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await query('DELETE FROM menu_items WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete menu item', error: error.message });
  }
});

app.get('/api/orders', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT id, customer_name, order_type, items, total, status, table_number, delivery_address, kitchen_ticket_sent_at, created_at, updated_at
       FROM orders
       ORDER BY created_at DESC`
    );
    res.json(rows.map(mapOrderRow));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const order = req.body;
  try {
    const id = order.id || `#${Date.now()}`;
    const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
    const updatedAt = order.updatedAt ? new Date(order.updatedAt) : new Date();

    await query(
      `INSERT INTO orders
       (id, customer_name, order_type, items, total, status, table_number, delivery_address, kitchen_ticket_sent_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        order.customerName,
        order.orderType,
        JSON.stringify(order.items || []),
        order.total,
        order.status,
        order.tableNumber || null,
        order.deliveryAddress || null,
        order.kitchenTicketSentAt ? new Date(order.kitchenTicketSentAt) : null,
        createdAt,
        updatedAt,
      ]
    );

    const rows = await query('SELECT * FROM orders WHERE id = ?', [id]);
    res.status(201).json(mapOrderRow(rows[0]));
  } catch (error) {
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  const order = req.body;
  try {
    await query(
      `UPDATE orders
       SET customer_name = ?, order_type = ?, items = ?, total = ?, status = ?, table_number = ?, delivery_address = ?, kitchen_ticket_sent_at = ?, updated_at = ?
       WHERE id = ?`,
      [
        order.customerName,
        order.orderType,
        JSON.stringify(order.items || []),
        order.total,
        order.status,
        order.tableNumber || null,
        order.deliveryAddress || null,
        order.kitchenTicketSentAt ? new Date(order.kitchenTicketSentAt) : null,
        new Date(),
        id,
      ]
    );

    const rows = await query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Order not found' });
    res.json(mapOrderRow(rows[0]));
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order', error: error.message });
  }
});

app.patch('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await query('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', [status, new Date(), id]);
    const rows = await query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Order not found' });
    res.json(mapOrderRow(rows[0]));
  } catch (error) {
    res.status(500).json({ message: 'Failed to update order status', error: error.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM orders WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete order', error: error.message });
  }
});

app.get('/api/inventory', async (_req, res) => {
  try {
    const rows = await query('SELECT * FROM inventory_items ORDER BY created_at DESC');
    res.json(rows.map(mapInventoryRow));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch inventory', error: error.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  const item = req.body;
  try {
    const id = item.id || `i${Date.now()}`;
    await query(
      `INSERT INTO inventory_items
       (id, name, category, quantity, unit, min_stock, max_stock, reorder_point, supplier, last_restocked, cost_per_unit, purchase_history)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        item.name,
        item.category,
        item.quantity,
        item.unit,
        item.minStock,
        item.maxStock,
        item.reorderPoint,
        item.supplier || null,
        item.lastRestocked ? new Date(item.lastRestocked) : null,
        item.costPerUnit,
        JSON.stringify(item.purchaseHistory || []),
      ]
    );

    const rows = await query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    res.status(201).json(mapInventoryRow(rows[0]));
  } catch (error) {
    res.status(500).json({ message: 'Failed to create inventory item', error: error.message });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  const { id } = req.params;
  const item = req.body;

  try {
    await query(
      `UPDATE inventory_items
       SET name = ?, category = ?, quantity = ?, unit = ?, min_stock = ?, max_stock = ?, reorder_point = ?, supplier = ?, last_restocked = ?, cost_per_unit = ?, purchase_history = ?
       WHERE id = ?`,
      [
        item.name,
        item.category,
        item.quantity,
        item.unit,
        item.minStock,
        item.maxStock,
        item.reorderPoint,
        item.supplier || null,
        item.lastRestocked ? new Date(item.lastRestocked) : null,
        item.costPerUnit,
        JSON.stringify(item.purchaseHistory || []),
        id,
      ]
    );

    const rows = await query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Inventory item not found' });
    res.json(mapInventoryRow(rows[0]));
  } catch (error) {
    res.status(500).json({ message: 'Failed to update inventory item', error: error.message });
  }
});

app.patch('/api/inventory/:id/quantity', async (req, res) => {
  const { id } = req.params;
  const { quantity } = req.body;

  try {
    await query('UPDATE inventory_items SET quantity = ?, last_restocked = ? WHERE id = ?', [quantity, new Date(), id]);
    const rows = await query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Inventory item not found' });
    res.json(mapInventoryRow(rows[0]));
  } catch (error) {
    res.status(500).json({ message: 'Failed to update inventory quantity', error: error.message });
  }
});

app.post('/api/inventory/:id/purchase', async (req, res) => {
  const { id } = req.params;
  const payload = req.body;

  try {
    const rows = await query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Inventory item not found' });

    const item = mapInventoryRow(rows[0]);
    const purchase = {
      date: new Date(),
      quantity: payload.quantity,
      unitCost: payload.unitCost,
      supplier: payload.supplier,
    };

    const quantity = Number((item.quantity + payload.quantity).toFixed(2));
    const history = [purchase, ...(item.purchaseHistory || [])];

    await query(
      `UPDATE inventory_items
       SET quantity = ?, supplier = ?, cost_per_unit = ?, last_restocked = ?, purchase_history = ?
       WHERE id = ?`,
      [quantity, payload.supplier, payload.unitCost, new Date(), JSON.stringify(history), id]
    );

    const updated = await query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    res.json(mapInventoryRow(updated[0]));
  } catch (error) {
    res.status(500).json({ message: 'Failed to add supplier purchase', error: error.message });
  }
});

app.get('/api/inventory/usage', async (req, res) => {
  const period = req.query.period === 'weekly' ? 'weekly' : 'daily';
  const hours = period === 'weekly' ? 7 * 24 : 24;
  try {
    const rows = await query(
      `SELECT id, item_id, item_name, quantity_used, unit, order_id, timestamp
       FROM inventory_usage_logs
       WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
       ORDER BY timestamp DESC`,
      [hours]
    );

    res.json(
      rows.map((row) => ({
        id: row.id,
        itemId: row.item_id,
        itemName: row.item_name,
        quantityUsed: Number(row.quantity_used),
        unit: row.unit,
        orderId: row.order_id,
        timestamp: new Date(row.timestamp),
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch inventory usage logs', error: error.message });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await query('DELETE FROM inventory_items WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete inventory item', error: error.message });
  }
});

app.get('/api/invoices', async (_req, res) => {
  try {
    const rows = await query('SELECT * FROM invoices ORDER BY created_at DESC');
    res.json(rows.map(mapInvoiceRow));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch invoices', error: error.message });
  }
});

app.post('/api/invoices/generate', async (req, res) => {
  const { orderId, config } = req.body;

  try {
    const orders = await query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!orders.length) return res.status(404).json({ message: 'Order not found' });

    const duplicate = await query('SELECT id FROM invoices WHERE order_id = ?', [orderId]);
    if (duplicate.length) return res.status(400).json({ message: 'Invoice already exists for this order' });

    const order = mapOrderRow(orders[0]);
    const subtotal = order.total;
    const discountAmount = Number(((subtotal * config.discountRate) / 100).toFixed(2));
    const discountedSubtotal = subtotal - discountAmount;
    const serviceChargeAmount = Number(((discountedSubtotal * config.serviceChargeRate) / 100).toFixed(2));
    const taxAmount = Number((((discountedSubtotal + serviceChargeAmount) * config.vatRate) / 100).toFixed(2));
    const total = Number((discountedSubtotal + serviceChargeAmount + taxAmount).toFixed(2));

    const id = `#INV${Date.now()}`;
    const receiptNumber = `RCPT-${Date.now()}`;
    const createdAt = new Date();

    await query(
      `INSERT INTO invoices
       (id, order_id, customer_name, amount, tax, total, vat_rate, service_charge_rate, discount_rate, discount_amount, service_charge_amount, receipt_number, receipt_type, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        order.id,
        order.customerName,
        subtotal,
        taxAmount,
        total,
        config.vatRate,
        config.serviceChargeRate,
        config.discountRate,
        discountAmount,
        serviceChargeAmount,
        receiptNumber,
        config.receiptType,
        'pending',
        createdAt,
      ]
    );

    const rows = await query('SELECT * FROM invoices WHERE id = ?', [id]);
    res.status(201).json(mapInvoiceRow(rows[0]));
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate invoice', error: error.message });
  }
});

app.patch('/api/invoices/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, paymentMethod } = req.body;

  try {
    await query(
      `UPDATE invoices
       SET status = ?, payment_method = ?, paid_at = ?
       WHERE id = ?`,
      [status, paymentMethod || null, status === 'paid' ? new Date() : null, id]
    );

    const rows = await query('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ message: 'Invoice not found' });
    res.json(mapInvoiceRow(rows[0]));
  } catch (error) {
    res.status(500).json({ message: 'Failed to update invoice status', error: error.message });
  }
});

app.get('/api/invoices/transactions', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM invoices WHERE status = 'paid' ORDER BY paid_at DESC`
    );
    res.json(rows.map(mapInvoiceRow));
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transaction history', error: error.message });
  }
});

const registerListCreateRoutes = ({ path, table, insertColumns, dateColumns = [], jsonColumns = [] }) => {
  const normalizeRow = (row) => {
    const copy = { ...row };

    jsonColumns.forEach((col) => {
      if (copy[col]) {
        try {
          copy[col] = JSON.parse(copy[col]);
        } catch {
          copy[col] = copy[col];
        }
      }
    });

    dateColumns.forEach((col) => {
      if (copy[col]) copy[col] = new Date(copy[col]);
    });

    return copy;
  };

  app.get(path, async (_req, res) => {
    try {
      const rows = await query(`SELECT * FROM ${table} ORDER BY id DESC`);
      const mapped = rows.map(normalizeRow);
      res.json(mapped);
    } catch (error) {
      res.status(500).json({ message: `Failed to fetch ${table}`, error: error.message });
    }
  });

  app.post(path, async (req, res) => {
    try {
      const body = req.body || {};
      const placeholders = insertColumns.map(() => '?').join(', ');
      const values = insertColumns.map((col) => {
        const value = body[col];
        if (value === undefined || value === null) return null;
        if (jsonColumns.includes(col)) return JSON.stringify(value);
        if (dateColumns.includes(col)) return new Date(value);
        return value;
      });

      await query(
        `INSERT INTO ${table} (${insertColumns.join(', ')}) VALUES (${placeholders})`,
        values
      );

      const rows = await query('SELECT * FROM ' + table + ' ORDER BY id DESC LIMIT 1');
      res.status(201).json(normalizeRow(rows[0]));
    } catch (error) {
      res.status(500).json({ message: `Failed to create ${table} record`, error: error.message });
    }
  });

  app.put(`${path}/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body || {};
      const setClause = insertColumns.map((col) => `${col} = ?`).join(', ');
      const values = insertColumns.map((col) => {
        const value = body[col];
        if (value === undefined || value === null) return null;
        if (jsonColumns.includes(col)) return JSON.stringify(value);
        if (dateColumns.includes(col)) return new Date(value);
        return value;
      });

      await query(`UPDATE ${table} SET ${setClause} WHERE id = ?`, [...values, id]);
      const rows = await query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
      if (!rows.length) {
        return res.status(404).json({ message: `${table} record not found` });
      }

      res.json(normalizeRow(rows[0]));
    } catch (error) {
      res.status(500).json({ message: `Failed to update ${table} record`, error: error.message });
    }
  });

  app.delete(`${path}/:id`, async (req, res) => {
    try {
      const { id } = req.params;
      await query(`DELETE FROM ${table} WHERE id = ?`, [id]);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: `Failed to delete ${table} record`, error: error.message });
    }
  });
};

registerListCreateRoutes({
  path: '/api/finance/chart-of-accounts',
  table: 'chart_of_accounts',
  insertColumns: ['code', 'name', 'account_type', 'parent_id', 'is_active'],
});

registerListCreateRoutes({
  path: '/api/finance/journal-entries',
  table: 'journal_entries',
  insertColumns: ['entry_date', 'reference_no', 'memo', 'lines', 'total_debit', 'total_credit', 'status'],
  dateColumns: ['entry_date'],
  jsonColumns: ['lines'],
});

registerListCreateRoutes({
  path: '/api/finance/accounts-payable',
  table: 'ap_invoices',
  insertColumns: ['supplier_id', 'supplier_name', 'invoice_no', 'invoice_date', 'due_date', 'amount', 'paid_amount', 'status'],
  dateColumns: ['invoice_date', 'due_date'],
});

registerListCreateRoutes({
  path: '/api/finance/accounts-receivable',
  table: 'ar_invoices',
  insertColumns: ['customer_id', 'customer_name', 'invoice_no', 'invoice_date', 'due_date', 'amount', 'received_amount', 'status'],
  dateColumns: ['invoice_date', 'due_date'],
});

registerListCreateRoutes({
  path: '/api/finance/bank-accounts',
  table: 'bank_accounts',
  insertColumns: ['account_name', 'bank_name', 'account_number', 'currency_code', 'opening_balance', 'current_balance', 'is_active'],
});

registerListCreateRoutes({
  path: '/api/finance/bank-transactions',
  table: 'bank_transactions',
  insertColumns: ['bank_account_id', 'txn_date', 'txn_type', 'amount', 'reference_no', 'description', 'reconciled'],
  dateColumns: ['txn_date'],
});

registerListCreateRoutes({
  path: '/api/finance/budgets',
  table: 'budgets',
  insertColumns: ['fiscal_year', 'period', 'department', 'budget_amount', 'actual_amount', 'variance_amount', 'notes'],
});

registerListCreateRoutes({
  path: '/api/finance/tax-filings',
  table: 'tax_filings',
  insertColumns: ['tax_type', 'filing_period', 'filing_date', 'tax_amount', 'status', 'notes'],
  dateColumns: ['filing_date'],
});

registerListCreateRoutes({
  path: '/api/sales/customers',
  table: 'crm_customers',
  insertColumns: ['customer_code', 'name', 'email', 'phone', 'address', 'credit_limit', 'is_active'],
});

registerListCreateRoutes({
  path: '/api/sales/leads',
  table: 'crm_leads',
  insertColumns: ['lead_source', 'name', 'email', 'phone', 'status', 'owner', 'notes'],
});

registerListCreateRoutes({
  path: '/api/sales/opportunities',
  table: 'crm_opportunities',
  insertColumns: ['customer_id', 'title', 'stage', 'amount', 'expected_close_date', 'owner'],
  dateColumns: ['expected_close_date'],
});

registerListCreateRoutes({
  path: '/api/sales/orders',
  table: 'sales_orders',
  insertColumns: ['order_no', 'customer_id', 'customer_name', 'order_date', 'status', 'pricing', 'line_items', 'total_amount'],
  dateColumns: ['order_date'],
  jsonColumns: ['pricing', 'line_items'],
});

registerListCreateRoutes({
  path: '/api/sales/pos-transactions',
  table: 'pos_transactions',
  insertColumns: ['txn_no', 'txn_date', 'cashier', 'items', 'subtotal', 'tax', 'discount', 'total', 'payment_method'],
  dateColumns: ['txn_date'],
  jsonColumns: ['items'],
});

registerListCreateRoutes({
  path: '/api/procurement/suppliers',
  table: 'suppliers',
  insertColumns: ['supplier_code', 'name', 'contact_person', 'email', 'phone', 'address', 'performance_score', 'is_active'],
});

registerListCreateRoutes({
  path: '/api/procurement/purchase-orders',
  table: 'purchase_orders',
  insertColumns: ['po_no', 'supplier_id', 'supplier_name', 'po_date', 'status', 'items', 'total_amount', 'approval_status'],
  dateColumns: ['po_date'],
  jsonColumns: ['items'],
});

registerListCreateRoutes({
  path: '/api/procurement/goods-receipts',
  table: 'goods_receipts',
  insertColumns: ['grn_no', 'po_id', 'receipt_date', 'received_by', 'items', 'notes'],
  dateColumns: ['receipt_date'],
  jsonColumns: ['items'],
});

registerListCreateRoutes({
  path: '/api/warehouse/warehouses',
  table: 'warehouses',
  insertColumns: ['code', 'name', 'branch_code', 'address', 'is_active'],
});

registerListCreateRoutes({
  path: '/api/warehouse/locations',
  table: 'warehouse_locations',
  insertColumns: ['warehouse_id', 'location_code', 'location_name', 'is_picking_area'],
});

registerListCreateRoutes({
  path: '/api/warehouse/stock-movements',
  table: 'stock_movements',
  insertColumns: ['movement_date', 'movement_type', 'item_code', 'quantity', 'from_location_id', 'to_location_id', 'reference_no', 'reason'],
  dateColumns: ['movement_date'],
});

registerListCreateRoutes({
  path: '/api/reporting/financial-runs',
  table: 'financial_report_runs',
  insertColumns: ['report_type', 'period_from', 'period_to', 'payload', 'created_by'],
  dateColumns: ['period_from', 'period_to'],
  jsonColumns: ['payload'],
});

registerListCreateRoutes({
  path: '/api/reporting/kpis',
  table: 'operational_kpis',
  insertColumns: ['kpi_name', 'kpi_value', 'unit', 'snapshot_date', 'module_name'],
  dateColumns: ['snapshot_date'],
});

registerListCreateRoutes({
  path: '/api/reporting/custom-reports',
  table: 'custom_reports',
  insertColumns: ['report_name', 'query_definition', 'export_format', 'created_by'],
  jsonColumns: ['query_definition'],
});

registerListCreateRoutes({
  path: '/api/admin/users',
  table: 'app_users',
  insertColumns: ['username', 'full_name', 'email', 'branch_code', 'is_active'],
});

registerListCreateRoutes({
  path: '/api/admin/roles',
  table: 'app_roles',
  insertColumns: ['role_code', 'role_name', 'permissions'],
  jsonColumns: ['permissions'],
});

registerListCreateRoutes({
  path: '/api/admin/user-role-assignments',
  table: 'user_role_assignments',
  insertColumns: ['user_id', 'role_id'],
});

registerListCreateRoutes({
  path: '/api/admin/approval-workflows',
  table: 'approval_workflows',
  insertColumns: ['module_name', 'workflow_name', 'is_active', 'steps'],
  jsonColumns: ['steps'],
});

registerListCreateRoutes({
  path: '/api/admin/audit-logs',
  table: 'audit_logs',
  insertColumns: ['event_time', 'user_name', 'module_name', 'entity_name', 'entity_id', 'action', 'before_data', 'after_data', 'ip_address'],
  dateColumns: ['event_time'],
  jsonColumns: ['before_data', 'after_data'],
});

registerListCreateRoutes({
  path: '/api/admin/branches',
  table: 'branches',
  insertColumns: ['branch_code', 'branch_name', 'address', 'is_active'],
});

registerListCreateRoutes({
  path: '/api/admin/currencies',
  table: 'currencies',
  insertColumns: ['currency_code', 'currency_name', 'symbol', 'is_base_currency', 'exchange_rate'],
});

app.listen(port, () => {
  console.log(`Resto ERP API running on http://localhost:${port}`);
});
