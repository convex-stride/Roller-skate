import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const url = process.env.GAME_URL || "http://127.0.0.1:4173", errors = [];
function watch(page) {
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && /shader|THREE|WebGLProgram/i.test(m.text())) errors.push(m.text()); });
}
async function ready(page) { await page.getByRole("button", { name: "Find your line" }).waitFor({ timeout: 90000 }); }
async function settled(page, night) {
  await page.waitForFunction(night => window.__skate.state.grounded && window.__skate.state.queuedChunks === 0 && window.__skate.state.rendering.night.enabled === night && (!night || window.__skate.state.rendering.night.streetLamps > 0), night, { timeout: 90000 });
  assert.deepEqual(errors, []);
}
async function pixels(page) {
  return page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
    const canvas = document.querySelector("#scene"), gl = canvas.getContext("webgl2");
    const read = y => {
      const p = new Uint8Array(32 * 16 * 4); gl.readPixels(Math.floor(canvas.width / 2) - 16, y, 32, 16, gl.RGBA, gl.UNSIGNED_BYTE, p);
      let sum = 0; for (let i = 0; i < p.length; i += 4) sum += (p[i] + p[i + 1] + p[i + 2]) / 3;
      return sum / (32 * 16);
    };
    resolve({ sky: read(canvas.height - 20), ground: read(Math.floor(canvas.height * .26)) });
  })));
}
try {
  await mkdir("releases", { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 820 } }); watch(page);
  await page.goto(url); await ready(page);
  await page.locator("#lobby-settings").click(); await page.getByRole("checkbox", { name: "Night mode", exact: true }).check();
  await page.waitForFunction(() => window.__skate.state.rendering.night.enabled);
  await page.locator("#settings-back").click();
  await page.waitForFunction(() => !window.__skate.state.rendering.night.enabled);
  await page.locator("#lobby-settings").click(); await page.locator("#nightMode").check();
  await page.locator("#settings-apply").click(); await page.locator("#settings-back").click();
  await page.getByRole("button", { name: "Find your line" }).click(); await page.keyboard.press('Escape');await page.locator('#rail-practice').click();await settled(page, true);
  const gd = await pixels(page), state = await page.evaluate(() => window.__skate.state);
  assert.ok(gd.sky < 45 && gd.ground > 8, JSON.stringify(gd));
  assert.ok(state.rendering.night.streetLamps > 0 && state.rendering.night.pointLights <= 4);
  await page.screenshot({ path: "releases/layans-skate-gdansk-night.png" });
  await page.reload(); await ready(page);
  assert.equal(await page.locator("#nightMode").isChecked(), true);
  assert.equal(await page.evaluate(() => window.__skate.state.preferences.nightMode), true);
  await page.locator("#select-riyadh").click(); await page.getByRole("button", { name: "Find your line" }).click();await page.keyboard.press('Escape');await page.locator('#rail-practice').click();await settled(page, true);
  const ry = await pixels(page); assert.ok(ry.sky < 45 && ry.ground > 8, JSON.stringify(ry));
  await page.screenshot({ path: "releases/layans-skate-riyadh-night.png" });
  await page.keyboard.down("w"); await page.waitForFunction(() => window.__skate.state.speed > 2, undefined, { timeout: 60000 }); await page.keyboard.up("w");
  await page.keyboard.press("Escape"); await page.locator("#pause-settings").click();
  await page.locator("#nightMode").uncheck(); await page.locator("#settings-back").click();
  await page.waitForFunction(() => window.__skate.state.rendering.night.enabled);
  await page.locator("#pause-settings").click(); await page.locator("#nightMode").uncheck(); await page.locator("#settings-apply").click(); await page.locator("#settings-back").click();
  await page.locator("#resume").click(); await settled(page, false);
  const day = await pixels(page); assert.ok(day.sky > ry.sky * 2, JSON.stringify({ day, ry }));
  assert.equal(await page.evaluate(() => window.__skate.state.rendering.night.pointLights), 0);
  await page.screenshot({ path: "releases/layans-skate-day-restored.png" }); await page.close();
  const phone = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); watch(phone);
  await phone.goto(url); await ready(phone); await phone.locator("#lobby-settings").tap(); await phone.locator("#nightMode").check();
  await phone.locator("#settings-apply").tap(); await phone.locator("#settings-back").tap(); await phone.getByRole("button", { name: "Find your line" }).tap();await phone.getByRole('button',{name:'Pause game',exact:true}).tap();await phone.locator('#rail-practice').tap();await settled(phone, true);
  let mobile = await phone.evaluate(() => window.__skate.state);
  assert.equal(mobile.touch.enabled, true); assert.equal(mobile.rendering.shadows, false); assert.ok(mobile.rendering.night.pointLights <= 2);
  assert.ok((await pixels(phone)).ground > 8);
  await phone.screenshot({ path: "releases/layans-skate-phone-night.png" });
  await phone.getByRole("button", { name: "Open world map", exact: true }).tap(); await phone.locator("#map-travel-mode").tap(); await phone.locator('[data-landmark="masmak"]').tap(); await settled(phone, true);
  mobile = await phone.evaluate(() => window.__skate.state); assert.ok(mobile.position.x > 200); assert.ok(mobile.rendering.night.streetLamps > 0);
  await phone.screenshot({ path: "releases/layans-skate-phone-riyadh-night.png" });
  assert.deepEqual(errors, []);
  console.log("Night preview, discard, save/reload, both cities, readable lit ground, daylight restoration, skating and phone light budgets passed; zero runtime/shader errors.");
} finally { await browser.close(); }
