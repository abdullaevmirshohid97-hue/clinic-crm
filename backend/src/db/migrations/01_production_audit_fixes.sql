-- 1. RPC FOR ATOMIC ROOM ASSIGNMENT
CREATE OR REPLACE FUNCTION assign_room_atomic(
    p_clinic_id UUID,
    p_room_id UUID,
    p_patient_id UUID,
    p_doctor_id UUID
) RETURNS room_patients AS $$
DECLARE
    v_room RECORD;
    v_active_count INTEGER;
    v_assignment room_patients;
BEGIN
    -- Lock the room row to serialize concurrent assignments for the same room
    SELECT * INTO v_room FROM rooms 
    WHERE id = p_room_id AND clinic_id = p_clinic_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room not found or unauthorized.';
    END IF;

    -- Count active assignments
    SELECT COUNT(*) INTO v_active_count FROM room_patients
    WHERE room_id = p_room_id AND clinic_id = p_clinic_id AND status = 'active';

    IF v_active_count >= v_room.capacity THEN
        RAISE EXCEPTION 'Room is full. Maximum capacity for % is %.', v_room.type, v_room.capacity;
    END IF;

    -- Insert new assignment
    INSERT INTO room_patients (clinic_id, room_id, patient_id, doctor_id, status)
    VALUES (p_clinic_id, p_room_id, p_patient_id, p_doctor_id, 'active')
    RETURNING * INTO v_assignment;

    RETURN v_assignment;
END;
$$ LANGUAGE plpgsql;

-- 2. RPC FOR ATOMIC QUEUE ASSIGNMENT
-- Sequence alternative to Redis INCR if pure DB logic is desired as requested by user
CREATE OR REPLACE FUNCTION assign_queue_atomic(
    p_clinic_id UUID,
    p_patient_id UUID,
    p_doctor_id UUID,
    p_doctor_prefix TEXT
) RETURNS queues AS $$
DECLARE
    v_today_start TIMESTAMP WITH TIME ZONE := date_trunc('day', timezone('utc', now()));
    v_count INTEGER;
    v_number TEXT;
    v_queue queues;
BEGIN
    -- Using advisory locks or counting existing for the day
    -- Since we expect low/mid traffic per doctor, simple COUNT + 1 is fine, 
    -- but to avoid race, we can lock doctor row or use a designated table.
    -- For clinic CRM, we serialize by locking the doctor record
    PERFORM 1 FROM doctors WHERE id = p_doctor_id AND clinic_id = p_clinic_id FOR UPDATE;

    SELECT COALESCE(MAX(CAST(SUBSTRING(number FROM LENGTH(p_doctor_prefix) + 1) AS INTEGER)), 0) INTO v_count
    FROM queues
    WHERE doctor_id = p_doctor_id AND clinic_id = p_clinic_id AND created_at >= v_today_start;

    v_number := p_doctor_prefix || (v_count + 1)::TEXT;

    INSERT INTO queues (clinic_id, patient_id, doctor_id, number, status)
    VALUES (p_clinic_id, p_patient_id, p_doctor_id, v_number, 'waiting')
    RETURNING * INTO v_queue;

    RETURN v_queue;
END;
$$ LANGUAGE plpgsql;

-- 3. COMPOSITE INDEXES
CREATE INDEX IF NOT EXISTS idx_patients_clinic_phone ON patients (clinic_id, phone);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_created ON patients (clinic_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queues_clinic_doc_created ON queues (clinic_id, doctor_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_room_patients_clinic_status ON room_patients (clinic_id, room_id, status);
CREATE INDEX IF NOT EXISTS idx_users_clinic_lastseen ON users (clinic_id, last_seen DESC);

-- 4. STRICT RLS (WITH CHECK POLICIES)
-- Prevents a user in Clinic A from inserting rows for Clinic B

-- Example for patients:
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Clinic Data Access" ON patients;

-- Read Access
CREATE POLICY "Clinic Data Select" ON patients FOR SELECT
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Insert Access (WITH CHECK)
CREATE POLICY "Clinic Data Insert" ON patients FOR INSERT
  WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Update Access (USING + WITH CHECK)
CREATE POLICY "Clinic Data Update" ON patients FOR UPDATE
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()))
  WITH CHECK (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Delete Access
CREATE POLICY "Clinic Data Delete" ON patients FOR DELETE
  USING (clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- NOTE: Repeat the above rigid policy structure for queues, rooms, room_patients, etc.
