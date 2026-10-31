import { test, expect } from '@playwright/test';

test.describe('content correctness', () => {
  test('landing states the real pack counts', async ({ page }) => {
    await page.goto('/');
    const body = page.locator('body');

    await expect(body).toContainText('Ten agents');
    await expect(body).toContainText('28 on-demand skills');
  });

  test('landing does not repeat the retired counts', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();

    expect(body).not.toContain('36 skills');
    expect(body).not.toContain('36 on-demand skills');
    expect(body).not.toContain('19 commands');
  });

  test('landing offers the agentic install beside the install command', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: /let an agent install it/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/agentic-installation/');
  });

  test('getting-started leads with the agentic install tab', async ({ page }) => {
    await page.goto('/getting-started/');
    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(2);
    await expect(tabs.nth(0)).toHaveText(/Let an agent install it/);
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.nth(1)).toHaveText(/Manual install/);

    // The visible panel is the agentic one; the manual commands live behind tab 2.
    await expect(page.getByRole('tabpanel')).toContainText('npx agents-opencode --project .');
    await tabs.nth(1).click();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toContainText('npx agents-opencode --global');
  });

  test('the review stage does not claim the agent blocks merges', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('blocks bad merges');
    expect(body.toLowerCase()).toContain('reports findings');
  });

  test('agentic installation page carries a copy-paste prompt and the checks', async ({ page }) => {
    await page.goto('/agentic-installation/');
    const main = page.locator('main');

    await expect(main).toContainText('Install the OpenCode agents pack in this session');
    await expect(main).toContainText('npx agents-opencode --project .');
    await expect(main).toContainText('ls .opencode/agents | wc -l');
  });

  test('llms.txt is served and names the install command', async ({ request }) => {
    const res = await request.get('/llms.txt');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('npx agents-opencode --global');
    expect(text).toContain('28 skills');
  });
});
