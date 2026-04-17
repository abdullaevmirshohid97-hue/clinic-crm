-- Tenant Auth Migration
-- Aligns profiles table with initial_schema.sql and downstream migrations.
-- clinics and patients are already created in 20260405185031_initial_schema.sql.
-- All downstream migrations (analytics_rpc, plans_subscriptions, atomic_rpc)
-- expect profiles.clinic_id BIGINT and profiles.role TEXT.

-- ─────────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────────

-- get_my_clinic_id() is an alias for get_clinic_id() (defined in initial_schema).
-- Both functions read from app_metadata.clinic_id — single JWT claim source.
CREATE OR REPLACE FUNCTION get_my_clinic_id()
RETURNS BIGINT AS $$
  SELECT get_clinic_id();
$$ LANGUAGE sql STABLE;

-- get_my_role() returns the authenticated user's role from JWT app_metadata.
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$ LANGUAGE sql STABLE;

-- ─────────────────────────────────────────────────────────────────
-- PROFILES TABLE
-- id UUID = auth.users.id (primary key, no separate user_id column)
-- clinic_id BIGINT references clinics.id (BIGINT, matches initial_schema)
-- role TEXT  — compatible with analytics_rpc, plans_subscriptions, atomic_rpc
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY,
  clinic_id  BIGINT REFERENCES clinics(id) ON DELETE RESTRICT,
  full_name  TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('super_admin','admin','doctor','cashier','nurse','reception','warehouse_manager')),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen  TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_access" ON public.profiles;
CREATE POLICY "profiles_access"
ON public.profiles FOR ALL
USING (
  get_my_role() = 'super_admin'
  OR clinic_id = get_my_clinic_id()
)
WITH CHECK (
  get_my_role() = 'super_admin'
  OR clinic_id = get_my_clinic_id()
);

-- ─────────────────────────────────────────────────────────────────
-- CLINICS RLS (super_admin sees all; clinic members see their own)
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "clinic_access" ON public.clinics;
CREATE POLICY "clinic_access"
ON public.clinics FOR ALL
USING (
  get_my_role() = 'super_admin'
  OR id = get_my_clinic_id()
);

-- ─────────────────────────────────────────────────────────────────
-- PATIENTS RLS — ensure consistency with initial_schema helper
-- ─────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Clinic isolation" ON public.patients;
CREATE POLICY "Clinic isolation"
ON public.patients FOR ALL
USING (clinic_id = get_clinic_id());
