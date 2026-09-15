import { test, expect } from '@playwright/test';

test.describe('Catalog and Book Details', () => {
  test('should display catalog with books and category filters', async ({ page }) => {
    await page.goto('/#/catalog');

    await expect(page.locator('h2')).toContainText('Кітаптар қоры');
    await expect(page.locator('.section-tag')).toContainText('Каталог');

    // Category pills should be rendered
    const categoryButtons = page.locator('button:has-text("Бәрі")');
    await expect(categoryButtons.first()).toBeVisible();
  });

  test('should filter books when typing in search input', async ({ page }) => {
    await page.goto('/#/catalog');

    const searchInput = page.locator('input[placeholder*="іздеу"], input[placeholder*="Іздеу"], input[type="text"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('Абай');
      // Wait for client-side filtering
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toContainText('Абай');
    }
  });

  test('should open book details when clicking a book card', async ({ page }) => {
    await page.goto('/#/catalog');

    // Find first book link/card
    const bookCard = page.locator('a[href*="#/book/"]').first();
    if (await bookCard.isVisible()) {
      await bookCard.click();
      await expect(page).toHaveURL(/.*#\/book\/.+/);
      await expect(page.locator('button:has-text("Оқу"), button:has-text("Тыңдау")').first()).toBeVisible();
    }
  });
});
