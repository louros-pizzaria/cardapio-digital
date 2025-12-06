import { test, expect } from '@playwright/test';

test.describe('Subscription Flow', () => {
  test('should display subscription plans page', async ({ page }) => {
    await page.goto('/plans');
    
    await expect(page.getByRole('heading', { name: /planos/i })).toBeVisible();
  });

  test('should show plan cards', async ({ page }) => {
    await page.goto('/plans');
    
    // Check for plan elements
    const planCards = page.locator('[data-testid*="plan-card"], .plan-card, article, [class*="plan"]');
    const count = await planCards.count();
    
    expect(count).toBeGreaterThan(0);
  });

  test('should have pricing information', async ({ page }) => {
    await page.goto('/plans');
    
    // Look for price indicators (R$, price, valor)
    const priceElements = page.getByText(/R\$|preço|valor|mensal|anual/i);
    const priceCount = await priceElements.count();
    
    expect(priceCount).toBeGreaterThan(0);
  });

  test('should navigate to subscription page from root if needed', async ({ page }) => {
    await page.goto('/');
    
    // Wait for initial load and check if redirected to plans
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    // User might be redirected to plans if no subscription, or to menu if has subscription
    expect(url).toMatch(/\/(menu|plans|auth)/);
  });
});
