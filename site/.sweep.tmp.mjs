import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const axeSrc = readFileSync('.tools/node_modules/axe-core/axe.min.js', 'utf8');
const BASE = 'http://localhost:4400';
const browser = await chromium.launch();

// --- breakpoints ---
for (const w of [390, 768, 1024, 1280]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/agents/', { waitUntil: 'networkidle' });
  const cards = await p.$$eval('.agent-card', (els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  const cols = new Set(cards).size;
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await p.goto(BASE + '/', { waitUntil: 'networkidle' });
  const themeUi = await p.evaluate(() => ({
    trigger: !!document.querySelector('[data-theme-trigger]')?.offsetParent,
    switch: !!document.querySelector('.theme-switch')?.offsetParent,
  }));
  console.log(`W=${w} cards=${cols}col overflow=${overflow} trigger=${themeUi.trigger} switch=${themeUi.switch}`);
  await ctx.close();
}

// --- axe ---
for (const path of ['/', '/agents/', '/getting-started/', '/agentic-installation/']) {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const p = await ctx.newPage();
    await p.addInitScript((t) => localStorage.setItem('starlight-theme', t), theme);
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    await p.addScriptTag({ content: axeSrc });
    const res = await p.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help }));
    });
    console.log(`AXE ${path} [${theme}]: ${res.length === 0 ? 'none' : JSON.stringify(res)}`);
    await ctx.close();
  }
}
await browser.close();
