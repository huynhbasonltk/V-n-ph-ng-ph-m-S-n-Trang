import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { POS } from './components/POS';
import { Customers } from './components/Customers';
import { Orders } from './components/Orders';
import { Settings } from './components/Settings';
import { ViewState } from './types';
import { Menu } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (currentView) {
      case 'DASHBOARD':
        return <Dashboard />;
      case 'INVENTORY':
        return <Inventory />;
      case 'POS':
        return <POS />;
      case 'CUSTOMERS':
        return <Customers />;
      case 'ORDERS':
        return <Orders />;
      case 'SETTINGS':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Mobile Header for Sidebar Toggle */}
        <header className="md:hidden bg-white h-14 border-b border-slate-200 flex items-center px-4 justify-between shrink-0">
          <span className="font-bold text-blue-600 text-lg">VPP Sơn Trang</span>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Menu size={24} />
          </button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto no-scrollbar">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;