-- =============================================================================
-- Migration: RLS for remaining clinic-scoped tables
-- Date: 2026-04-16
-- Description:
--   All major tables (appointments, patients, transactions, rooms, staff, etc.)
--   already have RLS enabled in earlier migrations using the get_clinic_id()
--   helper. This migration enables RLS and adds "Clinic isolation" policies
--   on the remaining tables referenced in application code that were not yet
--   protected by earlier migrations:
--
--     inventory, inventory_transactions, pharmacy,
--     audit_log, consumables_mapping, marketing_campaigns, app_permissions
--
--   No table schemas are changed here — this is a pure policy migration.
--   The policy pattern is consistent with the rest of the codebase:
--     FOR ALL USING (clinic_id = get_clinic_id()) WITH CHECK (clinic_id = get_clinic_id())
--
--   app_permissions has no clinic_id (it is a global permission registry) so
--   all authenticated users may read it; writes are restricted to super_admins
--   using the existing get_my_role() function (defined in 20260412230000_tenant_auth.sql).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. inventory
-- ---------------------------------------------------------------------------
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic isolation" ON public.inventory;
CREATE POLICY "Clinic isolation" ON public.inventory
  FOR ALL
  TO authenticated
  USING      (clinic_id = get_clinic_id())
  WITH CHECK (clinic_id = get_clinic_id());


-- ---------------------------------------------------------------------------
-- 2. inventory_transactions
-- ---------------------------------------------------------------------------
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic isolation" ON public.inventory_transactions;
CREATE POLICY "Clinic isolation" ON public.inventory_transactions
  FOR ALL
  TO authenticated
  USING      (clinic_id = get_clinic_id())
  WITH CHECK (clinic_id = get_clinic_id());


-- ---------------------------------------------------------------------------
-- 3. pharmacy
-- ---------------------------------------------------------------------------
ALTER TABLE public.pharmacy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic isolation" ON public.pharmacy;
CREATE POLICY "Clinic isolation" ON public.pharmacy
  FOR ALL
  TO authenticated
  USING      (clinic_id = get_clinic_id())
  WITH CHECK (clinic_id = get_clinic_id());


-- ---------------------------------------------------------------------------
-- 4. audit_log
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic isolation" ON public.audit_log;
CREATE POLICY "Clinic isolation" ON public.audit_log
  FOR ALL
  TO authenticated
  USING      (clinic_id = get_clinic_id())
  WITH CHECK (clinic_id = get_clinic_id());


-- ---------------------------------------------------------------------------
-- 5. consumables_mapping
-- ---------------------------------------------------------------------------
ALTER TABLE public.consumables_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic isolation" ON public.consumables_mapping;
CREATE POLICY "Clinic isolation" ON public.consumables_mapping
  FOR ALL
  TO authenticated
  USING      (clinic_id = get_clinic_id())
  WITH CHECK (clinic_id = get_clinic_id());


-- ---------------------------------------------------------------------------
-- 6. marketing_campaigns
-- ---------------------------------------------------------------------------
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clinic isolation" ON public.marketing_campaigns;
CREATE POLICY "Clinic isolation" ON public.marketing_campaigns
  FOR ALL
  TO authenticated
  USING      (clinic_id = get_clinic_id())
  WITH CHECK (clinic_id = get_clinic_id());


-- ---------------------------------------------------------------------------
-- 7. app_permissions  (global registry — no clinic_id column)
--    All authenticated users may read; only super_admins may write.
--    Depends on get_my_role() from 20260412230000_tenant_auth.sql.
-- ---------------------------------------------------------------------------
ALTER TABLE public.app_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_permissions: read all authenticated" ON public.app_permissions;
DROP POLICY IF EXISTS "app_permissions: super_admin write"      ON public.app_permissions;

CREATE POLICY "app_permissions: read all authenticated"
  ON public.app_permissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "app_permissions: super_admin write"
  ON public.app_permissions FOR ALL
  TO authenticated
  USING      (get_my_role() = 'super_admin')
  WITH CHECK (get_my_role() = 'super_admin');


-- =============================================================================
-- End of migration
-- =============================================================================
