import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/auth');
    
    await expect(page.getByRole('heading', { name: /entrar/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/senha/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/auth');
    
    await page.getByRole('button', { name: /entrar/i }).click();
    
    // Check for validation messages
    await expect(page.getByText(/obrigatório/i).first()).toBeVisible();
  });

  test('should toggle between login and register', async ({ page }) => {
    await page.goto('/auth');
    
    await expect(page.getByRole('heading', { name: /entrar/i })).toBeVisible();
    
    // Switch to register
    await page.getByRole('button', { name: /criar conta/i }).click();
    
    await expect(page.getByRole('heading', { name: /criar conta/i })).toBeVisible();
    await expect(page.getByPlaceholder(/nome completo/i)).toBeVisible();
  });

  test('should show password toggle', async ({ page }) => {
    await page.goto('/auth');
    
    const passwordInput = page.getByPlaceholder(/senha/i);
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click eye icon to show password
    await page.locator('button[aria-label*="senha"]').click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
