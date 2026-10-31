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
