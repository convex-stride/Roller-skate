import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", m => { if (m.type() === "error" && /shader|THREE|WebGLProgram/i.test(m.text())) errors.push(m.text()); });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
  await page.locator("#play:not([disabled])").waitFor({ timeout: 60000 });
  await page.locator("#lobby-rider").click();
  await page.getByRole("button", { name: "Inspect headwear" }).click();
  await page.waitForFunction(() => window.__skate.state.rendering.fov === 32);
  assert.equal(await page.locator("#headwear-detail").getAttribute("aria-pressed"), "true");
  const appearance = await page.evaluate(() => window.__skate.state.appearance);
  assert.equal(appearance.skinTone, "fair");
  assert.equal(appearance.headwear, "hijab");
  assert.equal(appearance.bandanaStyle, "pirate-style side-tied bandana");
  assert.match(appearance.helmet, /vented skate helmet/);
  for (const kind of ["knee", "elbow", "wrist"]) assert.equal(appearance.guards.filter(name => name === `${kind} guard`).length, 2);
  for (const [angle, name] of [[0, "front"], [90, "side"], [180, "back"]]) {
    await page.getByRole("slider", { name: "Turn rider" }).fill(String(angle));
    // Wait for the next animation/render turn before recording the angle.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: `releases/pirate-hijab-${name}.png` });
  }
  await page.getByRole("button", { name: "View full outfit" }).click();
  await page.waitForFunction(() => window.__skate.state.rendering.fov === 40);
  await page.screenshot({ path: "releases/layans-skate-full-safety-gear.png" });
  await page.locator("#wardrobe-back").click();
  await page.locator("#play").click();
  await page.waitForFunction(() => window.__skate.state.grounded);
  await page.keyboard.down("w");
  await page.waitForFunction(() => window.__skate.state.speed > 3, null, { timeout: 30000 });
  await page.keyboard.up("w");
  await page.keyboard.down("s"); await page.waitForFunction(() => window.__skate.state.speed < 0.2); await page.keyboard.up("s");
  await page.keyboard.press("p");
  await page.locator('[data-partner="close"]').click();
  await page.waitForFunction(() => window.__skate.state.companion.active && window.__skate.state.crowd.detailed > 5);
  const crowd = await page.evaluate(() => window.__skate.state.crowd);
  assert.equal(crowd.appearance.skinTone, "fair");
  assert.deepEqual(crowd.appearance.skinPalette, [0xe9c8b8, 0xf0d7c8, 0xe8c5b3, 0xf2d9cd, 0xeacdbc, 0xefd1bf]);
  assert.equal(crowd.appearance.detailedGuardMeshes, crowd.detailed * 6);
  assert.ok(crowd.appearance.distantGuardInstances > 0);
  await page.screenshot({ path: "releases/layans-skate-taqee-safety-gear.png" });
  await page.keyboard.press("Escape"); await page.locator("#riyadh").click();
  await page.waitForFunction(() => window.__skate.state.position.x > 0 && window.__skate.state.crowd.visible > 25);
  await page.screenshot({ path: "releases/layans-skate-riyadh-safety-gear.png" });
  assert.deepEqual(errors, []);
  await page.close();
  const phone = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  phone.on("pageerror", error => errors.push(error.message));
  await phone.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
  await phone.getByRole("button", { name: "Find your line" }).tap({ timeout: 60000 });
  await phone.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.crowd.detailed > 3);
  await phone.locator("#partner-toggle").tap(); await phone.locator('[data-partner="close"]').tap();
  assert.equal(await phone.evaluate(() => window.__skate.state.crowd.appearance.detailedGuardMeshes === window.__skate.state.crowd.detailed * 6), true);
  await phone.screenshot({ path: "releases/layans-skate-phone-safety-gear.png" });
  assert.deepEqual(errors, []);
  console.log("Layan, Taqee and all NPCs: helmets, six articulated guards, fair skin palettes, three-angle hijab/bandana fit, distant instances, both cities and phone rendering passed; no runtime/shader errors.");
} finally { await browser.close(); }
