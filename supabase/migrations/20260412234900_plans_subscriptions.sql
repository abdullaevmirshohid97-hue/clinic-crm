-- Plans Table
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  max_doctors INT NOT NULL,
  max_patients INT NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Upgrade subscriptions table
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES plans(id),
ADD COLUMN IF NOT EXISTS max_doctors INT,
ADD COLUMN IF NOT EXISTS max_patients INT;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_clinic_role ON profiles(clinic_id, role);
CREATE INDEX IF NOT EXISTS idx_patients_clinic ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_clinic_status ON subscriptions(clinic_id, status);

-- RLS for plans
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_read_all" ON plans FOR SELECT USING (true);
CREATE POLICY "plans_admin_manage" ON plans FOR ALL USING (get_my_role() = 'super_admin');

-- Seed default plans
INSERT INTO plans (name, price, max_doctors, max_patients) VALUES
  ('Baza', 250000, 2, 500),
  ('Pro', 600000, 10, 5000),
  ('Korxona', 1500000, -1, -1)
ON CONFLICT DO NOTHING;
