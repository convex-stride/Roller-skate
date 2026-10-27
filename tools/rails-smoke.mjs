import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 740 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && /shader|THREE|WebGLProgram/i.test(m.text())) errors.push(m.text()); });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
  await page.getByRole("button", { name: "Find your line" }).waitFor({timeout:90000});
  await page.locator("#lobby-settings").click(); await page.locator("#quality").selectOption("0.5"); await page.locator("#settings-apply").click(); await page.locator("#settings-back").click();
  const shuffled = new Set();
  for(let i=0;i<3;i++) { shuffled.add(await page.evaluate(()=>window.__skate.state.freeSpawn.id)); await page.locator("#lobby-shuffle").click(); }
  assert.equal(shuffled.size,3);
  const prior=await page.evaluate(()=>window.__skate.state.freeSpawn.id); await page.reload(); await page.getByRole("button",{name:"Find your line"}).waitFor({timeout:90000}); assert.notEqual(await page.evaluate(()=>window.__skate.state.freeSpawn.id),prior);
  await page.getByRole("button", { name: "Find your line" }).click();
  for (const city of ["gdansk", "riyadh"]) {
    if (city === "riyadh") {
      await page.keyboard.press("Escape"); await page.locator("#riyadh").click();
    }
    await page.keyboard.press("Escape"); await page.locator("#rail-practice").click();
    await page.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.queuedChunks === 0, null, { timeout: 60000 });
    const start = await page.evaluate(() => window.__skate.state);
    assert.ok(city === "gdansk" ? start.position.x < -1060 && start.position.z > 70 : start.position.x > 1250 && start.position.z < 0);
    await page.screenshot({ path: `releases/${city}-start-v09.png` });
    await page.keyboard.down("w");
    await page.waitForFunction(city => city === "gdansk" ? window.__skate.state.position.x > -1057.5 : window.__skate.state.position.z > 4.5, city, { timeout: 30000 });
    await page.keyboard.down("Space");
    await page.waitForFunction(() => window.__skate.state.grinding !== null, null, { timeout: 15000 });
    await page.keyboard.up("Space"); await page.keyboard.up("w");
    await page.keyboard.press("x");
    await page.waitForFunction(() => window.__skate.state.grindingDistance > 3 && window.__skate.state.grindStyle === "Royale grind");
    assert.equal(await page.locator("#rail-flow").isVisible(),true);
    const riding = await page.evaluate(() => window.__skate.state);
    assert.ok(Math.abs(riding.position.y - (riding.grinding.y + 0.835)) < 0.08);
    await page.screenshot({ path: `releases/${city}-rail-v09.png` });
    // Pop near the end so the ballistic landing clears the same rail.
    await page.waitForFunction(() => {
      const s = window.__skate.state, r = s.grinding;
      return r && r.length / 2 - (s.position[r.axis] - r[r.axis]) < 2;
    });
    await page.keyboard.down("Space");
    await page.waitForFunction(() => window.__skate.state.grinding === null && window.__skate.state.verticalSpeed > 2);
    await page.keyboard.press("v");
    await page.waitForFunction(() => window.__skate.state.liveTrick.includes("SPREAD EAGLE"));
    await page.screenshot({ path: `releases/${city}-stunt-v09.png` });
    await page.keyboard.up("Space");
    await page.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.lastTrick.includes("Spread eagle"), null, { timeout: 15000 }).catch(async e => { console.log(await page.evaluate(() => window.__skate.state)); throw e; });
    const landed = await page.evaluate(() => window.__skate.state);
    assert.ok(landed.combo + landed.banked > 250);
    console.log(JSON.stringify({ city, spawn: start.position, railDistance: riding.grindingDistance, landed: landed.lastTrick, score: landed.combo + landed.banked }));
  }
  assert.deepEqual(errors, []);
  console.log("Both city starts, shuffled safe starts, physical auto-catches, sustained royale grinds, rail pop-outs and aerial stunt landings passed; no runtime/shader errors.");
} finally { await browser.close(); }
