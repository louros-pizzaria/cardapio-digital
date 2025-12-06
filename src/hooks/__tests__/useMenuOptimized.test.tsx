import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMenuOptimized } from '../useMenuOptimized';

const mockCategories = [
  { id: '1', name: 'Pizzas', subcategories: [{ id: 's1', name: 'Tradicionais' }] },
  { id: '2', name: 'Bebidas', subcategories: [{ id: 's2', name: 'Refrigerantes' }] },
];

const mockProducts = [
  { id: 'p1', name: 'Pizza Margherita', price: 45.99, subcategory_id: 's1' },
  { id: 'p2', name: 'Pizza Calabresa', price: 49.99, subcategory_id: 's1' },
];

vi.mock('@/services/supabase', () => ({
  supabase: {
    from: vi.fn((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: table === 'categories' ? mockCategories : mockProducts,
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

describe('useMenuOptimized', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useMenuOptimized(), { wrapper: createWrapper() });
    
    expect(result.current.loading).toBe(true);
  });

  it('should have categories array', () => {
    const { result } = renderHook(() => useMenuOptimized(), { wrapper: createWrapper() });

    expect(Array.isArray(result.current.categories)).toBe(true);
  });

  it('should handle subcategory selection', () => {
    const { result } = renderHook(() => useMenuOptimized(), { wrapper: createWrapper() });

    result.current.handleSubcategorySelect('s1', '1');

    expect(result.current.selectedSubcategoryId).toBe('s1');
    expect(result.current.currentView).toBe('products');
  });

  it('should provide navigation functions', () => {
    const { result } = renderHook(() => useMenuOptimized(), { wrapper: createWrapper() });

    expect(typeof result.current.handleBackToCategories).toBe('function');
    expect(typeof result.current.handleBackToSubcategories).toBe('function');
  });

  it('should get current category name', () => {
    const { result } = renderHook(() => useMenuOptimized(), { wrapper: createWrapper() });

    result.current.handleSubcategorySelect('s1', '1');
    
    const categoryName = result.current.getCurrentCategoryName();
    expect(typeof categoryName).toBe('string');
  });

  it('should provide refresh function', () => {
    const { result } = renderHook(() => useMenuOptimized(), { wrapper: createWrapper() });

    expect(typeof result.current.refreshData).toBe('function');
  });
});
