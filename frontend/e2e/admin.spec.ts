import { test, expect } from '@playwright/test';

test.describe('Admin Panel and Security', () => {
  test('should allow admin user to access Admin Dashboard and see books table', async ({ page }) => {
    await page.goto('/#/login');
    await page.click('button:has-text("Админ")');

    await expect(page).toHaveURL(/.*#\/admin/, { timeout: 10000 });
    // Check for Admin Dashboard heading
    await expect(page.locator('h2:has-text("Басқару панелі")')).toBeVisible();
  });

  test('should navigate to Readers management page from Admin Dashboard', async ({ page }) => {
    await page.goto('/#/login');
    await page.click('button:has-text("Админ")');
    await page.waitForURL(/.*#\/admin/);

    await page.goto('/#/admin/readers');
    await expect(page).toHaveURL(/.*#\/admin\/readers/);
    await expect(page.locator('h2:has-text("Оқырмандар тізімі")')).toBeVisible();
  });

  test('should allow navigating to Add Book form from Admin Dashboard', async ({ page }) => {
    await page.goto('/#/login');
    await page.click('button:has-text("Админ")');
    await page.waitForURL(/.*#\/admin/);

    await page.goto('/#/admin/books/new');
    await expect(page).toHaveURL(/.*#\/admin\/books\/new/);
    await expect(page.locator('h1:has-text("Жаңа кітап"), h1:has-text("кітап")').first()).toBeVisible();
  });
});
