-- App Permissions Table & Seed
-- Full 14-feature × 7-role matrix.
-- canAccess: 1 = granted, 0 = denied (explicit deny, overrides fallback).

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
-- Full 14-feature matrix for all roles
-- Features: dashboard, reception, queue, inpatient, laboratory,
--           pharmacy, cashier, journal, analytics, marketing,
--           archive, staff, subscription, settings
-- ─────────────────────────────────────────────────────────────────

INSERT INTO public.app_permissions (role_name, feature_name, "canAccess") VALUES
-- super_admin: full access
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
  ('super_admin', 'settings',     1),
-- admin: full access
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
  ('admin', 'settings',     1),
-- doctor: clinical only
  ('doctor', 'dashboard',    1),
  ('doctor', 'reception',    1),
  ('doctor', 'queue',        1),
  ('doctor', 'inpatient',    1),
  ('doctor', 'laboratory',   1),
  ('doctor', 'pharmacy',     1),
  ('doctor', 'cashier',      0),
  ('doctor', 'journal',      0),
  ('doctor', 'analytics',    0),
  ('doctor', 'marketing',    0),
  ('doctor', 'archive',      1),
  ('doctor', 'staff',        0),
  ('doctor', 'subscription', 0),
  ('doctor', 'settings',     0),
-- cashier: finance & reception
  ('cashier', 'dashboard',    1),
  ('cashier', 'reception',    1),
  ('cashier', 'queue',        1),
  ('cashier', 'inpatient',    0),
  ('cashier', 'laboratory',   0),
  ('cashier', 'pharmacy',     0),
  ('cashier', 'cashier',      1),
  ('cashier', 'journal',      1),
  ('cashier', 'analytics',    1),
  ('cashier', 'marketing',    0),
  ('cashier', 'archive',      1),
  ('cashier', 'staff',        0),
  ('cashier', 'subscription', 0),
  ('cashier', 'settings',     0),
-- nurse: clinical support
  ('nurse', 'dashboard',    1),
  ('nurse', 'reception',    1),
  ('nurse', 'queue',        1),
  ('nurse', 'inpatient',    1),
  ('nurse', 'laboratory',   1),
  ('nurse', 'pharmacy',     0),
  ('nurse', 'cashier',      0),
  ('nurse', 'journal',      0),
  ('nurse', 'analytics',    0),
  ('nurse', 'marketing',    0),
  ('nurse', 'archive',      1),
  ('nurse', 'staff',        0),
  ('nurse', 'subscription', 0),
  ('nurse', 'settings',     0),
-- reception: front-desk only
  ('reception', 'dashboard',    1),
  ('reception', 'reception',    1),
  ('reception', 'queue',        1),
  ('reception', 'inpatient',    0),
  ('reception', 'laboratory',   0),
  ('reception', 'pharmacy',     0),
  ('reception', 'cashier',      0),
  ('reception', 'journal',      0),
  ('reception', 'analytics',    0),
  ('reception', 'marketing',    0),
  ('reception', 'archive',      1),
  ('reception', 'staff',        0),
  ('reception', 'subscription', 0),
  ('reception', 'settings',     0),
-- warehouse_manager: pharmacy/inventory only
  ('warehouse_manager', 'dashboard',    1),
  ('warehouse_manager', 'reception',    0),
  ('warehouse_manager', 'queue',        0),
  ('warehouse_manager', 'inpatient',    0),
  ('warehouse_manager', 'laboratory',   0),
  ('warehouse_manager', 'pharmacy',     1),
  ('warehouse_manager', 'cashier',      0),
  ('warehouse_manager', 'journal',      0),
  ('warehouse_manager', 'analytics',    0),
  ('warehouse_manager', 'marketing',    0),
  ('warehouse_manager', 'archive',      0),
  ('warehouse_manager', 'staff',        0),
  ('warehouse_manager', 'subscription', 0),
  ('warehouse_manager', 'settings',     0)
ON CONFLICT (role_name, feature_name) DO NOTHING;
