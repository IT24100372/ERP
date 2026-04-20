// Types for Restaurant ERP System

export interface Order {
  id: string;
  customerName: string;
  orderType: 'dine-in' | 'takeaway' | 'delivery';
  items: OrderItem[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  tableNumber?: number;
  deliveryAddress?: string;
  kitchenTicketSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  isAvailable: boolean;
  preparationTime: number; // in minutes
  ingredients: string[];
  variants?: MenuItemVariant[];
  addOns?: MenuItemAddOn[];
}

export interface MenuItemVariant {
  name: string;
  options: string[];
}

export interface MenuItemAddOn {
  name: string;
  price: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  maxStock: number;
  reorderPoint: number;
  supplier?: string;
  lastRestocked?: Date;
  costPerUnit: number;
  purchaseHistory?: InventoryPurchase[];
}

export interface InventoryPurchase {
  date: Date;
  quantity: number;
  unitCost: number;
  supplier: string;
}

export interface InventoryUsageLog {
  id: string;
  itemId: string;
  itemName: string;
  quantityUsed: number;
  unit: string;
  orderId: string;
  timestamp: Date;
}

export interface Invoice {
  id: string;
  orderId: string;
  customerName: string;
  amount: number;
  tax: number;
  total: number;
  vatRate?: number;
  serviceChargeRate?: number;
  discountRate?: number;
  discountAmount?: number;
  serviceChargeAmount?: number;
  receiptNumber?: string;
  receiptType?: 'print' | 'digital';
  status: 'paid' | 'pending' | 'overdue';
  createdAt: Date;
  paidAt?: Date;
  paymentMethod?: 'cash' | 'card' | 'online';
}

export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  totalDishes: number;
  salesChange: number;
  ordersChange: number;
  customersChange: number;
  dishesChange: number;
}

export interface SalesData {
  date: string;
  sales: number;
  orders: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'staff';
  avatar?: string;
}
