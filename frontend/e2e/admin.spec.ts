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

  test('should allow navigating to Edit Reader form from Readers page and updating data', async ({ page }) => {
    await page.goto('/#/login');
    await page.click('button:has-text("Админ")');
    await page.waitForURL(/.*#\/admin/);

    await page.goto('/#/admin/readers');
    await expect(page.locator('h2:has-text("Оқырмандар тізімі")')).toBeVisible();

    const editBtn = page.locator('a:has-text("Өңдеу")').first();
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    await expect(page.locator('h1:has-text("Оқырман")')).toBeVisible();
    await expect(page.locator('button:has-text("Өзгерістерді сақтау")')).toBeVisible();
  });
});
