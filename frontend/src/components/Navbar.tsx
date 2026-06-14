import { Search, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user } = useAuth();

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 select-none shrink-0">
      {/* Search Bar */}
      <div className="flex-1 max-w-md relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 text-slate-400 h-4 w-4 pointer-events-none" />
          <input
            type="text"
            placeholder="Search customers, campaigns..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4 text-xs font-medium">
        <button className="relative p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded transition">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
        </button>

        <div className="h-px w-4 bg-slate-200" />

        <div className="flex items-center gap-2 shrink-0">
          <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
            {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <span className="text-xs font-semibold text-slate-700">{user?.name || 'Admin'}</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
