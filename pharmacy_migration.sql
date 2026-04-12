-- ════════════════════════════════════════════════
-- Dorixona Migratsiya (to'liq)
-- Supabase SQL Editor da ishga tushiring
-- ════════════════════════════════════════════════

-- 1. pharmacy jadvali yangi ustunlar
ALTER TABLE public.pharmacy
  ADD COLUMN IF NOT EXISTS serial     TEXT,
  ADD COLUMN IF NOT EXISTS supplier   TEXT,
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2); -- Kirim narxi (foyda hisoblash uchun)

-- 2. pharmacy_journal jadvali
CREATE TABLE IF NOT EXISTS public.pharmacy_journal (
  id           BIGSERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT,
  unit         TEXT DEFAULT 'dona',
  qty_in       INTEGER DEFAULT 0,
  qty_out      INTEGER DEFAULT 0,
  remaining    INTEGER,
  price        NUMERIC(12,2) DEFAULT 0,
  serial       TEXT,
  expiry       DATE,
  supplier     TEXT,
  payment_type TEXT DEFAULT 'naqd',
  entry_type   TEXT DEFAULT 'kirim',  -- kirim | chiqim
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS
ALTER TABLE public.pharmacy_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pjournal_all" ON public.pharmacy_journal
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_pj_created    ON public.pharmacy_journal(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pj_name       ON public.pharmacy_journal(name);
CREATE INDEX IF NOT EXISTS idx_pj_entry_type ON public.pharmacy_journal(entry_type);
