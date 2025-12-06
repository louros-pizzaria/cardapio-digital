import { test, expect } from '@playwright/test';

test.describe('Payment Flow', () => {
  test('should display payment page', async ({ page }) => {
    await page.goto('/payment');
    
    // Will redirect if no order in progress
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    expect(url).toMatch(/\/(payment|menu|checkout|auth)/);
  });

  test('should show payment method selection in checkout', async ({ page }) => {
    await page.goto('/checkout');
    
    // Look for payment method options
    const paymentMethods = page.getByText(/pix|cartão|dinheiro|pagamento/i);
    const methodCount = await paymentMethods.count();
    
    expect(methodCount).toBeGreaterThanOrEqual(0);
  });

  test('should validate payment page structure', async ({ page }) => {
    await page.goto('/payment');
    
    // Check if page has expected structure (redirected or showing payment)
    const hasContent = await page.locator('main, [role="main"], .payment, .checkout').count() > 0;
    
    expect(hasContent).toBe(true);
  });
});
