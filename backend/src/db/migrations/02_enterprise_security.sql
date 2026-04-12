-- =====================================================
-- RLS Policies + Audit Logs + Feature Flags + Pharmacy
-- Enterprise Security Migration
-- =====================================================

-- 1. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_clinic ON audit_logs(clinic_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- 2. FEATURE FLAGS TABLE
CREATE TABLE IF NOT EXISTS clinic_features (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  feature TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clinic_id, feature)
);

CREATE INDEX idx_clinic_features_clinic ON clinic_features(clinic_id);

-- 3. PHARMACY INVENTORY TABLE
CREATE TABLE IF NOT EXISTS pharmacy_inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'dona',
  price NUMERIC(12,2) DEFAULT 0,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pharmacy_clinic ON pharmacy_inventory(clinic_id);

-- 4. ADD permissions COLUMN TO users (IF NOT EXISTS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE users ADD COLUMN permissions TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- =====================================================
-- 5. ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_inventory ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. RLS POLICIES (clinic_id isolation)
-- =====================================================

-- USERS
CREATE POLICY users_clinic_isolation ON users
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- PATIENTS
CREATE POLICY patients_clinic_isolation ON patients
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- QUEUES
CREATE POLICY queues_clinic_isolation ON queues
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- ROOMS
CREATE POLICY rooms_clinic_isolation ON rooms
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- ROOM_PATIENTS
CREATE POLICY room_patients_clinic_isolation ON room_patients
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- AUDIT_LOGS
CREATE POLICY audit_logs_clinic_isolation ON audit_logs
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- CLINIC_FEATURES
CREATE POLICY clinic_features_isolation ON clinic_features
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- PHARMACY_INVENTORY
CREATE POLICY pharmacy_clinic_isolation ON pharmacy_inventory
  USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);
