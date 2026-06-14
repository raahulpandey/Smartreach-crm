import React from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="grid grid-cols-[240px_1fr] h-screen w-screen overflow-hidden bg-slate-50">
      {/* Left sidebar column */}
      <Sidebar />

      {/* Right main workspace column */}
      <div className="flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <Navbar />

        {/* Scrollable content area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="max-w-[1200px] mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
