-- Clinic-level payment provider integrations

CREATE TABLE IF NOT EXISTS public.payment_provider_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL,
  provider TEXT NOT NULL,
  merchant_account_id TEXT,
  secret_key TEXT,
  webhook_secret TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'production' CHECK (mode IN ('sandbox', 'production')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_payment_provider_accounts_clinic
  ON public.payment_provider_accounts(clinic_id);

ALTER TABLE public.payment_provider_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payment_provider_accounts clinic read/write" ON public.payment_provider_accounts;
CREATE POLICY "payment_provider_accounts clinic read/write"
  ON public.payment_provider_accounts
  FOR ALL
  TO authenticated
  USING (clinic_id = get_my_clinic_id())
  WITH CHECK (clinic_id = get_my_clinic_id());
