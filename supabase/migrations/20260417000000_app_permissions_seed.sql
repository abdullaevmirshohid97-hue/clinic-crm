-- App Permissions Table & Seed
-- Maps role_name → feature_name (sidebar page keys) with canAccess flag

CREATE TABLE IF NOT EXISTS public.app_permissions (
  id           SERIAL PRIMARY KEY,
  role_name    TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  "canAccess"  INTEGER NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_name, feature_name)
);

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
-- SEED: super_admin — all features
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

-- ─────────────────────────────────────────────────────────────────
-- SEED: admin — full access
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
  ('doctor', 'dashboard',  1),
  ('doctor', 'reception',  1),
  ('doctor', 'queue',      1),
  ('doctor', 'inpatient',  1),
  ('doctor', 'laboratory', 1),
  ('doctor', 'pharmacy',   1),
  ('doctor', 'archive',    1)
ON CONFLICT (role_name, feature_name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- SEED: cashier — finance & reception pages
-- ─────────────────────────────────────────────────────────────────
INSERT INTO public.app_permissions (role_name, feature_name, "canAccess") VALUES
  ('cashier', 'dashboard', 1),
  ('cashier', 'reception', 1),
  ('cashier', 'queue',     1),
  ('cashier', 'cashier',   1),
  ('cashier', 'journal',   1),
  ('cashier', 'analytics', 1),
  ('cashier', 'archive',   1)
ON CONFLICT (role_name, feature_name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- SEED: nurse — clinical support pages
-- ─────────────────────────────────────────────────────────────────
INSERT INTO public.app_permissions (role_name, feature_name, "canAccess") VALUES
  ('nurse', 'dashboard',  1),
  ('nurse', 'reception',  1),
  ('nurse', 'queue',      1),
  ('nurse', 'inpatient',  1),
  ('nurse', 'laboratory', 1),
  ('nurse', 'archive',    1)
ON CONFLICT (role_name, feature_name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- SEED: reception — front-desk pages
-- ─────────────────────────────────────────────────────────────────
INSERT INTO public.app_permissions (role_name, feature_name, "canAccess") VALUES
  ('reception', 'dashboard',  1),
  ('reception', 'reception',  1),
  ('reception', 'queue',      1),
  ('reception', 'archive',    1)
ON CONFLICT (role_name, feature_name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- SEED: warehouse_manager — inventory pages
-- ─────────────────────────────────────────────────────────────────
INSERT INTO public.app_permissions (role_name, feature_name, "canAccess") VALUES
  ('warehouse_manager', 'dashboard', 1),
  ('warehouse_manager', 'pharmacy',  1)
ON CONFLICT (role_name, feature_name) DO NOTHING;
