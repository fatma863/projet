import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      <div
        className={`
          fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden
          ${sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}
        `}
        onClick={() => setSidebarOpen(false)}
        onKeyDown={(e) => { if (e.key === 'Escape') setSidebarOpen(false); }}
        role="presentation"
      />

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-40 lg:relative lg:z-auto
        transform transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="relative z-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
