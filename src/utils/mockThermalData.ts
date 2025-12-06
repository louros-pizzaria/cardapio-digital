// ===== DADOS MOCK PARA TESTE DE IMPRESSÃO TÉRMICA =====

export const mockTestOrder = {
  id: 'test-order-preview',
  order_number: 'T001',
  customer_name: 'Cliente Teste',
  customer_phone: '(11) 98765-4321',
  delivery_address: {
    street: 'Rua das Flores',
    number: '123',
    complement: 'Apto 45',
    neighborhood: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    zip_code: '01234-567'
  },
  items: [
    {
      product_name: 'Pizza Margherita G',
      quantity: 1,
      unit_price: 45.00,
      total_price: 45.00,
      notes: 'Sem cebola'
    },
    {
      product_name: 'Refrigerante 2L',
      quantity: 2,
      unit_price: 8.00,
      total_price: 16.00
    },
    {
      product_name: 'Batata Frita Grande',
      quantity: 1,
      unit_price: 15.00,
      total_price: 15.00,
      notes: 'Bem crocante'
    }
  ],
  subtotal: 76.00,
  delivery_fee: 5.00,
  total_amount: 81.00,
  payment_method: 'pix',
  payment_status: 'pending',
  notes: 'Entregar no portão lateral',
  created_at: new Date().toISOString()
};
