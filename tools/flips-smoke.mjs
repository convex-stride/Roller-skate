import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } }), errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && /shader|THREE|WebGLProgram/i.test(m.text())) errors.push(m.text()); });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
  await page.getByRole("button", { name: "Find your line" }).click({ timeout: 60000 });
  await page.waitForFunction(() => window.__skate.state.grounded);
  for (const [key, kind] of [["1", "frontflip"], ["2", "backflip"], ["3", "leftflip"], ["4", "rightflip"]]) {
    const count = await page.evaluate(() => window.__skate.state.flipLandings);
    await page.keyboard.press(key);
    await page.waitForFunction(kind => { const s = window.__skate.state; return s.flipKind === kind && Math.abs(s.airPitch) + Math.abs(s.airRoll) > 1.8; }, kind);
    await page.screenshot({ path: `releases/layans-skate-${kind}.png` });
    await page.waitForFunction(n => window.__skate.state.flipLandings > n && window.__skate.state.grounded, count, { timeout: 30000 });
    assert.equal(await page.evaluate(() => window.__skate.state.lastLandedFlip), kind);
  }
  await page.keyboard.press("j"); await page.getByRole("button", { name: "Flip challenges", exact: true }).click();
  assert.equal(await page.locator("[data-quest]:visible").count(), 32);
  await page.locator("#map-travel-mode").click();
  await page.locator('[data-quest="quest-flip-gdansk-1-1"]').click();
  await page.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.queuedChunks === 0);
  await page.screenshot({ path: "releases/layans-skate-new-bank-court.png" });
  await page.locator("#quest-accept").click();
  for (const key of ["1", "2"]) { const n = await page.evaluate(() => window.__skate.state.flipLandings); await page.keyboard.press(key); await page.waitForFunction(n => window.__skate.state.flipLandings > n && window.__skate.state.grounded, n); }
  await page.waitForFunction(() => window.__skate.state.quest.stage === "return");
  await page.keyboard.down("w"); await page.waitForFunction(() => window.__skate.state.position.z > window.__skate.state.quest.goal.z - 4); await page.keyboard.up("w");
  await page.keyboard.down("s"); await page.waitForFunction(() => window.__skate.state.speed < 0.3); await page.keyboard.up("s");
  await page.locator("#quest-interact").click();
  assert.deepEqual(await page.evaluate(() => window.__skate.state.completedQuests), ["quest-flip-gdansk-1-1"]);
  assert.equal(await page.evaluate(() => window.__skate.state.questXP), 240);
  await page.screenshot({ path: "releases/layans-skate-flip-quest-complete.png" });
  const anchor = await page.evaluate(() => window.__skate.destinations.find(d => d.id === "quest:quest-flip-gdansk-1-1"));
  await page.locator("#quest-bank").click();
  await page.waitForFunction(() => window.__skate.state.grounded);
  await page.keyboard.down("w");
  await page.waitForFunction(z => window.__skate.state.position.z > z + 11 && window.__skate.state.position.y > 1.7, anchor.z, { timeout: 60000 }).catch(async e => { console.log(await page.evaluate(() => window.__skate.state)); throw e; });
  const beforeDouble = await page.evaluate(() => window.__skate.state.flipLandings);
  await page.keyboard.down("Shift"); await page.keyboard.down("Space"); await page.keyboard.press("2"); await page.keyboard.press("2"); await page.keyboard.up("w");
  await page.waitForFunction(() => window.__skate.state.airPitch < -7);
  await page.screenshot({ path: "releases/layans-skate-double-backflip.png" });
  await page.waitForFunction(n => window.__skate.state.flipLandings > n, beforeDouble, { timeout: 30000 }).catch(async e => { console.log(await page.evaluate(() => window.__skate.state)); throw e; });
  await page.keyboard.up("Space"); await page.keyboard.up("Shift");
  assert.match(await page.evaluate(() => window.__skate.state.lastTrick), /Double backflip/);
  await page.reload(); await page.getByRole("button", { name: "Find your line" }).click({ timeout: 60000 });
  assert.ok((await page.evaluate(() => window.__skate.state.completedQuests)).includes("quest-flip-gdansk-1-1"));
  await page.close();
  const phone = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  phone.on("pageerror", e => errors.push(e.message));
  await phone.goto(process.env.GAME_URL || "http://127.0.0.1:4173"); await phone.getByRole("button", { name: "Find your line" }).tap({ timeout: 60000 });
  await phone.waitForFunction(() => window.__skate.state.grounded);
  await phone.getByRole("button", { name: "Backflip", exact: true }).tap();
  await phone.waitForFunction(() => window.__skate.state.flipLandings === 1 && window.__skate.state.grounded);
  await phone.locator('[data-command="more"]').tap(); await phone.getByRole("button", { name: "Frontflip", exact: true }).tap();
  await phone.waitForFunction(() => window.__skate.state.flipLandings === 2 && window.__skate.state.grounded);
  await phone.screenshot({ path: "releases/layans-skate-phone-flips.png" });
  await phone.setViewportSize({ width: 852, height: 393 });
  await phone.screenshot({ path: "releases/layans-skate-phone-flips-landscape.png" });
  for (const selector of [".touch-more", "#touch-stick", ".touch-buttons"]) { const b = await phone.locator(selector).boundingBox(); assert.ok(b && b.x >= 0 && b.y >= 0 && b.x + b.width <= 853 && b.y + b.height <= 394, `${selector} fits landscape`); }
  assert.deepEqual(errors, []);
  console.log("Four physical flip directions, 32 flip challenges, completed/saved flip quest, riding a new bank, double backflip, phone flip taps and portrait/landscape controls passed; no runtime/shader errors.");
} finally { await browser.close(); }
