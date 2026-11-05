import { test, expect } from '@playwright/test';

test.describe('theme control — mobile', () => {
  test('one 44px control in the header, and it persists', async ({ page }) => {
    await page.goto('/getting-started/');
    const button = page.locator('[data-theme-toggle]:visible');
    await expect(button).toHaveCount(1);
    // Ghost in the normal state; the fill is interaction feedback only.
    await expect(button).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(button).toHaveCSS('border-width', '0px');

    const box = await button.boundingBox();
    expect(box, 'control has a box').not.toBeNull();
    expect(box!.height, 'control height').toBeGreaterThanOrEqual(44);
    expect(box!.width, 'control width').toBeGreaterThanOrEqual(44);

    await button.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('the mobile menu does not duplicate the header control', async ({ page }) => {
    await page.goto('/getting-started/');
    await page.locator('.sl-menu-button').click();
    await expect(page.locator('[data-theme-toggle]:visible')).toHaveCount(1);
    await expect(page.locator('#starlight__sidebar a[href*="github.com"]:visible')).toHaveCount(0);
    await expect(page.locator('#starlight__sidebar a[href*="npmjs.com"]:visible')).toHaveCount(0);
    // The hidden footer must not take the navigation with it.
    await expect(page.locator('#starlight__sidebar a[href="/getting-started/"]')).toBeVisible();
  });

  test('hover paints a 35px circular halo', async ({ page }) => {
    await page.goto('/getting-started/');
    const button = page.locator('[data-theme-toggle]:visible');

    const readHalo = () =>
      button.evaluate((el) => {
        const style = getComputedStyle(el, '::before');
        return {
          width: style.width,
          height: style.height,
          radius: style.borderTopLeftRadius,
          background: style.backgroundColor,
        };
      });

    expect((await readHalo()).background).toBe('rgba(0, 0, 0, 0)');

    await button.hover();
    await expect.poll(async () => (await readHalo()).background).not.toBe('rgba(0, 0, 0, 0)');
    const hoverFill = (await readHalo()).background;
    expect(await readHalo()).toMatchObject({
      width: '35px',
      height: '35px',
      radius: '50%',
    });

    await page.mouse.down();
    await expect.poll(async () => (await readHalo()).background).not.toBe(hoverFill);
    await page.mouse.up();
  });

  test('keyboard focus shows an inset outline', async ({ page }) => {
    await page.goto('/getting-started/');
    const button = page.locator('[data-theme-toggle]:visible');
    await button.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');

    await expect(button).toHaveCSS('outline-style', 'solid');
    await expect(button).toHaveCSS('outline-width', '2px');
    await expect(button).toHaveCSS('outline-offset', '-2px');
  });

  test('header controls stay out of print', async ({ page }) => {
    await page.emulateMedia({ media: 'print' });
    await page.goto('/getting-started/');
    await expect(page.locator('header .right-group')).toBeHidden();
    await expect(page.locator('header .header > div:has(site-search)')).toBeHidden();
    await expect(page.locator('.sl-menu-button')).toBeHidden();
  });

  test('wordmark returns at 420px without clipping', async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 800 });
    await page.goto('/getting-started/');
    await expect(page.locator('.site-wordmark__text')).toBeVisible();

    const fits = await page.evaluate(() => {
      const wrapper = document.querySelector('.title-wrapper')!.getBoundingClientRect();
      const wordmark = document.querySelector('.site-wordmark')!.getBoundingClientRect();
      return wordmark.right <= wrapper.right + 0.5;
    });
    expect(fits).toBe(true);
  });

  test('cycles dark → light → system and wraps back to dark', async ({ page }) => {
    await page.goto('/getting-started/');
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

  test('cycles dark → light even when storage is blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.getItem = () => {
        throw new Error('storage blocked');
      };
      Storage.prototype.setItem = () => {
        throw new Error('storage blocked');
      };
    });
    await page.goto('/getting-started/');

    const button = page.locator('[data-theme-toggle]:visible');
    await expect(button).toHaveAttribute('aria-label', 'Theme: System');
    await button.click();
    await expect(button).toHaveAttribute('aria-label', 'Theme: Dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await button.click();
    await expect(button).toHaveAttribute('aria-label', 'Theme: Light');
  });

  test('the landing page exposes one control directly, without a menu', async ({ page }) => {
    await page.goto('/');
    // Splash layout: no menu button exists, so the control must be reachable.
    await expect(page.locator('.sl-menu-button')).toHaveCount(0);
    await expect(page.locator('[data-theme-toggle]:visible')).toHaveCount(1);
  });
});
