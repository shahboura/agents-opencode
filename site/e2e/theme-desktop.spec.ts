import { test, expect } from '@playwright/test';

test.describe('theme control — desktop', () => {
  test('exposes all three states in a popover', async ({ page }) => {
    await page.goto('/');

    const trigger = page.locator('[data-theme-trigger]:visible');
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();
    const popover = page.locator('[data-theme-popover]:visible');
    await expect(popover).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(popover.getByRole('radio')).toHaveCount(3);
  });

  test('choosing dark applies and survives a reload', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-theme-trigger]:visible').click();
    await page.locator('[data-theme-popover]:visible').locator('label', { hasText: 'Dark' }).click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('starlight-theme'))).toBe('dark');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.locator('[data-theme-trigger]:visible').click();
    await expect(page.locator('[data-theme-popover]:visible input[value="dark"]')).toBeChecked();
  });

  test('escape closes the popover and returns focus', async ({ page }) => {
    await page.goto('/');

    const trigger = page.locator('[data-theme-trigger]:visible');
    await trigger.click();
    await page.locator('[data-theme-popover]:visible label').first().click();
    await trigger.click();
    await page.keyboard.press('Escape');

    await expect(page.locator('[data-theme-popover]:visible')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});
