import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCartProducts } from '../useCartProducts';

const mockProducts = [
  {
    id: 'p1',
    name: 'Pizza Margherita',
    categories: { name: 'Pizzas' },
    subcategories: { name: 'Tradicionais' },
  },
];

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({
        data: mockProducts,
        error: null,
      }),
    })),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCartProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array for empty cart', () => {
    const { result } = renderHook(() => useCartProducts([]), { wrapper: createWrapper() });

    expect(result.current.productsInfo).toEqual([]);
  });

  it('should have loading state', () => {
    const cartItems = [
      { id: '1', productId: 'p1', name: 'Pizza', quantity: 2, price: 45.99, cartItemId: 'c1' },
    ];

    const { result } = renderHook(() => useCartProducts(cartItems), { 
      wrapper: createWrapper() 
    });
    
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('should provide getProductInfo function', () => {
    const cartItems = [
      { id: '1', productId: 'p1', name: 'Pizza', quantity: 2, price: 45.99, cartItemId: 'c1' },
    ];

    const { result } = renderHook(() => useCartProducts(cartItems), { 
      wrapper: createWrapper() 
    });

    expect(typeof result.current.getProductInfo).toBe('function');
  });

  it('should return undefined for non-existent product', () => {
    const cartItems = [
      { id: '1', productId: 'p1', name: 'Pizza', quantity: 2, price: 45.99, cartItemId: 'c1' },
    ];

    const { result } = renderHook(() => useCartProducts(cartItems), { 
      wrapper: createWrapper() 
    });

    const productInfo = result.current.getProductInfo('non-existent');
    expect(productInfo).toBeUndefined();
  });
});
