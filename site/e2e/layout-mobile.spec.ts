import { test, expect } from '@playwright/test';

test.describe('landing layout — mobile', () => {
  test('hero stacks into one column', async ({ page }) => {
    await page.goto('/');

    const left = page.locator('.landing-hero > div').first();
    const right = page.locator('.loop-panel');
    const a = await left.boundingBox();
    const b = await right.boundingBox();
    expect(a, 'hero text column').not.toBeNull();
    expect(b, 'loop panel').not.toBeNull();

    expect(b!.y).toBeGreaterThanOrEqual(a!.y + a!.height - 1);
    expect(Math.abs(a!.x - b!.x)).toBeLessThanOrEqual(2);
  });

  test('no horizontal overflow', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
