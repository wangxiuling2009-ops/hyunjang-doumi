import { useState, useEffect, useCallback } from 'react';
import { supabase, type Site, type Process, type Profile } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import StatusBadge from '../components/StatusBadge';
import { Plus, RefreshCw, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewSite, setShowNewSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddr, setNewSiteAddr] = useState('');

  const isManager = profile?.role === 'manager';

  const loadProfile = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (data) setProfile(data);
  }, []);

  const loadSites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isManager) {
      // Manager: own sites
      const { data } = await supabase.from('sites').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
      if (data) { setSites(data); if (data.length > 0 && !selectedSite) setSelectedSite(data[0].id); }
    } else {
      // Worker: invited sites
      const { data: sw } = await supabase.from('site_workers').select('site_id').eq('worker_id', user.id);
      if (sw && sw.length > 0) {
        const ids = sw.map(s => s.site_id);
        const { data } = await supabase.from('sites').select('*').in('id', ids).order('created_at', { ascending: false });
        if (data) { setSites(data); if (data.length > 0 && !selectedSite) setSelectedSite(data[0].id); }
      }
    }
    setLoading(false);
  }, [isManager, selectedSite]);

  const loadProcesses = useCallback(async () => {
    if (!selectedSite) return;
    const { data } = await supabase.from('processes').select('*').eq('site_id', selectedSite).order('display_order', { ascending: true });
    if (data) setProcesses(data);
  }, [selectedSite]);

  useEffect(() => { loadProfile(); }, []);
  useEffect(() => { if (profile) loadSites(); }, [profile, loadSites]);
  useEffect(() => { loadProcesses(); }, [selectedSite, loadProcesses]);

  const handleAddSite = async () => {
    if (!newSiteName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('sites').insert({ name: newSiteName, address: newSiteAddr, owner_id: user.id }).select().single();
    if (data) { setSites(prev => [data, ...prev]); setSelectedSite(data.id); setShowNewSite(false); setNewSiteName(''); setNewSiteAddr(''); }
  };

  const getTrafficColor = () => {
    if (processes.length === 0) return 'bg-gray-300';
    if (processes.some(p => p.status === 'delayed')) return 'bg-red-500';
    if (processes.some(p => p.status === 'in_progress')) return 'bg-yellow-400';
    if (processes.every(p => p.status === 'completed')) return 'bg-green-500';
    return 'bg-gray-300';
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">{t('dashboard.loading')}</div>;

  return (
    <div>
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-700">{t('dashboard.siteStatus')}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {profile?.real_name} · {isManager ? t('profile.manager') : t('profile.worker')}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-full ${getTrafficColor()} shadow-md`} />
        </div>

        {/* Site selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sites.map(site => (
            <button key={site.id} onClick={() => setSelectedSite(site.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${selectedSite === site.id ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {site.name}
            </button>
          ))}
          {isManager && (
            <button onClick={() => setShowNewSite(true)}
              className="shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
              <Plus size={16} />
            </button>
          )}
        </div>

        {/* Manager: quick link to workers */}
        {isManager && selectedSite && (
          <button onClick={() => navigate('/workers')}
            className="mt-2 w-full py-2 bg-gray-50 rounded-lg text-xs font-medium text-gray-600 flex items-center justify-center gap-1 hover:bg-gray-100">
            <Users size={14} /> {t('workers.manage')}
          </button>
        )}
      </div>

      {/* New Site Modal (manager only) */}
      {showNewSite && isManager && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <input type="text" value={newSiteName} onChange={e => setNewSiteName(e.target.value)} placeholder={t('dashboard.siteName')}
            className="w-full px-3 py-2 border rounded-lg text-sm mb-2" />
          <input type="text" value={newSiteAddr} onChange={e => setNewSiteAddr(e.target.value)} placeholder={t('dashboard.siteAddress')}
            className="w-full px-3 py-2 border rounded-lg text-sm mb-3" />
          <div className="flex gap-2">
            <button onClick={() => setShowNewSite(false)} className="flex-1 py-2 bg-gray-100 rounded-lg text-sm">{t('dashboard.cancel')}</button>
            <button onClick={handleAddSite} className="flex-1 py-2 bg-yellow-400 rounded-lg text-sm font-bold">{t('dashboard.addSite')}</button>
          </div>
        </div>
      )}

      {/* Process List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">{t('dashboard.processStatus')}</h3>
          <button onClick={loadProcesses} className="p-1 hover:bg-gray-100 rounded"><RefreshCw size={16} className="text-gray-400" /></button>
        </div>
        {processes.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">{t('dashboard.noProcesses')}</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {processes.map(proc => (
              <div key={proc.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{proc.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t('dashboard.updated')}: {new Date(proc.updated_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <StatusBadge status={proc.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
