import { test, expect } from '@playwright/test';

test.describe('theme control — mobile', () => {
  test('switch lives in the menu and every stop is a 44px target', async ({ page }) => {
    await page.goto('/');

    // Small screens keep the control in the menu panel.
    await page.locator('.sl-menu-button').click();

    await expect(page.locator('.theme-switch:visible')).toBeVisible();
    await expect(page.locator('[data-theme-trigger]:visible')).toHaveCount(0);

    const stops = page.locator('.theme-switch:visible label');
    await expect(stops).toHaveCount(3);

    for (let i = 0; i < 3; i++) {
      const box = await stops.nth(i).boundingBox();
      expect(box, `stop ${i} has a box`).not.toBeNull();
      expect(box!.height, `stop ${i} height`).toBeGreaterThanOrEqual(44);
      expect(box!.width, `stop ${i} width`).toBeGreaterThanOrEqual(44);
    }
  });

  test('picking dark from the menu persists', async ({ page }) => {
    await page.goto('/');
    await page.locator('.sl-menu-button').click();
    await page.locator('.theme-switch:visible input[value="dark"]').click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});
