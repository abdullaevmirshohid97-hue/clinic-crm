-- Ensure RLS policies exist for plural queues table
ALTER TABLE IF EXISTS public.queues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "queues_select" ON public.queues;
CREATE POLICY "queues_select" ON public.queues FOR SELECT
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());

DROP POLICY IF EXISTS "queues_insert" ON public.queues;
CREATE POLICY "queues_insert" ON public.queues FOR INSERT
  WITH CHECK (clinic_id::text = get_my_clinic_id());

DROP POLICY IF EXISTS "queues_update" ON public.queues;
CREATE POLICY "queues_update" ON public.queues FOR UPDATE
  USING (clinic_id::text = get_my_clinic_id());

DROP POLICY IF EXISTS "queues_delete" ON public.queues;
CREATE POLICY "queues_delete" ON public.queues FOR DELETE
  USING (clinic_id::text = get_my_clinic_id());
