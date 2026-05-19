import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { UserCheck } from 'lucide-react';

export default function ProfileSetup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [role, setRole] = useState<'manager' | 'worker'>('worker');
  const [realName, setRealName] = useState('');
  const [phone, setPhone] = useState('');
  const [trade, setTrade] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const TRADES = ['목공(木工)','전기(电气)','설비(水电)','도배(油漆)','타설(打灰)','기타(其他)'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!realName.trim()) return setError(t('profile.nameRequired'));
    if (role === 'worker' && !trade) return setError(t('profile.tradeRequired'));

    setLoading(true); setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { error: insertErr } = await supabase.from('profiles').insert({
        id: user.id,
        role,
        real_name: realName.trim(),
        phone: phone.trim(),
        trade: role === 'worker' ? trade : '',
      });

      if (insertErr) throw insertErr;
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-400 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-3 flex items-center justify-center shadow-lg">
            <UserCheck size={32} className="text-gray-800" />
          </div>
          <h1 className="text-xl font-extrabold text-gray-900">{t('profile.title')}</h1>
          <p className="text-sm text-gray-700 mt-1">{t('profile.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-lg">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>}

          {/* Role Selection */}
          <label className="block text-sm font-bold text-gray-700 mb-2">{t('profile.role')}</label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button type="button" onClick={() => setRole('manager')}
              className={`py-3 rounded-xl font-bold text-sm ${role === 'manager' ? 'bg-yellow-400 text-gray-900 ring-2 ring-gray-800' : 'bg-gray-100 text-gray-600'}`}>
              👷 {t('profile.manager')}
            </button>
            <button type="button" onClick={() => setRole('worker')}
              className={`py-3 rounded-xl font-bold text-sm ${role === 'worker' ? 'bg-yellow-400 text-gray-900 ring-2 ring-gray-800' : 'bg-gray-100 text-gray-600'}`}>
              🔧 {t('profile.worker')}
            </button>
          </div>

          {/* Real Name */}
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.realName')} *</label>
          <input type="text" value={realName} onChange={e => setRealName(e.target.value)}
            placeholder={t('profile.realNameHint')} required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base mb-3" />

          {/* Phone */}
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.phone')}</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="010-1234-5678"
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base mb-3" />

          {/* Trade (only for workers) */}
          {role === 'worker' && (
            <>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.trade')} *</label>
              <select value={trade} onChange={e => setTrade(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base mb-4">
                <option value="">{t('profile.selectTrade')}</option>
                {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-yellow-400 text-gray-900 rounded-xl font-bold text-base hover:bg-yellow-500 disabled:opacity-50">
            {loading ? t('login.loading') : t('profile.save')}
          </button>
        </form>
      </div>
    </div>
  );
}
