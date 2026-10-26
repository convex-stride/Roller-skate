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
  for (const [angle, name] of [[0, "front"], [90, "side"], [180, "back"]]) {
    await page.getByRole("slider", { name: "Turn rider" }).fill(String(angle));
    // Wait for the next animation/render turn before recording the angle.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: `releases/pirate-hijab-${name}.png` });
  }
  await page.getByRole("button", { name: "View full outfit" }).click();
  await page.waitForFunction(() => window.__skate.state.rendering.fov === 40);
  await page.locator("#wardrobe-back").click();
  await page.locator("#play").click();
  await page.waitForFunction(() => window.__skate.state.grounded);
  await page.keyboard.down("w");
  await page.waitForFunction(() => window.__skate.state.speed > 3, null, { timeout: 30000 });
  await page.keyboard.up("w");
  assert.deepEqual(errors, []);
  console.log("Pirate-style headwear, three-angle inspection, outfit return and resumed skating passed; no runtime/shader errors.");
} finally { await browser.close(); }
