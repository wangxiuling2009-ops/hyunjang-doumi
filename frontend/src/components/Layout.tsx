import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ClipboardCheck, Camera, LayoutDashboard, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Status', icon: LayoutDashboard },
  { path: '/checkin', label: 'Check-in', icon: ClipboardCheck },
  { path: '/report', label: 'Report', icon: Camera },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-yellow-400 px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">Hyunjang Doumi</h1>
        <button onClick={handleLogout} className="p-2 hover:bg-yellow-500 rounded-lg transition-colors">
          <LogOut size={20} />
        </button>
      </header>
      <main className="px-4 py-4"><Outlet /></main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-40">
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${active ? 'text-yellow-600' : 'text-gray-500'}`}>
              <Icon size={22} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
