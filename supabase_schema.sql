-- FixMaster POS & Repair Management System - 100% Idempotent Supabase Schema

-- STEP 1: CREATE TABLES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    full_name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    phone_number TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    part_name TEXT NOT NULL,
    category TEXT NOT NULL,
    vendor_name TEXT,
    cost_price NUMERIC(10,2) DEFAULT 0.00,
    margin_percent NUMERIC(5,2) DEFAULT 30.00,
    retail_price NUMERIC(10,2) DEFAULT 0.00,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_alert INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_no TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    machine_category TEXT NOT NULL,
    brand_model TEXT NOT NULL,
    serial_number TEXT,
    reported_fault TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    labor_charge NUMERIC(10,2) DEFAULT 0.00,
    advance_deposit NUMERIC(10,2) DEFAULT 0.00,
    total_amount NUMERIC(10,2) DEFAULT 0.00,
    assigned_technician_name TEXT,
    has_external_parts BOOLEAN DEFAULT false,
    external_parts_note TEXT,
    ext_shop_name TEXT,
    ext_part_name TEXT,
    ext_cost_price NUMERIC(10,2) DEFAULT 0.00,
    ext_selling_price NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_parts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_card_id UUID REFERENCES public.job_cards(id) ON DELETE CASCADE,
    part_id TEXT NOT NULL,
    part_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    cost_price NUMERIC(10,2) DEFAULT 0.00,
    margin_percent NUMERIC(5,2) DEFAULT 30.00,
    is_external BOOLEAN DEFAULT false,
    vendor_name TEXT,
    warranty_days INTEGER DEFAULT 30
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_no TEXT UNIQUE NOT NULL,
    job_card_id UUID REFERENCES public.job_cards(id),
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    discount NUMERIC(10,2) DEFAULT 0.00,
    net_payable NUMERIC(10,2) NOT NULL,
    payment_method TEXT DEFAULT 'Cash',
    status TEXT DEFAULT 'Paid',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- STEP 2: ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- STEP 3: CREATE ACCESS POLICIES (SAFE DROP BEFORE RE-CREATING)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public access for profiles" ON public.profiles;
    CREATE POLICY "Allow public access for profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow public access for parts" ON public.parts;
    CREATE POLICY "Allow public access for parts" ON public.parts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow public access for job_cards" ON public.job_cards;
    CREATE POLICY "Allow public access for job_cards" ON public.job_cards FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow public access for job_parts" ON public.job_parts;
    CREATE POLICY "Allow public access for job_parts" ON public.job_parts FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow public access for invoices" ON public.invoices;
    CREATE POLICY "Allow public access for invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
END $$;

-- STEP 4: INSERT SAMPLE DATA
INSERT INTO public.parts (part_name, category, vendor_name, cost_price, margin_percent, retail_price, stock_quantity, min_stock_alert)
VALUES 
  ('Chainsaw Spark Plug (L7T)', 'Chainsaws', 'Husqvarna Spares LK', 400.00, 50.00, 600.00, 25, 5),
  ('Brush Cutter Carburetor 33cc', 'Brush Cutters', 'Stihl Importers', 2500.00, 30.00, 3250.00, 8, 3),
  ('Water Pump Mechanical Seal 2"', 'Petrol / Diesel Water Pumps', 'Lanka Hardware Tech', 1200.00, 40.00, 1680.00, 12, 4),
  ('Angle Grinder Carbon Brush Set', 'Cutting Machines / Angle Grinders', 'Bosch Parts Center', 350.00, 60.00, 560.00, 40, 10)
ON CONFLICT DO NOTHING;

INSERT INTO public.job_cards (job_no, customer_name, phone_number, machine_category, brand_model, reported_fault, status, labor_charge, advance_deposit, total_amount)
VALUES
  ('JOB-1001', 'Kamal Perera', '0771234567', 'Chainsaws', 'Stihl MS180', 'Engine starting issue & hard pull', 'In Progress', 1500.00, 500.00, 2100.00),
  ('JOB-1002', 'Nimal Silva', '0719876543', 'Brush Cutters', 'Honda GX35', 'Carburetor overflow & low speed vibration', 'Pending', 2000.00, 0.00, 2000.00)
ON CONFLICT DO NOTHING;
