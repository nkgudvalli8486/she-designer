import { getSupabaseAdminClient } from './supabase-admin';

export type OrderItemInput = {
  product_id: string;
  name: string;
  unit_amount_cents: number;
  quantity: number;
  attributes?: Record<string, unknown>;
};

export async function createOrderDraft(params: {
  customerId?: string | null;
  currency?: string;
  totalCents: number;
  madeToOrder?: boolean;
  shippingAddress?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  items?: OrderItemInput[];
}) {
  const supabase = getSupabaseAdminClient();
  
  // Generate order number (format: ORD-YYYYMMDD-XXXXX)
  const orderNumber = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
  
  // Build order data, making made_to_order optional in case column doesn't exist yet
  const orderData: Record<string, unknown> = {
    customer_id: params.customerId ?? null,
    status: 'pending',
    payment_status: 'unpaid',
    currency: params.currency ?? 'inr',
    total_cents: params.totalCents,
    total: params.totalCents / 100.0, // total in currency units (e.g., 100000 cents = 1000.00)
    subtotal: params.totalCents, // subtotal is typically the same as total_cents before taxes/shipping
    paid_amount_cents: 0, // Initialize paid amount to 0
    paid_amount: 0, // Initialize paid amount (numeric) to 0
    shipping_address: params.shippingAddress ?? null,
    metadata: params.metadata ?? {},
    order_number: orderNumber
  };

  // Only include made_to_order if explicitly provided (column may not exist in all DBs yet)
  // Try to include it, but if it fails, retry without it
  let orderId: string;
  try {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        ...orderData,
        made_to_order: params.madeToOrder ?? false
      })
      .select('id')
      .single();
    
    if (orderError) {
      // If error is about missing column, retry without it
      if (orderError.message?.includes('made_to_order') || orderError.code === 'PGRST204') {
        const { data: orderRetry, error: retryError } = await supabase
          .from('orders')
          .insert(orderData)
          .select('id')
          .single();
        if (retryError) throw retryError;
        orderId = orderRetry.id as string;
      } else {
        throw orderError;
      }
    } else {
      orderId = order.id as string;
    }
  } catch (err: any) {
    // Final fallback: try without made_to_order
    if (err?.message?.includes('made_to_order') || err?.code === 'PGRST204') {
      const { data: orderFallback, error: fallbackError } = await supabase
        .from('orders')
        .insert(orderData)
        .select('id')
        .single();
      if (fallbackError) throw fallbackError;
      orderId = orderFallback.id as string;
    } else {
      throw err;
    }
  }

  // Create order items if provided
  if (params.items && params.items.length > 0) {
    const orderItems = params.items.map(item => {
      const unitPrice = item.unit_amount_cents / 100.0;
      const totalPrice = unitPrice * item.quantity;
      const baseItem: Record<string, unknown> = {
        order_id: orderId,
        product_id: item.product_id,
        name: item.name,
        title: item.name, // title is often an alias for name
        unit_amount_cents: item.unit_amount_cents,
        unit_price: unitPrice, // unit_price in currency units (e.g., 100000 cents = 1000.00)
        total_price: totalPrice, // total_price = unit_price * quantity
        quantity: item.quantity
      };
      // Only include attributes if column exists (handle gracefully)
      if (item.attributes) {
        baseItem.attributes = item.attributes;
      }
      return baseItem;
    });

    try {
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        // Handle missing columns gracefully - try with minimal required fields
        if (itemsError.code === 'PGRST204' || itemsError.code === '23502') {
          // Try with all potentially required fields
          const minimalItems = orderItems.map(item => {
            const unitPrice = (Number(item.unit_amount_cents) || 0) / 100.0;
            const qty = Number(item.quantity) || 1;
            return {
              order_id: item.order_id,
              product_id: item.product_id,
              name: item.name || 'Product',
              title: item.title || item.name || 'Product',
              unit_amount_cents: item.unit_amount_cents || 0,
              unit_price: unitPrice,
              total_price: unitPrice * qty, // total_price = unit_price * quantity
              quantity: qty
            };
          });
          
          const { error: retryError } = await supabase
            .from('order_items')
            .insert(minimalItems);
          
          if (retryError) {
            console.error('Failed to create order items (minimal retry):', retryError);
            // Don't throw - order is created, items are optional for now
          }
        } else {
          console.error('Failed to create order items:', itemsError);
        }
      }
    } catch (err: any) {
      // Final fallback: try with minimal fields only
      if (err?.code === 'PGRST204' || err?.code === '23502') {
        const minimalItems = orderItems.map(item => {
          const unitPrice = (Number(item.unit_amount_cents) || 0) / 100.0;
          const qty = Number(item.quantity) || 1;
          return {
            order_id: item.order_id,
            product_id: item.product_id,
            name: item.name || 'Product',
            title: item.title || item.name || 'Product',
            unit_amount_cents: item.unit_amount_cents || 0,
            unit_price: unitPrice,
            total_price: unitPrice * qty, // total_price = unit_price * quantity
            quantity: qty
          };
        });
        
        const { error: fallbackError } = await supabase
          .from('order_items')
          .insert(minimalItems);
        
        if (fallbackError) {
          console.error('Failed to create order items (final fallback):', fallbackError);
        }
      } else {
        console.error('Failed to create order items:', err);
      }
    }
  }

  return orderId;
}


