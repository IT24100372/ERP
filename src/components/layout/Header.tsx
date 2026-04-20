import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Bell, 
  User, 
  ChevronDown,
  Check,
  Clock,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  role: 'admin' | 'kitchen' | 'cashier' | 'inventory' | 'manager';
  roleLabel: string;
  onRoleChange: (role: 'admin' | 'kitchen' | 'cashier' | 'inventory' | 'manager') => void;
  onLogout: () => void;
}

const roleOptions: Array<{ value: 'admin' | 'kitchen' | 'cashier' | 'inventory' | 'manager'; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'kitchen', label: 'Kitchen Staff' },
  { value: 'cashier', label: 'Cashier' },
  { value: 'inventory', label: 'Inventory Staff' },
  { value: 'manager', label: 'Manager' },
];

const notifications = [
  {
    id: 1,
    title: 'New Order Received',
    message: 'Order #1006 has been placed',
    time: '2 min ago',
    type: 'order',
    read: false,
  },
  {
    id: 2,
    title: 'Low Stock Alert',
    message: 'Olive Oil is running low (12L remaining)',
    time: '15 min ago',
    type: 'alert',
    read: false,
  },
  {
    id: 3,
    title: 'Payment Received',
    message: 'Invoice #INV001 has been paid',
    time: '1 hour ago',
    type: 'payment',
    read: true,
  },
];

export function Header({ title, subtitle, role, roleLabel, onRoleChange, onLogout }: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="h-20 glass border-b border-white/70 flex items-center justify-between px-6 md:px-8 sticky top-0 z-40"
    >
      {/* Left: Title & Search */}
      <div className="flex items-center gap-8">
        <div>
          <motion.h1 
            className="text-2xl font-bold text-slate-900"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            {title}
          </motion.h1>
          {subtitle && (
            <motion.p 
              className="text-sm text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {subtitle}
            </motion.p>
          )}
        </div>

        {/* Search Bar */}
        <motion.div 
          className="relative"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search orders, menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-72 lg:w-80 h-11 pl-11 pr-4 bg-white/90 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all duration-300"
          />
        </motion.div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Date */}
        <motion.div 
          className="hidden lg:flex items-center gap-2 text-sm text-slate-600 bg-white/90 border border-slate-200 px-4 py-2 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Clock className="w-4 h-4" />
          <span>{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
        </motion.div>

        {/* Notifications */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-11 h-11 flex items-center justify-center bg-white/90 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors duration-300"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-[#ff5a65] text-white text-xs font-bold flex items-center justify-center rounded-full"
              >
                {unreadCount}
              </motion.span>
            )}
          </motion.button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
              >
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-[#151515]">Notifications</h3>
                  <button className="text-sm text-[#ff5a65] hover:underline">Mark all read</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer",
                        !notification.read && "bg-[#ff5a65]/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                          notification.type === 'order' && "bg-blue-100 text-blue-600",
                          notification.type === 'alert' && "bg-amber-100 text-amber-600",
                          notification.type === 'payment' && "bg-green-100 text-green-600"
                        )}>
                          {notification.type === 'order' && <Check className="w-4 h-4" />}
                          {notification.type === 'alert' && <AlertCircle className="w-4 h-4" />}
                          {notification.type === 'payment' && <Check className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-[#151515]">{notification.title}</p>
                          <p className="text-sm text-gray-500 truncate">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-[#ff5a65] rounded-full flex-shrink-0" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden xl:flex items-center gap-2 bg-white/90 border border-slate-200 rounded-xl px-3 py-2">
          <span className="text-xs text-gray-500">Role</span>
          <select
            value={role}
            onChange={(event) => onRoleChange(event.target.value as 'admin' | 'kitchen' | 'cashier' | 'inventory' | 'manager')}
            className="text-sm font-medium bg-transparent text-[#151515] focus:outline-none"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Profile */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-3 px-3 py-2 hover:bg-slate-100 rounded-xl transition-colors duration-300 border border-transparent hover:border-slate-200"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shadow-md shadow-cyan-600/25">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="hidden md:block text-left">
              <p className="font-medium text-sm text-[#151515]">{roleLabel} User</p>
              <p className="text-xs text-gray-500">Role-based access enabled</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </motion.button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
              >
                <div className="p-4 border-b border-gray-100">
                  <p className="font-semibold text-[#151515]">{roleLabel} User</p>
                  <p className="text-sm text-gray-500">rbac@restaurant.com</p>
                </div>
                <div className="p-2">
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    Profile Settings
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    Account Preferences
                  </button>
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.header>
  );
}
