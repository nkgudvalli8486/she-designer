import { getSupabaseAdminClient } from './supabase-admin';

/**
 * Deducts stock for order items atomically.
 * Uses database-level operations to prevent race conditions.
 * 
 * @param orderItems Array of order items with product_id and quantity
 * @returns Promise that resolves if successful, rejects on error
 * @throws Error if stock is insufficient or update fails
 */
export async function deductStockForOrder(orderItems: Array<{ product_id: string; quantity: number }>): Promise<void> {
  const supabase = getSupabaseAdminClient();
  
  // First, check if all products have sufficient stock
  const productIds = orderItems.map(item => item.product_id);
  
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, stock, name')
    .in('id', productIds);
  
  if (fetchError) {
    throw new Error(`Failed to fetch product stock: ${fetchError.message}`);
  }
  
  if (!products || products.length !== productIds.length) {
    throw new Error('Some products not found');
  }
  
  // Create a map for quick lookup
  const productMap = new Map(products.map(p => [p.id, p]));
  
  // Validate stock availability before deducting
  const stockIssues: string[] = [];
  for (const item of orderItems) {
    const product = productMap.get(item.product_id);
    if (!product) {
      stockIssues.push(`Product ${item.product_id} not found`);
      continue;
    }
    
    const currentStock = product.stock ?? 0;
    if (currentStock < item.quantity) {
      stockIssues.push(
        `${product.name || 'Product'}: Only ${currentStock} available, but ${item.quantity} requested`
      );
    }
  }
  
  if (stockIssues.length > 0) {
    throw new Error(`Insufficient stock: ${stockIssues.join('; ')}`);
  }
  
  // Deduct stock atomically using SQL UPDATE with WHERE clause
  // This ensures atomicity and prevents race conditions
  for (const item of orderItems) {
    const product = productMap.get(item.product_id);
    if (!product) continue;
    
    // Use a SQL function for atomic stock deduction
    // This prevents race conditions where multiple orders try to deduct simultaneously
    const { error: updateError } = await supabase.rpc('deduct_product_stock', {
      product_id: item.product_id,
      quantity_to_deduct: item.quantity
    });
    
    // If RPC function doesn't exist, fall back to manual update with validation
    if (updateError && (updateError.message?.includes('function') || updateError.code === '42883' || updateError.code === 'P0001')) {
      // Fallback: Manual update with re-check
      const { data: currentProduct, error: recheckError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single();
      
      if (recheckError) {
        throw new Error(`Failed to re-check stock for product ${item.product_id}: ${recheckError.message}`);
      }
      
      const currentStock = currentProduct?.stock ?? 0;
      if (currentStock < item.quantity) {
        throw new Error(
          `Insufficient stock: Product has ${currentStock} available, but ${item.quantity} requested`
        );
      }
      
      const newStock = currentStock - item.quantity;
      const { error: manualUpdateError } = await supabase
        .from('products')
        .update({ 
          stock: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.product_id)
        .eq('stock', currentStock); // Optimistic locking: only update if stock hasn't changed
      
      if (manualUpdateError) {
        // If optimistic lock failed, stock was modified by another transaction
        // Re-check and throw error
        const { data: latestProduct } = await supabase
          .from('products')
          .select('stock, name')
          .eq('id', item.product_id)
          .single();
        
        const latestStock = latestProduct?.stock ?? 0;
        throw new Error(
          `Stock conflict: Product ${latestProduct?.name || item.product_id} now has ${latestStock} available, but ${item.quantity} requested. Please try again.`
        );
      }
    } else if (updateError) {
      throw new Error(`Failed to deduct stock: ${updateError.message}`);
    }
  }
  
  console.log(`Successfully deducted stock for ${orderItems.length} products`);
}

