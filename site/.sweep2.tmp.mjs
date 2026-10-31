import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
const axeSrc = readFileSync('.tools/node_modules/axe-core/axe.min.js', 'utf8');
const b = await chromium.launch();

for (const w of [768, 1024, 1280]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://localhost:4400/agents/', { waitUntil: 'networkidle' });
  const cols = await p.evaluate(() => getComputedStyle(document.querySelector('.agent-grid')).gridTemplateColumns.split(' ').length);
  console.log(`W=${w} gridColumns=${cols}`);
  await ctx.close();
}

const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();
await p.addInitScript(() => localStorage.setItem('starlight-theme', 'dark'));
for (const path of ['/', '/getting-started/']) {
  await p.goto('http://localhost:4400' + path, { waitUntil: 'networkidle' });
  await p.addScriptTag({ content: axeSrc });
  const out = await p.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: ['color-contrast'] });
    return r.violations.flatMap((v) => v.nodes.map((n) => ({ target: n.target.join(' '), data: n.any[0]?.data })));
  });
  console.log(path, JSON.stringify(out, null, 1));
}
await b.close();
