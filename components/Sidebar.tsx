import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, Package, ShoppingCart, Users, Menu, X, Settings, ClipboardList } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, setIsOpen }) => {
  const menuItems = [
    { id: 'DASHBOARD', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'INVENTORY', label: 'Kho hàng', icon: Package },
    { id: 'POS', label: 'Bán hàng', icon: ShoppingCart },
    { id: 'CUSTOMERS', label: 'Khách hàng', icon: Users },
    { id: 'ORDERS', label: 'Lịch sử đơn', icon: ClipboardList },
    { id: 'SETTINGS', label: 'Cài đặt', icon: Settings },
  ];

  const sidebarClasses = `
    fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    md:translate-x-0 md:static md:inset-0
  `;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={sidebarClasses}>
        <div className="flex items-center justify-between h-16 px-6 bg-slate-800">
          <span className="text-xl font-bold tracking-wider text-blue-400">VPP Sơn Trang</span>
          <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onChangeView(item.id as ViewState);
                  setIsOpen(false);
                }}
                className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors duration-200 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} className="mr-3" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-6 bg-slate-900">
          <div className="flex items-center p-3 rounded-lg bg-slate-800 border border-slate-700">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              AD
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">Admin User</p>
              <p className="text-xs text-slate-400">Chủ cửa hàng</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};