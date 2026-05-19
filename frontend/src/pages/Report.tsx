import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { transcribeVoice, translateText } from '../lib/openai';
import PhotoAnnotate from '../components/PhotoAnnotate';
import { Camera, Mic, Send, Volume2 } from 'lucide-react';

const ISSUE_TAG_KEYS = ['tag.nusu','tag.pyeonghwaldo','tag.keuraek','tag.bangsu','tag.cheongso','tag.gita'] as const;
const ISSUE_TAG_IDS = ['nusu','pyeonghwaldo','keuraek','bangsu','cheongso','gita'] as const;

export default function Report() {
  const { t } = useTranslation();
  const [photo, setPhoto] = useState<string | null>(null);
  const [annotatedPhoto, setAnnotatedPhoto] = useState<string | null>(null);
  const [showAnnotate, setShowAnnotate] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceBase64, setVoiceBase64] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const handleCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video'); video.srcObject = stream; video.play();
      await new Promise(r => setTimeout(r, 1000));
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d'); if (ctx) ctx.drawImage(video, 0, 0);
      stream.getTracks().forEach(t => t.stop());
      setPhoto(canvas.toDataURL('image/jpeg', 0.7));
    } catch {
      const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
      input.onchange = (e: any) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setPhoto(r.result as string); r.readAsDataURL(f); } };
      input.click();
    }
  };

  const handleRecordToggle = async () => {
    if (isRecording) { mediaRecorderRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mr; chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => setVoiceBase64((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      };
      mr.start(); setIsRecording(true);
    } catch (e) { console.error('Mic error:', e); }
  };

  const handleProcessVoice = async () => {
    if (!voiceBase64) return;
    setProcessing(true);
    try {
      const orig = await transcribeVoice(voiceBase64, 'zh');
      setOriginalText(orig);
      const translated = await translateText(orig, 'zh', 'ko');
      setTranslatedText(translated);
    } catch (e) { console.error('AI error:', e); }
    finally { setProcessing(false); }
  };

  const handleSubmit = async () => {
    if (!photo) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      let photoUrl = '', annotatedUrl = '';
      const blob = await (await fetch(photo)).blob();
      const fp = `reports/${Date.now()}.jpg`;
      await supabase.storage.from('report-photos').upload(fp, blob, { contentType: 'image/jpeg' });
      const { data: pu } = supabase.storage.from('report-photos').getPublicUrl(fp);
      photoUrl = pu.publicUrl;
      if (annotatedPhoto) {
        const ab = await (await fetch(annotatedPhoto)).blob();
        const ap = `reports/${Date.now()}_a.jpg`;
        await supabase.storage.from('report-photos').upload(ap, ab, { contentType: 'image/jpeg' });
        const { data: au } = supabase.storage.from('report-photos').getPublicUrl(ap);
        annotatedUrl = au.publicUrl;
      }
      await supabase.from('issue_reports').insert({
        site_id: 'default', user_id: user.id, photo_url: photoUrl, annotated_photo_url: annotatedUrl,
        tag: selectedTag || 'gita', voice_text_ko: translatedText, voice_text_orig: originalText,
      });
      setSubmitted(true);
      setTimeout(() => { setSubmitted(false); setPhoto(null); setAnnotatedPhoto(null); setSelectedTag(null); setVoiceBase64(null); setTranslatedText(''); setOriginalText(''); }, 2000);
    } catch (e) { console.error('Submit error:', e); }
    finally { setProcessing(false); }
  };

  if (submitted) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4"><Send size={40} className="text-blue-500" /></div>
      <p className="text-lg font-bold text-gray-900">{t('report.success')}</p>
      <p className="text-sm text-gray-500 mt-1">{t('report.successMsg')}</p>
    </div>
  );

  return (
    <div>
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">{t('report.takePhoto')}</h3>
        {photo ? (
          <div>
            <img src={annotatedPhoto || photo} alt="Issue" className="w-full rounded-xl mb-2" />
            <button onClick={() => setShowAnnotate(true)} className="w-full py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">{t('report.markPhoto')}</button>
          </div>
        ) : (
          <button onClick={handleCapture} className="w-full py-12 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center gap-2 hover:border-yellow-400">
            <Camera size={32} className="text-gray-400" />
            <span className="text-sm text-gray-500">{t('report.tapPhoto')}</span>
          </button>
        )}
      </div>

      {photo && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">{t('report.selectIssue')}</h3>
          <div className="flex flex-wrap gap-2">
            {ISSUE_TAG_KEYS.map((key, i) => (
              <button key={key} onClick={() => setSelectedTag(ISSUE_TAG_IDS[i])}
                className={`px-3 py-2 rounded-full text-xs font-medium ${selectedTag === ISSUE_TAG_IDS[i] ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {t(key)}
              </button>
            ))}
          </div>
        </div>
      )}

      {photo && selectedTag && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">{t('report.voiceExplain')}</h3>
          <button onClick={handleRecordToggle}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-medium ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            <Mic size={20} />
            {isRecording ? t('report.recording') : t('report.holdSpeak')}
          </button>
          {voiceBase64 && !isRecording && (
            <div className="mt-3">
              <button onClick={handleProcessVoice} disabled={processing}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                <Volume2 size={18} />
                {processing ? t('report.translating') : t('report.translateKo')}
              </button>
            </div>
          )}
          {translatedText && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-600 font-medium mb-1">{t('report.translated')}</p>
              <p className="text-sm text-gray-900">{translatedText}</p>
              {originalText && <>
                <p className="text-xs text-blue-600 font-medium mt-2 mb-1">{t('report.original')}</p>
                <p className="text-xs text-gray-500">{originalText}</p>
              </>}
            </div>
          )}
        </div>
      )}

      {photo && selectedTag && (
        <button onClick={handleSubmit} disabled={processing}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-base hover:bg-blue-700 disabled:opacity-50">
          {processing ? t('report.sending') : t('report.send')}
        </button>
      )}

      {showAnnotate && photo && (
        <PhotoAnnotate imageUrl={photo} onSave={d=>{setAnnotatedPhoto(d);setShowAnnotate(false);}} onCancel={()=>setShowAnnotate(false)} />
      )}
    </div>
  );
}
