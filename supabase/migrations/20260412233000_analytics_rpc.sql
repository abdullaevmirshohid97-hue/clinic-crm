-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_patients_clinic_created ON patients(clinic_id, "createdAt");
CREATE INDEX IF NOT EXISTS idx_subscriptions_clinic_created ON subscriptions(clinic_id, "createdAt");
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Global Analytics SECURE Invoker RPC
CREATE OR REPLACE FUNCTION get_global_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_total_clinics INT;
  v_active_clinics INT;
  v_blocked_clinics INT;
  v_total_patients INT;
  v_total_doctors INT;
  v_mrr NUMERIC;
  v_clinics_growth JSON;
  v_revenue_growth JSON;
BEGIN
  IF get_my_role() != 'super_admin' THEN 
    RAISE EXCEPTION 'Unauthorized access: Global analytics restricted to super admin'; 
  END IF;

  SELECT count(*), 
         count(*) FILTER (WHERE status = 'active'),
         count(*) FILTER (WHERE status = 'blocked')
  INTO v_total_clinics, v_active_clinics, v_blocked_clinics
  FROM clinics;

  SELECT count(*) INTO v_total_patients FROM patients;
  
  SELECT count(*) INTO v_total_doctors FROM profiles WHERE role = 'doctor';

  SELECT COALESCE(SUM(amount), 0) INTO v_mrr 
  FROM subscriptions 
  WHERE status = 'active' AND current_period_end > now();

  SELECT COALESCE(json_agg(row_to_json(t)), '[]') INTO v_clinics_growth
  FROM (
    SELECT DATE("createdAt") as date, COUNT(*) as val
    FROM clinics
    WHERE "createdAt" >= (now() - interval '30 days')
    GROUP BY DATE("createdAt")
    ORDER BY DATE("createdAt")
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]') INTO v_revenue_growth
  FROM (
    SELECT DATE("createdAt") as date, SUM(amount) as val
    FROM subscriptions
    WHERE status = 'active' AND current_period_end > now() AND "createdAt" >= (now() - interval '30 days')
    GROUP BY DATE("createdAt")
    ORDER BY DATE("createdAt")
  ) t;

  RETURN json_build_object(
    'total_clinics', v_total_clinics,
    'active_clinics', v_active_clinics,
    'blocked_clinics', v_blocked_clinics,
    'total_patients', v_total_patients,
    'total_doctors', v_total_doctors,
    'mrr', v_mrr,
    'clinics_growth', v_clinics_growth,
    'revenue_growth', v_revenue_growth
  );
END;
$$;

-- Clinic Analytics SECURE Invoker RPC
CREATE OR REPLACE FUNCTION get_clinic_analytics()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_clinic_uuid UUID;
  v_total_patients INT;
  v_today_patients INT;
  v_total_doctors INT;
  v_revenue_today NUMERIC;
  v_revenue_month NUMERIC;
  v_patient_growth JSON;
  v_revenue_growth JSON;
BEGIN
  v_clinic_uuid := get_my_clinic_id();

  IF v_clinic_uuid IS NULL AND get_my_role() != 'super_admin' THEN
    RAISE EXCEPTION 'Invalid tenant: No clinic context found in session';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE DATE("createdAt") = CURRENT_DATE)
  INTO v_total_patients, v_today_patients
  FROM patients WHERE clinic_id = v_clinic_uuid;

  SELECT count(*) INTO v_total_doctors 
  FROM profiles WHERE clinic_id = v_clinic_uuid AND role = 'doctor';

  SELECT 
    COALESCE(SUM(amount) FILTER (WHERE DATE("createdAt") = CURRENT_DATE), 0),
    COALESCE(SUM(amount) FILTER (WHERE date_trunc('month', "createdAt") = date_trunc('month', CURRENT_DATE)), 0)
  INTO v_revenue_today, v_revenue_month
  FROM subscriptions 
  WHERE clinic_id = v_clinic_uuid AND status = 'active' AND current_period_end > now();

  SELECT COALESCE(json_agg(row_to_json(t)), '[]') INTO v_patient_growth
  FROM (
    SELECT DATE("createdAt") as date, COUNT(*) as val
    FROM patients
    WHERE clinic_id = v_clinic_uuid AND "createdAt" >= (now() - interval '30 days')
    GROUP BY DATE("createdAt")
    ORDER BY DATE("createdAt")
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]') INTO v_revenue_growth
  FROM (
    SELECT DATE("createdAt") as date, SUM(amount) as val
    FROM subscriptions
    WHERE clinic_id = v_clinic_uuid AND status = 'active' AND current_period_end > now() AND "createdAt" >= (now() - interval '30 days')
    GROUP BY DATE("createdAt")
    ORDER BY DATE("createdAt")
  ) t;

  RETURN json_build_object(
    'total_patients', v_total_patients,
    'today_patients', v_today_patients,
    'total_doctors', v_total_doctors,
    'revenue_today', v_revenue_today,
    'revenue_month', v_revenue_month,
    'patient_growth', v_patient_growth,
    'revenue_growth', v_revenue_growth
  );
END;
$$;
