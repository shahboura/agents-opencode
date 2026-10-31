import { test, expect } from '@playwright/test';

// Every internal link must resolve: catches the "page renamed, link stayed" class of bug.
test('every internal link on the landing page resolves', async ({ page, request }) => {
  await page.goto('/');

  const hrefs = await page.$$eval('a[href]', (links) =>
    links
      .map((a) => a.getAttribute('href') || '')
      .filter((href) => href.startsWith('/') && !href.startsWith('//'))
      .map((href) => href.split('#')[0])
      .filter(Boolean)
  );

  const unique = [...new Set(hrefs)];
  expect(unique.length).toBeGreaterThan(0);

  for (const href of unique) {
    const res = await request.get(href);
    expect(res.status(), `${href} should resolve`).toBeLessThan(400);
  }
});
