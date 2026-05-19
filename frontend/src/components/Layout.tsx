import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ClipboardCheck, Camera, LayoutDashboard, LogOut, Globe, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';

const BASE_NAV = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/checkin', labelKey: 'nav.checkin', icon: ClipboardCheck },
  { path: '/report', labelKey: 'nav.report', icon: Camera },
];

const LANGUAGES = [
  { code: 'ko', label: '한' },
  { code: 'zh', label: '中' },
  { code: 'en', label: 'EN' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
          setIsManager(data?.role === 'manager');
        });
      }
    });
  }, []);

  const navItems = isManager
    ? [...BASE_NAV, { path: '/workers', labelKey: 'nav.workers', icon: Users }]
    : BASE_NAV;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const switchLang = () => {
    const langs = ['ko', 'zh', 'en'];
    const cur = langs.indexOf(i18n.language);
    i18n.changeLanguage(langs[(cur + 1) % 3]);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-yellow-400 px-4 py-3 flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">{t('app.title')}</h1>
        <div className="flex items-center gap-1">
          <button onClick={switchLang} className="p-2 hover:bg-yellow-500 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold">
            <Globe size={16} />
            {LANGUAGES.find(l => l.code === i18n.language)?.label || 'KO'}
          </button>
          <button onClick={handleLogout} className="p-2 hover:bg-yellow-500 rounded-lg transition-colors">
            <LogOut size={20} />
          </button>
        </div>
      </header>
      <main className="px-4 py-4"><Outlet /></main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-40">
        {navItems.map(item => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${active ? 'text-yellow-600' : 'text-gray-500'}`}>
              <Icon size={22} />
              <span className="text-xs font-medium">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
