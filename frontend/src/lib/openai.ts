import OpenAI from 'openai';

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OpenAI API key not set.');
    return null;
  }
  if (!client) {
    client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }
  return client;
}

export async function transcribeVoice(audioBase64: string, language: 'ko' | 'zh' | 'vi' = 'zh'): Promise<string> {
  const c = getClient();
  if (!c) return '[AI speech recognition not configured]';

  try {
    const binary = atob(audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'audio/webm' });
    const file = new File([blob], 'audio.webm', { type: 'audio/webm' });

    const response = await c.audio.transcriptions.create({
      model: 'whisper-1', file, language
    });
    return response.text;
  } catch (e) {
    console.error('Transcription error:', e);
    return '[Voice recognition failed]';
  }
}

export async function translateText(
  text: string, from: 'ko' | 'zh' | 'vi', to: 'ko' | 'zh' | 'vi'
): Promise<string> {
  const c = getClient();
  if (!c) return text;

  const langNames: Record<string, string> = { ko: 'Korean', zh: 'Chinese', vi: 'Vietnamese' };

  try {
    const response = await c.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `You are a construction-site interpreter. Translate from ${langNames[from]} to ${langNames[to]}.
Use proper construction terminology:
- demajji -> waiting/idle workers
- geojip/pom -> formwork
- baegwan -> pipe installation
- taseol -> concrete pouring
- bangsu -> waterproofing
- keuraek -> crack
- nusu -> water leak
Return ONLY the translation, no explanation.`
      }, { role: 'user', content: text }],
      temperature: 0.1, max_tokens: 500
    });
    return response.choices[0]?.message?.content || text;
  } catch (e) {
    console.error('Translation error:', e);
    return text;
  }
}

export async function generateDailyReport(notes: string, language: 'ko' | 'zh' = 'ko'): Promise<string> {
  const c = getClient();
  if (!c) return notes;

  try {
    const response = await c.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `You are a construction site assistant. Format notes into a daily report in ${language === 'ko' ? 'Korean' : 'Chinese'}.
Structure: Date / Work Done / Issues & Delays / Next Day Plan. Keep it concise.`
      }, { role: 'user', content: notes }],
      temperature: 0.3, max_tokens: 800
    });
    return response.choices[0]?.message?.content || notes;
  } catch (e) {
    console.error('Report error:', e);
    return notes;
  }
}
