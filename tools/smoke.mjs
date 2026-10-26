import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:5173");
  await page
    .getByRole("button", { name: "Find your line" })
    .waitFor({ timeout: 60000 });
  await page.screenshot({ path: "/tmp/skate-title.png" });
  await page.getByRole("button", { name: "Find your line" }).click();
  await page.waitForTimeout(1500);
  const initial = await page.evaluate(() => window.__skate.state);
  assert.equal(initial.paused, false);
  assert.ok(initial.chunks > 0);
  await page.keyboard.down("w");
  await page.waitForFunction(
    () => window.__skate.state.speed > 4 && window.__skate.state.position.z > 5,
    {},
    { timeout: 30000 },
  );
  await page.keyboard.up("w");
  const moving = await page.evaluate(() => window.__skate.state);
  assert.ok(moving.speed > 1, "push should create measurable velocity");
  assert.ok(
    Math.hypot(
      moving.position.x - initial.position.x,
      moving.position.z - initial.position.z,
    ) > 1,
    "rider should move",
  );
  await page.keyboard.down("Space");
  await page.waitForTimeout(650);
  await page.keyboard.up("Space");
  await page.waitForTimeout(250);
  const jump = await page.evaluate(() => window.__skate.state);
  assert.ok(jump.jumps > 0, "actual physics jump must execute");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/skate-game.png" });
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => window.__skate.state.paused), true);
  await page.getByRole("button", { name: "Riyadh plaza" }).click();
  await page.waitForTimeout(1500);
  const riyadh = await page.evaluate(() => window.__skate.state);
  assert.ok(riyadh.position.x > 200);
  assert.ok(riyadh.position.y > 0);
  await page.screenshot({ path: "/tmp/skate-riyadh.png" });
  await page.keyboard.press("m");
  await page.getByRole("button", { name: "Motława Quay · SPRINT" }).click();
  await page.waitForTimeout(500);
  await page
    .locator("#event")
    .waitFor({ state: "visible", timeout: 15000 })
    .catch(async (e) => {
      console.log({
        errors,
        state: await page.evaluate(() => window.__skate.state),
      });
      throw e;
    });
  assert.deepEqual(errors, [], "no browser runtime errors");
  const savedCount = await page.evaluate(() => window.__skate.state.collected);
  assert.ok(
    savedCount > 0,
    "the first route token should be collected during the ride",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Find your line" })
    .waitFor({ timeout: 60000 });
  assert.equal(
    await page.evaluate(() => window.__skate.state.collected),
    savedCount,
    "collection progress survives a full reload",
  );
  assert.deepEqual(
    errors,
    [],
    "reloading the saved game produces no browser errors",
  );
  console.log(
    JSON.stringify({ initial, moving, jump, riyadh, errors }, null, 2),
  );
} finally {
  await browser.close();
}
