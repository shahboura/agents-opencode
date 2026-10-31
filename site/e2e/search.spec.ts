import { test, expect } from '@playwright/test';

test.describe('search keyboard shortcut', () => {
  test('slash opens search and the hint says so', async ({ page }) => {
    await page.goto('/');
    const trigger = page.locator('[data-open-modal]');
    await expect(trigger).toBeEnabled();
    await expect(trigger).toHaveAttribute('aria-keyshortcuts', '/');
    await expect(page.locator('[data-open-modal] > kbd')).toHaveText('/');

    await page.keyboard.press('/');
    await expect(page.locator('site-search dialog')).toBeVisible();
  });

  test('slash inside an input is typed, not a shortcut', async ({ page }) => {
    await page.goto('/getting-started/');
    await page.evaluate(() => {
      const input = document.createElement('input');
      input.id = 'slash-probe';
      document.body.append(input);
      input.focus();
    });

    await page.keyboard.press('/');
    await expect(page.locator('#slash-probe')).toHaveValue('/');
    await expect(page.locator('site-search dialog')).not.toBeVisible();
  });

  test('ctrl+k still opens search', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-open-modal]')).toBeEnabled();

    await page.keyboard.press('Control+k');
    await expect(page.locator('site-search dialog')).toBeVisible();
  });
});
