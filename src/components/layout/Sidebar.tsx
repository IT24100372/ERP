import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Shield,
  ShoppingCart, 
  UtensilsCrossed, 
  Package, 
  Receipt, 
  ChevronLeft,
  ChevronRight,
  X,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';

type PageId = 'dashboard' | 'admin' | 'orders' | 'menu' | 'inventory' | 'billing';

interface SidebarProps {
  activePage: PageId;
  onPageChange: (page: PageId) => void;
  allowedPages: PageId[];
  currentRole: 'admin' | 'kitchen' | 'cashier' | 'inventory' | 'manager';
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

const menuItems: Array<{ id: PageId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'admin', label: 'Admin', icon: Shield },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'billing', label: 'Billing', icon: Receipt },
];

const roleLabels = {
  admin: 'Admin',
  kitchen: 'Kitchen Staff',
  cashier: 'Cashier',
  inventory: 'Inventory Staff',
  manager: 'Manager',
} as const;

export function Sidebar({
  activePage,
  onPageChange,
  allowedPages,
  currentRole,
  onLogout,
  isOpen,
  onClose,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  const visibleMenuItems = menuItems.filter((item) => allowedPages.includes(item.id));

  const handleNavigate = (page: PageId) => {
    onPageChange(page);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <motion.aside
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed left-0 top-0 h-svh md:h-screen text-white z-50 flex flex-col border-r border-slate-700/40",
          "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900/95",
          "transform transition-transform duration-300 md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-20" : "w-64"
        )}
      >
      {/* Logo */}
      <div className="h-16 sm:h-20 flex items-center justify-between border-b border-white/10 px-3">
        <motion.div 
          className="flex items-center gap-3"
          whileHover={{ scale: 1.05 }}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-600/20">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div>
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-bold text-lg tracking-tight block"
              >
                RestoERP
              </motion.span>
              <span className="text-xs text-slate-300/80">{roleLabels[currentRole]}</span>
            </div>
          )}
        </motion.div>

        {/* Close button (mobile only) */}
        <button
          type="button"
          onClick={onClose}
          className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
          aria-label="Close navigation menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3">
        <ul className="space-y-2">
          {visibleMenuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            
            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 0.3 }}
              >
                <button
                  onClick={() => handleNavigate(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                    isActive 
                      ? "bg-white/14 text-white shadow-xl shadow-slate-950/40 border border-white/15" 
                      : "hover:bg-white/8 text-slate-300 hover:text-white border border-transparent hover:border-white/10"
                  )}
                >
                  {/* Active indicator glow */}
                  {isActive && (
                    <motion.div
                      layoutId="activeGlow"
                      className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 to-blue-500/20"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  
                  <Icon className={cn(
                    "w-5 h-5 relative z-10 transition-transform duration-300",
                    isActive ? "scale-110" : "group-hover:scale-110"
                  )} />
                  
                  {!collapsed && (
                    <span className="font-medium relative z-10">{item.label}</span>
                  )}
                </button>
              </motion.li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <button
          onClick={() => {
            onLogout();
            onClose();
          }}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-slate-300 hover:text-white hover:bg-white/8 border border-transparent hover:border-white/10",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapsed}
          className={cn(
            "hidden md:flex w-full items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-slate-400 hover:text-white hover:bg-white/5",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
      </motion.aside>
    </>
  );
}
