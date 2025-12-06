import { describe, it, expect, vi } from 'vitest';
import { render, userEvent } from '@/test/utils/testUtils';
import { Button } from './button';

describe('Button', () => {
  it('should render button with text', () => {
    const { getByRole } = render(<Button>Click me</Button>);
    const button = getByRole('button', { name: /click me/i });
    expect(button).not.toBeNull();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    const { getByRole } = render(<Button onClick={handleClick}>Click me</Button>);
    
    await user.click(getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be disabled when disabled prop is true', () => {
    const { getByRole } = render(<Button disabled>Disabled</Button>);
    const button = getByRole('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('should apply variant classes', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>);
    const button = container.firstChild as HTMLElement;
    expect(button.className).toContain('bg-destructive');
  });

  it('should apply size classes', () => {
    const { container } = render(<Button size="sm">Small</Button>);
    const button = container.firstChild as HTMLElement;
    expect(button.className).toContain('h-9');
  });

  it('should not call onClick when disabled', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    const { getByRole } = render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    await user.click(getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should render as child component when asChild is true', () => {
    const { getByRole } = render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    
    const link = getByRole('link');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/test');
  });
});
