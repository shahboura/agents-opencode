import { test, expect } from '@playwright/test';

test.describe('theme control — mobile', () => {
  test('one 44px control in the docs menu, and it persists', async ({ page }) => {
    // A docs page: the menu carries the control, the header instance is hidden.
    await page.goto('/getting-started/');
    await expect(page.locator('[data-theme-toggle]:visible')).toHaveCount(0);

    await page.locator('.sl-menu-button').click();
    const button = page.locator('[data-theme-toggle]:visible');
    await expect(button).toHaveCount(1);

    const box = await button.boundingBox();
    expect(box, 'control has a box').not.toBeNull();
    expect(box!.height, 'control height').toBeGreaterThanOrEqual(44);
    expect(box!.width, 'control width').toBeGreaterThanOrEqual(44);

    await button.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('cycles dark → light → system and wraps back to dark', async ({ page }) => {
    await page.goto('/getting-started/');
    await page.locator('.sl-menu-button').click();
    const button = page.locator('[data-theme-toggle]:visible');
    await expect(button).toHaveAttribute('aria-label', 'Theme: System');

    await button.click();
    await expect(button).toHaveAttribute('aria-label', 'Theme: Dark');
    await button.click();
    await expect(button).toHaveAttribute('aria-label', 'Theme: Light');
    await button.click();
    await expect(button).toHaveAttribute('aria-label', 'Theme: System');
    expect(await page.evaluate(() => localStorage.getItem('starlight-theme'))).toBe('');
    await button.click();
    await expect(button).toHaveAttribute('aria-label', 'Theme: Dark');
  });

  test('the landing page exposes one control directly, without a menu', async ({ page }) => {
    await page.goto('/');
    // Splash layout: no menu button exists, so the control must be reachable.
    await expect(page.locator('.sl-menu-button')).toHaveCount(0);
    await expect(page.locator('[data-theme-toggle]:visible')).toHaveCount(1);
  });
});
