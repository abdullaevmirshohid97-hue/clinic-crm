-- Create app_permissions table (global registry — no clinic_id)
CREATE TABLE IF NOT EXISTS public.app_permissions (
  id          SERIAL PRIMARY KEY,
  role_name   TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  "canAccess"  INTEGER NOT NULL DEFAULT 1,
  UNIQUE(role_name, feature_name)
);

-- RLS (already added in 20260416000000 but safe to re-enable)
ALTER TABLE public.app_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_permissions: read all authenticated" ON public.app_permissions;
CREATE POLICY "app_permissions: read all authenticated"
  ON public.app_permissions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "app_permissions: super_admin write" ON public.app_permissions;
CREATE POLICY "app_permissions: super_admin write"
  ON public.app_permissions FOR ALL
  TO authenticated
  USING (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');

-- ─────────────────────────────────────────────────────────────────
-- SEED: admin — full access to all features
-- ─────────────────────────────────────────────────────────────────
INSERT INTO public.app_permissions (role_name, feature_name, "canAccess") VALUES
  ('admin', 'dashboard',    1),
  ('admin', 'reception',    1),
  ('admin', 'queue',        1),
  ('admin', 'inpatient',    1),
  ('admin', 'laboratory',   1),
  ('admin', 'pharmacy',     1),
  ('admin', 'cashier',      1),
  ('admin', 'journal',      1),
  ('admin', 'analytics',    1),
  ('admin', 'marketing',    1),
  ('admin', 'archive',      1),
  ('admin', 'staff',        1),
  ('admin', 'subscription', 1),
  ('admin', 'settings',     1)
ON CONFLICT (role_name, feature_name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- SEED: doctor — clinical pages
-- ─────────────────────────────────────────────────────────────────
INSERT INTO public.app_permissions (role_name, feature_name, "canAccess") VALUES
  ('doctor', 'dashboard',   1),
  ('doctor', 'reception',   1),
  ('doctor', 'queue',       1),
  ('doctor', 'inpatient',   1),
  ('doctor', 'laboratory',  1),
  ('doctor', 'pharmacy',    1),
  ('doctor', 'archive',     1)
ON CONFLICT (role_name, feature_name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- SEED: cashier — finance & reception pages
-- ─────────────────────────────────────────────────────────────────
INSERT INTO public.app_permissions (role_name, feature_name, "canAccess") VALUES
  ('cashier', 'dashboard',  1),
  ('cashier', 'reception',  1),
  ('cashier', 'queue',      1),
  ('cashier', 'cashier',    1),
  ('cashier', 'journal',    1),
  ('cashier', 'analytics',  1),
  ('cashier', 'archive',    1)
ON CONFLICT (role_name, feature_name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- SEED: super_admin — all features (handled in code too, belt+suspenders)
-- ─────────────────────────────────────────────────────────────────
INSERT INTO public.app_permissions (role_name, feature_name, "canAccess") VALUES
  ('super_admin', 'dashboard',    1),
  ('super_admin', 'reception',    1),
  ('super_admin', 'queue',        1),
  ('super_admin', 'inpatient',    1),
  ('super_admin', 'laboratory',   1),
  ('super_admin', 'pharmacy',     1),
  ('super_admin', 'cashier',      1),
  ('super_admin', 'journal',      1),
  ('super_admin', 'analytics',    1),
  ('super_admin', 'marketing',    1),
  ('super_admin', 'archive',      1),
  ('super_admin', 'staff',        1),
  ('super_admin', 'subscription', 1),
  ('super_admin', 'settings',     1)
ON CONFLICT (role_name, feature_name) DO NOTHING;
