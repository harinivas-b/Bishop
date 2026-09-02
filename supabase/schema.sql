-- ============================================
-- BISHOP — Database Schema (Supabase / PostgreSQL)
-- Run this in the Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Profiles ───
-- Stores user profile data. Links to Supabase Auth users.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'shopkeeper' CHECK (role IN ('shopkeeper', 'employee')),
  phone TEXT,
  avatar_url TEXT,
  shop_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Shops ───
-- Each shopkeeper can create one shop (bakery / hotel).
CREATE TABLE IF NOT EXISTS shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description TEXT,
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  gst_number TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  upi_id TEXT,
  payment_qr_url TEXT,
  bank_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key from profiles to shops if it doesn't already exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_profiles_shop'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT fk_profiles_shop;
  END IF;

  ALTER TABLE public.profiles
    ADD CONSTRAINT fk_profiles_shop
    FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE SET NULL;
END $$;

-- ─── Categories ───
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Menu Items ───
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_veg BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Inventory ───
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC(10,2) NOT NULL DEFAULT 0,
  supplier TEXT,
  last_restocked TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Orders ───
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  table_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax NUMERIC(10,2) NOT NULL DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'upi', 'card', 'razorpay')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Order Items ───
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  total NUMERIC(10,2) NOT NULL,
  notes TEXT
);

-- ─── Employees ───
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff',
  salary NUMERIC(10,2),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(shop_id, profile_id)
);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_profiles_shop ON profiles(shop_id);
CREATE INDEX IF NOT EXISTS idx_categories_shop ON categories(shop_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_shop ON menu_items(shop_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_shop ON inventory(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_employees_shop ON employees(shop_id);

-- ─── Updated At Trigger ───
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_shops_updated_at ON shops;
CREATE TRIGGER trg_shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_menu_items_updated_at ON menu_items;
CREATE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_inventory_updated_at ON inventory;
CREATE TRIGGER trg_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON orders;
CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Row Level Security (RLS) ───
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- ─── Helper Function ───
CREATE OR REPLACE FUNCTION get_user_shop_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT shop_id FROM profiles WHERE id = user_id LIMIT 1;
$$;

-- Profiles: Users can read/update their own profile, Owners can manage shop employee profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Shop owners can manage employee profiles" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Shop owners can manage employee profiles"
  ON profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = profiles.shop_id 
      AND shops.owner_id = auth.uid()
    )
  );

-- Shops: Owner can do everything, employees can read
DROP POLICY IF EXISTS "Owner can manage shop" ON shops;
DROP POLICY IF EXISTS "Employees can view shop" ON shops;
DROP POLICY IF EXISTS "Owner can insert shop" ON shops;

CREATE POLICY "Owner can manage shop"
  ON shops FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "Owner can insert shop" 
  ON shops FOR INSERT 
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Employees can view shop"
  ON shops FOR SELECT
  USING (
    id = get_user_shop_id(auth.uid())
  );

-- Categories: Shop members can read, owner can manage
DROP POLICY IF EXISTS "Shop members can view categories" ON categories;
DROP POLICY IF EXISTS "Owner can manage categories" ON categories;

CREATE POLICY "Shop members can view categories"
  ON categories FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owner can manage categories"
  ON categories FOR ALL
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

-- Menu Items: Public read (for customer QR ordering), owner manages
DROP POLICY IF EXISTS "Anyone can view menu items" ON menu_items;
DROP POLICY IF EXISTS "Owner can manage menu items" ON menu_items;

CREATE POLICY "Anyone can view menu items"
  ON menu_items FOR SELECT
  USING (true);

CREATE POLICY "Owner can manage menu items"
  ON menu_items FOR ALL
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

-- Inventory: Shop members can view, owner manages
DROP POLICY IF EXISTS "Shop members can view inventory" ON inventory;
DROP POLICY IF EXISTS "Owner can manage inventory" ON inventory;

CREATE POLICY "Shop members can view inventory"
  ON inventory FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owner can manage inventory"
  ON inventory FOR ALL
  USING (
    shop_id IN (
      SELECT id FROM shops WHERE owner_id = auth.uid()
    )
  );

-- Orders: Shop members can view/manage
DROP POLICY IF EXISTS "Shop members can view orders" ON orders;
DROP POLICY IF EXISTS "Shop members can manage orders" ON orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON orders;

CREATE POLICY "Shop members can view orders"
  ON orders FOR SELECT
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Shop members can manage orders"
  ON orders FOR ALL
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Allow anonymous order insertion (for customer QR ordering)
CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Order Items: Follow order access
DROP POLICY IF EXISTS "Order items follow order access" ON order_items;
DROP POLICY IF EXISTS "Anyone can insert order items" ON order_items;

CREATE POLICY "Order items follow order access"
  ON order_items FOR SELECT
  USING (
    order_id IN (
      SELECT id FROM orders WHERE shop_id IN (
        SELECT shop_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Anyone can insert order items"
  ON order_items FOR INSERT
  WITH CHECK (true);

-- Employees: Owner manages, employees can view own record
DROP POLICY IF EXISTS "Owner can manage employees" ON employees;
DROP POLICY IF EXISTS "Employees can view own record" ON employees;

CREATE POLICY "Owner can manage employees"
  ON employees FOR ALL
  USING (
    shop_id IN (
      SELECT shop_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Employees can view own record"
  ON employees FOR SELECT
  USING (profile_id = auth.uid());

-- ─── Enable Realtime ───
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'order_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
  END IF;
END $$;
