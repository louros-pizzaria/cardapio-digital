import { test, expect } from '@playwright/test';

test.describe('Menu Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Note: In real tests, you would authenticate first
    await page.goto('/menu');
  });

  test('should display menu page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /cardápio/i })).toBeVisible();
  });

  test('should show categories', async ({ page }) => {
    // Wait for categories to load
    await page.waitForSelector('[data-testid="category-card"], .grid', { timeout: 10000 });
    
    // Check if there are any interactive elements (categories or products)
    const categories = page.locator('[data-testid="category-card"]');
    const products = page.locator('[data-testid="product-card"]');
    
    const categoriesCount = await categories.count();
    const productsCount = await products.count();
    
    expect(categoriesCount + productsCount).toBeGreaterThan(0);
  });

  test('should navigate to subcategories when clicking category', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Find first clickable category
    const firstCategory = page.locator('[data-testid="category-card"]').first();
    
    if (await firstCategory.count() > 0) {
      await firstCategory.click();
      
      // Should show back button or breadcrumb
      await expect(
        page.getByRole('button', { name: /voltar/i })
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show product modal when clicking product', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Find and click first product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    
    if (await firstProduct.count() > 0) {
      await firstProduct.locator('button', { hasText: /ver produto/i }).click();
      
      // Modal should open
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should add item to cart', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Click quick add button
    const quickAddButton = page.locator('button[aria-label*="carrinho"]').first();
    
    if (await quickAddButton.count() > 0) {
      await quickAddButton.click();
      
      // Cart count should increase
      await expect(page.getByText(/carrinho.*\(1\)/i)).toBeVisible({ timeout: 3000 });
    }
  });
});
