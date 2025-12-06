import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

// Mock Supabase
vi.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ 
        data: { session: null }, 
        error: null 
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('should have signIn function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    
    expect(typeof result.current.signIn).toBe('function');
  });

  it('should have signUp function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    
    expect(typeof result.current.signUp).toBe('function');
  });

  it('should have signOut function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    
    expect(typeof result.current.signOut).toBe('function');
  });

  it('should have isAuthenticated function', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });
    
    expect(typeof result.current.isAuthenticated).toBe('function');
  });
});
