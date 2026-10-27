import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && /shader|THREE|WebGLProgram/i.test(m.text())) errors.push(m.text()); });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
  await page.getByRole("button", { name: "Find your line" }).click({ timeout: 60000 });
  for (const [id, name, height] of [["dock", "Container hop", 1.8], ["garden", "Rooftop leap", 3]]) {
    await page.keyboard.press("m"); await page.locator("#map-travel-mode").click(); await page.getByRole("button", { name: new RegExp(`^Ride: ${name}`) }).click();
    await page.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.queuedChunks === 0);
    await page.screenshot({ path: `releases/${id}-spot-v10.png` });
    await page.keyboard.down("w");
    await page.waitForFunction(() => window.__skate.state.position.z > -268.5, null, { timeout: 60000 }).catch(async e => { console.log(await page.evaluate(() => window.__skate.state)); throw e; });
    const roof = await page.evaluate(() => window.__skate.state);
    assert.ok(roof.position.y > height + 0.6, "the ramp physically reaches the roof");
    assert.equal(roof.spot.gate, 2);
    await page.keyboard.down("Space"); await page.keyboard.press("v");
    await page.waitForFunction(() => window.__skate.state.position.z > -257);
    await page.screenshot({ path: `releases/${id}-gap-v10.png` });
    await page.keyboard.up("Space");
    await page.waitForFunction(() => window.__skate.state.spot?.status === "finished", null, { timeout: 60000 }).catch(async e => { console.log(await page.evaluate(() => window.__skate.state)); throw e; });
    await page.keyboard.up("w");
    const result = await page.evaluate(() => window.__skate.state.spot);
    assert.ok(result.medal);
    console.log(JSON.stringify({ id, result }));
    await page.screenshot({ path: `releases/${id}-medal-v10.png` });
  }
  assert.equal(await page.evaluate(() => window.__skate.state.spotStamps), 2);
  await page.keyboard.press("Escape"); await page.locator("#wardrobe").click();
  assert.equal(await page.getByRole("button", { name: "Coastal blue jacket", exact: true }).isDisabled(), false);
  await page.reload(); await page.getByRole("button", { name: "Find your line" }).waitFor({ timeout: 60000 });
  assert.equal(await page.evaluate(() => window.__skate.state.spotStamps), 2, "stamps survive loading the save");
  assert.deepEqual(errors, []);
  console.log("Both physical rooftop courses completed; medals, jacket unlock and save reload passed; no runtime/shader errors.");
} finally { await browser.close(); }
