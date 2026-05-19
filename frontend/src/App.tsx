import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import Dashboard from './pages/Dashboard';
import CheckIn from './pages/CheckIn';
import Report from './pages/Report';
import Workers from './pages/Workers';

function ProtectedRoute({ children, requireProfile = true }: { children: React.ReactNode; requireProfile?: boolean }) {
  const [state, setState] = useState<'loading' | 'login' | 'setup' | 'ok'>('loading');

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return setState('login');

      if (requireProfile) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', session.user.id).single();
        if (!profile) return setState('setup');
      }

      setState('ok');
    };
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => check());
    return () => subscription.unsubscribe();
  }, [requireProfile]);

  if (state === 'loading') return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading...</div>;
  if (state === 'login') return <Navigate to="/login" />;
  if (state === 'setup') return <Navigate to="/setup" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={
          <ProtectedRoute requireProfile={false}>
            <ProfileSetup />
          </ProtectedRoute>
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="checkin" element={<CheckIn />} />
          <Route path="report" element={<Report />} />
          <Route path="workers" element={<Workers />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
