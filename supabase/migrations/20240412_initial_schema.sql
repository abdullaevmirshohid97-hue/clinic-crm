-- ENABLE RLS
-- ALL TABLES MUST HAVE clinic_id

-- 1. Clinics Table
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'trial')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Roles
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

INSERT INTO roles (name) VALUES 
('super_admin'), ('admin'), ('doctor'), ('receptionist'), ('cashier'), ('pharmacist'), ('lab_tech')
ON CONFLICT DO NOTHING;

-- 3. Users (Auth linked)
-- auth.users is handled by Supabase, we link it here
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id),
  full_name TEXT,
  role_id INTEGER REFERENCES roles(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  birth_date DATE,
  gender TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) NOT NULL,
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES public.profiles(id),
  status TEXT DEFAULT 'pending',
  amount REAL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS RULES (Example for Patients)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clinic_isolation_policy ON patients
  USING (clinic_id = (SELECT clinic_id FROM public.profiles WHERE id = auth.uid()));

-- Repeat for all tables...
