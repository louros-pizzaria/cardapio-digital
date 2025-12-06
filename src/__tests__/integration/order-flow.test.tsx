import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Menu from '@/pages/Menu';

vi.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ 
        data: { session: { user: { id: 'test-user' } } }, 
        error: null 
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Pizzas', subcategories: [] },
        ],
        error: null,
      }),
    })),
  },
}));

describe('Order Flow Integration', () => {
  it('should render menu page', () => {
    const { container } = render(
      <BrowserRouter>
        <Menu />
      </BrowserRouter>
    );
    
    // Menu should render without crashing
    expect(container.firstChild).toBeTruthy();
  });

  it('should have basic structure', () => {
    const { container } = render(
      <BrowserRouter>
        <Menu />
      </BrowserRouter>
    );
    
    // Check that something rendered
    expect(container.firstChild).toBeTruthy();
  });
});
