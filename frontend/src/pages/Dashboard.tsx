import { useState, useEffect, useCallback } from 'react';
import { supabase, type Site, type Process } from '../lib/supabase';
import StatusBadge from '../components/StatusBadge';
import { Plus, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const [sites, setSites] = useState<Site[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewSite, setShowNewSite] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddr, setNewSiteAddr] = useState('');

  const loadSites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('sites')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setSites(data);
      if (data.length > 0 && !selectedSite) {
        setSelectedSite(data[0].id);
      }
    }
    setLoading(false);
  }, [selectedSite]);

  const loadProcesses = useCallback(async () => {
    if (!selectedSite) return;
    const { data } = await supabase
      .from('processes')
      .select('*')
      .eq('site_id', selectedSite)
      .order('display_order', { ascending: true });

    if (data) setProcesses(data);
  }, [selectedSite]);

  useEffect(() => { loadSites(); }, []);
  useEffect(() => { loadProcesses(); }, [selectedSite, loadProcesses]);

  const handleAddSite = async () => {
    if (!newSiteName.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase.from('sites').insert({
      name: newSiteName,
      address: newSiteAddr,
      owner_id: user.id
    }).select().single();

    if (data) {
      setSites(prev => [data, ...prev]);
      setSelectedSite(data.id);
      setShowNewSite(false);
      setNewSiteName('');
      setNewSiteAddr('');
    }
  };

  // Traffic light color aggregation
  const getTrafficColor = () => {
    if (processes.length === 0) return 'bg-gray-300';
    const hasDelayed = processes.some(p => p.status === 'delayed');
    const hasInProgress = processes.some(p => p.status === 'in_progress');
    const allDone = processes.every(p => p.status === 'completed');
    if (hasDelayed) return 'bg-red-500';
    if (hasInProgress) return 'bg-yellow-400';
    if (allDone) return 'bg-green-500';
    return 'bg-gray-300';
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>;
  }

  return (
    <div>
      {/* Traffic Light Indicator */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-700">Site Status</h2>
          <div className={`w-10 h-10 rounded-full ${getTrafficColor()} shadow-md`} />
        </div>

        {/* Site selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sites.map(site => (
            <button key={site.id} onClick={() => setSelectedSite(site.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedSite === site.id
                  ? 'bg-yellow-400 text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {site.name}
            </button>
          ))}
          <button onClick={() => setShowNewSite(true)}
            className="shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* New Site Modal */}
      {showNewSite && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <input
            type="text" value={newSiteName} onChange={e => setNewSiteName(e.target.value)}
            placeholder="Site name"
            className="w-full px-3 py-2 border rounded-lg text-sm mb-2"
          />
          <input
            type="text" value={newSiteAddr} onChange={e => setNewSiteAddr(e.target.value)}
            placeholder="Address (optional)"
            className="w-full px-3 py-2 border rounded-lg text-sm mb-3"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowNewSite(false)}
              className="flex-1 py-2 bg-gray-100 rounded-lg text-sm">Cancel</button>
            <button onClick={handleAddSite}
              className="flex-1 py-2 bg-yellow-400 rounded-lg text-sm font-bold">Add Site</button>
          </div>
        </div>
      )}

      {/* Process List */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-700">Process Status</h3>
          <button onClick={loadProcesses} className="p-1 hover:bg-gray-100 rounded">
            <RefreshCw size={16} className="text-gray-400" />
          </button>
        </div>

        {processes.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No processes yet. Check-ins will appear here.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {processes.map(proc => (
              <div key={proc.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{proc.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Updated: {new Date(proc.updated_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
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
