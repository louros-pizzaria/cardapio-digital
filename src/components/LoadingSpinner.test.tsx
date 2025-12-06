import { describe, it, expect } from 'vitest';
import { render } from '@/test/utils/testUtils';
import { LoadingSpinner } from './LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render loading spinner', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).not.toBeNull();
  });

  it('should have default size', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.h-8');
    expect(spinner).not.toBeNull();
  });

  it('should be visible', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.firstChild).not.toBeNull();
  });
});
