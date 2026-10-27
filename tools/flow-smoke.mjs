import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 740 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && /shader|THREE|WebGLProgram/i.test(m.text())) errors.push(m.text()); });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
  await page.getByRole("button", { name: "Find your line" }).waitFor({ timeout: 60000 });
  if (process.env.LOW_GRAPHICS) { await page.locator("#lobby-settings").click(); await page.locator("#quality").selectOption("0.5"); await page.locator("#settings-apply").click(); await page.locator("#settings-back").click(); }
  await page.getByRole("button", { name: "Find your line" }).click();
  await page.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.queuedChunks === 0);
  const start = await page.evaluate(() => window.__skate.state);
  await page.screenshot({ path: "releases/gdansk-flow-v06.png" });
  await page.keyboard.down("Space");
  await page.waitForFunction(() => window.__skate.state.jumps === 1 && window.__skate.state.verticalSpeed > 2);
  assert.equal(await page.evaluate(() => window.__skate.state.grounded), false, "jump executes while Space is still held");
  await page.keyboard.press("z");
  await page.keyboard.press("f");
  await page.waitForFunction(() => Math.abs(window.__skate.state.airRotation) > 1.5);
  assert.ok((await page.evaluate(() => window.__skate.state.position.y)) > start.position.y + 0.5, "jump visibly lifts the rider");
  await page.screenshot({ path: "releases/trick-flow-v06.png" });
  await page.keyboard.up("Space");
  await page.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.lastTrick.includes("landed"));
  const landed = await page.evaluate(() => window.__skate.state);
  assert.ok(landed.combo + landed.banked >= 360, "one tap spin and grab earn a completed combo");
  await page.keyboard.press("h");
  await page.locator("#help").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.locator("#riyadh").click();
  await page.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.queuedChunks === 0);
  await page.screenshot({ path: "releases/riyadh-flow-v06.png" });
  // The new city start faces Masmak; use the skyline destination for the arterial run.
  await page.keyboard.press("m");
  await page.locator("#map-travel-mode").click();
  await page.getByRole("button", { name: /^Explore: Kingdom Centre/ }).click();
  await page.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.queuedChunks === 0);
  const time = await page.evaluate(() => window.__skate.state.simTime);
  console.log(JSON.stringify(await page.evaluate(() => ({ stage: "before continuous ride", position: window.__skate.state.position, render: window.__skate.state.rendering }))));
  await page.keyboard.down("w");
  // Cross a streaming boundary along the clear arterial, without teleporting.
  await page.waitForFunction(() => window.__skate.state.position.z > 215, null, { timeout: Number(process.env.FLOW_TIMEOUT || 120000) }).catch(async error => {
    console.log(JSON.stringify(await page.evaluate(() => ({ position: window.__skate.state.position, speed: window.__skate.state.speed, simTime: window.__skate.state.simTime, render: window.__skate.state.rendering, chunks: window.__skate.state.queuedChunks, paused: window.__skate.state.paused }))));
    await page.screenshot({path:"releases/flow-failure.png"}); throw error;
  });
  await page.keyboard.up("w");
  const travelled = await page.evaluate(() => window.__skate.state);
  assert.ok(travelled.position.y > 0.5 && travelled.position.y < 2, "continuous ground across chunk and road boundaries");
  assert.ok(travelled.simTime > time + 15);
  assert.equal(travelled.appearance.headwear, "hijab");
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ jumpOnPress: true, landedCombo: landed.combo, streamedRide: travelled.position, errors }));
} finally { await browser.close(); }
