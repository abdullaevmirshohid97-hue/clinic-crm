-- Doctor + Nurse workflow tables and live activity journal

CREATE TABLE IF NOT EXISTS public.doctor_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  queue_id UUID REFERENCES public.queues(id) ON DELETE SET NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  doctor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  diagnosis TEXT,
  prescription TEXT,
  inpatient_required BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctor_consultations_clinic_created
  ON public.doctor_consultations(clinic_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.treatment_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  consultation_id UUID NOT NULL REFERENCES public.doctor_consultations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  dosage TEXT,
  frequency_per_day INTEGER NOT NULL DEFAULT 1,
  scheduled_time TIME,
  method TEXT,
  checkup_notes TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  assigned_nurse_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_consultation
  ON public.treatment_plan_items(consultation_id, scheduled_time);

CREATE TABLE IF NOT EXISTS public.nurse_treatment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  plan_item_id UUID NOT NULL REFERENCES public.treatment_plan_items(id) ON DELETE CASCADE,
  nurse_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nurse_treatment_logs_plan_item
  ON public.nurse_treatment_logs(plan_item_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.activity_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  actor_id UUID,
  actor_name TEXT,
  actor_role TEXT,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  patient_name TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_journal_clinic_created
  ON public.activity_journal(clinic_id, created_at DESC);

ALTER TABLE public.doctor_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurse_treatment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_journal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doctor_consultations clinic read/write" ON public.doctor_consultations;
CREATE POLICY "doctor_consultations clinic read/write"
  ON public.doctor_consultations
  FOR ALL
  TO authenticated
  USING (clinic_id = get_my_clinic_id())
  WITH CHECK (clinic_id = get_my_clinic_id());

DROP POLICY IF EXISTS "treatment_plan_items clinic read/write" ON public.treatment_plan_items;
CREATE POLICY "treatment_plan_items clinic read/write"
  ON public.treatment_plan_items
  FOR ALL
  TO authenticated
  USING (clinic_id = get_my_clinic_id())
  WITH CHECK (clinic_id = get_my_clinic_id());

DROP POLICY IF EXISTS "nurse_treatment_logs clinic read/write" ON public.nurse_treatment_logs;
CREATE POLICY "nurse_treatment_logs clinic read/write"
  ON public.nurse_treatment_logs
  FOR ALL
  TO authenticated
  USING (clinic_id = get_my_clinic_id())
  WITH CHECK (clinic_id = get_my_clinic_id());

DROP POLICY IF EXISTS "activity_journal clinic read/write" ON public.activity_journal;
CREATE POLICY "activity_journal clinic read/write"
  ON public.activity_journal
  FOR ALL
  TO authenticated
  USING (clinic_id = get_my_clinic_id())
  WITH CHECK (clinic_id = get_my_clinic_id());

INSERT INTO public.app_permissions (role_name, feature_name, "canAccess")
VALUES
  ('super_admin', 'doctor_workspace', 1),
  ('super_admin', 'nurse_workspace', 1),
  ('admin', 'doctor_workspace', 1),
  ('admin', 'nurse_workspace', 1),
  ('doctor', 'doctor_workspace', 1),
  ('doctor', 'nurse_workspace', 0),
  ('nurse', 'doctor_workspace', 0),
  ('nurse', 'nurse_workspace', 1),
  ('reception', 'doctor_workspace', 0),
  ('reception', 'nurse_workspace', 0),
  ('cashier', 'doctor_workspace', 0),
  ('cashier', 'nurse_workspace', 0),
  ('warehouse_manager', 'doctor_workspace', 0),
  ('warehouse_manager', 'nurse_workspace', 0)
ON CONFLICT (role_name, feature_name) DO NOTHING;
