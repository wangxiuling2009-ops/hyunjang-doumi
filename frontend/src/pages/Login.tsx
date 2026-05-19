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

  const REDIRECT_URL = import.meta.env.VITE_SITE_URL || window.location.origin;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({ email, password });
        if (result.error) throw result.error;
        result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        navigate('/setup');
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        const { data: profile } = await supabase.from('profiles').select('id').eq('id', result.data.user!.id).single();
        navigate(profile ? '/dashboard' : '/setup');
      }
    } catch (err: any) {
      setError(err.message || t('login.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'kakao') => {
    setLoading(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${REDIRECT_URL}/dashboard` }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || t('login.error'));
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

        {/* OAuth Buttons */}
        <div className="space-y-2 mb-4">
          {/* Google */}
          <button onClick={() => handleOAuth('google')} disabled={loading}
            className="w-full py-3 bg-white text-gray-800 rounded-xl font-bold text-sm shadow hover:shadow-md transition-shadow flex items-center justify-center gap-3 disabled:opacity-50">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {t('login.google')}
          </button>

          {/* Kakao */}
          <button onClick={() => handleOAuth('kakao')} disabled={loading}
            className="w-full py-3 bg-[#FEE500] text-[#3C1E1E] rounded-xl font-bold text-sm shadow hover:shadow-md transition-shadow flex items-center justify-center gap-3 disabled:opacity-50">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#3C1E1E" d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.83 5.18 4.58 6.55l-.93 3.44c-.07.27.23.49.47.34l4.1-2.74c.58.08 1.17.12 1.78.12 5.52 0 10-3.48 10-7.8S17.52 3 12 3z"/></svg>
            {t('login.kakao')}
          </button>

          {/* WeChat (coming soon) */}
          <button disabled
            className="w-full py-3 bg-[#07C160] text-white rounded-xl font-bold text-sm opacity-60 flex items-center justify-center gap-3 cursor-not-allowed">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="currentColor" d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.224 4.284c-2.99 0-5.52 2.05-6.038 4.746-.562 2.93 1.28 5.46 3.826 6.37.306.108.47.14.55.338a.56.56 0 0 1-.048.415l-.233.528c-.045.1-.118.167-.01.248.13.1.346.056.451-.016l1.098-.74a.72.72 0 0 1 .504-.1c.282.052.57.08.862.08 3.402 0 6.073-2.418 6.073-5.301 0-2.88-2.64-5.309-6.035-5.309zm-2.63 2.78c.497 0 .9.41.9.915a.908.908 0 0 1-.9.914.908.908 0 0 1-.9-.914c0-.505.403-.915.9-.915zm4.712 0c.497 0 .9.41.9.915a.908.908 0 0 1-.9.914.908.908 0 0 1-.9-.914c0-.505.403-.915.9-.915z"/></svg>
            {t('login.wechat')}
            <span className="text-xs opacity-70 ml-1">({t('login.comingSoon')})</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="text-xs text-gray-500 font-medium">{t('login.or')}</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>

        {/* Email/Password */}
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
      </div>
    </div>
  );
}
