import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BadgeDollarSign,
  BarChart3,
  Building2,
  Calculator,
  ClipboardList,
  Gift,
  Percent,
  Plus,
  Receipt,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  UserCog,
  Users,
} from 'lucide-react';
import { StatCard } from '@/components/ui-custom/StatCard';
import { mockApi } from '@/services/mockApi';
import type { DashboardStats, InventoryItem, Invoice, Order, SalesData } from '@/types';
import { formatLKR } from '@/lib/currency';

interface RolePermission {
  role: 'Admin' | 'Cashier' | 'Kitchen Staff';
  accessLevel: 'Full Access' | 'Scoped Access' | 'Operational Access';
  permissions: string[];
}

interface Offer {
  id: string;
  title: string;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  appliesTo: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

const rolePermissions: RolePermission[] = [
  {
    role: 'Admin',
    accessLevel: 'Full Access',
    permissions: ['Users & Roles', 'Billing', 'Inventory', 'Reports', 'System Config'],
  },
  {
    role: 'Cashier',
    accessLevel: 'Scoped Access',
    permissions: ['Orders', 'Payments', 'Invoices', 'Discount Apply'],
  },
  {
    role: 'Kitchen Staff',
    accessLevel: 'Operational Access',
    permissions: ['Order Queue', 'Order Status Update', 'Prep Notes'],
  },
];

const managedUsers = [
  { id: 'u1', name: 'Aarav Mehta', role: 'Admin', status: 'Active' },
  { id: 'u2', name: 'Nisha Rao', role: 'Cashier', status: 'Active' },
  { id: 'u3', name: 'Ravi Kumar', role: 'Kitchen Staff', status: 'On Shift' },
  { id: 'u4', name: 'Sana Iqbal', role: 'Kitchen Staff', status: 'Off Shift' },
];

const salesReportRows = [
  { period: 'Today', gross: 2840, net: 2530, tax: 310, orders: 67 },
  { period: 'This Week', gross: 19250, net: 17120, tax: 2130, orders: 468 },
  { period: 'This Month', gross: 76100, net: 67620, tax: 8480, orders: 1844 },
];

export function Admin() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [vatPercent, setVatPercent] = useState(8);
  const [serviceChargePercent, setServiceChargePercent] = useState(5);
  const [discountRule, setDiscountRule] = useState('10% on orders above LKR 10000');
  const [offerWindow, setOfferWindow] = useState('Weekdays 3PM - 6PM');
  const [restaurantName, setRestaurantName] = useState('Resto Prime');
  const [restaurantAddress, setRestaurantAddress] = useState('No504, Welivitta Road, Welivitta, Kaduwela.');
  const [restaurantContact, setRestaurantContact] = useState('+94 76 445 6658');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [offers, setOffers] = useState<Offer[]>([
    {
      id: 'off-1',
      title: 'Happy Hour 10% Off',
      code: 'HAPPY10',
      type: 'percent',
      value: 10,
      appliesTo: 'All Dine-in Orders',
      startDate: '2026-04-01',
      endDate: '2026-04-30',
      isActive: true,
    },
  ]);

  const [offerForm, setOfferForm] = useState<Omit<Offer, 'id'>>({
    title: '',
    code: '',
    type: 'percent',
    value: 0,
    appliesTo: '',
    startDate: '',
    endDate: '',
    isActive: true,
  });
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        const [dashboardStats, weeklySales, allOrders, inventory, billingInvoices] = await Promise.all([
          mockApi.getDashboardStats(),
          mockApi.getSalesData(),
          mockApi.getOrders(),
          mockApi.getInventoryItems(),
          mockApi.getInvoices(),
        ]);

        setStats(dashboardStats);
        setSalesData(weeklySales);
        setOrders(allOrders);
        setInventoryItems(inventory);
        setInvoices(billingInvoices);
      } catch (error) {
        console.error('Failed to load admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, []);

  const totals = useMemo(() => {
    const weeklySales = salesData.reduce((sum, day) => sum + day.sales, 0);
    const weeklyOrders = salesData.reduce((sum, day) => sum + day.orders, 0);
    const dailySales = Math.round(weeklySales / Math.max(salesData.length, 1));
    const dailyOrders = Math.round(weeklyOrders / Math.max(salesData.length, 1));
    const monthlySales = weeklySales * 4;
    const monthlyOrders = weeklyOrders * 4;

    const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const paidRevenue = invoices
      .filter((invoice) => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + invoice.total, 0);

    const inventoryCost = inventoryItems.reduce((sum, item) => sum + item.quantity * item.costPerUnit, 0);
    const lowStockItems = inventoryItems.filter((item) => item.quantity <= item.reorderPoint);
    const weeklyEstimatedProfit = weeklySales * 0.28;

    return {
      dailySales,
      weeklySales,
      monthlySales,
      dailyOrders,
      weeklyOrders,
      monthlyOrders,
      totalRevenue,
      paidRevenue,
      inventoryCost,
      lowStockItems,
      weeklyEstimatedProfit,
    };
  }, [salesData, invoices, inventoryItems]);

  const handleSaveSystemChanges = () => {
    setLastSavedAt(new Date().toLocaleString());
    alert('ERP system settings saved successfully.');
  };

  const resetOfferForm = () => {
    setOfferForm({
      title: '',
      code: '',
      type: 'percent',
      value: 0,
      appliesTo: '',
      startDate: '',
      endDate: '',
      isActive: true,
    });
    setEditingOfferId(null);
  };

  const handleAddOrUpdateOffer = () => {
    if (!offerForm.title.trim() || !offerForm.code.trim() || !offerForm.appliesTo.trim()) {
      alert('Please fill offer title, code and applies-to fields.');
      return;
    }

    if (offerForm.value <= 0) {
      alert('Offer value must be greater than 0.');
      return;
    }

    if (editingOfferId) {
      setOffers((current) =>
        current.map((offer) =>
          offer.id === editingOfferId
            ? { ...offer, ...offerForm }
            : offer
        )
      );
    } else {
      setOffers((current) => [
        ...current,
        {
          id: `off-${Date.now()}`,
          ...offerForm,
        },
      ]);
    }

    resetOfferForm();
  };

  const handleEditOffer = (offer: Offer) => {
    setEditingOfferId(offer.id);
    setOfferForm({
      title: offer.title,
      code: offer.code,
      type: offer.type,
      value: offer.value,
      appliesTo: offer.appliesTo,
      startDate: offer.startDate,
      endDate: offer.endDate,
      isActive: offer.isActive,
    });
  };

  const handleDeleteOffer = (offerId: string) => {
    setOffers((current) => current.filter((offer) => offer.id !== offerId));
    if (editingOfferId === offerId) {
      resetOfferForm();
    }
  };

  const toggleOfferStatus = (offerId: string) => {
    setOffers((current) =>
      current.map((offer) =>
        offer.id === offerId ? { ...offer, isActive: !offer.isActive } : offer
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-[#ff5a65] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          title="Daily Sales"
          value={totals.dailySales}
          prefix="LKR "
          icon={BadgeDollarSign}
          color="coral"
          delay={0}
        />
        <StatCard
          title="Weekly Sales"
          value={totals.weeklySales}
          prefix="LKR "
          icon={BarChart3}
          color="blue"
          delay={0.1}
        />
        <StatCard
          title="Monthly Sales"
          value={totals.monthlySales}
          prefix="LKR "
          icon={ClipboardList}
          color="green"
          delay={0.2}
        />
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders || orders.length}
          icon={Receipt}
          color="amber"
          delay={0.3}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="xl:col-span-2 bg-white border border-gray-100 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-[#ff5a65]/10 flex items-center justify-center">
              <UserCog className="w-5 h-5 text-[#ff5a65]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#151515]">User Management</h3>
              <p className="text-sm text-gray-500">Role creation, permissions and access levels</p>
            </div>
          </div>

          <div className="space-y-4">
            {rolePermissions.map((entry) => (
              <div key={entry.role} className="rounded-xl border border-gray-100 p-4 bg-gray-50/50">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-[#151515]">{entry.role}</p>
                  <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#151515] text-white">
                    {entry.accessLevel}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-gray-200 text-gray-700"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-3 pr-4 font-semibold">User</th>
                  <th className="py-3 pr-4 font-semibold">Role</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {managedUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="py-3 pr-4 text-[#151515] font-medium">{user.name}</td>
                    <td className="py-3 pr-4 text-gray-600">{user.role}</td>
                    <td className="py-3 pr-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white border border-gray-100 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#151515]">Inventory Alerts</h3>
              <p className="text-sm text-gray-500">Low stock warnings</p>
            </div>
          </div>

          <div className="space-y-3">
            {totals.lowStockItems.length === 0 && (
              <p className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
                All inventory items are healthy.
              </p>
            )}

            {totals.lowStockItems.map((item) => (
              <div key={item.id} className="p-3 rounded-lg border border-amber-200 bg-amber-50">
                <p className="font-medium text-[#151515]">{item.name}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Qty: {item.quantity} {item.unit} | Reorder point: {item.reorderPoint} {item.unit}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Tracked Items</p>
              <p className="text-lg font-bold text-[#151515]">{inventoryItems.length}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-500">Inventory Value</p>
              <p className="text-lg font-bold text-[#151515]">{formatLKR(Math.round(totals.inventoryCost))}</p>
            </div>
          </div>
        </motion.section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="bg-white border border-gray-100 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#151515]">System Configuration</h3>
              <p className="text-sm text-gray-500">Tax, discount, and restaurant details</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Percent className="w-4 h-4" /> VAT (%)
              </label>
              <input
                type="number"
                value={vatPercent}
                onChange={(event) => setVatPercent(Number(event.target.value))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a65]/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calculator className="w-4 h-4" /> Service Charge (%)
              </label>
              <input
                type="number"
                value={serviceChargePercent}
                onChange={(event) => setServiceChargePercent(Number(event.target.value))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a65]/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">Discount Rule</label>
              <input
                type="text"
                value={discountRule}
                onChange={(event) => setDiscountRule(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a65]/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">Offer Window</label>
              <input
                type="text"
                value={offerWindow}
                onChange={(event) => setOfferWindow(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a65]/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">Restaurant Name</label>
              <input
                type="text"
                value={restaurantName}
                onChange={(event) => setRestaurantName(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a65]/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">Address</label>
              <input
                type="text"
                value={restaurantAddress}
                onChange={(event) => setRestaurantAddress(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a65]/30"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2">Contact</label>
              <input
                type="text"
                value={restaurantContact}
                onChange={(event) => setRestaurantContact(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a65]/30"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                onClick={handleSaveSystemChanges}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#151515] text-white hover:bg-[#151515]/90 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save ERP Changes
              </button>
              {lastSavedAt && <p className="text-xs text-gray-500">Last saved: {lastSavedAt}</p>}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white border border-gray-100 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#151515]">Reports & Analytics</h3>
              <p className="text-sm text-gray-500">Sales, inventory usage, and P&L view</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl p-4 bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500">Revenue Collected</p>
              <p className="text-xl font-bold text-[#151515] mt-1">{formatLKR(Math.round(totals.paidRevenue))}</p>
            </div>
            <div className="rounded-xl p-4 bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500">Total Billed</p>
              <p className="text-xl font-bold text-[#151515] mt-1">{formatLKR(Math.round(totals.totalRevenue))}</p>
            </div>
            <div className="rounded-xl p-4 bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500">Weekly Orders</p>
              <p className="text-xl font-bold text-[#151515] mt-1">{totals.weeklyOrders}</p>
            </div>
            <div className="rounded-xl p-4 bg-gray-50 border border-gray-100">
              <p className="text-xs text-gray-500">Estimated Weekly Profit</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">{formatLKR(Math.round(totals.weeklyEstimatedProfit))}</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-500">
                  <th className="py-3 px-3 font-semibold">Period</th>
                  <th className="py-3 px-3 font-semibold">Gross</th>
                  <th className="py-3 px-3 font-semibold">Net</th>
                  <th className="py-3 px-3 font-semibold">Tax</th>
                  <th className="py-3 px-3 font-semibold">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {salesReportRows.map((row) => (
                  <tr key={row.period}>
                    <td className="py-3 px-3 font-medium text-[#151515]">{row.period}</td>
                    <td className="py-3 px-3 text-gray-700">{formatLKR(row.gross)}</td>
                    <td className="py-3 px-3 text-gray-700">{formatLKR(row.net)}</td>
                    <td className="py-3 px-3 text-gray-700">{formatLKR(row.tax)}</td>
                    <td className="py-3 px-3 text-gray-700">{row.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg p-3 bg-blue-50 text-blue-800 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Inventory usage trend is stable this week.
            </div>
            <div className="rounded-lg p-3 bg-emerald-50 text-emerald-800 text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Management has full visibility across modules.
            </div>
          </div>
        </motion.section>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="bg-white border border-gray-100 rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-[#ff5a65]/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-[#ff5a65]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#151515]">Offer Management (Admin Example)</h3>
            <p className="text-sm text-gray-500">Admin can add offers and edit any promotional details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <input
            type="text"
            value={offerForm.title}
            onChange={(event) => setOfferForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Offer title"
            className="rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a65]/30"
          />
          <input
            type="text"
            value={offerForm.code}
            onChange={(event) => setOfferForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
            placeholder="Coupon code (e.g. NEW10)"
            className="rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a65]/30"
          />
          <input
            type="text"
            value={offerForm.appliesTo}
            onChange={(event) => setOfferForm((current) => ({ ...current, appliesTo: event.target.value }))}
            placeholder="Applies to"
            className="rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a65]/30"
          />
          <select
            value={offerForm.type}
            onChange={(event) => setOfferForm((current) => ({ ...current, type: event.target.value as Offer['type'] }))}
            className="rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a65]/30"
          >
            <option value="percent">Percent (%)</option>
            <option value="flat">Flat (LKR)</option>
          </select>
          <input
            type="number"
            min={0}
            value={offerForm.value}
            onChange={(event) => setOfferForm((current) => ({ ...current, value: Number(event.target.value) || 0 }))}
            placeholder="Value"
            className="rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a65]/30"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddOrUpdateOffer}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#ff5a65] text-white hover:bg-[#ff5a65]/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {editingOfferId ? 'Update Offer' : 'Add Offer'}
            </button>
            {editingOfferId && (
              <button
                onClick={resetOfferForm}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
          <input
            type="date"
            value={offerForm.startDate}
            onChange={(event) => setOfferForm((current) => ({ ...current, startDate: event.target.value }))}
            className="rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a65]/30"
          />
          <input
            type="date"
            value={offerForm.endDate}
            onChange={(event) => setOfferForm((current) => ({ ...current, endDate: event.target.value }))}
            className="rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#ff5a65]/30"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={offerForm.isActive}
              onChange={(event) => setOfferForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Active Offer
          </label>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-500">
                <th className="py-3 px-3 font-semibold">Offer</th>
                <th className="py-3 px-3 font-semibold">Code</th>
                <th className="py-3 px-3 font-semibold">Discount</th>
                <th className="py-3 px-3 font-semibold">Applies To</th>
                <th className="py-3 px-3 font-semibold">Status</th>
                <th className="py-3 px-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offers.map((offer) => (
                <tr key={offer.id}>
                  <td className="py-3 px-3 font-medium text-[#151515]">{offer.title}</td>
                  <td className="py-3 px-3 text-gray-700">{offer.code}</td>
                  <td className="py-3 px-3 text-gray-700">
                    {offer.type === 'percent' ? `${offer.value}%` : formatLKR(offer.value)}
                  </td>
                  <td className="py-3 px-3 text-gray-700">{offer.appliesTo}</td>
                  <td className="py-3 px-3">
                    <button
                      onClick={() => toggleOfferStatus(offer.id)}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${offer.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {offer.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditOffer(offer)}
                        className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteOffer(offer.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  );
}