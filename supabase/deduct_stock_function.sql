-- Function to atomically deduct stock for a product
-- This prevents race conditions when multiple orders try to deduct stock simultaneously
CREATE OR REPLACE FUNCTION public.deduct_product_stock(
  product_id uuid,
  quantity_to_deduct int
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_stock int;
BEGIN
  -- Lock the row for update to prevent concurrent modifications
  SELECT stock INTO current_stock
  FROM public.products
  WHERE id = product_id
  FOR UPDATE;
  
  -- Check if product exists
  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'Product not found: %', product_id;
  END IF;
  
  -- Check if sufficient stock is available
  IF current_stock < quantity_to_deduct THEN
    RAISE EXCEPTION 'Insufficient stock: Product has % available, but % requested', current_stock, quantity_to_deduct;
  END IF;
  
  -- Deduct stock atomically
  UPDATE public.products
  SET 
    stock = stock - quantity_to_deduct,
    updated_at = now()
  WHERE id = product_id;
  
  -- The trigger will automatically update is_active based on stock
END;
$$;

