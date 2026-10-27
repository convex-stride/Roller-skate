import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && /shader|THREE|WebGLProgram/i.test(m.text())) errors.push(m.text()); });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
  await page.getByRole("button", { name: "Find your line" }).waitFor({ timeout: 60000 });
  assert.match(await page.title(), /^Layan's Skate/);
  assert.match(await page.locator(".wordmark").first().innerText(), /LAYAN'S\s+SKATE/);
  await page.screenshot({ path: "releases/layans-skate-lobby-v13.png" });
  await page.getByRole("button", { name: "Find your line" }).click();
  await page.keyboard.press("m"); await page.getByRole("button", { name: "Skate parks", exact: true }).click();
  await page.locator("#map-travel-mode").click();
  assert.equal(await page.locator("[data-park]:visible").count(), 14);
  assert.equal(await page.locator("[data-race]:visible").count(), 0);
  await page.screenshot({ path: "releases/layans-skate-parks-map-v13.png" });
  const ids = await page.locator("[data-park]").evaluateAll(buttons => buttons.map(b => b.dataset.park));
  const illustrations = new Set(["baltic", "stocznia", "oliwa", "palm", "island", "wadi"]);
  for (const id of ids) {
    await page.locator(`[data-park="${id}"]`).click();
    await page.waitForFunction(id => window.__skate.state.park === id && window.__skate.state.grounded && window.__skate.state.queuedChunks === 0, id, { timeout: 60000 });
    const state = await page.evaluate(() => window.__skate.state);
    assert.equal(state.parks, 14); assert.equal(state.spot, null, "park visits are free skate"); assert.ok(state.position.y > 0.8);
    if (illustrations.has(id)) await page.screenshot({ path: `releases/park-${id}-v13.png` });
    if (id === "baltic") {
      const startZ = state.position.z;
      await page.keyboard.down("w");
      await page.waitForFunction(z => window.__skate.state.position.z > z + 23 && window.__skate.state.position.y > 1.15, startZ, { timeout: 45000 });
      await page.keyboard.up("w");
      await page.screenshot({ path: "releases/park-baltic-riding-v13.png" });
    }
    if (id === "oliwa") {
      await page.locator("#spot-play").click();
      await page.waitForFunction(() => window.__skate.state.spot?.id === "oliwa-jam");
      await page.locator("#spot-leave").click();
    }
    await page.keyboard.press("m");
  }
  await page.getByRole("button", { name: "All", exact: true }).click();
  assert.equal(await page.locator("[data-race]:visible").count(), 4);
  await page.close();
  const phone = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  phone.on("pageerror", e => errors.push(e.message));
  await phone.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
  await phone.getByRole("button", { name: "Find your line" }).tap({ timeout: 60000 });
  await phone.getByRole("button", { name: "Open world map", exact: true }).tap();
  await phone.locator("#map-travel-mode").tap();
  await phone.getByRole("button", { name: "Skate parks", exact: true }).tap();
  await phone.locator('[data-park="palm"]').tap();
  await phone.waitForFunction(() => window.__skate.state.park === "palm" && window.__skate.state.grounded);
  await phone.screenshot({ path: "releases/layans-skate-phone-park-v13.png" });
  assert.equal(await phone.locator("#touch-controls").isVisible(), true);
  assert.deepEqual(errors, []);
  console.log("Layan's Skate branding, fourteen free-skate park destinations, map filtering, physical pump riding, park session entry and phone travel passed; no runtime/shader errors.");
} finally { await browser.close(); }
