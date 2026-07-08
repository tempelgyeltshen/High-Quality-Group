import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Checkout from './components/Checkout';
import Inventory from './components/Inventory';
import Employees from './components/Employees';
import Reports from './components/Reports';
import ManageSales from './components/ManageSales';
import { User } from './types';
import { ShieldCheck, Undo, HelpCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('sale');
  
  // Reload trigger to sync state updates between components
  const [syncCount, setSyncCount] = useState(0);

  // Restore session from localStorage on app boot
  useEffect(() => {
    const saved = localStorage.getItem('pos_user_session');
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('pos_user_session');
      }
    }
  }, []);

  // Auto-logout after 10 minutes of inactivity
  useEffect(() => {
    if (!currentUser) return;

    let timeoutId: any;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      // 10 minutes = 600,000 milliseconds
      timeoutId = setTimeout(() => {
        localStorage.setItem('pos_logout_reason', 'inactivity');
        handleLogout();
      }, 10 * 60 * 1000);
    };

    // Initialize timer
    resetTimer();

    // Listen to user interaction events to track activity
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    const handleEvent = () => resetTimer();

    events.forEach(event => {
      window.addEventListener(event, handleEvent, { passive: true });
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, handleEvent);
      });
    };
  }, [currentUser]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('pos_user_session', JSON.stringify(user));
    // Clear any stale logout reason when logging in again
    localStorage.removeItem('pos_logout_reason');
    // Default to checkout view on entry
    setActiveTab('sale');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pos_user_session');
  };

  const triggerSync = () => {
    setSyncCount(prev => prev + 1);
  };

  // If user is not authenticated, render our custom terminal login
  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Helper to render the active workspace panel based on sidebar state
  const renderWorkspaceContent = () => {
    switch (activeTab) {
      case 'sale':
        return (
          <Checkout 
            currentUser={currentUser} 
            onLogout={handleLogout} 
            onSaleSaved={triggerSync} 
          />
        );

      case 'manage-sales':
        return (
          <div key={syncCount}>
            <ManageSales currentUser={currentUser} />
          </div>
        );

      case 'credit-payment':
        return (
          <div key={syncCount}>
            <Reports mode="credit" currentUser={currentUser} />
          </div>
        );

      case 'sale-return':
        return (
          <div key={syncCount}>
            <Reports mode="return" currentUser={currentUser} />
          </div>
        );

      case 'day-end':
        return (
          <div key={syncCount}>
            <Reports mode="day-end" currentUser={currentUser} />
          </div>
        );

      case 'gst-report':
        return (
          <div key={syncCount}>
            <Reports mode="gst" currentUser={currentUser} />
          </div>
        );

      // Secure Admin Category Tabs
      case 'inventory':
        return currentUser.role === 'admin' ? (
          <Inventory key={syncCount} onInventoryChanged={triggerSync} />
        ) : (
          <AccessDeniedPanel />
        );

      case 'employees':
        return currentUser.role === 'admin' ? (
          <Employees key={syncCount} />
        ) : (
          <AccessDeniedPanel />
        );

      default:
        return (
          <div className="flex-1 p-6 bg-[#FEF7E5] flex items-center justify-center">
            <p className="text-xs text-slate-400 italic">Workspace panel not configured.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FEF7E5] select-none overflow-hidden h-screen">
      {/* 1. Header Navbar */}
      <Navbar currentUser={currentUser} onLogout={handleLogout} />

      {/* 2. Primary Layout (Sidebar + Content Workspace) */}
      <div className="flex flex-row flex-1 overflow-hidden">
        <Sidebar 
          activeTab={activeTab === 'day-end' || activeTab === 'sale-register' || activeTab === 'credit-report' ? activeTab : activeTab}
          setActiveTab={setActiveTab} 
          currentUser={currentUser} 
        />
        <main className="flex-1 flex flex-col overflow-hidden bg-[#FEF7E5] relative">
          {renderWorkspaceContent()}
        </main>
      </div>
    </div>
  );
}

// Inline fallback panel for unauthorized access to Admin screens
function AccessDeniedPanel() {
  return (
    <div className="flex-1 p-6 bg-[#FEF7E5] flex flex-col items-center justify-center font-sans">
      <div className="max-w-md bg-white p-8 rounded-lg shadow-sm border-l-4 border-red-600 text-center space-y-4">
        <HelpCircle className="w-12 h-12 text-red-600 mx-auto" />
        <h2 className="text-base font-extrabold text-red-800 uppercase tracking-tight">Access Prohibited</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          This system partition is strictly reserved for the <span className="font-bold text-slate-800">Admin</span> role. Your current operator session does not have permission keys to modify this SQLite master listing.
        </p>
        <p className="text-[10px] text-slate-400">
          If you are a store administrator, please log out and authenticate using administrative credentials.
        </p>
      </div>
    </div>
  );
}
