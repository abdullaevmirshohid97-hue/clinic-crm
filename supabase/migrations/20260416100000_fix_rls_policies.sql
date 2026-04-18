-- ============================================
-- FIX RLS POLICIES - Based on actual table structure
-- All clinic_id are BIGINT, users/profiles id are UUID
-- ============================================

-- Helper function: get clinic_id from JWT as TEXT
CREATE OR REPLACE FUNCTION get_my_clinic_id()
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'clinic_id',
    auth.jwt() -> 'user_metadata' ->> 'clinic_id'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function: get role from JWT
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- DROP ALL EXISTING POLICIES
-- ============================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ============================================
-- CLINICS (id = BIGINT, no clinic_id)
-- ============================================
CREATE POLICY "clinics_select" ON clinics FOR SELECT 
  USING (get_my_role() = 'super_admin' OR id::text = get_my_clinic_id());
CREATE POLICY "clinics_insert" ON clinics FOR INSERT 
  WITH CHECK (get_my_role() = 'super_admin');
CREATE POLICY "clinics_update" ON clinics FOR UPDATE 
  USING (get_my_role() = 'super_admin' OR id::text = get_my_clinic_id());
CREATE POLICY "clinics_delete" ON clinics FOR DELETE 
  USING (get_my_role() = 'super_admin');

-- ============================================
-- USERS (id = UUID = auth.uid(), clinic_id = BIGINT)
-- ============================================
CREATE POLICY "users_select" ON users FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id() OR id = auth.uid());
CREATE POLICY "users_insert" ON users FOR INSERT 
  WITH CHECK (get_my_role() IN ('super_admin', 'admin') OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "users_update" ON users FOR UPDATE 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id() OR id = auth.uid());
CREATE POLICY "users_delete" ON users FOR DELETE 
  USING (get_my_role() IN ('super_admin', 'admin'));

-- ============================================
-- PROFILES (id = UUID = auth.uid(), clinic_id = BIGINT)
-- ============================================
CREATE POLICY "profiles_select" ON profiles FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id() OR id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id() OR id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id() OR id = auth.uid());
CREATE POLICY "profiles_delete" ON profiles FOR DELETE 
  USING (get_my_role() IN ('super_admin', 'admin'));

-- ============================================
-- STAFF (id = BIGINT, clinic_id = BIGINT, auth_user_id = UUID)
-- ============================================
CREATE POLICY "staff_select" ON staff FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id() OR auth_user_id = auth.uid());
CREATE POLICY "staff_insert" ON staff FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "staff_update" ON staff FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id() OR auth_user_id = auth.uid());
CREATE POLICY "staff_delete" ON staff FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id() AND get_my_role() = 'admin');

-- ============================================
-- STANDARD TABLES (id = BIGINT, clinic_id = BIGINT)
-- ============================================

-- PATIENTS
CREATE POLICY "patients_select" ON patients FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "patients_insert" ON patients FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "patients_update" ON patients FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "patients_delete" ON patients FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id() AND get_my_role() IN ('admin', 'super_admin'));

-- DOCTORS
CREATE POLICY "doctors_select" ON doctors FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "doctors_insert" ON doctors FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "doctors_update" ON doctors FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "doctors_delete" ON doctors FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id() AND get_my_role() = 'admin');

-- SERVICES
CREATE POLICY "services_select" ON services FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "services_insert" ON services FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "services_update" ON services FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "services_delete" ON services FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id() AND get_my_role() = 'admin');

-- QUEUE
CREATE POLICY "queue_select" ON queue FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "queue_insert" ON queue FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "queue_update" ON queue FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "queue_delete" ON queue FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id());

-- APPOINTMENTS
CREATE POLICY "appointments_select" ON appointments FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "appointments_insert" ON appointments FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "appointments_update" ON appointments FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "appointments_delete" ON appointments FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id() AND get_my_role() = 'admin');

-- TRANSACTIONS
CREATE POLICY "transactions_select" ON transactions FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "transactions_insert" ON transactions FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "transactions_update" ON transactions FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "transactions_delete" ON transactions FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id() AND get_my_role() = 'admin');

-- SHIFTS
CREATE POLICY "shifts_select" ON shifts FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "shifts_insert" ON shifts FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "shifts_update" ON shifts FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "shifts_delete" ON shifts FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id() AND get_my_role() = 'admin');

-- ROOMS
CREATE POLICY "rooms_select" ON rooms FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "rooms_insert" ON rooms FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "rooms_update" ON rooms FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "rooms_delete" ON rooms FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id() AND get_my_role() = 'admin');

-- ROOM_TARIFFS
CREATE POLICY "room_tariffs_select" ON room_tariffs FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "room_tariffs_insert" ON room_tariffs FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "room_tariffs_update" ON room_tariffs FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "room_tariffs_delete" ON room_tariffs FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id());

-- ROOM_PATIENTS
CREATE POLICY "room_patients_select" ON room_patients FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "room_patients_insert" ON room_patients FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "room_patients_update" ON room_patients FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "room_patients_delete" ON room_patients FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id());

-- SETTINGS
CREATE POLICY "settings_select" ON settings FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "settings_insert" ON settings FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "settings_update" ON settings FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "settings_delete" ON settings FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id() AND get_my_role() = 'admin');

-- EXPENSES
CREATE POLICY "expenses_select" ON expenses FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "expenses_insert" ON expenses FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "expenses_update" ON expenses FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "expenses_delete" ON expenses FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id() AND get_my_role() = 'admin');

-- ATTENDANCE
CREATE POLICY "attendance_select" ON attendance FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "attendance_insert" ON attendance FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "attendance_update" ON attendance FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "attendance_delete" ON attendance FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id());

-- LABORATORY_TEMPLATES
CREATE POLICY "laboratory_templates_select" ON laboratory_templates FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "laboratory_templates_insert" ON laboratory_templates FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "laboratory_templates_update" ON laboratory_templates FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "laboratory_templates_delete" ON laboratory_templates FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id());

-- LABORATORY_TESTS
CREATE POLICY "laboratory_tests_select" ON laboratory_tests FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "laboratory_tests_insert" ON laboratory_tests FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "laboratory_tests_update" ON laboratory_tests FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "laboratory_tests_delete" ON laboratory_tests FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id());

-- INPATIENT_TREATMENTS
CREATE POLICY "inpatient_treatments_select" ON inpatient_treatments FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "inpatient_treatments_insert" ON inpatient_treatments FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "inpatient_treatments_update" ON inpatient_treatments FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "inpatient_treatments_delete" ON inpatient_treatments FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id());

-- VITAL_SIGNS
CREATE POLICY "vital_signs_select" ON vital_signs FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "vital_signs_insert" ON vital_signs FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "vital_signs_update" ON vital_signs FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "vital_signs_delete" ON vital_signs FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id());

-- PHARMACY_JOURNAL
CREATE POLICY "pharmacy_journal_select" ON pharmacy_journal FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "pharmacy_journal_insert" ON pharmacy_journal FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "pharmacy_journal_update" ON pharmacy_journal FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "pharmacy_journal_delete" ON pharmacy_journal FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id());

-- ============================================
-- TABLES WITH UUID id and BIGINT clinic_id
-- ============================================

-- PHARMACY (id = UUID, clinic_id = BIGINT nullable)
CREATE POLICY "pharmacy_select" ON pharmacy FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "pharmacy_insert" ON pharmacy FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "pharmacy_update" ON pharmacy FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "pharmacy_delete" ON pharmacy FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id());

-- DOCTOR_PAYOUTS (id = UUID, clinic_id = BIGINT nullable)
CREATE POLICY "doctor_payouts_select" ON doctor_payouts FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "doctor_payouts_insert" ON doctor_payouts FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "doctor_payouts_update" ON doctor_payouts FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "doctor_payouts_delete" ON doctor_payouts FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id());

-- INVENTORY (id = BIGINT, clinic_id = BIGINT nullable)
CREATE POLICY "inventory_select" ON inventory FOR SELECT 
  USING (get_my_role() = 'super_admin' OR clinic_id::text = get_my_clinic_id());
CREATE POLICY "inventory_insert" ON inventory FOR INSERT 
  WITH CHECK (clinic_id::text = get_my_clinic_id());
CREATE POLICY "inventory_update" ON inventory FOR UPDATE 
  USING (clinic_id::text = get_my_clinic_id());
CREATE POLICY "inventory_delete" ON inventory FOR DELETE 
  USING (clinic_id::text = get_my_clinic_id());

-- PAYMENT_PROVIDER_ACCOUNTS (id = UUID, clinic_id = UUID)
CREATE POLICY "payment_provider_accounts clinic read/write" ON payment_provider_accounts FOR ALL
  USING (clinic_id::text = get_my_clinic_id())
  WITH CHECK (clinic_id::text = get_my_clinic_id());

-- ============================================
-- GLOBAL TABLES (no clinic_id - accessible by all)
-- ============================================

-- APP_PERMISSIONS (global, read-only for users)
CREATE POLICY "app_permissions_select" ON app_permissions FOR SELECT USING (true);
CREATE POLICY "app_permissions_manage" ON app_permissions FOR ALL USING (get_my_role() = 'super_admin');

-- ROLES (global, read-only for users)
CREATE POLICY "roles_select" ON roles FOR SELECT USING (true);
CREATE POLICY "roles_manage" ON roles FOR ALL USING (get_my_role() = 'super_admin');

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'RLS Policies created successfully for all 25 tables!' AS result;
