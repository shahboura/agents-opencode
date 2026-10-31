import { test, expect } from '@playwright/test';

test.describe('theme control — desktop', () => {
  test('cycles dark → light → system and wraps back to dark', async ({ page }) => {
    await page.goto('/');

    const button = page.locator('[data-theme-toggle]:visible');
    await expect(button).toHaveCount(1);
    await expect(button).toHaveAttribute('aria-label', 'Theme: System');
    await expect(button).toHaveAttribute('title', 'Switch to dark');

    await button.click();
    await expect(button).toHaveAttribute('aria-label', 'Theme: Dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('starlight-theme'))).toBe('dark');

    await button.click();
    await expect(button).toHaveAttribute('aria-label', 'Theme: Light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => localStorage.getItem('starlight-theme'))).toBe('light');

    await button.click();
    await expect(button).toHaveAttribute('aria-label', 'Theme: System');
    // System resolves from prefers-color-scheme, which Playwright defaults to light.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await page.evaluate(() => localStorage.getItem('starlight-theme'))).toBe('');

    await button.click();
    await expect(button).toHaveAttribute('aria-label', 'Theme: Dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('the chosen value persists across a reload', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-theme-toggle]:visible').click(); // dark
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('[data-theme-toggle]:visible')).toHaveAttribute(
      'aria-label',
      'Theme: Dark',
    );

    await page.locator('[data-theme-toggle]:visible').click(); // light
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('[data-theme-toggle]:visible')).toHaveAttribute(
      'aria-label',
      'Theme: Light',
    );
  });

  test('keyboard activation cycles the theme', async ({ page }) => {
    await page.goto('/');

    const button = page.locator('[data-theme-toggle]:visible');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-label', 'Theme: Dark');

    await page.keyboard.press(' ');
    await expect(button).toHaveAttribute('aria-label', 'Theme: Light');
  });
});
