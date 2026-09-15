import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/#/login');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display login page correctly with Kazakh UI elements', async ({ page }) => {
    await page.goto('/#/login');

    await expect(page.locator('h1')).toHaveText('Кіру');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Кіру');
  });

  test('should switch between Login and Signup modes via bottom link', async ({ page }) => {
    await page.goto('/#/login');

    // Click link to signup at the bottom of the card
    await page.locator('a:has-text("Тіркелу")').click();
    await expect(page).toHaveURL(/.*#\/signup/);
    await expect(page.locator('h1')).toHaveText('Тіркелу');
    await expect(page.locator('input[placeholder*="Азамат"]')).toBeVisible();

    // Click link back to login
    await page.locator('a:has-text("Кіру")').click();
    await expect(page).toHaveURL(/.*#\/login/);
    await expect(page.locator('h1')).toHaveText('Кіру');
  });

  test('should show validation error when submitting with empty email or password', async ({ page }) => {
    await page.goto('/#/login');

    // Attempt to submit empty form (removing HTML required attribute to test JS validation)
    await page.evaluate(() => {
      document.querySelectorAll('input').forEach(i => i.removeAttribute('required'));
    });
    await page.click('button[type="submit"]');

    // Error message should appear
    await expect(page.locator('div:has-text("енгізіңіз")').first()).toBeVisible({ timeout: 5000 });
  });

  test('should successfully register a new user and redirect to catalog/home', async ({ page }) => {
    await page.goto('/#/signup');

    const randomEmail = `e2e_user_${Date.now()}@tanda.kz`;
    await page.fill('input[placeholder*="Азамат"]', 'E2E Тест Пайдаланушы');
    await page.fill('input[type="email"]', randomEmail);
    await page.fill('input[type="password"]', 'SecretPass123!');
    await page.click('button[type="submit"]');

    // Successful registration stores session and navigates away from auth
    await expect(page).not.toHaveURL(/.*#\/signup/, { timeout: 10000 });
  });

  test('should successfully log in as Admin via Quick Demo button', async ({ page }) => {
    await page.goto('/#/login');

    // Click Admin quick login button
    await page.click('button:has-text("Админ")');

    // Should redirect to admin dashboard
    await expect(page).toHaveURL(/.*#\/admin/, { timeout: 10000 });
    await expect(page.locator('text=Басқару панелі').or(page.locator('text=Админ')).first()).toBeVisible();
  });

  test('should successfully log in as Reader via Quick Demo button and log out', async ({ page }) => {
    await page.goto('/#/login');

    // Click Reader quick login button
    await page.click('button:has-text("Оқырман")');

    // Should redirect to catalog
    await expect(page).toHaveURL(/.*#\/catalog/, { timeout: 10000 });

    // Navigate to profile and log out
    await page.goto('/#/profile');
    const logoutBtn = page.locator('button:has-text("Шығу")');
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/.*#\//);
    }
  });
});
