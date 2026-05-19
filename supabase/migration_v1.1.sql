-- ============================================
-- v1.1: 角色 + 实名 + 工地-工人关联
-- 在 Supabase SQL Editor 中运行
-- ============================================

-- 1. 用户档案表（实名 + 角色）
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('manager', 'worker')),
  real_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  trade TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "u_own_profile" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "manager_read_worker" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'manager')
);

-- 2. 工地-工人关联表
CREATE TABLE site_workers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, worker_id)
);

ALTER TABLE site_workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manager_own" ON site_workers FOR ALL USING (
  EXISTS (SELECT 1 FROM sites s JOIN profiles p ON p.id = auth.uid() WHERE s.id = site_workers.site_id AND s.owner_id = auth.uid() AND p.role = 'manager')
);
CREATE POLICY "worker_view" ON site_workers FOR SELECT USING (worker_id = auth.uid());

-- 3. 允许所长查看自己工地下的所有数据（覆盖原来的单一owner策略）
-- 更新 checkins 策略，让受邀工人也能插入
CREATE POLICY "worker_insert_checkin" ON checkins FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM site_workers WHERE site_id = checkins.site_id AND worker_id = auth.uid())
);
CREATE POLICY "worker_view_checkin" ON checkins FOR SELECT USING (
  EXISTS (SELECT 1 FROM site_workers WHERE site_id = checkins.site_id AND worker_id = auth.uid())
);

-- 更新 issue_reports 策略
CREATE POLICY "worker_insert_report" ON issue_reports FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM site_workers WHERE site_id = issue_reports.site_id AND worker_id = auth.uid())
);
CREATE POLICY "worker_view_report" ON issue_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM site_workers WHERE site_id = issue_reports.site_id AND worker_id = auth.uid())
);
