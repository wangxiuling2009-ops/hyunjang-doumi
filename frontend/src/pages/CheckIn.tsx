import { useState, useEffect, useCallback } from 'react';
import { supabase, type Site, type Process } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import StatusBadge from '../components/StatusBadge';
import { Camera, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

const CHECKIN_OPTIONS = [
  { value: 'completed', labelKey: 'checkin.done', icon: CheckCircle, color: 'bg-green-500' },
  { value: 'delayed_half', labelKey: 'checkin.delayedHalf', icon: Clock, color: 'bg-yellow-500' },
  { value: 'delayed_full', labelKey: 'checkin.delayedFull', icon: AlertTriangle, color: 'bg-red-500' },
] as const;

export default function CheckIn() {
  const { t } = useTranslation();
  const [sites, setSites] = useState<Site[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: siteData } = await supabase.from('sites').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
    if (siteData) { setSites(siteData); if (siteData.length > 0 && !selectedSite) setSelectedSite(siteData[0].id); }
  }, [selectedSite]);

  const loadProcesses = useCallback(async () => {
    if (!selectedSite) return;
    const { data } = await supabase.from('processes').select('*').eq('site_id', selectedSite).order('display_order', { ascending: true });
    if (data) setProcesses(data);
  }, [selectedSite]);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadProcesses(); }, [selectedSite, loadProcesses]);

  const handleCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      await new Promise(r => setTimeout(r, 1000));
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());
      setPhoto(canvas.toDataURL('image/jpeg', 0.7));
    } catch {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) { const reader = new FileReader(); reader.onload = () => setPhoto(reader.result as string); reader.readAsDataURL(file); }
      };
      input.click();
    }
  };

  const handleSubmit = async () => {
    if (!selectedSite || !selectedProcess || !selectedStatus) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let photoUrl = '';
      if (photo) {
        const blob = await (await fetch(photo)).blob();
        const filePath = `${selectedSite}/${Date.now()}.jpg`;
        const { data: uploadData } = await supabase.storage.from('checkin-photos').upload(filePath, blob, { contentType: 'image/jpeg' });
        if (uploadData) { const { data: publicUrl } = supabase.storage.from('checkin-photos').getPublicUrl(filePath); photoUrl = publicUrl.publicUrl; }
      }
      await supabase.from('checkins').insert({ site_id: selectedSite, process_id: selectedProcess, user_id: user.id, status: selectedStatus, photo_url: photoUrl, note });
      const newStatus = selectedStatus === 'completed' ? 'completed' : 'delayed';
      await supabase.from('processes').update({ status: newStatus, updated_at: new Date().toISOString(), updated_by: user.id }).eq('id', selectedProcess);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setSelectedStatus(null); setPhoto(null); setNote('');
    } catch (err) { console.error('Submit error:', err); }
    finally { setSubmitting(false); }
  };

  if (success) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4"><CheckCircle size={40} className="text-green-500" /></div>
      <p className="text-lg font-bold text-gray-900">{t('checkin.success')}</p>
      <p className="text-sm text-gray-500 mt-1">{t('checkin.successMsg')}</p>
    </div>
  );

  return (
    <div>
      {sites.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
          {sites.map(site => (
            <button key={site.id} onClick={() => setSelectedSite(site.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${selectedSite === site.id ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 text-gray-600'}`}>
              {site.name}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">{t('checkin.selectProcess')}</h3>
        {processes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">{t('checkin.noProcesses')}</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {processes.map(proc => (
              <button key={proc.id} onClick={() => setSelectedProcess(proc.id)}
                className={`p-3 rounded-xl border-2 text-left ${selectedProcess === proc.id ? 'border-yellow-400 bg-yellow-50' : 'border-gray-100 hover:border-gray-200'}`}>
                <p className="text-sm font-medium text-gray-900">{proc.name}</p>
                <StatusBadge status={proc.status} size="sm" />
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedProcess && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">{t('checkin.statusUpdate')}</h3>
          <div className="grid grid-cols-3 gap-2">
            {CHECKIN_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button key={opt.value} onClick={() => setSelectedStatus(opt.value)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1 ${selectedStatus === opt.value ? 'ring-2 ring-offset-1 ring-gray-800' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <Icon size={24} className={opt.value === 'completed' ? 'text-green-500' : opt.value === 'delayed_half' ? 'text-yellow-500' : 'text-red-500'} />
                  <span className="text-xs font-medium text-gray-700">{t(opt.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedStatus && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">{t('checkin.sitePhoto')}</h3>
          {photo ? (
            <div className="relative">
              <img src={photo} alt="Site" className="w-full rounded-xl" />
              <button onClick={() => setPhoto(null)} className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">{t('checkin.removePhoto')}</button>
            </div>
          ) : (
            <button onClick={handleCapture} className="w-full py-12 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center gap-2 hover:border-yellow-400">
              <Camera size={32} className="text-gray-400" />
              <span className="text-sm text-gray-500">{t('checkin.tapPhoto')}</span>
            </button>
          )}
        </div>
      )}

      {selectedStatus && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={t('checkin.note')} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none" rows={3} />
        </div>
      )}

      {selectedStatus && (
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-4 bg-yellow-400 text-gray-900 rounded-2xl font-bold text-base hover:bg-yellow-500 disabled:opacity-50">
          {submitting ? t('checkin.submitting') : t('checkin.submit')}
        </button>
      )}
    </div>
  );
}
