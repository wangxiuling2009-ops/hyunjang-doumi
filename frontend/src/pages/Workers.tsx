import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase, type Site, type Profile, type SiteWorker } from '../lib/supabase';
import { UserPlus, Trash2 } from 'lucide-react';

export default function Workers() {
  const { t } = useTranslation();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [workers, setWorkers] = useState<(SiteWorker & { profile?: Profile })[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const loadSites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('sites').select('*').eq('owner_id', user.id);
    if (data) { setSites(data); if (data.length > 0 && !selectedSite) setSelectedSite(data[0].id); }
  }, [selectedSite]);

  const loadWorkers = useCallback(async () => {
    if (!selectedSite) return;
    const { data: sw } = await supabase.from('site_workers').select('*').eq('site_id', selectedSite);
    if (!sw) return;
    // Fetch profiles for each worker
    const workerIds = sw.map(w => w.worker_id);
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', workerIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    setWorkers(sw.map(w => ({ ...w, profile: profileMap.get(w.worker_id) })));
  }, [selectedSite]);

  useEffect(() => { loadSites(); }, []);
  useEffect(() => { loadWorkers(); }, [selectedSite, loadWorkers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedSite) return;
    setLoading(true); setMsg('');

    try {
      // Find user by email
      const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'worker');
      // We need to look up by auth.users email via admin API - simplified: use raw query
      // For MVP, we use a stored procedure or just try inserting
      const { data: { user: me } } = await supabase.auth.getUser();
      if (!me) throw new Error('Not logged in');

      // Since we can't query auth.users by email from client, we use a workaround:
      // Ask worker to provide their user ID, or use a server-side function.
      // For MVP, we accept user ID directly.
      const { error } = await supabase.from('site_workers').insert({
        site_id: selectedSite,
        worker_id: inviteEmail.trim(), // In production, resolve email -> UUID via Edge Function
        invited_by: me.id,
      });

      if (error) {
        if (error.code === '23505') setMsg(t('workers.alreadyInvited'));
        else if (error.code === '23503') setMsg(t('workers.userNotFound'));
        else setMsg(error.message);
      } else {
        setMsg(t('workers.inviteSuccess'));
        setInviteEmail('');
        loadWorkers();
      }
    } catch (err: any) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (workerId: string) => {
    await supabase.from('site_workers').delete().eq('site_id', selectedSite).eq('worker_id', workerId);
    loadWorkers();
  };

  return (
    <div>
      {/* Site selector */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
        {sites.map(site => (
          <button key={site.id} onClick={() => setSelectedSite(site.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${selectedSite === site.id ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 text-gray-600'}`}>
            {site.name}
          </button>
        ))}
      </div>

      {/* Invite form */}
      {selectedSite && (
        <form onSubmit={handleInvite} className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">{t('workers.inviteWorker')}</h3>
          <div className="flex gap-2">
            <input type="text" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              placeholder={t('workers.workerIdHint')}
              className="flex-1 px-3 py-2 border rounded-lg text-sm" />
            <button type="submit" disabled={loading}
              className="px-4 py-2 bg-yellow-400 rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-yellow-500 disabled:opacity-50">
              <UserPlus size={16} /> {t('workers.invite')}
            </button>
          </div>
          {msg && <p className={`text-xs mt-2 ${msg.includes('Success') || msg.includes('성공') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
        </form>
      )}

      {/* Worker list */}
      {selectedSite && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700">{t('workers.list')} ({workers.length})</h3>
          </div>
          {workers.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-400">{t('workers.empty')}</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {workers.map(w => (
                <div key={w.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{w.profile?.real_name || w.worker_id.slice(0, 8)}</p>
                    <p className="text-xs text-gray-400">{w.profile?.trade || '-'}</p>
                  </div>
                  <button onClick={() => handleRemove(w.worker_id)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
