import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Minus,
  Package,
  Plus,
  Plus as PlusIcon,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import { DataTable } from '@/components/ui-custom/DataTable';
import { CircularGauge } from '@/components/ui-custom/CircularGauge';
import { mockApi } from '@/services/mockApi';
import type { InventoryItem, InventoryUsageLog } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { formatLKR } from '@/lib/currency';

type ReportPeriod = 'daily' | 'weekly';

type NewInventoryForm = Omit<InventoryItem, 'id'>;

const defaultNewItem: NewInventoryForm = {
  name: '',
  category: 'Vegetables',
  quantity: 0,
  unit: 'kg',
  minStock: 5,
  maxStock: 50,
  reorderPoint: 10,
  supplier: '',
  costPerUnit: 0,
  lastRestocked: new Date(),
  purchaseHistory: [],
};

const purchaseSeed = {
  quantity: '0',
  unitCost: '0',
  supplier: '',
};

export function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [usageLogs, setUsageLogs] = useState<InventoryUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState(0);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemForm, setNewItemForm] = useState<NewInventoryForm>(defaultNewItem);

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState(purchaseSeed);

  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('daily');

  useEffect(() => {
    loadInventoryModuleData();
  }, []);

  const loadInventoryModuleData = async () => {
    try {
      const [inventoryData, logs] = await Promise.all([
        mockApi.getInventoryItems(),
        mockApi.getInventoryUsageLogs('daily'),
      ]);
      setInventory(inventoryData);
      setUsageLogs(logs);
    } catch (error) {
      console.error('Failed to load inventory module data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsageReport = async (period: ReportPeriod) => {
    try {
      const logs = await mockApi.getInventoryUsageLogs(period);
      setUsageLogs(logs);
      setReportPeriod(period);
    } catch (error) {
      console.error('Failed to load usage report:', error);
    }
  };

  const categories = useMemo(() => {
    const dynamic = Array.from(new Set(inventory.map((item) => item.category))).sort();
    return ['All', ...dynamic];
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    if (activeCategory === 'All') return inventory;
    return inventory.filter((item) => item.category === activeCategory);
  }, [inventory, activeCategory]);

  const lowStockItems = useMemo(() => {
    return inventory.filter((item) => item.quantity <= item.reorderPoint);
  }, [inventory]);

  const usageSummary = useMemo(() => {
    const map = new Map<string, { itemName: string; quantityUsed: number; unit: string }>();

    usageLogs.forEach((log) => {
      const current = map.get(log.itemId);
      if (current) {
        current.quantityUsed += log.quantityUsed;
      } else {
        map.set(log.itemId, {
          itemName: log.itemName,
          quantityUsed: log.quantityUsed,
          unit: log.unit,
        });
      }
    });

    return Array.from(map.values())
      .sort((a, b) => b.quantityUsed - a.quantityUsed)
      .slice(0, 8);
  }, [usageLogs]);

  const totalInventoryValue = useMemo(() => {
    return inventory.reduce((sum, item) => sum + item.quantity * item.costPerUnit, 0);
  }, [inventory]);

  const getStockStatus = (item: InventoryItem) => {
    const percentage = (item.quantity / Math.max(item.maxStock, 1)) * 100;
    if (percentage <= 30) return { label: 'Low', color: 'text-red-500', bg: 'bg-red-50' };
    if (percentage <= 60) return { label: 'Medium', color: 'text-amber-500', bg: 'bg-amber-50' };
    return { label: 'Good', color: 'text-emerald-500', bg: 'bg-emerald-50' };
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
    try {
      await mockApi.deleteInventoryItem(item.id);
      await loadInventoryModuleData();
    } catch (error) {
      console.error('Failed to delete inventory item:', error);
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedItem) return;
    try {
      const newQuantity = Math.max(0, Number((selectedItem.quantity + adjustQuantity).toFixed(2)));
      await mockApi.updateInventoryQuantity(selectedItem.id, newQuantity);
      await loadInventoryModuleData();
      setShowAdjustModal(false);
      setAdjustQuantity(0);
    } catch (error) {
      console.error('Failed to adjust stock:', error);
    }
  };

  const handleAddInventoryItem = async () => {
    if (!newItemForm.name.trim()) {
      alert('Item name is required.');
      return;
    }
    if (!newItemForm.category.trim()) {
      alert('Category is required.');
      return;
    }
    try {
      await mockApi.createInventoryItem({
        ...newItemForm,
        lastRestocked: new Date(),
      });
      setShowAddModal(false);
      setNewItemForm(defaultNewItem);
      await loadInventoryModuleData();
    } catch (error) {
      console.error('Failed to add inventory item:', error);
    }
  };

  const handleSupplierPurchase = async () => {
    if (!selectedItem) return;
    const quantity = Number(purchaseForm.quantity);
    const unitCost = Number(purchaseForm.unitCost);
    const supplier = purchaseForm.supplier.trim();

    if (quantity <= 0 || unitCost <= 0 || !supplier) {
      alert('Enter valid purchase quantity, unit cost, and supplier name.');
      return;
    }

    try {
      await mockApi.addSupplierPurchase(selectedItem.id, { quantity, unitCost, supplier });
      setShowPurchaseModal(false);
      setPurchaseForm(purchaseSeed);
      await loadInventoryModuleData();
    } catch (error) {
      console.error('Failed to add supplier purchase:', error);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Item',
      render: (item: InventoryItem) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-[#151515]">{item.name}</p>
            <p className="text-sm text-gray-500">{item.category}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Stock Level',
      render: (item: InventoryItem) => {
        const status = getStockStatus(item);
        const percentage = Math.round((item.quantity / Math.max(item.maxStock, 1)) * 100);
        return (
          <div className="w-full max-w-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-[#151515]">{item.quantity} {item.unit}</span>
              <span className={cn('text-sm font-medium', status.color)}>{percentage}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(percentage, 100)}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={cn(
                  'h-full rounded-full',
                  percentage <= 30 ? 'bg-red-500' : percentage <= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                )}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: InventoryItem) => {
        const status = getStockStatus(item);
        return (
          <span className={cn('px-3 py-1 rounded-full text-sm font-medium', status.bg, status.color)}>
            {status.label}
          </span>
        );
      },
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (item: InventoryItem) => <span className="text-gray-600">{item.supplier || '-'}</span>,
    },
    {
      key: 'costPerUnit',
      header: 'Cost',
      render: (item: InventoryItem) => <span className="text-gray-600">{formatLKR(item.costPerUnit)}/{item.unit}</span>,
    },
    {
      key: 'lastRestocked',
      header: 'Last Restocked',
      render: (item: InventoryItem) => (
        <span className="text-gray-500">
          {item.lastRestocked ? format(item.lastRestocked, 'MMM d, yyyy') : 'Never'}
        </span>
      ),
    },
  ];

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
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-[#151515]">Inventory Management Module</h2>
          <p className="text-gray-500">Track stock, automate ingredient deduction, and monitor supplier purchases</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setNewItemForm(defaultNewItem);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#ff5a65] text-white rounded-xl hover:bg-[#ff5a65]/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-sm text-gray-500">Total Inventory Items</p>
          <p className="text-2xl font-bold text-[#151515] mt-1">{inventory.length}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-sm text-gray-500">Low Stock Alerts</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{lowStockItems.length}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-sm text-gray-500">Auto Deductions ({reportPeriod})</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{usageLogs.length}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <p className="text-sm text-gray-500">Inventory Value</p>
          <p className="text-2xl font-bold text-[#151515] mt-1">{formatLKR(Math.round(totalInventoryValue))}</p>
        </div>
      </motion.div>

      {lowStockItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-100 rounded-2xl p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-800">Low Stock Notification</h3>
              <p className="text-sm text-red-600">The following items reached minimum levels.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {lowStockItems.map((item) => (
              <span key={item.id} className="px-3 py-1 rounded-lg text-xs bg-white border border-red-200 text-red-700">
                {item.name}: {item.quantity} {item.unit}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-6"
      >
        {inventory.slice(0, 4).map((item, index) => (
          <div key={item.id} className="bg-white rounded-2xl p-6 border border-gray-100">
            <CircularGauge
              value={item.quantity}
              max={item.maxStock}
              label={item.name}
              sublabel={item.unit}
              delay={0.1 + index * 0.1}
            />
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
      >
        <div className="xl:col-span-2 space-y-4">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300',
                  activeCategory === category
                    ? 'bg-[#151515] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-[#ff5a65]/30'
                )}
              >
                {category}
              </button>
            ))}
          </div>

          <DataTable
            data={filteredInventory}
            columns={columns}
            keyExtractor={(item) => item.id}
            onEdit={(item) => {
              setSelectedItem(item);
              setAdjustQuantity(0);
              setShowAdjustModal(true);
            }}
            onView={(item) => {
              setSelectedItem(item);
              setPurchaseForm({
                quantity: '0',
                unitCost: item.costPerUnit.toString(),
                supplier: item.supplier || '',
              });
              setShowPurchaseModal(true);
            }}
            onDelete={handleDelete}
            searchKeys={['name', 'category', 'supplier']}
            pageSize={10}
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#151515]">Stock Reports</h3>
              <p className="text-xs text-gray-500">Daily/weekly ingredient usage from orders</p>
            </div>
            <ShoppingCart className="w-5 h-5 text-[#ff5a65]" />
          </div>

          <div className="flex gap-2 mb-4">
            <button
              onClick={() => loadUsageReport('daily')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border',
                reportPeriod === 'daily' ? 'bg-[#151515] text-white border-[#151515]' : 'bg-white border-gray-200 text-gray-600'
              )}
            >
              Daily
            </button>
            <button
              onClick={() => loadUsageReport('weekly')}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border',
                reportPeriod === 'weekly' ? 'bg-[#151515] text-white border-[#151515]' : 'bg-white border-gray-200 text-gray-600'
              )}
            >
              Weekly
            </button>
          </div>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {usageSummary.length === 0 && (
              <p className="text-sm text-gray-500 rounded-lg bg-gray-50 p-3">
                No usage logs yet. Create orders to see automatic deduction activity.
              </p>
            )}

            {usageSummary.map((row) => (
              <div key={row.itemName} className="rounded-lg bg-gray-50 border border-gray-100 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-[#151515]">{row.itemName}</p>
                  <p className="text-sm text-blue-700">
                    -{row.quantityUsed.toFixed(2)} {row.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700">
            Automatic deduction is triggered whenever new orders are placed in the Orders module.
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showAdjustModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAdjustModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-2xl max-w-md w-full"
            >
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-[#151515]">Update Stock Quantity</h3>
                <p className="text-gray-500">{selectedItem.name}</p>
              </div>

              <div className="p-6">
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Current Stock</p>
                  <p className="text-2xl font-bold text-[#151515]">{selectedItem.quantity} {selectedItem.unit}</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adjust Quantity</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setAdjustQuantity((qty) => qty - 1)}
                      className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={adjustQuantity}
                      onChange={(event) => setAdjustQuantity(Number(event.target.value) || 0)}
                      className="flex-1 text-center px-4 py-2 border border-gray-200 rounded-xl font-medium"
                    />
                    <button
                      onClick={() => setAdjustQuantity((qty) => qty + 1)}
                      className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center"
                    >
                      <PlusIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50">
                  <p className="text-sm text-gray-500">New Stock Level</p>
                  <p className={cn(
                    'text-2xl font-bold',
                    selectedItem.quantity + adjustQuantity < selectedItem.reorderPoint ? 'text-red-500' : 'text-[#151515]'
                  )}>
                    {Math.max(0, selectedItem.quantity + adjustQuantity)} {selectedItem.unit}
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setShowAdjustModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600">
                  Cancel
                </button>
                <button onClick={handleAdjustStock} className="px-4 py-2 bg-[#ff5a65] text-white rounded-xl">
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full"
            >
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-[#151515]">Add Inventory Item</h3>
                <p className="text-gray-500">Create a new raw material or ingredient record</p>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Item Name</label>
                  <input
                    value={newItemForm.name}
                    onChange={(event) => setNewItemForm((current) => ({ ...current, name: event.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Category</label>
                  <input
                    value={newItemForm.category}
                    onChange={(event) => setNewItemForm((current) => ({ ...current, category: event.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Quantity</label>
                  <input
                    type="number"
                    value={newItemForm.quantity}
                    onChange={(event) => setNewItemForm((current) => ({ ...current, quantity: Number(event.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Unit</label>
                  <input
                    value={newItemForm.unit}
                    onChange={(event) => setNewItemForm((current) => ({ ...current, unit: event.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Min Stock</label>
                  <input
                    type="number"
                    value={newItemForm.minStock}
                    onChange={(event) => setNewItemForm((current) => ({ ...current, minStock: Number(event.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Max Stock</label>
                  <input
                    type="number"
                    value={newItemForm.maxStock}
                    onChange={(event) => setNewItemForm((current) => ({ ...current, maxStock: Number(event.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Reorder Point</label>
                  <input
                    type="number"
                    value={newItemForm.reorderPoint}
                    onChange={(event) => setNewItemForm((current) => ({ ...current, reorderPoint: Number(event.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Cost / Unit</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItemForm.costPerUnit}
                    onChange={(event) => setNewItemForm((current) => ({ ...current, costPerUnit: Number(event.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Supplier</label>
                  <input
                    value={newItemForm.supplier || ''}
                    onChange={(event) => setNewItemForm((current) => ({ ...current, supplier: event.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600">
                  Cancel
                </button>
                <button onClick={handleAddInventoryItem} className="px-4 py-2 bg-[#ff5a65] text-white rounded-xl">
                  Create Item
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPurchaseModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowPurchaseModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#151515]">Supplier Management</h3>
                  <p className="text-gray-500">{selectedItem.name}</p>
                </div>
                <Truck className="w-5 h-5 text-[#ff5a65]" />
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Purchase Quantity</label>
                  <input
                    type="number"
                    value={purchaseForm.quantity}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, quantity: event.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Unit Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchaseForm.unitCost}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, unitCost: event.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Supplier Name</label>
                  <input
                    value={purchaseForm.supplier}
                    onChange={(event) => setPurchaseForm((current) => ({ ...current, supplier: event.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="px-6 pb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Purchase History</p>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-100">
                  {(selectedItem.purchaseHistory || []).length === 0 && (
                    <p className="text-sm text-gray-500 p-3">No purchases recorded yet.</p>
                  )}
                  {(selectedItem.purchaseHistory || []).map((entry, index) => (
                    <div key={`${entry.date.toISOString()}-${index}`} className="px-3 py-2 border-b border-gray-100 last:border-0 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[#151515] font-medium">{entry.supplier}</span>
                        <span className="text-gray-500">{format(entry.date, 'MMM d, yyyy')}</span>
                      </div>
                      <p className="text-gray-600">
                        +{entry.quantity} {selectedItem.unit} @ {formatLKR(entry.unitCost)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button onClick={() => setShowPurchaseModal(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600">
                  Close
                </button>
                <button onClick={handleSupplierPurchase} className="px-4 py-2 bg-[#ff5a65] text-white rounded-xl">
                  Record Purchase
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
