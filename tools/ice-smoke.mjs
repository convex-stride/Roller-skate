import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const url = process.env.GAME_URL || "http://127.0.0.1:4173", errors = [];
function watch(page) {
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && /shader|THREE|WebGLProgram/i.test(m.text())) errors.push(m.text()); });
}
async function visit(page, id, mobile = false) {
  if (mobile) await page.getByRole("button", { name: "Open world map", exact: true }).tap(); else await page.keyboard.press("m");
  await page.getByRole("button", { name: "Ice arenas", exact: true }).click();
  assert.equal(await page.locator("[data-rink]:visible").count(), 6);
  await page.locator("#map-travel-mode").click(); await page.locator(`[data-rink="${id}"]`).click();
  await page.waitForFunction(id => { const s = window.__skate.state; return s.rink?.id === id && s.rink.onIce && s.grounded && s.surface === "ICE" && s.appearance.skates === "ice blades" && s.queuedChunks === 0; }, id, { timeout: 90000 });
  const s = await page.evaluate(() => window.__skate.state); assert.equal(s.iceArenas, 6); assert.ok(s.position.y > .8 && s.position.y < 1.3); assert.deepEqual(errors, []);
}
async function pair(page) {
  await page.locator("#ice-partner").click();
  await page.waitForFunction(() => { const s = window.__skate.state; return s.companion.active && s.companion.mode === "pairs" && s.companion.surface === "ICE" && s.crowd.appearance.partnerSkates === "ice blades"; }, undefined, { timeout: 60000 });
}
try {
  await mkdir("releases", { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } }); watch(page);
  await page.goto(url); await page.getByRole("button", { name: "Find your line" }).click({ timeout: 90000 });
  const rinks = await page.evaluate(() => window.__skate.destinations.filter(d => d.kind === "rink"));
  assert.equal(rinks.filter(r => r.x < 0).length, 4); assert.equal(rinks.filter(r => r.x > 0).length, 2);
  for (const r of rinks) {
    await visit(page, r.key); await pair(page);
    await page.screenshot({ path: `releases/ice-${r.key}.png` });
  }
  const start = await page.evaluate(() => ({ p: window.__skate.state.position, t: window.__skate.state.companion.position, jumps: window.__skate.state.companion.jumps }));
  await page.keyboard.down("w"); await page.waitForFunction(z => window.__skate.state.position.z > z + 10, start.p.z, { timeout: 90000 }); await page.keyboard.up("w");
  await page.waitForFunction(z => window.__skate.state.companion.position.z > z + 3, start.t.z, { timeout: 60000 });
  await page.keyboard.down("s"); await page.waitForFunction(() => window.__skate.state.speed < .3, undefined, { timeout: 60000 }); await page.keyboard.up("s");
  const playerJumps = await page.evaluate(() => window.__skate.state.jumps);
  await page.keyboard.down("Space"); await page.waitForFunction(n => window.__skate.state.jumps > n, playerJumps); await page.keyboard.up("Space");
  await page.waitForFunction(n => window.__skate.state.companion.jumps > n, start.jumps);
  await page.waitForFunction(() => window.__skate.state.grounded); await page.screenshot({ path: "releases/ice-layan-taqee-skating.png" });
  await page.locator("#ice-exit").click();
  await page.waitForFunction(() => window.__skate.state.appearance.skates === "inline wheels" && window.__skate.state.grounded);
  await page.screenshot({ path: "releases/ice-mall-entrance.png" });
  const outside = await page.evaluate(() => window.__skate.state.position);
  await page.keyboard.down("w");
  await page.waitForFunction(() => window.__skate.state.rink?.onIce && window.__skate.state.surface === "ICE", undefined, { timeout: 90000 }).catch(async e => { console.log(await page.evaluate(() => window.__skate.state)); throw e; });
  await page.keyboard.up("w"); assert.ok((await page.evaluate(() => window.__skate.state.position.z)) > outside.z + 12);
  await page.close();
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const phone = await context.newPage(); watch(phone);
  await phone.goto(url); await phone.getByRole("button", { name: "Find your line" }).waitFor({ timeout: 90000 });
  await phone.locator("#lobby-settings").tap(); await phone.locator("#nightMode").check(); await phone.locator("#settings-apply").tap(); await phone.locator("#settings-back").tap();
  await phone.getByRole("button", { name: "Find your line" }).tap();
  for (const id of ["baltic-galleria", "olaya-ice"]) { await visit(phone, id, true); await pair(phone); assert.equal(await phone.evaluate(() => window.__skate.state.rendering.night.enabled), true); await phone.screenshot({ path: `releases/ice-phone-${id}-night.png` }); }
  const client = await context.newCDPSession(phone), box = await phone.locator("#touch-stick").boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2;
  await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ id: 1, x, y }] });
  await client.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ id: 1, x, y: y - 40 }] });
  await phone.waitForFunction(() => window.__skate.state.speed > 2, undefined, { timeout: 60000 }); await client.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await phone.setViewportSize({ width: 852, height: 393 });
  assert.equal(await phone.locator("#ice-partner").isVisible(), true);
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await phone.screenshot({ path: "releases/ice-phone-landscape.png" });
  assert.deepEqual(errors, []);
  console.log("Six stadium/mall ice arenas (4 Gdańsk, 2 Riyadh), physical entrances/boards, automatic ice blades, moving/jumping with Taqee, and phone/night skating passed; zero runtime/shader errors.");
} finally { await browser.close(); }
