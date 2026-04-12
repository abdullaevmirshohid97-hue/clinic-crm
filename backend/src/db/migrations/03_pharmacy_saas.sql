-- =====================================================
-- Pharmacy SaaS Upgrade: FEFO, Audits, Movements, Suppliers
-- =====================================================

-- 1. MODIFY PHARMACY_INVENTORY TABLE
ALTER TABLE pharmacy_inventory 
  ADD COLUMN IF NOT EXISTS batch_number TEXT,
  ADD COLUMN IF NOT EXISTS manufacture_date DATE,
  ADD COLUMN IF NOT EXISTS min_threshold INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS supplier_id UUID;

-- 2. CREATE SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  name TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_suppliers_clinic ON suppliers(clinic_id);
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY suppliers_clinic_isolation ON suppliers USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

ALTER TABLE pharmacy_inventory 
  ADD CONSTRAINT fk_pharmacy_supplier 
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id);

-- 3. CREATE PHARMACY_MOVEMENTS TABLE
CREATE TABLE IF NOT EXISTS pharmacy_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  medicine_id UUID NOT NULL REFERENCES pharmacy_inventory(id),
  type TEXT NOT NULL CHECK (type IN ('IN', 'OUT')),
  quantity INTEGER NOT NULL,
  source TEXT NOT NULL, -- e.g. 'purchase', 'sale', 'manual_adjustment', 'discard'
  reference_id UUID, -- Links to transaction_id or purchase_id if any
  created_by UUID NOT NULL, -- User UUID performing the action
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_movements_clinic ON pharmacy_movements(clinic_id);
CREATE INDEX idx_movements_medicine ON pharmacy_movements(medicine_id);
ALTER TABLE pharmacy_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY movements_clinic_isolation ON pharmacy_movements USING (clinic_id = (auth.jwt() ->> 'clinic_id')::uuid);

-- 4. ATOMIC CONCURRENCY UPDATES (RPC)
CREATE OR REPLACE FUNCTION atomic_deduct_stock(p_medicine_id UUID, deduct_qty INT)
RETURNS TABLE (new_quantity INT, success BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current INT;
BEGIN
  -- Row-level lock to prevent concurrent modify
  SELECT quantity INTO v_current FROM pharmacy_inventory 
  WHERE id = p_medicine_id FOR UPDATE;

  IF v_current >= deduct_qty THEN
    UPDATE pharmacy_inventory SET quantity = quantity - deduct_qty WHERE id = p_medicine_id
    RETURNING quantity INTO v_current;
    RETURN QUERY SELECT v_current, true;
  ELSE
    RETURN QUERY SELECT v_current, false;
  END IF;
END;
$$;

-- 5. ROLES / POLICIES (Handled mainly in App Logic/RBAC middleware)
