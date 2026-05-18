-- ============================================
-- Hyunjang Doumi - Database Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Sites (construction sites / projects)
-- ============================================
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT DEFAULT '',
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own sites
CREATE POLICY "Users can view own sites"
  ON sites FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own sites"
  ON sites FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own sites"
  ON sites FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own sites"
  ON sites FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================
-- 2. Processes (work phases per site)
-- ============================================
CREATE TABLE processes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,             -- e.g. 'Mokgong (Carpentry)', 'Jeongi (Electrical)'
  display_order INT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'delayed', 'completed')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE processes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view processes for own sites"
  ON processes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = processes.site_id
      AND sites.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert processes for own sites"
  ON processes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = processes.site_id
      AND sites.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update processes for own sites"
  ON processes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = processes.site_id
      AND sites.owner_id = auth.uid()
    )
  );

-- ============================================
-- 3. Check-ins (daily end-of-day status updates)
-- ============================================
CREATE TABLE checkins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL CHECK (status IN ('completed', 'delayed_half', 'delayed_full')),
  photo_url TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checkins for own sites"
  ON checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = checkins.site_id
      AND sites.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert checkins for own sites"
  ON checkins FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = checkins.site_id
      AND sites.owner_id = auth.uid()
    )
  );

-- ============================================
-- 4. Issue Reports (photo + voice issue reporting)
-- ============================================
CREATE TABLE issue_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  photo_url TEXT DEFAULT '',
  annotated_photo_url TEXT DEFAULT '',
  tag TEXT DEFAULT 'gita',        -- e.g. 'nusu', 'keuraek', 'bangsu'
  voice_text_ko TEXT DEFAULT '',  -- AI translated Korean
  voice_text_orig TEXT DEFAULT '',-- Original language text
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE issue_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports for own sites"
  ON issue_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = issue_reports.site_id
      AND sites.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert reports for own sites"
  ON issue_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sites
      WHERE sites.id = issue_reports.site_id
      AND sites.owner_id = auth.uid()
    )
  );

-- ============================================
-- 5. Storage Buckets (for photos)
-- ============================================
-- Run these separately in Supabase Dashboard > Storage:
-- 
-- Create bucket: checkin-photos (public)
-- Create bucket: report-photos (public)
-- 
-- Or via SQL:
INSERT INTO storage.buckets (id, name, public) VALUES ('checkin-photos', 'checkin-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('report-photos', 'report-photos', true);

-- Storage RLS policies
CREATE POLICY "Anyone can view checkin photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'checkin-photos');

CREATE POLICY "Authenticated users can upload checkin photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'checkin-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view report photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'report-photos');

CREATE POLICY "Authenticated users can upload report photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'report-photos' AND auth.role() = 'authenticated');

-- ============================================
-- 6. Seed Data: Default processes for a site
-- Replace 'SITE_ID_HERE' with actual site UUID
-- ============================================
-- INSERT INTO processes (site_id, name, display_order, status) VALUES
--   ('SITE_ID_HERE', 'Mokgong (Carpentry)',    1, 'pending'),
--   ('SITE_ID_HERE', 'Jeongi (Electrical)',    2, 'pending'),
--   ('SITE_ID_HERE', 'Seolbi (Plumbing)',      3, 'pending'),
--   ('SITE_ID_HERE', 'Dobae (Painting)',       4, 'pending'),
--   ('SITE_ID_HERE', 'Taseol (Concrete)',      5, 'pending');
