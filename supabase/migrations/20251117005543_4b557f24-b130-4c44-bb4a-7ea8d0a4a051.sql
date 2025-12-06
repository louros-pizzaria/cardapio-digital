-- Add 'in_delivery' status to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'in_delivery';

-- Update order status validation comment
COMMENT ON TYPE order_status IS 'Order status: pending, confirmed, preparing, ready, picked_up, in_delivery, delivered, cancelled, expired';