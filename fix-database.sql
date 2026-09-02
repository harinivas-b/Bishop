-- ========================================================
-- BISHOP — Database Fix & Non-Recursive RLS Policy Script
-- Execute this script in your Supabase SQL Editor
-- ========================================================

-- 0. Ensure schema columns exist on existing tables
ALTER TABLE shops ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 0;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS upi_id TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS payment_qr_url TEXT;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS bank_details TEXT;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shop_id UUID;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cash';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS notes TEXT;

-- 1. Helper Function to break RLS recursion loop (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_user_shop_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shop_id FROM profiles WHERE id = user_id LIMIT 1;
$$;

-- 2. Clean up old recursive policies
DROP POLICY IF EXISTS "Employees can view shop" ON shops;
DROP POLICY IF EXISTS "Owner can manage shop" ON shops;
DROP POLICY IF EXISTS "Owner can insert shop" ON shops;
DROP POLICY IF EXISTS "Anyone can view active shops" ON shops;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Shop owners can manage employee profiles" ON profiles;

DROP POLICY IF EXISTS "Owner can manage employees" ON employees;
DROP POLICY IF EXISTS "Employees can view own record" ON employees;

DROP POLICY IF EXISTS "Shop members can view categories" ON categories;
DROP POLICY IF EXISTS "Anyone can view active categories" ON categories;

DROP POLICY IF EXISTS "Anyone can view menu items" ON menu_items;
DROP POLICY IF EXISTS "Anyone can view available menu items" ON menu_items;

DROP POLICY IF EXISTS "Anyone can create orders" ON orders;
DROP POLICY IF EXISTS "Anyone can insert order items" ON order_items;

-- 3. Profiles Policies
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "Shop owners can manage employee profiles"
ON profiles FOR ALL USING (
  EXISTS (
    SELECT 1 FROM shops 
    WHERE shops.id = profiles.shop_id 
    AND shops.owner_id = auth.uid()
  )
);

-- 4. Shops Policies
CREATE POLICY "Owner can manage shop" 
ON shops FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Owner can insert shop" 
ON shops FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Employees can view shop" 
ON shops FOR SELECT USING (
  id = get_user_shop_id(auth.uid())
);

CREATE POLICY "Anyone can view active shops" 
ON shops FOR SELECT USING (is_active = true);

-- 5. Categories Policies
CREATE POLICY "Anyone can view active categories"
ON categories FOR SELECT USING (is_active = true);

CREATE POLICY "Shop owners can manage categories"
ON categories FOR ALL USING (
  shop_id = get_user_shop_id(auth.uid())
);

-- 6. Menu Items Policies
CREATE POLICY "Anyone can view available menu items"
ON menu_items FOR SELECT USING (is_available = true);

CREATE POLICY "Shop owners can manage menu items"
ON menu_items FOR ALL USING (
  shop_id = get_user_shop_id(auth.uid())
);

-- 7. Orders & Order Items Public QR Policies
CREATE POLICY "Anyone can create orders"
ON orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert order items"
ON order_items FOR INSERT WITH CHECK (true);

-- 8. Employees Policies
CREATE POLICY "Owner can manage employees"
ON employees FOR ALL USING (
  EXISTS (
    SELECT 1 FROM shops 
    WHERE shops.id = employees.shop_id 
    AND shops.owner_id = auth.uid()
  )
);

CREATE POLICY "Employees can view own record"
ON employees FOR SELECT USING (profile_id = auth.uid());

-- 9. Secure RPC Function for Server-Side Order Price Validation
CREATE OR REPLACE FUNCTION submit_customer_order(
  p_shop_id UUID,
  p_table_number TEXT,
  p_customer_name TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT 'cash',
  p_notes TEXT DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop record;
  v_menu_item record;
  v_order_id UUID;
  v_order_number TEXT;
  v_subtotal NUMERIC := 0;
  v_tax NUMERIC := 0;
  v_total NUMERIC := 0;
  v_item_total NUMERIC := 0;
  v_item_json JSONB;
BEGIN
  -- 1. Check shop exists and is active
  SELECT * INTO v_shop FROM shops WHERE id = p_shop_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop not found or inactive';
  END IF;

  -- 2. Validate items and calculate subtotal using DB prices
  FOR v_item_json IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF (v_item_json->>'quantity')::int <= 0 THEN
      RAISE EXCEPTION 'Invalid quantity for item';
    END IF;

    SELECT * INTO v_menu_item FROM menu_items 
    WHERE id = (v_item_json->>'menu_item_id')::UUID 
      AND shop_id = p_shop_id 
      AND is_available = true;
      
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Menu item unavailable or invalid';
    END IF;

    v_item_total := v_menu_item.price * (v_item_json->>'quantity')::int;
    v_subtotal := v_subtotal + v_item_total;
  END LOOP;

  -- 3. Calculate tax and total
  v_tax := ROUND(v_subtotal * (COALESCE(v_shop.tax_rate, 0) / 100.0), 2);
  v_total := ROUND(v_subtotal + v_tax, 2);
  v_order_number := 'BISHOP-' || floor(extract(epoch from now()))::text || '-' || floor(random() * 900 + 100)::text;

  -- 4. Insert order
  INSERT INTO orders (
    shop_id, order_number, customer_name, customer_phone, table_number,
    status, subtotal, tax, total, payment_method, payment_status, notes
  ) VALUES (
    p_shop_id, v_order_number, p_customer_name, p_customer_phone, p_table_number,
    'pending', v_subtotal, v_tax, v_total, p_payment_method,
    CASE WHEN p_payment_method = 'cash' THEN 'pending' ELSE 'paid' END,
    p_notes
  ) RETURNING id INTO v_order_id;

  -- 5. Insert order items
  FOR v_item_json IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT * INTO v_menu_item FROM menu_items WHERE id = (v_item_json->>'menu_item_id')::UUID;
    v_item_total := v_menu_item.price * (v_item_json->>'quantity')::int;

    INSERT INTO order_items (
      order_id, menu_item_id, name, price, quantity, total, notes
    ) VALUES (
      v_order_id, v_menu_item.id, v_menu_item.name, v_menu_item.price,
      (v_item_json->>'quantity')::int, v_item_total, v_item_json->>'notes'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'total', v_total
  );
END;
$$;

-- 9. Enable Realtime Replication on Orders Table (Idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
END $$;

-- 10. Employee Tasks Table & RLS Policies
CREATE TABLE IF NOT EXISTS employee_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE employee_tasks ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE employee_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE employee_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Shop owners can manage employee tasks" ON employee_tasks;
DROP POLICY IF EXISTS "Employees can view and update own tasks" ON employee_tasks;

CREATE POLICY "Shop owners can manage employee tasks"
ON employee_tasks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM shops 
    WHERE shops.id = employee_tasks.shop_id 
    AND shops.owner_id = auth.uid()
  )
);

CREATE POLICY "Employees can view and update own tasks"
ON employee_tasks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.id = employee_tasks.employee_id 
    AND employees.profile_id = auth.uid()
  )
);

