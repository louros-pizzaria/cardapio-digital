// ===== TIPOS PADRONIZADOS DE STATUS DE PAGAMENTO =====

export type PaymentStatus = 
  | 'pending'
  | 'processing' 
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'expired';

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'picked_up'
  | 'in_delivery'
  | 'delivered'
  | 'cancelled'
  | 'expired';

export const PAYMENT_STATUS_MAP = {
  // MercadoPago status mapping
  'approved': 'paid' as PaymentStatus,
  'pending': 'pending' as PaymentStatus,
  'authorized': 'processing' as PaymentStatus,
  'in_process': 'processing' as PaymentStatus,
  'in_mediation': 'processing' as PaymentStatus,
  'rejected': 'failed' as PaymentStatus,
  'cancelled': 'cancelled' as PaymentStatus,
  'refunded': 'refunded' as PaymentStatus,
  'charged_back': 'refunded' as PaymentStatus,
} as const;

export const ORDER_STATUS_MAP = {
  // Payment status to order status mapping
  'paid': 'confirmed' as OrderStatus,
  'pending': 'pending' as OrderStatus,
  'processing': 'pending' as OrderStatus,
  'failed': 'cancelled' as OrderStatus,
  'cancelled': 'cancelled' as OrderStatus,
  'expired': 'expired' as OrderStatus,
} as const;

export function mapMercadoPagoStatus(mpStatus: string): PaymentStatus {
  return PAYMENT_STATUS_MAP[mpStatus as keyof typeof PAYMENT_STATUS_MAP] || 'pending';
}

export function mapPaymentToOrderStatus(paymentStatus: PaymentStatus): OrderStatus {
  return ORDER_STATUS_MAP[paymentStatus] || 'pending';
}