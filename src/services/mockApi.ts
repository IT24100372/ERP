import { 
  dashboardStats, 
  salesData, 
  recentOrders, 
  menuItems, 
  inventoryItems, 
  invoices,
  currentUser 
} from '@/data/mockData';
import type {
  Order,
  MenuItem,
  InventoryItem,
  InventoryUsageLog,
  Invoice,
  DashboardStats,
  SalesData,
  User,
} from '@/types';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');

const hasRemoteApi = () => Boolean(API_BASE_URL);

const fetchJson = async <T>(path: string, options?: RequestInit): Promise<T> => {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not configured');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

const mapRemoteOrder = (order: Order): Order => ({
  ...order,
  kitchenTicketSentAt: order.kitchenTicketSentAt ? new Date(order.kitchenTicketSentAt) : undefined,
  createdAt: new Date(order.createdAt),
  updatedAt: new Date(order.updatedAt),
});

const mapRemoteInventory = (item: InventoryItem): InventoryItem => ({
  ...item,
  lastRestocked: item.lastRestocked ? new Date(item.lastRestocked) : undefined,
  purchaseHistory: (item.purchaseHistory || []).map((entry) => ({
    ...entry,
    date: new Date(entry.date),
  })),
});

const mapRemoteInvoice = (invoice: Invoice): Invoice => ({
  ...invoice,
  createdAt: new Date(invoice.createdAt),
  paidAt: invoice.paidAt ? new Date(invoice.paidAt) : undefined,
});

const mapRemoteUsageLog = (log: InventoryUsageLog): InventoryUsageLog => ({
  ...log,
  timestamp: new Date(log.timestamp),
});

const inventoryUsageLogs: InventoryUsageLog[] = [];

const findInventoryByIngredient = (ingredient: string): InventoryItem | undefined => {
  const normalized = ingredient.toLowerCase().trim();
  return inventoryItems.find((item) => {
    const name = item.name.toLowerCase();
    return name.includes(normalized) || normalized.includes(name);
  });
};

const deductInventoryForOrder = (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>, orderId: string) => {
  order.items.forEach((orderItem) => {
    const menuItem = menuItems.find((menu) => menu.id === orderItem.menuItemId);
    if (!menuItem) return;

    menuItem.ingredients.forEach((ingredient) => {
      const inventoryItem = findInventoryByIngredient(ingredient);
      if (!inventoryItem) return;

      // Simple usage model: each ingredient consumes 0.25 unit per quantity ordered.
      const usageAmount = Number((0.25 * orderItem.quantity).toFixed(2));
      inventoryItem.quantity = Math.max(0, Number((inventoryItem.quantity - usageAmount).toFixed(2)));

      inventoryUsageLogs.unshift({
        id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        itemId: inventoryItem.id,
        itemName: inventoryItem.name,
        quantityUsed: usageAmount,
        unit: inventoryItem.unit,
        orderId,
        timestamp: new Date(),
      });
    });
  });
};

export const mockApi = {
  // Dashboard
  getDashboardStats: async (): Promise<DashboardStats> => {
    await delay(500);
    return { ...dashboardStats };
  },

  getSalesData: async (): Promise<SalesData[]> => {
    await delay(600);
    return [...salesData];
  },

  // Orders
  getOrders: async (): Promise<Order[]> => {
    if (hasRemoteApi()) {
      try {
        const remote = await fetchJson<Order[]>('/orders');
        return remote.map(mapRemoteOrder);
      } catch (error) {
        console.warn('Remote orders fetch failed, using local mock data.', error);
      }
    }

    await delay(700);
    return [...recentOrders];
  },

  getOrderById: async (id: string): Promise<Order | undefined> => {
    await delay(400);
    return recentOrders.find(order => order.id === id);
  },

  createOrder: async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> => {
    if (hasRemoteApi()) {
      try {
        const created = await fetchJson<Order>('/orders', {
          method: 'POST',
          body: JSON.stringify({
            ...order,
            id: `#${1006 + Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        });
        return mapRemoteOrder(created);
      } catch (error) {
        console.warn('Remote create order failed, using local mock data.', error);
      }
    }

    await delay(600);
    const newOrderId = `#${1006 + recentOrders.length}`;

    const newOrder: Order = {
      ...order,
      id: newOrderId,
      kitchenTicketSentAt: order.kitchenTicketSentAt ?? new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    deductInventoryForOrder(order, newOrderId);

    recentOrders.unshift(newOrder);
    return newOrder;
  },

  updateOrder: async (
    id: string,
    updates: Partial<Omit<Order, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Order> => {
    if (hasRemoteApi()) {
      try {
        const existingOrders = await fetchJson<Order[]>('/orders');
        const current = existingOrders.find((order) => order.id === id);
        if (!current) throw new Error('Order not found');

        const updated = await fetchJson<Order>(`/orders/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...current,
            ...updates,
            updatedAt: new Date().toISOString(),
          }),
        });
        return mapRemoteOrder(updated);
      } catch (error) {
        console.warn('Remote update order failed, using local mock data.', error);
      }
    }

    await delay(400);
    const index = recentOrders.findIndex((order) => order.id === id);
    if (index === -1) throw new Error('Order not found');

    recentOrders[index] = {
      ...recentOrders[index],
      ...updates,
      updatedAt: new Date(),
    };

    return recentOrders[index];
  },

  updateOrderStatus: async (id: string, status: Order['status']): Promise<Order> => {
    if (hasRemoteApi()) {
      try {
        const updated = await fetchJson<Order>(`/orders/${encodeURIComponent(id)}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
        return mapRemoteOrder(updated);
      } catch (error) {
        console.warn('Remote update order status failed, using local mock data.', error);
      }
    }

    await delay(400);
    const order = recentOrders.find(o => o.id === id);
    if (!order) throw new Error('Order not found');
    order.status = status;
    order.updatedAt = new Date();
    return order;
  },

  deleteOrder: async (id: string): Promise<void> => {
    if (hasRemoteApi()) {
      try {
        await fetchJson<void>(`/orders/${encodeURIComponent(id)}`, { method: 'DELETE' });
        return;
      } catch (error) {
        console.warn('Remote delete order failed, using local mock data.', error);
      }
    }

    await delay(400);
    const index = recentOrders.findIndex(o => o.id === id);
    if (index > -1) {
      recentOrders.splice(index, 1);
    }
  },

  // Menu
  getMenuItems: async (): Promise<MenuItem[]> => {
    if (hasRemoteApi()) {
      try {
        return await fetchJson<MenuItem[]>('/menu');
      } catch (error) {
        console.warn('Remote menu fetch failed, using local mock data.', error);
      }
    }

    await delay(600);
    return [...menuItems];
  },

  getMenuItemById: async (id: string): Promise<MenuItem | undefined> => {
    await delay(300);
    return menuItems.find(item => item.id === id);
  },

  createMenuItem: async (item: Omit<MenuItem, 'id'>): Promise<MenuItem> => {
    if (hasRemoteApi()) {
      try {
        return await fetchJson<MenuItem>('/menu', {
          method: 'POST',
          body: JSON.stringify(item),
        });
      } catch (error) {
        console.warn('Remote create menu failed, using local mock data.', error);
      }
    }

    await delay(500);
    const newItem: MenuItem = {
      ...item,
      id: `m${menuItems.length + 1}`,
    };
    menuItems.push(newItem);
    return newItem;
  },

  updateMenuItem: async (id: string, updates: Partial<MenuItem>): Promise<MenuItem> => {
    if (hasRemoteApi()) {
      try {
        const existing = await fetchJson<MenuItem[]>('/menu');
        const current = existing.find((item) => item.id === id);
        if (!current) throw new Error('Menu item not found');

        return await fetchJson<MenuItem>(`/menu/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...current, ...updates }),
        });
      } catch (error) {
        console.warn('Remote update menu failed, using local mock data.', error);
      }
    }

    await delay(400);
    const index = menuItems.findIndex(item => item.id === id);
    if (index === -1) throw new Error('Menu item not found');
    menuItems[index] = { ...menuItems[index], ...updates };
    return menuItems[index];
  },

  deleteMenuItem: async (id: string): Promise<void> => {
    if (hasRemoteApi()) {
      try {
        await fetchJson<void>(`/menu/${id}`, { method: 'DELETE' });
        return;
      } catch (error) {
        console.warn('Remote delete menu failed, using local mock data.', error);
      }
    }

    await delay(400);
    const index = menuItems.findIndex(item => item.id === id);
    if (index > -1) {
      menuItems.splice(index, 1);
    }
  },

  // Inventory
  getInventoryItems: async (): Promise<InventoryItem[]> => {
    if (hasRemoteApi()) {
      try {
        const remote = await fetchJson<InventoryItem[]>('/inventory');
        return remote.map(mapRemoteInventory);
      } catch (error) {
        console.warn('Remote inventory fetch failed, using local mock data.', error);
      }
    }

    await delay(600);
    return [...inventoryItems];
  },

  getInventoryItemById: async (id: string): Promise<InventoryItem | undefined> => {
    await delay(300);
    return inventoryItems.find(item => item.id === id);
  },

  updateInventoryQuantity: async (id: string, quantity: number): Promise<InventoryItem> => {
    if (hasRemoteApi()) {
      try {
        const updated = await fetchJson<InventoryItem>(`/inventory/${encodeURIComponent(id)}/quantity`, {
          method: 'PATCH',
          body: JSON.stringify({ quantity }),
        });
        return mapRemoteInventory(updated);
      } catch (error) {
        console.warn('Remote update inventory quantity failed, using local mock data.', error);
      }
    }

    await delay(400);
    const index = inventoryItems.findIndex(item => item.id === id);
    if (index === -1) throw new Error('Inventory item not found');
    inventoryItems[index].quantity = quantity;
    inventoryItems[index].lastRestocked = new Date();
    return inventoryItems[index];
  },

  createInventoryItem: async (item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> => {
    if (hasRemoteApi()) {
      try {
        const created = await fetchJson<InventoryItem>('/inventory', {
          method: 'POST',
          body: JSON.stringify(item),
        });
        return mapRemoteInventory(created);
      } catch (error) {
        console.warn('Remote create inventory failed, using local mock data.', error);
      }
    }

    await delay(500);
    const newItem: InventoryItem = {
      ...item,
      id: `i${inventoryItems.length + 1}`,
    };
    inventoryItems.push(newItem);
    return newItem;
  },

  updateInventoryItem: async (id: string, updates: Partial<InventoryItem>): Promise<InventoryItem> => {
    if (hasRemoteApi()) {
      try {
        const existing = await fetchJson<InventoryItem[]>('/inventory');
        const current = existing.find((item) => item.id === id);
        if (!current) throw new Error('Inventory item not found');

        const updated = await fetchJson<InventoryItem>(`/inventory/${encodeURIComponent(id)}`, {
          method: 'PUT',
          body: JSON.stringify({ ...current, ...updates }),
        });
        return mapRemoteInventory(updated);
      } catch (error) {
        console.warn('Remote update inventory failed, using local mock data.', error);
      }
    }

    await delay(400);
    const index = inventoryItems.findIndex(item => item.id === id);
    if (index === -1) throw new Error('Inventory item not found');
    inventoryItems[index] = { ...inventoryItems[index], ...updates };
    return inventoryItems[index];
  },

  deleteInventoryItem: async (id: string): Promise<void> => {
    if (hasRemoteApi()) {
      try {
        await fetchJson<void>(`/inventory/${encodeURIComponent(id)}`, { method: 'DELETE' });
        return;
      } catch (error) {
        console.warn('Remote delete inventory failed, using local mock data.', error);
      }
    }

    await delay(400);
    const index = inventoryItems.findIndex(item => item.id === id);
    if (index > -1) {
      inventoryItems.splice(index, 1);
    }
  },

  getInventoryUsageLogs: async (period: 'daily' | 'weekly' = 'daily'): Promise<InventoryUsageLog[]> => {
    if (hasRemoteApi()) {
      try {
        const logs = await fetchJson<InventoryUsageLog[]>(`/inventory/usage?period=${period}`);
        return logs.map(mapRemoteUsageLog);
      } catch (error) {
        console.warn('Remote usage logs fetch failed, using local mock data.', error);
      }
    }

    await delay(400);
    const now = new Date().getTime();
    const threshold = period === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    return inventoryUsageLogs.filter((log) => now - log.timestamp.getTime() <= threshold);
  },

  addSupplierPurchase: async (
    itemId: string,
    payload: { quantity: number; unitCost: number; supplier: string }
  ): Promise<InventoryItem> => {
    if (hasRemoteApi()) {
      try {
        const updated = await fetchJson<InventoryItem>(`/inventory/${encodeURIComponent(itemId)}/purchase`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        return mapRemoteInventory(updated);
      } catch (error) {
        console.warn('Remote supplier purchase failed, using local mock data.', error);
      }
    }

    await delay(400);
    const index = inventoryItems.findIndex((item) => item.id === itemId);
    if (index === -1) throw new Error('Inventory item not found');

    const target = inventoryItems[index];
    target.quantity = Number((target.quantity + payload.quantity).toFixed(2));
    target.costPerUnit = payload.unitCost;
    target.supplier = payload.supplier;
    target.lastRestocked = new Date();
    target.purchaseHistory = [
      {
        date: new Date(),
        quantity: payload.quantity,
        unitCost: payload.unitCost,
        supplier: payload.supplier,
      },
      ...(target.purchaseHistory || []),
    ];

    return target;
  },

  // Billing
  getInvoices: async (): Promise<Invoice[]> => {
    if (hasRemoteApi()) {
      try {
        const remote = await fetchJson<Invoice[]>('/invoices');
        return remote.map(mapRemoteInvoice);
      } catch (error) {
        console.warn('Remote invoices fetch failed, using local mock data.', error);
      }
    }

    await delay(600);
    return [...invoices];
  },

  getInvoiceById: async (id: string): Promise<Invoice | undefined> => {
    await delay(300);
    return invoices.find(inv => inv.id === id);
  },

  createInvoice: async (invoice: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> => {
    await delay(500);
    const newInvoice: Invoice = {
      ...invoice,
      id: `#INV${String(invoices.length + 1).padStart(3, '0')}`,
      receiptNumber: `RCPT-${String(invoices.length + 1).padStart(4, '0')}`,
      createdAt: new Date(),
    };
    invoices.push(newInvoice);
    return newInvoice;
  },

  generateInvoiceFromOrder: async (
    orderId: string,
    config: {
      vatRate: number;
      serviceChargeRate: number;
      discountRate: number;
      receiptType: 'print' | 'digital';
    }
  ): Promise<Invoice> => {
    if (hasRemoteApi()) {
      try {
        const generated = await fetchJson<Invoice>('/invoices/generate', {
          method: 'POST',
          body: JSON.stringify({ orderId, config }),
        });
        return mapRemoteInvoice(generated);
      } catch (error) {
        console.warn('Remote invoice generation failed, using local mock data.', error);
      }
    }

    await delay(500);
    const order = recentOrders.find((item) => item.id === orderId);
    if (!order) throw new Error('Order not found');

    const duplicate = invoices.find((invoice) => invoice.orderId === orderId);
    if (duplicate) throw new Error('Invoice already exists for this order');

    const subtotal = order.total;
    const discountAmount = Number(((subtotal * config.discountRate) / 100).toFixed(2));
    const discountedSubtotal = subtotal - discountAmount;
    const serviceChargeAmount = Number(((discountedSubtotal * config.serviceChargeRate) / 100).toFixed(2));
    const taxAmount = Number((((discountedSubtotal + serviceChargeAmount) * config.vatRate) / 100).toFixed(2));
    const total = Number((discountedSubtotal + serviceChargeAmount + taxAmount).toFixed(2));

    const newInvoice: Invoice = {
      id: `#INV${String(invoices.length + 1).padStart(3, '0')}`,
      receiptNumber: `RCPT-${String(invoices.length + 1).padStart(4, '0')}`,
      orderId: order.id,
      customerName: order.customerName,
      amount: subtotal,
      tax: taxAmount,
      total,
      vatRate: config.vatRate,
      serviceChargeRate: config.serviceChargeRate,
      discountRate: config.discountRate,
      discountAmount,
      serviceChargeAmount,
      receiptType: config.receiptType,
      status: 'pending',
      createdAt: new Date(),
    };

    invoices.unshift(newInvoice);
    return newInvoice;
  },

  updateInvoiceStatus: async (id: string, status: Invoice['status'], paymentMethod?: Invoice['paymentMethod']): Promise<Invoice> => {
    if (hasRemoteApi()) {
      try {
        const updated = await fetchJson<Invoice>(`/invoices/${encodeURIComponent(id)}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, paymentMethod }),
        });
        return mapRemoteInvoice(updated);
      } catch (error) {
        console.warn('Remote invoice status update failed, using local mock data.', error);
      }
    }

    await delay(400);
    const index = invoices.findIndex(inv => inv.id === id);
    if (index === -1) throw new Error('Invoice not found');
    invoices[index].status = status;
    if (status === 'paid') {
      invoices[index].paidAt = new Date();
      invoices[index].paymentMethod = paymentMethod;
    }
    return invoices[index];
  },

  getTransactionHistory: async (): Promise<Invoice[]> => {
    if (hasRemoteApi()) {
      try {
        const remote = await fetchJson<Invoice[]>('/invoices/transactions');
        return remote.map(mapRemoteInvoice);
      } catch (error) {
        console.warn('Remote transaction history fetch failed, using local mock data.', error);
      }
    }

    await delay(300);
    return [...invoices]
      .filter((invoice) => invoice.status === 'paid')
      .sort((a, b) => (b.paidAt?.getTime() || 0) - (a.paidAt?.getTime() || 0));
  },

  // User
  getCurrentUser: async (): Promise<User> => {
    await delay(300);
    return { ...currentUser };
  },
};
