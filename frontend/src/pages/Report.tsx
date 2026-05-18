import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { transcribeVoice, translateText } from '../lib/openai';
import PhotoAnnotate from '../components/PhotoAnnotate';
import { Camera, Mic, Send, Volume2 } from 'lucide-react';

const ISSUE_TAGS = [
  { id: 'nusu', label: 'Leak' },
  { id: 'pyeonghwaldo', label: 'Uneven' },
  { id: 'keuraek', label: 'Crack' },
  { id: 'bangsu', label: 'Waterproof' },
  { id: 'cheongso', label: 'Dirty' },
  { id: 'gita', label: 'Other' },
];

export default function Report() {
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

  // Photo capture (same pattern as CheckIn)
  const handleCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
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

  // Voice recording
  const handleRecordToggle = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          setVoiceBase64(base64);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone error:', err);
    }
  };

  // Process voice: transcribe then translate
  const handleProcessVoice = async () => {
    if (!voiceBase64) return;
    setProcessing(true);
    try {
      const orig = await transcribeVoice(voiceBase64, 'zh');
      setOriginalText(orig);
      const translated = await translateText(orig, 'zh', 'ko');
      setTranslatedText(translated);
    } catch (e) {
      console.error('AI processing error:', e);
    } finally {
      setProcessing(false);
    }
  };

  // Submit report
  const handleSubmit = async () => {
    if (!photo) return;
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let photoUrl = '';
      let annotatedUrl = '';

      const blob = await (await fetch(photo)).blob();
      const filePath = `reports/${Date.now()}.jpg`;
      await supabase.storage.from('report-photos').upload(filePath, blob, { contentType: 'image/jpeg' });
      const { data: publicUrl } = supabase.storage.from('report-photos').getPublicUrl(filePath);
      photoUrl = publicUrl.publicUrl;

      if (annotatedPhoto) {
        const aBlob = await (await fetch(annotatedPhoto)).blob();
        const aPath = `reports/${Date.now()}_annotated.jpg`;
        await supabase.storage.from('report-photos').upload(aPath, aBlob, { contentType: 'image/jpeg' });
        const { data: aUrl } = supabase.storage.from('report-photos').getPublicUrl(aPath);
        annotatedUrl = aUrl.publicUrl;
      }

      await supabase.from('issue_reports').insert({
        site_id: 'default', // TODO: wire site selection
        user_id: user.id,
        photo_url: photoUrl,
        annotated_photo_url: annotatedUrl,
        tag: selectedTag || 'gita',
        voice_text_ko: translatedText,
        voice_text_orig: originalText,
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setPhoto(null);
        setAnnotatedPhoto(null);
        setSelectedTag(null);
        setVoiceBase64(null);
        setTranslatedText('');
        setOriginalText('');
      }, 2000);
    } catch (e) {
      console.error('Submit error:', e);
    } finally {
      setProcessing(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <Send size={40} className="text-blue-500" />
        </div>
        <p className="text-lg font-bold text-gray-900">Report sent!</p>
        <p className="text-sm text-gray-500 mt-1">The issue has been reported.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Photo capture */}
      <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">1. Take a photo of the issue</h3>
        {photo ? (
          <div>
            <img src={annotatedPhoto || photo} alt="Issue" className="w-full rounded-xl mb-2" />
            <button onClick={() => setShowAnnotate(true)}
              className="w-full py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium">
              Mark on photo / Draw circle
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

      {/* Issue tags */}
      {photo && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">2. Select issue type</h3>
          <div className="flex flex-wrap gap-2">
            {ISSUE_TAGS.map(tag => (
              <button key={tag.id} onClick={() => setSelectedTag(tag.id)}
                className={`px-3 py-2 rounded-full text-xs font-medium transition-colors ${
                  selectedTag === tag.id
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {tag.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Voice recording */}
      {photo && selectedTag && (
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">3. Explain the issue (voice)</h3>

          <button onClick={handleRecordToggle}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors ${
              isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}>
            <Mic size={20} />
            {isRecording ? 'Recording... Tap to stop' : 'Hold to speak (Chinese)'}
          </button>

          {voiceBase64 && !isRecording && (
            <div className="mt-3">
              <button onClick={handleProcessVoice} disabled={processing}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                <Volume2 size={18} />
                {processing ? 'Translating...' : 'Translate to Korean'}
              </button>
            </div>
          )}

          {translatedText && (
            <div className="mt-3 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-600 font-medium mb-1">Translated (Korean)</p>
              <p className="text-sm text-gray-900">{translatedText}</p>
              {originalText && (
                <>
                  <p className="text-xs text-blue-600 font-medium mt-2 mb-1">Original (Chinese)</p>
                  <p className="text-xs text-gray-500">{originalText}</p>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Submit */}
      {photo && selectedTag && (
        <button onClick={handleSubmit} disabled={processing}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-base hover:bg-blue-700 transition-colors disabled:opacity-50">
          {processing ? 'Sending...' : 'Send Report'}
        </button>
      )}

      {/* Annotation modal */}
      {showAnnotate && photo && (
        <PhotoAnnotate
          imageUrl={photo}
          onSave={(dataUrl) => { setAnnotatedPhoto(dataUrl); setShowAnnotate(false); }}
          onCancel={() => setShowAnnotate(false)}
        />
      )}
    </div>
  );
}
