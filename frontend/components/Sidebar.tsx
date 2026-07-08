import { useState } from 'react';
import {
  ShoppingCart,
  Receipt,
  RotateCcw,
  CalendarDays,
  FileSpreadsheet,
  AlertOctagon,
  Boxes,
  Users2,
  Lock,
  History,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
}

export default function Sidebar({ activeTab, setActiveTab, currentUser }: SidebarProps) {
  const isAdmin = currentUser?.role === 'admin';
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('pos_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('pos_sidebar_collapsed', String(next));
      return next;
    });
  };

  const menuGroups = [
    {
      title: 'TRANSACTIONS',
      items: [
        { id: 'sale', label: 'Sale', icon: ShoppingCart },
        { id: 'manage-sales', label: 'Manage Sales', icon: History },
        { id: 'credit-payment', label: 'Credit Payment', icon: Receipt },
        { id: 'sale-return', label: 'Sale Return', icon: RotateCcw },
      ]
    },
    {
      title: 'REPORTS',
      items: [
        { id: 'day-end', label: 'Day End Report', icon: CalendarDays },
        { id: 'gst-report', label: 'GST Report', icon: FileSpreadsheet },
      ]
    },
    {
      title: 'ADMIN CONTROL',
      adminOnly: true,
      items: [
        { id: 'inventory', label: 'Inventory', icon: Boxes },
        { id: 'employees', label: 'Employees', icon: Users2 },
      ]
    }
  ];

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-[#2F2F2F] border-r border-amber-100/10 text-slate-100 flex flex-col justify-between select-none shrink-0 font-sans shadow-lg transition-all duration-300`}>
      {/* Collapse Toggle Bar */}
      <div className={`p-3 flex ${isCollapsed ? 'justify-center' : 'justify-end'} border-b border-white/5`}>
        <button
          onClick={toggleCollapse}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex-1 py-4 overflow-y-auto">
        {menuGroups.map((group) => {
          const isLocked = group.adminOnly && !isAdmin;

          return (
            <div key={group.title} className="mb-6">
              {isCollapsed ? (
                <div className="border-t border-white/5 my-3 mx-2" />
              ) : (
                <div className="px-5 py-2 text-[10px] font-black text-slate-400 tracking-widest uppercase flex items-center justify-between">
                  <span>{group.title}</span>
                  {group.adminOnly && (
                    <span className="bg-amber-950/40 text-amber-400 text-[9px] px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1 border border-amber-800/30">
                      <Lock className="w-2.5 h-2.5" />
                      ADMIN
                    </span>
                  )}
                </div>
              )}
              
              <ul className="mt-1.5 space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => {
                          if (!isLocked) {
                            setActiveTab(item.id);
                          }
                        }}
                        disabled={isLocked}
                        title={item.label + (isLocked ? ' (Admin Locked)' : '')}
                        className={`w-full flex items-center transition duration-150 border-l-4 cursor-pointer ${
                          isCollapsed ? 'justify-center py-3.5 px-0' : 'gap-3 px-5 py-3 text-xs text-left'
                        } ${
                          isLocked
                            ? 'opacity-30 cursor-not-allowed text-slate-600 border-transparent'
                            : isActive
                            ? 'bg-[#FEF7E5]/10 border-[#CC9900] text-[#FCC923] font-bold'
                            : 'border-transparent text-slate-300 hover:bg-white/5 hover:text-[#FCC923]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#FCC923]' : 'text-slate-400'}`} />
                        {!isCollapsed && <span className="flex-1">{item.label}</span>}
                        {!isCollapsed && isLocked && <Lock className="w-3 h-3 text-slate-600" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
