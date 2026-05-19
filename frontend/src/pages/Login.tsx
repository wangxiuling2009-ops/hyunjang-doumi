import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogIn } from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({ email, password });
        if (result.error) throw result.error;
        // Auto sign in after signup
        result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        // New user -> go to profile setup
        navigate('/setup');
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        // Check if profile exists
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', result.data.user!.id).single();
        if (!profile) navigate('/setup');
        else navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-400 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
            <span className="text-3xl">🏗️</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">{t('app.title')}</h1>
          <p className="text-sm text-gray-700 mt-1">{t('app.subtitle')}</p>
        </div>
        <form onSubmit={handleAuth} className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{isSignUp ? t('login.createAccount') : t('login.signIn')}</h2>
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.email')}</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="worker@example.com" required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base mb-3 focus:ring-2 focus:ring-yellow-400" />
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.password')}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={t('login.passwordHint')} required minLength={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base mb-4 focus:ring-2 focus:ring-yellow-400" />
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-yellow-400 text-gray-900 rounded-xl font-bold text-base hover:bg-yellow-500 disabled:opacity-50 flex items-center justify-center gap-2">
            <LogIn size={20} />
            {loading ? t('login.loading') : isSignUp ? t('login.signUp') : t('login.signIn')}
          </button>
          <p className="text-center text-sm text-gray-500 mt-4">
            {isSignUp ? t('login.hasAccount') : t('login.noAccount')}{' '}
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-yellow-600 font-medium hover:underline">
              {isSignUp ? t('login.signIn') : t('login.signUp')}
            </button>
          </p>
        </form>
        <p className="text-center text-xs text-gray-600 mt-4">{t('login.demoHint')}</p>
      </div>
    </div>
  );
}
