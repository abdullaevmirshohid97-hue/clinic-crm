-- Tenant Auth Migration
-- Creates profiles table and auth helper functions aligned with initial_schema.sql
-- clinics and patients tables are already created in 20260405185031_initial_schema.sql

-- HELPER FUNCTIONS
-- get_my_clinic_id() returns BIGINT (matches clinics.id type)
CREATE OR REPLACE FUNCTION get_my_clinic_id()
RETURNS BIGINT AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::BIGINT;
$$ LANGUAGE sql STABLE;

-- get_my_role() returns the role name from JWT app_metadata
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$ LANGUAGE sql STABLE;

-- ROLES TABLE (lookup for profile roles)
CREATE TABLE IF NOT EXISTS public.roles (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

INSERT INTO public.roles (name) VALUES
  ('admin'), ('doctor'), ('nurse'), ('reception'), ('super_admin'), ('cashier'), ('warehouse_manager')
ON CONFLICT (name) DO NOTHING;

-- PROFILES TABLE
-- id = auth.users.id (UUID), clinic_id = clinics.id (BIGINT)
CREATE TABLE IF NOT EXISTS public.profiles (
  id         UUID PRIMARY KEY,
  clinic_id  BIGINT REFERENCES clinics(id) ON DELETE RESTRICT,
  full_name  TEXT NOT NULL,
  role_id    INTEGER NOT NULL REFERENCES public.roles(id),
  last_seen  TIMESTAMPTZ,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
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

-- CLINICS RLS (using get_my_role / get_my_clinic_id)
DROP POLICY IF EXISTS "clinic_access" ON public.clinics;
CREATE POLICY "clinic_access"
ON public.clinics FOR ALL
USING (
  get_my_role() = 'super_admin'
  OR id = get_my_clinic_id()
);

-- PATIENTS RLS update to use BIGINT helper
DROP POLICY IF EXISTS "Clinic isolation" ON public.patients;
CREATE POLICY "Clinic isolation"
ON public.patients FOR ALL
USING (clinic_id = get_clinic_id());
