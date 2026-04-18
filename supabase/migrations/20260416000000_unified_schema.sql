-- ============================================
-- UNIFIED PRODUCTION SCHEMA FOR CLINIC CRM
-- Date: 2026-04-16
-- This migration creates a clean, consistent schema
-- ============================================

-- 0. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get current user's clinic_id from JWT
CREATE OR REPLACE FUNCTION get_my_clinic_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'clinic_id')::uuid,
    (auth.jwt() -> 'user_metadata' ->> 'clinic_id')::uuid
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Get current user's role from JWT
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- 1. CORE TABLES
-- ============================================

-- Plans (subscription tiers)
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  price NUMERIC NOT NULL DEFAULT 0,
  max_doctors INT NOT NULL DEFAULT 2,
  max_patients INT NOT NULL DEFAULT 500,
  features JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clinics
CREATE TABLE IF NOT EXISTS clinics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'pending')),
  owner_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id),
  status TEXT DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  amount NUMERIC DEFAULT 0,
  max_doctors INT,
  max_patients INT,
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ DEFAULT (now() + interval '14 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Users (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'doctor', 'nurse', 'reception', 'cashier', 'pharmacist', 'lab')),
  phone TEXT,
  specialty TEXT,
  prefix TEXT,
  commission_rate NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. PATIENT MODULE
-- ============================================

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  address TEXT,
  source TEXT,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);

-- ============================================
-- 3. SERVICES & PRICING
-- ============================================

CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  category_id UUID REFERENCES service_categories(id),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  duration INT DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_clinic ON services(clinic_id);

-- ============================================
-- 4. QUEUE MODULE
-- ============================================

CREATE TABLE IF NOT EXISTS queues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES users(id),
  number INT NOT NULL,
  prefix TEXT NOT NULL DEFAULT 'A',
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_queues_clinic_date ON queues(clinic_id, created_at);
CREATE INDEX IF NOT EXISTS idx_queues_doctor ON queues(doctor_id);
CREATE INDEX IF NOT EXISTS idx_queues_status ON queues(status);

-- ============================================
-- 5. APPOINTMENTS & TRANSACTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  total_cash NUMERIC DEFAULT 0,
  total_card NUMERIC DEFAULT 0,
  total_transfer NUMERIC DEFAULT 0,
  total_debt NUMERIC DEFAULT 0,
  total_discount NUMERIC DEFAULT 0,
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID REFERENCES users(id),
  service_id UUID REFERENCES services(id),
  shift_id UUID REFERENCES shifts(id),
  queue_id UUID REFERENCES queues(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  amount NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  quantity INT DEFAULT 1,
  payment_type TEXT CHECK (payment_type IN ('cash', 'card', 'transfer', 'debt')),
  notes TEXT,
  commission_paid BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON appointments(clinic_id, created_at);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES users(id),
  shift_id UUID REFERENCES shifts(id),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'refund', 'debt_payment')),
  amount NUMERIC NOT NULL,
  payment_type TEXT CHECK (payment_type IN ('cash', 'card', 'transfer')),
  description TEXT,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_clinic_date ON transactions(clinic_id, created_at);

-- ============================================
-- 6. ROOMS & INPATIENT
-- ============================================

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department TEXT,
  floor INT,
  capacity INT DEFAULT 2,
  room_type TEXT DEFAULT 'shared' CHECK (room_type IN ('shared', 'private', 'vip')),
  price_per_day NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID REFERENCES users(id),
  bed_number TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'discharged')),
  entry_date TIMESTAMPTZ DEFAULT now(),
  exit_date TIMESTAMPTZ,
  total_days INT,
  total_cost NUMERIC DEFAULT 0,
  deposit_balance NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_patients_room ON room_patients(room_id);
CREATE INDEX IF NOT EXISTS idx_room_patients_status ON room_patients(status);

-- ============================================
-- 7. PHARMACY
-- ============================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT DEFAULT 'dona',
  purchase_price NUMERIC DEFAULT 0,
  sale_price NUMERIC DEFAULT 0,
  quantity INT DEFAULT 0,
  min_quantity INT DEFAULT 10,
  expiry_date DATE,
  supplier_id UUID REFERENCES suppliers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_clinic ON medications(clinic_id);
CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);

CREATE TABLE IF NOT EXISTS pharmacy_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  shift_id UUID REFERENCES shifts(id),
  total_amount NUMERIC DEFAULT 0,
  payment_type TEXT CHECK (payment_type IN ('cash', 'card', 'transfer', 'debt')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pharmacy_sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES pharmacy_sales(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id),
  quantity INT NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL
);

-- ============================================
-- 8. LABORATORY
-- ============================================

CREATE TABLE IF NOT EXISTS lab_test_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC DEFAULT 0,
  normal_range TEXT,
  unit TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lab_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id),
  doctor_id UUID REFERENCES users(id),
  shift_id UUID REFERENCES shifts(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  total_amount NUMERIC DEFAULT 0,
  payment_type TEXT CHECK (payment_type IN ('cash', 'card', 'transfer', 'debt')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lab_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  test_type_id UUID NOT NULL REFERENCES lab_test_types(id),
  result_value TEXT,
  is_abnormal BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 9. SETTINGS & AUDIT
-- ============================================

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  UNIQUE(clinic_id, key)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID REFERENCES clinics(id),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic ON audit_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at);

-- ============================================
-- 10. EXPENSES
-- ============================================

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  category_id UUID REFERENCES expense_categories(id),
  amount NUMERIC NOT NULL,
  description TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 11. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_test_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Plans: readable by all, manageable by super_admin
CREATE POLICY "plans_read" ON plans FOR SELECT USING (true);
CREATE POLICY "plans_manage" ON plans FOR ALL USING (get_my_role() = 'super_admin');

-- Clinics: super_admin sees all, others see their own
CREATE POLICY "clinics_access" ON clinics FOR ALL 
  USING (get_my_role() = 'super_admin' OR id = get_my_clinic_id());

-- Subscriptions: clinic isolation
CREATE POLICY "subscriptions_access" ON subscriptions FOR ALL 
  USING (get_my_role() = 'super_admin' OR clinic_id = get_my_clinic_id());

-- Users: clinic isolation
CREATE POLICY "users_access" ON users FOR ALL 
  USING (get_my_role() = 'super_admin' OR clinic_id = get_my_clinic_id());

-- Generic clinic isolation policy for all other tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN 
    SELECT unnest(ARRAY[
      'patients', 'service_categories', 'services', 'queues', 'shifts',
      'appointments', 'transactions', 'rooms', 'room_patients',
      'suppliers', 'medications', 'pharmacy_sales', 'pharmacy_sale_items',
      'lab_test_types', 'lab_orders', 'lab_results', 'settings',
      'expense_categories', 'expenses', 'audit_logs'
    ])
  LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "%s_clinic_isolation" ON %I;
      CREATE POLICY "%s_clinic_isolation" ON %I FOR ALL 
        USING (get_my_role() = ''super_admin'' OR clinic_id = get_my_clinic_id())
        WITH CHECK (get_my_role() = ''super_admin'' OR clinic_id = get_my_clinic_id());
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END $$;

-- ============================================
-- 12. RPC FUNCTIONS
-- ============================================

-- Get queue for today with patient and doctor info
CREATE OR REPLACE FUNCTION get_queue_today(p_clinic_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  id UUID,
  patient_id UUID,
  patient_name TEXT,
  doctor_id UUID,
  doctor_name TEXT,
  doctor_prefix TEXT,
  number INT,
  prefix TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id,
    q.patient_id,
    p.full_name as patient_name,
    q.doctor_id,
    u.full_name as doctor_name,
    u.prefix as doctor_prefix,
    q.number,
    q.prefix,
    q.status,
    q.created_at
  FROM queues q
  LEFT JOIN patients p ON q.patient_id = p.id
  LEFT JOIN users u ON q.doctor_id = u.id
  WHERE q.clinic_id = p_clinic_id
    AND DATE(q.created_at) = p_date
  ORDER BY q.id ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get active doctors for queue
CREATE OR REPLACE FUNCTION get_doctors_for_queue(p_clinic_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  prefix TEXT,
  specialty TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.full_name,
    u.prefix,
    u.specialty
  FROM users u
  WHERE u.clinic_id = p_clinic_id
    AND u.role = 'doctor'
    AND u.is_active = true
  ORDER BY u.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get next queue number for doctor
CREATE OR REPLACE FUNCTION get_next_queue_number(p_clinic_id UUID, p_doctor_id UUID)
RETURNS INT AS $$
DECLARE
  v_max INT;
BEGIN
  SELECT COALESCE(MAX(number), 0) INTO v_max
  FROM queues
  WHERE clinic_id = p_clinic_id
    AND doctor_id = p_doctor_id
    AND DATE(created_at) = CURRENT_DATE;
  
  RETURN v_max + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create queue entry
CREATE OR REPLACE FUNCTION create_queue_entry(
  p_clinic_id UUID,
  p_doctor_id UUID,
  p_patient_id UUID DEFAULT NULL,
  p_patient_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_patient_id UUID;
  v_queue_id UUID;
  v_number INT;
  v_prefix TEXT;
BEGIN
  -- Get doctor prefix
  SELECT prefix INTO v_prefix FROM users WHERE id = p_doctor_id;
  IF v_prefix IS NULL THEN v_prefix := 'A'; END IF;
  
  -- Get next number
  v_number := get_next_queue_number(p_clinic_id, p_doctor_id);
  
  -- Create patient if name provided and no patient_id
  IF p_patient_id IS NULL AND p_patient_name IS NOT NULL THEN
    INSERT INTO patients (clinic_id, full_name)
    VALUES (p_clinic_id, p_patient_name)
    RETURNING id INTO v_patient_id;
  ELSE
    v_patient_id := p_patient_id;
  END IF;
  
  -- Create queue entry
  INSERT INTO queues (clinic_id, patient_id, doctor_id, number, prefix, status)
  VALUES (p_clinic_id, v_patient_id, p_doctor_id, v_number, v_prefix, 'waiting')
  RETURNING id INTO v_queue_id;
  
  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic doctor creation with limit check
CREATE OR REPLACE FUNCTION create_doctor_safe(
  p_clinic_id UUID,
  p_user_id UUID,
  p_full_name TEXT,
  p_prefix TEXT DEFAULT 'A',
  p_specialty TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_count INT;
  v_limit INT;
  v_id UUID;
BEGIN
  -- Lock for race condition
  PERFORM 1 FROM users WHERE clinic_id = p_clinic_id AND role = 'doctor' FOR UPDATE;
  
  -- Count current doctors
  SELECT count(*) INTO v_count FROM users WHERE clinic_id = p_clinic_id AND role = 'doctor';
  
  -- Get plan limit
  SELECT COALESCE(sub.max_doctors, pl.max_doctors, 2) INTO v_limit
  FROM subscriptions sub
  LEFT JOIN plans pl ON pl.id = sub.plan_id
  WHERE sub.clinic_id = p_clinic_id AND sub.status IN ('active', 'trial')
  ORDER BY sub.current_period_end DESC
  LIMIT 1;
  
  IF v_limit != -1 AND v_count >= v_limit THEN
    RAISE EXCEPTION 'Doctor limit reached for your plan';
  END IF;
  
  -- Create doctor
  INSERT INTO users (id, clinic_id, full_name, role, prefix, specialty, is_active)
  VALUES (p_user_id, p_clinic_id, p_full_name, 'doctor', p_prefix, p_specialty, true)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Analytics: Daily summary
CREATE OR REPLACE FUNCTION get_daily_summary(p_clinic_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  total_patients BIGINT,
  total_appointments BIGINT,
  total_income NUMERIC,
  total_cash NUMERIC,
  total_card NUMERIC,
  total_transfer NUMERIC,
  total_debt NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(DISTINCT patient_id) FROM appointments WHERE clinic_id = p_clinic_id AND DATE(created_at) = p_date),
    (SELECT COUNT(*) FROM appointments WHERE clinic_id = p_clinic_id AND DATE(created_at) = p_date),
    COALESCE((SELECT SUM(amount) FROM transactions WHERE clinic_id = p_clinic_id AND DATE(created_at) = p_date AND type = 'income'), 0),
    COALESCE((SELECT SUM(amount) FROM transactions WHERE clinic_id = p_clinic_id AND DATE(created_at) = p_date AND type = 'income' AND payment_type = 'cash'), 0),
    COALESCE((SELECT SUM(amount) FROM transactions WHERE clinic_id = p_clinic_id AND DATE(created_at) = p_date AND type = 'income' AND payment_type = 'card'), 0),
    COALESCE((SELECT SUM(amount) FROM transactions WHERE clinic_id = p_clinic_id AND DATE(created_at) = p_date AND type = 'income' AND payment_type = 'transfer'), 0),
    COALESCE((SELECT SUM(amount) FROM appointments WHERE clinic_id = p_clinic_id AND DATE(created_at) = p_date AND payment_type = 'debt'), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 13. SEED DATA
-- ============================================

-- Default plans
INSERT INTO plans (name, price, max_doctors, max_patients, features) VALUES
  ('Baza', 250000, 2, 500, '{"queue": true, "pharmacy": false, "lab": false}'),
  ('Pro', 600000, 10, 5000, '{"queue": true, "pharmacy": true, "lab": true}'),
  ('Korxona', 1500000, -1, -1, '{"queue": true, "pharmacy": true, "lab": true, "api": true}')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
