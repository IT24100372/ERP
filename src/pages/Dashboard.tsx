import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  UtensilsCrossed,
  TrendingUp,
  Clock,
  ChefHat,
  CheckCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { StatCard } from '@/components/ui-custom/StatCard';
import { StatusBadge } from '@/components/ui-custom/StatusBadge';
import { mockApi } from '@/services/mockApi';
import type { DashboardStats, SalesData, Order } from '@/types';
import { format } from 'date-fns';
import { formatLKR } from '@/lib/currency';

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, sales, orders] = await Promise.all([
          mockApi.getDashboardStats(),
          mockApi.getSalesData(),
          mockApi.getOrders(),
        ]);
        setStats(statsData);
        setSalesData(sales);
        setRecentOrders(orders.slice(0, 5));
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-[#ff5a65] border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const orderStats = {
    pending: recentOrders.filter(o => o.status === 'pending').length,
    preparing: recentOrders.filter(o => o.status === 'preparing').length,
    ready: recentOrders.filter(o => o.status === 'ready').length,
    completed: recentOrders.filter(o => o.status === 'completed').length,
  };

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sales"
          value={stats?.totalSales || 0}
          prefix="LKR "
          change={stats?.salesChange}
          icon={DollarSign}
          color="coral"
          delay={0}
        />
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders || 0}
          change={stats?.ordersChange}
          icon={ShoppingCart}
          color="blue"
          delay={0.1}
        />
        <StatCard
          title="Total Customers"
          value={stats?.totalCustomers || 0}
          change={stats?.customersChange}
          icon={Users}
          color="green"
          delay={0.2}
        />
        <StatCard
          title="Menu Items"
          value={stats?.totalDishes || 0}
          change={stats?.dishesChange}
          icon={UtensilsCrossed}
          color="amber"
          delay={0.3}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-100"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[#151515]">Sales Overview</h3>
              <p className="text-sm text-gray-500">Weekly revenue performance</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-sm text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                <TrendingUp className="w-4 h-4" />
                +12.5%
              </span>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff5a65" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ff5a65" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  tickFormatter={(value) => formatLKR(Number(value))}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#151515', 
                    border: 'none', 
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [formatLKR(value), 'Sales']}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#ff5a65" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Order Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-white rounded-2xl p-6 border border-gray-100"
        >
          <div className="mb-6">
            <h3 className="text-lg font-bold text-[#151515]">Order Status</h3>
            <p className="text-sm text-gray-500">Current order distribution</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-[#151515]">Pending</p>
                  <p className="text-sm text-gray-500">Awaiting preparation</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-amber-600">{orderStats.pending}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-[#151515]">Preparing</p>
                  <p className="text-sm text-gray-500">In the kitchen</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-600">{orderStats.preparing}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-[#151515]">Ready</p>
                  <p className="text-sm text-gray-500">Ready for pickup</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-purple-600">{orderStats.ready}</span>
            </div>

            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-[#151515]">Completed</p>
                  <p className="text-sm text-gray-500">Delivered orders</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-emerald-600">{orderStats.completed}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#151515]">Recent Orders</h3>
            <p className="text-sm text-gray-500">Latest customer orders</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-[#ff5a65] text-white rounded-xl text-sm font-medium hover:bg-[#ff5a65]/90 transition-colors"
          >
            View All
          </motion.button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Items</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Total</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.map((order, index) => (
                <motion.tr
                  key={order.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <span className="font-medium text-[#151515]">{order.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff5a65] to-[#ffa7ac] flex items-center justify-center text-white text-sm font-medium">
                        {order.customerName.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-700">{order.customerName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-600">{order.items.length} items</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-[#151515]">{formatLKR(order.total)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {format(order.createdAt, 'h:mm a')}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'New Order', icon: ShoppingCart, color: 'bg-[#ff5a65]' },
          { label: 'Add Menu Item', icon: UtensilsCrossed, color: 'bg-blue-500' },
          { label: 'Update Inventory', icon: TrendingUp, color: 'bg-emerald-500' },
          { label: 'Create Invoice', icon: DollarSign, color: 'bg-purple-500' },
        ].map((action, index) => (
          <motion.button
            key={action.label}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 + index * 0.1 }}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-[#ff5a65]/30 hover:shadow-lg hover:shadow-[#ff5a65]/10 transition-all duration-300"
          >
            <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
              <action.icon className="w-5 h-5 text-white" />
            </div>
            <span className="font-medium text-[#151515]">{action.label}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
