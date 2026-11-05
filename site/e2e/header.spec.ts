import { test, expect, type Page } from '@playwright/test';

const HEADER_PATHS = ['/', '/getting-started/'];
const HEADER_WIDTHS = [320, 390, 430, 1024, 1280];

const controls = (page: Page) =>
  page.locator(
    'header .right-group a[href*="github.com"]:visible, ' +
      'header .right-group a[href*="npmjs.com"]:visible, ' +
      'header .right-group [data-theme-toggle]:visible',
  );

async function expectHeaderOrder(page: Page) {
  const items = controls(page);
  await expect(items).toHaveCount(3);
  // Icon links use negative-margin hit areas, so compare centers for order.
  const centers = await items.evaluateAll((els) =>
    els.map((el) => el.getBoundingClientRect().x + el.getBoundingClientRect().width / 2),
  );
  expect(centers[0]).toBeLessThan(centers[1]);
  expect(centers[1]).toBeLessThan(centers[2]);
}

async function expectHeaderSpacing(page: Page, width: number, path: string) {
  // Desktop keeps the wide search field; only the icon cluster shares the rhythm.
  const gaps = await page.evaluate((viewportWidth) => {
    const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
    const github = box('header .right-group a[href*="github.com"] svg');
    const npm = box('header .right-group a[href*="npmjs.com"] svg');
    const theme = box('header .right-group [data-theme-toggle] svg[data-theme-icon="auto"]');
    const cluster = [npm.left - github.right, theme.left - npm.right];
    if (viewportWidth >= 800) return cluster;

    const search = box('site-search button[data-open-modal] svg');
    return [github.left - search.right, ...cluster];
  }, width);

  for (const gap of gaps) {
    expect(gap, `${path} ${width}px gaps ${gaps.join(', ')}`).toBeGreaterThanOrEqual(15);
    expect(gap, `${path} ${width}px gaps ${gaps.join(', ')}`).toBeLessThanOrEqual(17);
  }
}

async function expectHeaderCluster(page: Page, width: number, path: string) {
  const group = (await page.locator('header .right-group').boundingBox())!;
  const search = (await page.locator('site-search button[data-open-modal]').boundingBox())!;
  expect(search.x + search.width, `${path} ${width}px search overlaps cluster`).toBeLessThanOrEqual(group.x);

  const menu = page.locator('.sl-menu-button');
  await expect(menu, `${path} menu button count`).toHaveCount(path === '/' ? 0 : 1);
  if (path !== '/' && width < 800) {
    const menuBox = (await menu.boundingBox())!;
    const rightEdgeGap = menuBox.x - (group.x + group.width);
    expect(rightEdgeGap, `${path} ${width}px cluster not pinned`).toBeLessThanOrEqual(1);
    expect(rightEdgeGap, `${path} ${width}px cluster overlaps menu`).toBeGreaterThanOrEqual(0);

    // The cluster is pulled in so the hamburger glyph sits 21px from the theme.
    const menuGlyphGap = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const theme = box('header .right-group [data-theme-toggle] svg[data-theme-icon="auto"]');
      const hamburger = box('.sl-menu-button .open-menu');
      return hamburger.left - theme.right;
    });
    expect(menuGlyphGap, `${path} ${width}px menu glyph gap`).toBeGreaterThanOrEqual(20);
    expect(menuGlyphGap, `${path} ${width}px menu glyph gap`).toBeLessThanOrEqual(22);
  }
}

async function expectDesktopRightEdge(page: Page, width: number, path: string) {
  const delta = await page.evaluate(() => {
    const header = document.querySelector('header.header')!;
    const toggle = document.querySelector('header .right-group [data-theme-toggle]')!;
    const pad = parseFloat(getComputedStyle(header).paddingInlineEnd);
    return document.documentElement.clientWidth - pad - toggle.getBoundingClientRect().right;
  });
  expect(Math.abs(delta), `${path} ${width}px theme not at content edge`).toBeLessThanOrEqual(1);
}

for (const width of HEADER_WIDTHS) {
  test.describe(`header at ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const path of HEADER_PATHS) {
      test(`keeps order, spacing and fit on ${path}`, async ({ page }) => {
        await page.goto(path);

        await expectHeaderOrder(page);
        await expectHeaderSpacing(page, width, path);
        await expectHeaderCluster(page, width, path);
        if (width >= 800) await expectDesktopRightEdge(page, width, path);
        if (width < 420) {
          await expect(page.locator('.site-wordmark__text'), `${path} ${width}px wordmark`).toBeHidden();
        }

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${path} overflows at ${width}px`).toBeLessThanOrEqual(1);
      });
    }
  });
}

test('print hides the header controls at 1280px', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.emulateMedia({ media: 'print' });
  await page.goto('/getting-started/');

  const search = page.locator('header .header > div:has(site-search)');
  await expect(search).toHaveCount(1);
  await expect(search).toBeHidden();
  await expect(page.locator('header .right-group')).toBeHidden();
});
