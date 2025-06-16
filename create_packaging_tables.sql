-- Create packaging tables for Supabase database

-- 1. Packaging Attributes table
CREATE TABLE IF NOT EXISTS packaging_attributes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Packaging Attribute Values table
CREATE TABLE IF NOT EXISTS packaging_attribute_values (
  id TEXT PRIMARY KEY,
  attribute_id TEXT NOT NULL REFERENCES packaging_attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Main Packaging table
CREATE TABLE IF NOT EXISTS packaging (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('simple', 'variable')),
  sku TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Junction table for packaging and packaging attributes
CREATE TABLE IF NOT EXISTS packaging_packaging_attributes (
  packaging_id TEXT NOT NULL REFERENCES packaging(id) ON DELETE CASCADE,
  attribute_id TEXT NOT NULL REFERENCES packaging_attributes(id) ON DELETE CASCADE,
  PRIMARY KEY (packaging_id, attribute_id)
);

-- 5. Packaging Variations table
CREATE TABLE IF NOT EXISTS packaging_variations (
  id TEXT PRIMARY KEY,
  packaging_id TEXT NOT NULL REFERENCES packaging(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Junction table for packaging variation attributes
CREATE TABLE IF NOT EXISTS packaging_variation_attributes (
  variation_id TEXT NOT NULL REFERENCES packaging_variations(id) ON DELETE CASCADE,
  attribute_id TEXT NOT NULL REFERENCES packaging_attributes(id) ON DELETE CASCADE,
  attribute_value_id TEXT NOT NULL REFERENCES packaging_attribute_values(id) ON DELETE CASCADE,
  PRIMARY KEY (variation_id, attribute_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_packaging_status ON packaging(status);
CREATE INDEX IF NOT EXISTS idx_packaging_type ON packaging(type);
CREATE INDEX IF NOT EXISTS idx_packaging_variations_packaging_id ON packaging_variations(packaging_id);
CREATE INDEX IF NOT EXISTS idx_packaging_attribute_values_attribute_id ON packaging_attribute_values(attribute_id);

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist, then create new ones
DROP TRIGGER IF EXISTS update_packaging_updated_at ON packaging;
CREATE TRIGGER update_packaging_updated_at BEFORE UPDATE ON packaging
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_packaging_attributes_updated_at ON packaging_attributes;
CREATE TRIGGER update_packaging_attributes_updated_at BEFORE UPDATE ON packaging_attributes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_packaging_variations_updated_at ON packaging_variations;
CREATE TRIGGER update_packaging_variations_updated_at BEFORE UPDATE ON packaging_variations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample packaging attributes for testing (only if they don't exist)
INSERT INTO packaging_attributes (id, name, slug, status) 
SELECT 'PA001', 'Size', 'size', 'active'
WHERE NOT EXISTS (SELECT 1 FROM packaging_attributes WHERE id = 'PA001' OR slug = 'size')
UNION ALL
SELECT 'PA002', 'Material', 'material', 'active'
WHERE NOT EXISTS (SELECT 1 FROM packaging_attributes WHERE id = 'PA002' OR slug = 'material')
UNION ALL
SELECT 'PA003', 'Color', 'color', 'active'
WHERE NOT EXISTS (SELECT 1 FROM packaging_attributes WHERE id = 'PA003' OR slug = 'color');

-- Insert sample attribute values (only if they don't exist)
INSERT INTO packaging_attribute_values (id, attribute_id, value, label, slug, sort_order)
SELECT 'PAV001', 'PA001', 'Small', 'Small', 'small', 1
WHERE NOT EXISTS (SELECT 1 FROM packaging_attribute_values WHERE id = 'PAV001' OR slug = 'small')
UNION ALL
SELECT 'PAV002', 'PA001', 'Medium', 'Medium', 'medium', 2
WHERE NOT EXISTS (SELECT 1 FROM packaging_attribute_values WHERE id = 'PAV002' OR slug = 'medium')
UNION ALL
SELECT 'PAV003', 'PA001', 'Large', 'Large', 'large', 3
WHERE NOT EXISTS (SELECT 1 FROM packaging_attribute_values WHERE id = 'PAV003' OR slug = 'large')
UNION ALL
SELECT 'PAV004', 'PA002', 'Cardboard', 'Cardboard', 'cardboard', 1
WHERE NOT EXISTS (SELECT 1 FROM packaging_attribute_values WHERE id = 'PAV004' OR slug = 'cardboard')
UNION ALL
SELECT 'PAV005', 'PA002', 'Plastic', 'Plastic', 'plastic', 2
WHERE NOT EXISTS (SELECT 1 FROM packaging_attribute_values WHERE id = 'PAV005' OR slug = 'plastic')
UNION ALL
SELECT 'PAV006', 'PA002', 'Metal', 'Metal', 'metal', 3
WHERE NOT EXISTS (SELECT 1 FROM packaging_attribute_values WHERE id = 'PAV006' OR slug = 'metal')
UNION ALL
SELECT 'PAV007', 'PA003', 'Brown', 'Brown', 'brown', 1
WHERE NOT EXISTS (SELECT 1 FROM packaging_attribute_values WHERE id = 'PAV007' OR slug = 'brown')
UNION ALL
SELECT 'PAV008', 'PA003', 'White', 'White', 'white', 2
WHERE NOT EXISTS (SELECT 1 FROM packaging_attribute_values WHERE id = 'PAV008' OR slug = 'white')
UNION ALL
SELECT 'PAV009', 'PA003', 'Black', 'Black', 'black', 3
WHERE NOT EXISTS (SELECT 1 FROM packaging_attribute_values WHERE id = 'PAV009' OR slug = 'black'); 