import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(import.meta.dirname, '..');
const html = await readFile(resolve(root, 'releases/Layans-Skate.html'), 'utf8');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  for (const android of [false, true]) {
    const context = await browser.newContext({ viewport: android ? { width: 393, height: 852 } : { width: 1100, height: 740 }, isMobile: android, hasTouch: android });
    const page = await context.newPage(), errors = [], external = [];
    page.on('pageerror', e => errors.push(e.message));
    await context.route('**/*', route => {
      const url = route.request().url();
      if (url === 'https://appassets.androidplatform.net/assets/index.html' || url === 'https://windows.layans.test/') return route.fulfill({ contentType: 'text/html', body: html });
      external.push(url); return route.abort();
    });
    // Stock Chromium cannot register Electron's private protocol. Emulate its
    // secure origin with the exact bundled payload and deny every external URL.
    await page.goto(android ? 'https://appassets.androidplatform.net/assets/index.html' : 'https://windows.layans.test/');
    await page.getByRole('button', { name: 'Find your line' }).waitFor({ timeout: 90000 });
    await page.locator('#lobby-settings').click(); await page.locator('#quality').selectOption('0.5');
    await page.locator('#settings-apply').click(); await page.locator('#settings-back').click();
    await page.getByRole('button', { name: 'Find your line' }).click();
    await page.waitForFunction(() => window.__skate.state.grounded, null, { timeout: 60000 });
    assert.equal(await page.evaluate(() => window.__skate.state.touch.enabled), android);
    const start = await page.evaluate(() => window.__skate.state.position);
    await page.keyboard.down('w');
    await page.waitForFunction(p => { const s = window.__skate.state; return s.speed > 2 && Math.hypot(s.position.x - p.x, s.position.z - p.z) > 2; }, start, { timeout: 60000 });
    await page.keyboard.up('w'); await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__skate.state.jumps > 0);
    // Match the native Android Back dispatch target, including event bubbling.
    await page.evaluate(() => {
      const t = document.getElementById('scene');
      t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      t.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true }));
    });
    assert.equal(await page.evaluate(() => window.__skate.state.paused), true);
    await page.locator('#resume').click();
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    assert.equal(await page.evaluate(() => window.__skate.state.paused), true);
    await page.reload(); await page.getByRole('button', { name: 'Find your line' }).waitFor({ timeout: 90000 });
    assert.equal(await page.evaluate(() => window.__skate.state.preferences.quality), '0.5');
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    console.log(`${android ? 'Android virtual asset origin + touch layout' : 'Windows secure app-origin payload'}: offline launch, movement, jump, native Back event, background pause and saved preferences passed; no external requests/runtime errors.`);
    await context.close();
  }
} finally { await browser.close(); }
