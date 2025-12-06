// ===== LIMITES E VALIDAÇÕES DE PEDIDOS =====

export const ORDER_LIMITS = {
  MIN_VALUE: 15.00,
  MAX_VALUE: 500.00,
  MAX_ITEMS: 50,
  MAX_ORDERS_PER_HOUR: 5,
  MAX_QUANTITY_PER_ITEM: 20
} as const;

export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateOrderValue = (totalValue: number): OrderValidationResult => {
  const errors: string[] = [];
  
  if (totalValue < ORDER_LIMITS.MIN_VALUE) {
    errors.push(`Valor mínimo do pedido é R$ ${ORDER_LIMITS.MIN_VALUE.toFixed(2)}`);
  }
  
  if (totalValue > ORDER_LIMITS.MAX_VALUE) {
    errors.push(`Valor máximo do pedido é R$ ${ORDER_LIMITS.MAX_VALUE.toFixed(2)}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateOrderItems = (items: Array<{ quantity: number }>): OrderValidationResult => {
  const errors: string[] = [];
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  
  if (totalItems > ORDER_LIMITS.MAX_ITEMS) {
    errors.push(`Máximo de ${ORDER_LIMITS.MAX_ITEMS} itens por pedido`);
  }
  
  // Verificar quantidade individual por item
  const invalidItems = items.filter(item => item.quantity > ORDER_LIMITS.MAX_QUANTITY_PER_ITEM);
  if (invalidItems.length > 0) {
    errors.push(`Máximo de ${ORDER_LIMITS.MAX_QUANTITY_PER_ITEM} unidades por item`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};