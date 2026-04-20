import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Filter,
  Download,
  ChefHat,
  Trash2,
  Send,
} from 'lucide-react';
import { DataTable } from '@/components/ui-custom/DataTable';
import { StatusBadge } from '@/components/ui-custom/StatusBadge';
import { mockApi } from '@/services/mockApi';
import type { MenuItem, Order, OrderItem } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatLKR } from '@/lib/currency';

type StatusFilter = 'all' | Order['status'];

type OrderForm = {
  customerName: string;
  orderType: Order['orderType'];
  tableNumber: string;
  deliveryAddress: string;
  status: Order['status'];
};

const statusFilters: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending', label: 'Pending' },
  { id: 'preparing', label: 'Preparing' },
  { id: 'ready', label: 'Ready' },
  { id: 'completed', label: 'Served / Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const initialOrderForm: OrderForm = {
  customerName: '',
  orderType: 'dine-in',
  tableNumber: '',
  deliveryAddress: '',
  status: 'pending',
};

type OrdersRole = 'admin' | 'kitchen' | 'cashier' | 'inventory' | 'manager';

export function Orders({ role = 'admin' }: { role?: OrdersRole }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const [createForm, setCreateForm] = useState<OrderForm>(initialOrderForm);
  const [createItems, setCreateItems] = useState<OrderItem[]>([]);

  const [editForm, setEditForm] = useState<OrderForm>(initialOrderForm);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);

  const [selectedMenuId, setSelectedMenuId] = useState('');
  const [itemQty, setItemQty] = useState(1);

  const isKitchenStaff = role === 'kitchen';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [orderData, menuData] = await Promise.all([
        mockApi.getOrders(),
        mockApi.getMenuItems(),
      ]);
      setOrders(orderData);
      setMenuItems(menuData);
      if (!selectedMenuId && menuData.length > 0) {
        setSelectedMenuId(menuData[0].id);
      }
    } catch (error) {
      console.error('Failed to load orders data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return orders;
    return orders.filter((order) => order.status === activeFilter);
  }, [orders, activeFilter]);

  const statusCounts = useMemo(() => ({
    all: orders.length,
    pending: orders.filter((o) => o.status === 'pending').length,
    preparing: orders.filter((o) => o.status === 'preparing').length,
    ready: orders.filter((o) => o.status === 'ready').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  }), [orders]);

  const kdsQueue = useMemo(
    () => orders
      .filter((order) => ['pending', 'preparing', 'ready'].includes(order.status))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    [orders]
  );

  const calculateTotal = (items: OrderItem[]) => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const resetCreateForm = () => {
    setCreateForm(initialOrderForm);
    setCreateItems([]);
    setItemQty(1);
  };

  const addItem = (
    target: 'create' | 'edit',
    menuId: string,
    quantity: number,
    items: OrderItem[],
    setItems: React.Dispatch<React.SetStateAction<OrderItem[]>>
  ) => {
    const menu = menuItems.find((item) => item.id === menuId);
    if (!menu) return;

    const existing = items.find((item) => item.menuItemId === menuId);
    if (existing) {
      setItems((current) =>
        current.map((item) =>
          item.menuItemId === menuId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
      return;
    }

    const newItem: OrderItem = {
      id: `${target}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      menuItemId: menu.id,
      name: menu.name,
      quantity,
      price: menu.price,
    };
    setItems((current) => [...current, newItem]);
  };

  const updateItemQuantity = (
    itemId: string,
    quantity: number,
    setItems: React.Dispatch<React.SetStateAction<OrderItem[]>>
  ) => {
    if (quantity <= 0) return;
    setItems((current) => current.map((item) => (item.id === itemId ? { ...item, quantity } : item)));
  };

  const removeItem = (itemId: string, setItems: React.Dispatch<React.SetStateAction<OrderItem[]>>) => {
    setItems((current) => current.filter((item) => item.id !== itemId));
  };

  const validateOrderForm = (form: OrderForm, items: OrderItem[]) => {
    if (!form.customerName.trim()) {
      alert('Customer name is required.');
      return false;
    }
    if (items.length === 0) {
      alert('Add at least one item to the order.');
      return false;
    }
    if (form.orderType === 'dine-in' && !form.tableNumber.trim()) {
      alert('Please select a table for dine-in orders.');
      return false;
    }
    if (form.orderType === 'delivery' && !form.deliveryAddress.trim()) {
      alert('Delivery address is required for delivery orders.');
      return false;
    }
    return true;
  };

  const handleCreateOrder = async () => {
    if (!validateOrderForm(createForm, createItems)) return;

    try {
      await mockApi.createOrder({
        customerName: createForm.customerName,
        orderType: createForm.orderType,
        items: createItems,
        total: calculateTotal(createItems),
        status: 'pending',
        tableNumber: createForm.orderType === 'dine-in' ? Number(createForm.tableNumber) : undefined,
        deliveryAddress: createForm.orderType === 'delivery' ? createForm.deliveryAddress : undefined,
        kitchenTicketSentAt: new Date(),
      });

      setShowCreateModal(false);
      resetCreateForm();
      await loadData();
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (confirm('Are you sure you want to delete this order?')) {
      try {
        await mockApi.deleteOrder(order.id);
        await loadData();
      } catch (error) {
        console.error('Failed to delete order:', error);
      }
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: Order['status']) => {
    try {
      await mockApi.updateOrderStatus(orderId, newStatus);
      await loadData();
    } catch (error) {
      console.error('Failed to update order status:', error);
    }
  };

  const handleOpenEdit = (order: Order) => {
    if (isKitchenStaff) return;
    setEditingOrder(order);
    setEditForm({
      customerName: order.customerName,
      orderType: order.orderType,
      tableNumber: order.tableNumber ? String(order.tableNumber) : '',
      deliveryAddress: order.deliveryAddress || '',
      status: order.status,
    });
    setEditItems(order.items.map((item) => ({ ...item })));
    setShowDetailModal(true);
  };

  const handleSaveOrderChanges = async () => {
    if (!editingOrder) return;
    if (!validateOrderForm(editForm, editItems)) return;

    try {
      await mockApi.updateOrder(editingOrder.id, {
        customerName: editForm.customerName,
        orderType: editForm.orderType,
        status: editForm.status,
        items: editItems,
        total: calculateTotal(editItems),
        tableNumber: editForm.orderType === 'dine-in' ? Number(editForm.tableNumber) : undefined,
        deliveryAddress: editForm.orderType === 'delivery' ? editForm.deliveryAddress : undefined,
      });

      setShowDetailModal(false);
      setEditingOrder(null);
      await loadData();
    } catch (error) {
      console.error('Failed to save order changes:', error);
    }
  };

  const columns = [
    {
      key: 'id',
      header: 'Order ID',
      render: (order: Order) => <span className="font-medium text-[#151515]">{order.id}</span>,
    },
    {
      key: 'customerName',
      header: 'Customer',
      render: (order: Order) => (
        <div>
          <p className="font-medium text-gray-700">{order.customerName}</p>
          <p className="text-xs text-gray-400 uppercase">{order.orderType}</p>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      render: (order: Order) => (
        <div className="max-w-xs">
          <p className="text-sm text-gray-600 truncate">
            {order.items.map((item) => `${item.name} x${item.quantity}`).join(', ')}
          </p>
          <p className="text-xs text-gray-400">{order.items.length} line items</p>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (order: Order) => <span className="font-semibold text-[#151515]">{formatLKR(order.total)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (order: Order) => <StatusBadge status={order.status} />,
    },
    {
      key: 'channel',
      header: 'Table / Address',
      render: (order: Order) => (
        <span className="text-gray-600">
          {order.orderType === 'dine-in' ? `Table ${order.tableNumber || '-'}` : order.deliveryAddress || '-'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Placed At',
      render: (order: Order) => <span className="text-gray-500">{format(order.createdAt, 'MMM d, h:mm a')}</span>,
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
          <h2 className="text-2xl font-bold text-[#151515]">Order Processing System</h2>
          <p className="text-gray-500">
            {isKitchenStaff
              ? 'Kitchen view: monitor queue and update order status only'
              : 'Create, modify, track, and route orders to kitchen in real-time'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filter
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </motion.button>

          {!isKitchenStaff && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                resetCreateForm();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#ff5a65] text-white rounded-xl hover:bg-[#ff5a65]/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Order
            </motion.button>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
      >
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-sm text-gray-500">Total Orders</p>
          <p className="text-2xl font-bold text-[#151515] mt-1">{orders.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-sm text-gray-500">In Kitchen Queue</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{kdsQueue.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <p className="text-sm text-gray-500">Ready To Serve / Dispatch</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{statusCounts.ready}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 xl:grid-cols-3 gap-6"
      >
        <div className="xl:col-span-2 space-y-4">
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => (
              <motion.button
                key={filter.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300',
                  activeFilter === filter.id
                    ? 'bg-[#151515] text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-[#ff5a65]/30'
                )}
              >
                {filter.label}
                <span
                  className={cn(
                    'ml-2 px-2 py-0.5 rounded-full text-xs',
                    activeFilter === filter.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {statusCounts[filter.id]}
                </span>
              </motion.button>
            ))}
          </div>

          <DataTable
            data={filteredOrders}
            columns={columns}
            keyExtractor={(order) => order.id}
            onView={isKitchenStaff ? undefined : (order) => handleOpenEdit(order)}
            onEdit={isKitchenStaff ? undefined : (order) => handleOpenEdit(order)}
            onDelete={isKitchenStaff ? undefined : handleDeleteOrder}
            searchKeys={['id', 'customerName', 'orderType']}
            pageSize={10}
          />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-[#151515]">Kitchen Display Queue</h3>
              <p className="text-xs text-gray-500">Orders are auto-sent to KDS on creation</p>
            </div>
            <ChefHat className="w-5 h-5 text-[#ff5a65]" />
          </div>

          <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
            {kdsQueue.length === 0 && (
              <div className="rounded-xl bg-emerald-50 text-emerald-700 text-sm p-3">
                Kitchen queue is clear.
              </div>
            )}

            {kdsQueue.map((order) => (
              <div key={order.id} className="rounded-xl border border-gray-100 p-3 bg-gray-50/60">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-[#151515]">{order.id}</p>
                    <p className="text-xs text-gray-500">{order.customerName}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <p className="text-xs text-gray-600 mb-2">
                  {order.orderType === 'dine-in' && `Dine-in · Table ${order.tableNumber || '-'}`}
                  {order.orderType === 'takeaway' && 'Takeaway'}
                  {order.orderType === 'delivery' && `Delivery · ${order.deliveryAddress || 'No address'}`}
                </p>

                <p className="text-xs text-gray-500 mb-3">
                  Sent to KDS: {format(order.kitchenTicketSentAt || order.createdAt, 'h:mm a')}
                </p>

                <div className="space-y-1 mb-3">
                  {order.items.slice(0, 3).map((item) => (
                    <p key={item.id} className="text-xs text-gray-700 truncate whitespace-nowrap">
                      {item.name} x{item.quantity}
                    </p>
                  ))}
                  {order.items.length > 3 && (
                    <p className="text-xs text-gray-500">+{order.items.length - 3} more item(s)</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'preparing')}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-500 text-white"
                    >
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'ready')}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-purple-500 text-white"
                    >
                      Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'completed')}
                      className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white"
                    >
                      Served / Completed
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {!isKitchenStaff && showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-xl font-bold text-[#151515]">Create New Order</h3>
                <p className="text-sm text-gray-500">Dine-in, takeaway, or delivery with automatic KDS routing</p>
              </div>

              <div className="p-6 overflow-y-auto max-h-[65vh] grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Customer Name</label>
                    <input
                      value={createForm.customerName}
                      onChange={(event) => setCreateForm((current) => ({ ...current, customerName: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                      placeholder="Enter customer name"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Order Type</label>
                    <select
                      value={createForm.orderType}
                      onChange={(event) =>
                        setCreateForm((current) => ({
                          ...current,
                          orderType: event.target.value as Order['orderType'],
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                    >
                      <option value="dine-in">Dine-in</option>
                      <option value="takeaway">Takeaway</option>
                      <option value="delivery">Delivery</option>
                    </select>
                  </div>

                  {createForm.orderType === 'dine-in' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Table Number</label>
                      <select
                        value={createForm.tableNumber}
                        onChange={(event) =>
                          setCreateForm((current) => ({ ...current, tableNumber: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                      >
                        <option value="">Select table</option>
                        {Array.from({ length: 20 }, (_, index) => index + 1).map((tableNo) => (
                          <option key={tableNo} value={String(tableNo)}>
                            Table {tableNo}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {createForm.orderType === 'delivery' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Delivery Address</label>
                      <textarea
                        value={createForm.deliveryAddress}
                        onChange={(event) =>
                          setCreateForm((current) => ({ ...current, deliveryAddress: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                        rows={3}
                        placeholder="Enter delivery address"
                      />
                    </div>
                  )}

                  <div className="rounded-xl bg-gray-50 p-3 border border-gray-100 text-sm text-gray-600">
                    Kitchen Integration: This order will be automatically sent to the Kitchen Display System with status Pending.
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-100 p-4">
                    <p className="font-semibold text-[#151515] mb-3">Add Items</p>
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                      <select
                        value={selectedMenuId}
                        onChange={(event) => setSelectedMenuId(event.target.value)}
                        className="rounded-xl border border-gray-200 px-3 py-2"
                      >
                        {menuItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({formatLKR(item.price)})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={itemQty}
                        onChange={(event) => setItemQty(Number(event.target.value) || 1)}
                        className="w-20 rounded-xl border border-gray-200 px-3 py-2"
                      />
                      <button
                        onClick={() => addItem('create', selectedMenuId, itemQty, createItems, setCreateItems)}
                        className="rounded-xl bg-[#151515] text-white px-3"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {createItems.map((item) => (
                      <div key={item.id} className="rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[#151515] truncate whitespace-nowrap">{item.name}</p>
                          <p className="text-xs text-gray-500">{formatLKR(item.price)} each</p>
                        </div>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(event) =>
                            updateItemQuantity(item.id, Number(event.target.value) || 1, setCreateItems)
                          }
                          className="w-16 rounded-lg border border-gray-200 px-2 py-1.5"
                        />
                        <button
                          onClick={() => removeItem(item.id, setCreateItems)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {createItems.length === 0 && (
                      <p className="text-sm text-gray-500">No items added yet.</p>
                    )}
                  </div>

                  <div className="rounded-xl bg-[#151515] text-white p-4 flex items-center justify-between">
                    <span className="text-sm">Order Total</span>
                    <span className="text-lg font-semibold">{formatLKR(calculateTotal(createItems))}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrder}
                  className="px-4 py-2 bg-[#ff5a65] text-white rounded-xl"
                >
                  Create & Send to Kitchen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isKitchenStaff && showDetailModal && editingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[#151515]">Edit Order {editingOrder.id}</h3>
                  <p className="text-gray-500 text-sm">Modify items, quantities, type and status</p>
                </div>
                <StatusBadge status={editForm.status} />
              </div>

              <div className="p-6 overflow-y-auto max-h-[65vh] grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Customer Name</label>
                    <input
                      value={editForm.customerName}
                      onChange={(event) => setEditForm((current) => ({ ...current, customerName: event.target.value }))}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Order Type</label>
                      <select
                        value={editForm.orderType}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            orderType: event.target.value as Order['orderType'],
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                      >
                        <option value="dine-in">Dine-in</option>
                        <option value="takeaway">Takeaway</option>
                        <option value="delivery">Delivery</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Status</label>
                      <select
                        value={editForm.status}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            status: event.target.value as Order['status'],
                          }))
                        }
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                      >
                        <option value="pending">Pending</option>
                        <option value="preparing">Preparing</option>
                        <option value="ready">Ready</option>
                        <option value="completed">Served / Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {editForm.orderType === 'dine-in' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Table Number</label>
                      <input
                        type="number"
                        min={1}
                        value={editForm.tableNumber}
                        onChange={(event) =>
                          setEditForm((current) => ({ ...current, tableNumber: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                      />
                    </div>
                  )}

                  {editForm.orderType === 'delivery' && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Delivery Address</label>
                      <textarea
                        value={editForm.deliveryAddress}
                        onChange={(event) =>
                          setEditForm((current) => ({ ...current, deliveryAddress: event.target.value }))
                        }
                        className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2"
                        rows={3}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                    <select
                      value={selectedMenuId}
                      onChange={(event) => setSelectedMenuId(event.target.value)}
                      className="rounded-xl border border-gray-200 px-3 py-2"
                    >
                      {menuItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({formatLKR(item.price)})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={itemQty}
                      onChange={(event) => setItemQty(Number(event.target.value) || 1)}
                      className="w-20 rounded-xl border border-gray-200 px-3 py-2"
                    />
                    <button
                      onClick={() => addItem('edit', selectedMenuId, itemQty, editItems, setEditItems)}
                      className="rounded-xl bg-[#151515] text-white px-3"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {editItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#151515] truncate whitespace-nowrap">{item.name}</p>
                        <p className="text-xs text-gray-500">{formatLKR(item.price)} each</p>
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(event) =>
                          updateItemQuantity(item.id, Number(event.target.value) || 1, setEditItems)
                        }
                        className="w-16 rounded-lg border border-gray-200 px-2 py-1.5"
                      />
                      <button
                        onClick={() => removeItem(item.id, setEditItems)}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {editItems.length === 0 && (
                    <p className="text-sm text-gray-500">No items in this order.</p>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 flex items-center justify-between gap-3">
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#ff5a65]" />
                  Updates remain synchronized with kitchen status flow.
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-gray-600"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSaveOrderChanges}
                    className="px-4 py-2 bg-[#ff5a65] text-white rounded-xl"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
