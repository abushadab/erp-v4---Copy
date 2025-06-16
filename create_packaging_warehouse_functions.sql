-- Create packaging warehouse stock management functions

-- Function to update packaging warehouse stock
CREATE OR REPLACE FUNCTION update_packaging_warehouse_stock(
  p_packaging_id TEXT,
  p_warehouse_id TEXT,
  p_variation_id TEXT DEFAULT NULL,
  p_quantity_change INTEGER,
  p_movement_type TEXT DEFAULT 'adjustment',
  p_reference_id TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_created_by TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_record packaging_warehouse_stock%ROWTYPE;
  v_new_stock INTEGER;
BEGIN
  -- Get or create the stock record
  SELECT * INTO v_current_record
  FROM packaging_warehouse_stock
  WHERE packaging_id = p_packaging_id 
    AND warehouse_id = p_warehouse_id
    AND (
      (p_variation_id IS NULL AND variation_id IS NULL) OR
      (variation_id = p_variation_id)
    );

  IF NOT FOUND THEN
    -- Create new record if it doesn't exist
    INSERT INTO packaging_warehouse_stock (
      packaging_id,
      warehouse_id,
      variation_id,
      current_stock,
      reserved_stock,
      buying_price,
      bought_quantity,
      last_movement_at,
      created_at,
      updated_at
    )
    VALUES (
      p_packaging_id,
      p_warehouse_id,
      p_variation_id,
      GREATEST(0, p_quantity_change), -- Ensure non-negative stock
      0,
      NULL,
      CASE WHEN p_quantity_change > 0 THEN p_quantity_change ELSE 0 END,
      NOW(),
      NOW(),
      NOW()
    );
    
    v_new_stock := GREATEST(0, p_quantity_change);
  ELSE
    -- Update existing record
    v_new_stock := GREATEST(0, v_current_record.current_stock + p_quantity_change);
    
    UPDATE packaging_warehouse_stock
    SET 
      current_stock = v_new_stock,
      bought_quantity = CASE 
        WHEN p_movement_type = 'purchase' AND p_quantity_change > 0 
        THEN COALESCE(bought_quantity, 0) + p_quantity_change
        ELSE bought_quantity
      END,
      last_movement_at = NOW(),
      updated_at = NOW()
    WHERE packaging_id = p_packaging_id 
      AND warehouse_id = p_warehouse_id
      AND (
        (p_variation_id IS NULL AND variation_id IS NULL) OR
        (variation_id = p_variation_id)
      );
  END IF;

  -- Create stock movement record (if we have a stock_movements table for packaging)
  -- Note: This assumes we extend stock_movements to handle packaging or create packaging_stock_movements
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update packaging warehouse stock: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to get total packaging stock across all warehouses
CREATE OR REPLACE FUNCTION get_total_packaging_stock(
  p_packaging_id TEXT,
  p_variation_id TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_total_stock INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(current_stock), 0) INTO v_total_stock
  FROM packaging_warehouse_stock
  WHERE packaging_id = p_packaging_id
    AND (
      (p_variation_id IS NULL AND variation_id IS NULL) OR
      (variation_id = p_variation_id)
    );
    
  RETURN v_total_stock;
END;
$$ LANGUAGE plpgsql;

-- Function to get total available packaging stock across all warehouses
CREATE OR REPLACE FUNCTION get_total_available_packaging_stock(
  p_packaging_id TEXT,
  p_variation_id TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  v_total_available INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(current_stock - reserved_stock), 0) INTO v_total_available
  FROM packaging_warehouse_stock
  WHERE packaging_id = p_packaging_id
    AND (
      (p_variation_id IS NULL AND variation_id IS NULL) OR
      (variation_id = p_variation_id)
    );
    
  RETURN GREATEST(0, v_total_available);
END;
$$ LANGUAGE plpgsql;

-- Function to transfer packaging stock between warehouses
CREATE OR REPLACE FUNCTION transfer_packaging_stock_between_warehouses(
  p_packaging_id TEXT,
  p_variation_id TEXT DEFAULT NULL,
  p_from_warehouse_id TEXT,
  p_to_warehouse_id TEXT,
  p_quantity INTEGER,
  p_reference_id TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT 'Warehouse Transfer',
  p_created_by TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_from_stock INTEGER;
BEGIN
  -- Check if source warehouse has enough stock
  SELECT current_stock INTO v_from_stock
  FROM packaging_warehouse_stock
  WHERE packaging_id = p_packaging_id 
    AND warehouse_id = p_from_warehouse_id
    AND (
      (p_variation_id IS NULL AND variation_id IS NULL) OR
      (variation_id = p_variation_id)
    );

  IF v_from_stock IS NULL OR v_from_stock < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock in source warehouse for transfer';
  END IF;

  -- Remove stock from source warehouse
  PERFORM update_packaging_warehouse_stock(
    p_packaging_id,
    p_from_warehouse_id,
    p_variation_id,
    -p_quantity,
    'transfer',
    p_reference_id,
    p_reason || ' (outgoing)',
    p_created_by,
    p_notes
  );

  -- Add stock to destination warehouse
  PERFORM update_packaging_warehouse_stock(
    p_packaging_id,
    p_to_warehouse_id,
    p_variation_id,
    p_quantity,
    'transfer',
    p_reference_id,
    p_reason || ' (incoming)',
    p_created_by,
    p_notes
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to transfer packaging stock: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql; 