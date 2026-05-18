import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not set. Create .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true }
});

export interface Site {
  id: string;
  name: string;
  address: string;
  owner_id: string;
  created_at: string;
}

export interface Process {
  id: string;
  site_id: string;
  name: string;
  display_order: number;
  status: 'pending' | 'in_progress' | 'delayed' | 'completed';
  updated_at: string;
  updated_by: string;
}

export interface CheckIn {
  id: string;
  site_id: string;
  process_id: string;
  user_id: string;
  status: 'completed' | 'delayed_half' | 'delayed_full';
  photo_url: string;
  note: string;
  created_at: string;
}

export interface IssueReport {
  id: string;
  site_id: string;
  user_id: string;
  photo_url: string;
  annotated_photo_url: string;
  tag: string;
  voice_text_ko: string;
  voice_text_orig: string;
  created_at: string;
}
