import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Dashboard } from '@/pages/Dashboard';
import { Orders } from '@/pages/Orders';
import { Menu } from '@/pages/Menu';
import { Inventory } from '@/pages/Inventory';
import { Billing } from '@/pages/Billing';
import { Admin } from '@/pages/Admin';
import { cn } from '@/lib/utils';

type AppPage = 'dashboard' | 'admin' | 'orders' | 'menu' | 'inventory' | 'billing';
type AppRole = 'admin' | 'kitchen' | 'cashier' | 'inventory' | 'manager';

const pageTitles: Record<AppPage, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your restaurant performance' },
  admin: { title: 'Admin Module', subtitle: 'Control center for users, system settings, and analytics' },
  orders: { title: 'Orders', subtitle: 'Manage customer orders' },
  menu: { title: 'Menu', subtitle: 'Manage your restaurant menu' },
  inventory: { title: 'Inventory', subtitle: 'Track stock and supplies' },
  billing: { title: 'Billing', subtitle: 'Manage invoices and payments' },
};

const roleAccess: Record<AppRole, AppPage[]> = {
  admin: ['dashboard', 'admin', 'orders', 'menu', 'inventory', 'billing'],
  kitchen: ['orders'],
  cashier: ['orders', 'billing'],
  inventory: ['inventory'],
  manager: ['dashboard', 'orders', 'inventory'],
};

const roleLabels: Record<AppRole, string> = {
  admin: 'Admin',
  kitchen: 'Kitchen Staff',
  cashier: 'Cashier',
  inventory: 'Inventory Staff',
  manager: 'Manager',
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [activePage, setActivePage] = useState<AppPage>('dashboard');
  const [currentRole, setCurrentRole] = useState<AppRole>('admin');
  // Sidebar state can be added here when needed

  const allowedPages = useMemo(() => roleAccess[currentRole], [currentRole]);

  useEffect(() => {
    if (!allowedPages.includes(activePage)) {
      setActivePage(allowedPages[0]);
    }
  }, [activePage, allowedPages]);

  const renderPage = () => {
    if (!allowedPages.includes(activePage)) {
      return (
        <div className="rounded-2xl border border-gray-100 bg-white p-8">
          <h3 className="text-xl font-bold text-[#151515]">Access Restricted</h3>
          <p className="text-gray-500 mt-2">
            {roleLabels[currentRole]} role cannot access this module.
          </p>
        </div>
      );
    }

    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'admin':
        return <Admin />;
      case 'orders':
        return <Orders role={currentRole} />;
      case 'menu':
        return <Menu />;
      case 'inventory':
        return <Inventory />;
      case 'billing':
        return <Billing />;
      default:
        return <Dashboard />;
    }
  };

  const currentPageInfo = pageTitles[activePage] || pageTitles[allowedPages[0]];

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    setCurrentRole('admin');
    setActivePage('dashboard');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen app-shell-background flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass rounded-3xl p-8 text-center"
        >
          <h1 className="text-3xl font-bold text-slate-900">Logged Out</h1>
          <p className="text-gray-500 mt-2">You have been signed out from RestoERP.</p>
          <button
            onClick={handleLogin}
            className="mt-6 w-full rounded-xl bg-slate-900 text-white py-2.5 hover:bg-slate-800 transition-colors"
          >
            Sign In Again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-shell-background flex">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
        allowedPages={allowedPages}
        currentRole={currentRole}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300",
        "ml-64" // Default sidebar width
      )}>
        {/* Header */}
        <Header 
          title={currentPageInfo.title} 
          subtitle={currentPageInfo.subtitle} 
          role={currentRole}
          roleLabel={roleLabels[currentRole]}
          onRoleChange={setCurrentRole}
          onLogout={handleLogout}
        />

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default App;
