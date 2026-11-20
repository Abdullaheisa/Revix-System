-- ==============================================================================
-- 005_fleet_and_purchasing.sql
-- Revix System Phase 5: Purchasing & Fleet Management
-- Vehicle variants, vendor directory, purchase orders (PO) with partial receiving,
-- and individual fleet vehicle asset tracking with branch scoping & duration-band rates.
-- ==============================================================================

-- 1. Vehicle Variants (Catalog of makes, models, model years, trims, and duration-band rental rates)
CREATE TABLE IF NOT EXISTS vehicle_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    make VARCHAR(60) NOT NULL,
    model VARCHAR(60) NOT NULL,
    model_year INTEGER NOT NULL CHECK (model_year >= 1990 AND model_year <= 2040),
    trim VARCHAR(60) NOT NULL DEFAULT 'Standard',
    category VARCHAR(30) NOT NULL DEFAULT 'sedan',
    transmission VARCHAR(20) NOT NULL DEFAULT 'automatic' CHECK (transmission IN ('automatic', 'manual')),
    fuel_type VARCHAR(20) NOT NULL DEFAULT 'petrol' CHECK (fuel_type IN ('petrol', 'diesel', 'hybrid', 'electric')),
    seating_capacity INTEGER NOT NULL DEFAULT 5 CHECK (seating_capacity > 0),
    sipp_code VARCHAR(8) NOT NULL DEFAULT 'ICAR',
    color VARCHAR(40),
    daily_rate_1_to_2 NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (daily_rate_1_to_2 >= 0),
    daily_rate_3_to_7 NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (daily_rate_3_to_7 >= 0),
    daily_rate_8_plus NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (daily_rate_8_plus >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_variants_company ON vehicle_variants(company_id);
CREATE INDEX IF NOT EXISTS idx_variants_make_model ON vehicle_variants(company_id, make, model);
CREATE INDEX IF NOT EXISTS idx_variants_status ON vehicle_variants(status);

-- 2. Vendors Directory
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    legal_name VARCHAR(150),
    category VARCHAR(30) NOT NULL DEFAULT 'dealership' CHECK (category IN ('dealership', 'leasing', 'auction', 'maintenance_parts')),
    contact_person VARCHAR(100) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(255),
    country_code VARCHAR(3) NOT NULL,
    city VARCHAR(80) NOT NULL,
    address TEXT,
    tax_number VARCHAR(60),
    commercial_register VARCHAR(60),
    bank_name VARCHAR(100),
    iban VARCHAR(60),
    payment_terms_days INTEGER NOT NULL DEFAULT 30 CHECK (payment_terms_days >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_company ON vendors(company_id);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);

-- 3. Purchase Orders (PO)
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
    po_number VARCHAR(40) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'partially_received', 'completed', 'cancelled')),
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    currency VARCHAR(10) NOT NULL DEFAULT 'EGP',
    total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    upfront_paid NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (upfront_paid >= 0),
    remaining_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (remaining_amount >= 0),
    installments_count INTEGER NOT NULL DEFAULT 1 CHECK (installments_count >= 1),
    notes TEXT,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_company_po_number UNIQUE (company_id, po_number)
);

CREATE INDEX IF NOT EXISTS idx_po_company ON purchase_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_po_branch ON purchase_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_po_vendor ON purchase_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);

-- 4. Purchase Order Line Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES vehicle_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    received_count INTEGER NOT NULL DEFAULT 0 CHECK (received_count >= 0 AND received_count <= quantity),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_items_variant ON purchase_order_items(variant_id);

-- 5. Fleet Vehicles (Individual assets with VIN, license plate, branch, status, rate override)
CREATE TABLE IF NOT EXISTS fleet_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    variant_id UUID NOT NULL REFERENCES vehicle_variants(id) ON DELETE RESTRICT,
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
    vin VARCHAR(40) NOT NULL,
    license_plate VARCHAR(30) NOT NULL,
    key_number VARCHAR(20),
    color VARCHAR(40) NOT NULL,
    mileage_odometer INTEGER NOT NULL DEFAULT 0 CHECK (mileage_odometer >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'on_rent', 'maintenance', 'reserved', 'out_of_service')),
    registration_expiry DATE,
    insurance_expiry DATE,
    daily_rate_override NUMERIC(12, 2) CHECK (daily_rate_override IS NULL OR daily_rate_override >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_company_vin UNIQUE (company_id, vin),
    CONSTRAINT uk_company_license_plate UNIQUE (company_id, license_plate)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_company ON fleet_vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_branch ON fleet_vehicles(branch_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_variant ON fleet_vehicles(variant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON fleet_vehicles(status);
