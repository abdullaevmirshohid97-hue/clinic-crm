-- 1. CLINICS TABLE
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'doctor', 'cashier')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- 3. PATIENTS TABLE
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE RESTRICT,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ENABLE RLS
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTIONS (auth.jwt)
CREATE OR REPLACE FUNCTION get_my_clinic_id()
RETURNS uuid AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT auth.jwt() -> 'app_metadata' ->> 'role';
$$ LANGUAGE sql STABLE;

-- CLINICS POLICIES
DROP POLICY IF EXISTS "clinic_access" ON clinics;
CREATE POLICY "clinic_access"
ON clinics
FOR ALL
USING (
  get_my_role() = 'super_admin'
  OR id = get_my_clinic_id()
);

-- PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_access" ON profiles;
CREATE POLICY "profiles_access"
ON profiles
FOR ALL
USING (
  get_my_role() = 'super_admin'
  OR clinic_id = get_my_clinic_id()
)
WITH CHECK (
  get_my_role() = 'super_admin'
  OR clinic_id = get_my_clinic_id()
);

-- PATIENTS POLICIES
DROP POLICY IF EXISTS "patients_access" ON patients;
CREATE POLICY "patients_access"
ON patients
FOR ALL
USING (
  get_my_role() = 'super_admin'
  OR clinic_id = get_my_clinic_id()
)
WITH CHECK (
  get_my_role() = 'super_admin'
  OR clinic_id = get_my_clinic_id()
);
