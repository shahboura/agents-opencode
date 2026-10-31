import { test, expect } from '@playwright/test';

test.describe('landing layout — desktop', () => {
  test('hero sits in two columns', async ({ page }) => {
    await page.goto('/');

    const left = page.locator('.landing-hero > div').first();
    const right = page.locator('.loop-panel');
    const a = await left.boundingBox();
    const b = await right.boundingBox();
    expect(a, 'hero left column').not.toBeNull();
    expect(b, 'loop panel').not.toBeNull();

    expect(Math.abs(a!.y - b!.y)).toBeLessThanOrEqual(2);
    expect(b!.x).toBeGreaterThan(a!.x + a!.width - 1);
  });

  test('the four delivery stages are all present', async ({ page }) => {
    await page.goto('/');
    const panel = page.locator('.loop-panel');
    await expect(panel.locator('.loop-step')).toHaveCount(4);
    for (const stage of ['Plan', 'Implement', 'Review', 'Document']) {
      await expect(panel.getByText(stage, { exact: true })).toBeVisible();
    }
  });
});
