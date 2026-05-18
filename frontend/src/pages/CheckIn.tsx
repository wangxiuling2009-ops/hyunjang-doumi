import { useState, useEffect, useCallback } from 'react';
import { supabase, type Site, type Process } from '../lib/supabase';
import StatusBadge from '../components/StatusBadge';
import { Camera, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

const CHECKIN_OPTIONS = [
  { value: 'completed', label: 'Done', icon: CheckCircle, color: 'bg-green-500' },
  { value: 'delayed_half', label: 'Delayed (half)', icon: Clock, color: 'bg-yellow-500' },
  { value: 'delayed_full', label: 'Delayed (full)', icon: AlertTriangle, color: 'bg-red-500' },
] as const;

export default function CheckIn() {
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

    const { data: siteData } = await supabase
      .from('sites').select('*').eq('owner_id', user.id).order('created_at', { ascending: false });
    if (siteData) {
      setSites(siteData);
      if (siteData.length > 0 && !selectedSite) {
        setSelectedSite(siteData[0].id);
      }
    }
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

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadProcesses(); }, [selectedSite, loadProcesses]);

  // Camera capture
  const handleCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      // Simple approach: create a video element, take a snapshot
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      // Wait for video to be ready
      await new Promise(r => setTimeout(r, 1000));

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(video, 0, 0);

      // Stop the stream
      stream.getTracks().forEach(t => t.stop());

      setPhoto(canvas.toDataURL('image/jpeg', 0.7));
    } catch (err) {
      console.error('Camera error:', err);
      // Fallback: file picker
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = () => setPhoto(reader.result as string);
          reader.readAsDataURL(file);
        }
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

      // Upload photo to Supabase Storage if present
      let photoUrl = '';
      if (photo) {
        const blob = await (await fetch(photo)).blob();
        const filePath = `${selectedSite}/${Date.now()}.jpg`;
        const { data: uploadData } = await supabase.storage
          .from('checkin-photos')
          .upload(filePath, blob, { contentType: 'image/jpeg' });

        if (uploadData) {
          const { data: publicUrl } = supabase.storage
            .from('checkin-photos')
            .getPublicUrl(filePath);
          photoUrl = publicUrl.publicUrl;
        }
      }

      // Insert check-in
      await supabase.from('checkins').insert({
        site_id: selectedSite,
        process_id: selectedProcess,
        user_id: user.id,
        status: selectedStatus,
        photo_url: photoUrl,
        note
      });

      // Update process status
      const newStatus = selectedStatus === 'completed' ? 'completed' : 'delayed';
      await supabase.from('processes')
        .update({ status: newStatus, updated_at: new Date().toISOString(), updated_by: user.id })
        .eq('id', selectedProcess);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);

      // Reset
      setSelectedStatus(null);
      setPhoto(null);
      setNote('');
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <p className="text-lg font-bold text-gray-900">Check-in complete!</p>
        <p className="text-sm text-gray-500 mt-1">Status has been updated.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Site selector */}
      {sites.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-3 mb-3">
          {sites.map(site => (
            <button key={site.id} onClick={() => setSelectedSite(site.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedSite === site.id ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 text-gray-600'
              }`}>
              {site.name}
            </button>
          ))}
        </div>
      )}

      {/* Process Picker */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Select Process</h3>
        {processes.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No processes yet. Add a site first.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {processes.map(proc => (
              <button key={proc.id} onClick={() => setSelectedProcess(proc.id)}
                className={`p-3 rounded-xl border-2 transition-colors text-left ${
                  selectedProcess === proc.id
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-100 hover:border-gray-200'
                }`}>
                <p className="text-sm font-medium text-gray-900">{proc.name}</p>
                <StatusBadge status={proc.status} size="sm" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Status Selection */}
      {selectedProcess && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Status Update</h3>
          <div className="grid grid-cols-3 gap-2">
            {CHECKIN_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <button key={opt.value} onClick={() => setSelectedStatus(opt.value)}
                  className={`p-3 rounded-xl flex flex-col items-center gap-1 transition-colors ${
                    selectedStatus === opt.value ? 'ring-2 ring-offset-1 ring-gray-800' : 'bg-gray-50 hover:bg-gray-100'
                  }`}>
                  <Icon size={24} className={opt.value === 'completed' ? 'text-green-500' : opt.value === 'delayed_half' ? 'text-yellow-500' : 'text-red-500'} />
                  <span className="text-xs font-medium text-gray-700">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Photo Capture */}
      {selectedStatus && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Site Photo</h3>
          {photo ? (
            <div className="relative">
              <img src={photo} alt="Site" className="w-full rounded-xl" />
              <button onClick={() => setPhoto(null)}
                className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">
                Remove
              </button>
            </div>
          ) : (
            <button onClick={handleCapture}
              className="w-full py-12 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center gap-2 hover:border-yellow-400 transition-colors">
              <Camera size={32} className="text-gray-400" />
              <span className="text-sm text-gray-500">Tap to take a photo</span>
            </button>
          )}
        </div>
      )}

      {/* Note */}
      {selectedStatus && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <textarea
            value={note} onChange={e => setNote(e.target.value)}
            placeholder="Add a note (optional)..."
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none"
            rows={3}
          />
        </div>
      )}

      {/* Submit */}
      {selectedStatus && (
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-4 bg-yellow-400 text-gray-900 rounded-2xl font-bold text-base hover:bg-yellow-500 transition-colors disabled:opacity-50">
          {submitting ? 'Submitting...' : 'Submit Check-in'}
        </button>
      )}
    </div>
  );
}
