import { test, expect } from '@playwright/test';

test.describe('theme control — mobile', () => {
  test('switch lives in the menu and every stop is a 44px target', async ({ page }) => {
    // A docs page: the menu exists and carries the control.
    await page.goto('/getting-started/');
    await page.locator('.sl-menu-button').click();

    await expect(page.locator('.theme-switch:visible')).toHaveCount(1);
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
    await page.goto('/getting-started/');
    await page.locator('.sl-menu-button').click();
    await expect(page.locator('.theme-switch:visible')).toHaveCount(1);
    await page.locator('.theme-switch:visible input[value="dark"]').click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('the landing page exposes one switch directly, without a menu', async ({ page }) => {
    await page.goto('/');
    // Splash layout: no menu button exists, so the switch must be reachable.
    await expect(page.locator('.sl-menu-button')).toHaveCount(0);
    await expect(page.locator('.theme-switch:visible')).toHaveCount(1);
  });
});
