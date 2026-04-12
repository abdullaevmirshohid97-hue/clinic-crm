-- Atomic RPC: Create Doctor (race-condition safe)
CREATE OR REPLACE FUNCTION create_doctor_safe(
  p_clinic_id uuid,
  p_name text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
  v_limit int;
BEGIN
  -- Lock existing doctor rows for this clinic
  PERFORM 1 FROM profiles
  WHERE clinic_id = p_clinic_id AND role = 'doctor'
  FOR UPDATE;

  -- Count current doctors
  SELECT count(*) INTO v_count
  FROM profiles
  WHERE clinic_id = p_clinic_id AND role = 'doctor';

  -- Fetch plan limit
  SELECT COALESCE(sub.max_doctors, plans.max_doctors)
  INTO v_limit
  FROM subscriptions sub
  LEFT JOIN plans ON plans.id = sub.plan_id
  WHERE sub.clinic_id = p_clinic_id
  ORDER BY sub.current_period_end DESC
  LIMIT 1;

  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'Invalid plan config';
  END IF;

  IF v_limit != -1 AND v_count >= v_limit THEN
    RAISE EXCEPTION 'Doctor limit reached';
  END IF;

  -- Safe insert
  INSERT INTO profiles (clinic_id, role, full_name)
  VALUES (p_clinic_id, 'doctor', p_name);
END;
$$;

-- Atomic RPC: Create Patient (race-condition safe)
CREATE OR REPLACE FUNCTION create_patient_safe(
  p_clinic_id uuid,
  p_name text,
  p_phone text DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int;
  v_limit int;
BEGIN
  PERFORM 1 FROM patients
  WHERE clinic_id = p_clinic_id
  FOR UPDATE;

  SELECT count(*) INTO v_count
  FROM patients
  WHERE clinic_id = p_clinic_id;

  SELECT COALESCE(sub.max_patients, plans.max_patients)
  INTO v_limit
  FROM subscriptions sub
  LEFT JOIN plans ON plans.id = sub.plan_id
  WHERE sub.clinic_id = p_clinic_id
  ORDER BY sub.current_period_end DESC
  LIMIT 1;

  IF v_limit IS NULL THEN
    RAISE EXCEPTION 'Invalid plan config';
  END IF;

  IF v_limit != -1 AND v_count >= v_limit THEN
    RAISE EXCEPTION 'Patient limit reached';
  END IF;

  INSERT INTO patients (clinic_id, full_name, phone, created_by)
  VALUES (p_clinic_id, p_name, p_phone, p_created_by);
END;
$$;

-- Atomic RPC: Activate Subscription (expire old → insert new)
CREATE OR REPLACE FUNCTION activate_subscription_safe(
  p_clinic_id uuid,
  p_plan_id uuid,
  p_months int DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Expire all current active/trial subs for this clinic
  UPDATE subscriptions
  SET status = 'expired'
  WHERE clinic_id = p_clinic_id
    AND status IN ('active', 'trial');

  -- Insert new active subscription from plan
  INSERT INTO subscriptions (
    clinic_id, plan_id, status, amount,
    max_doctors, max_patients,
    current_period_start, current_period_end
  )
  SELECT
    p_clinic_id, p.id, 'active', p.price,
    p.max_doctors, p.max_patients,
    now(), now() + (p_months || ' months')::interval
  FROM plans p
  WHERE p.id = p_plan_id;
END;
$$;
