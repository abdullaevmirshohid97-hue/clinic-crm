-- pharmacy_journal ga clinic_id qo'shish (multi-tenant izolyatsiya)
-- Agar jadval mavjud bo'lsa, clinic_id ustunini qo'shamiz va RLS yoqamiz

ALTER TABLE pharmacy_journal
  ADD COLUMN IF NOT EXISTS clinic_id BIGINT NOT NULL DEFAULT get_clinic_id();

ALTER TABLE pharmacy_journal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic isolation" ON pharmacy_journal;
CREATE POLICY "Clinic isolation" ON pharmacy_journal
  FOR ALL USING (clinic_id = get_clinic_id());

CREATE INDEX IF NOT EXISTS idx_pharmacy_journal_clinic ON pharmacy_journal(clinic_id);
