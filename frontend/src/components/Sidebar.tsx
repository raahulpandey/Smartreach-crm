import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  LayoutGrid, 
  Users, 
  Layers, 
  Send, 
  BarChart3, 
  LogOut,
  Sparkles,
  Settings
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Segments', path: '/segments', icon: Layers },
    { name: 'Campaigns', path: '/campaigns', icon: Send },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    toast('Logged out successfully', 'info');
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="w-[240px] bg-white border-r border-slate-200 select-none flex flex-col justify-between h-full p-5">
      <div className="space-y-6">
        {/* Logo at the top */}
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-slate-900 tracking-tight leading-none">SmartReach</span>
            <span className="text-[9px] text-blue-600 font-semibold tracking-wider uppercase mt-0.5">CRM System</span>
          </div>
        </div>

        {/* Menu list */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md text-xs font-bold transition-all ${
                  active 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom profile card */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
            {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Administrator'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email || 'admin@smartreach.ai'}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full py-2 border border-slate-200 hover:bg-rose-50 hover:border-rose-100 hover:text-rose-600 rounded text-xs font-bold transition"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Exit Workspace</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
