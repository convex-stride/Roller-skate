import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /shader|THREE|WebGLProgram/i.test(m.text()))
      errors.push(m.text());
  });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
  await page.getByRole("button", { name: "Find your line" }).click();
  await page.waitForFunction(() => window.__skate.state.grounded);
  // Begin the bridge traversal at the waterfront destination; the city now
  // starts along the quay instead of facing directly down the bridge.
  await page.keyboard.press("m");
  await page.locator("#map-travel-mode").click();
  await page.getByRole("button", { name: /^Explore: Żuraw/ }).click();
  await page.waitForFunction(() => window.__skate.state.grounded);
  await page.keyboard.down("a");
  await page.waitForFunction(() => window.__skate.state.heading > -0.085);
  await page.keyboard.up("a");
  const settleTime = await page.evaluate(() => window.__skate.state.simTime + 1);
  await page.waitForFunction(t => window.__skate.state.simTime > t, settleTime);
  assert.ok(
    (await page.evaluate(() => window.__skate.state.riderVertices)) > 9000,
    "the clothed anatomical rider actually loaded",
  );
  await page.getByRole("button", { name: "Zoom minimap in" }).click();
  assert.equal(
    await page.evaluate(() => window.__skate.state.navigation.radius),
    80,
  );
  await page.getByRole("button", { name: "Zoom minimap out" }).click();
  assert.equal(
    await page.evaluate(() => window.__skate.state.navigation.radius),
    110,
  );
  await page.keyboard.press("m");
  const canvas = page.locator("#world-map"),
    rect = await canvas.boundingBox(),
    scale = Math.min(900 / 3800, 380 / 1800);
  await page.locator("#map-pin-mode").click();
  await canvas.click({
    position: {
      x: ((450 - 1000 * scale) / 900) * rect.width,
      y: ((210 + 145 * scale) / 420) * rect.height,
    },
  });
  const nav = await page.evaluate(() => window.__skate.state.navigation);
  assert.ok(
    nav.goal && nav.routePoints > 2,
    "a bridge-aware route was planned",
  );
  await page.locator("#map-close").click();
  await mkdir("releases", { recursive: true });
  await page.screenshot({ path: "releases/minimap-v04.png" });
  await page.keyboard.down("w");
  await page.waitForFunction(
    () => window.__skate.state.position.z > 147,
    null,
    { timeout: 120000 },
  ).catch(async error => { console.log(await page.evaluate(() => window.__skate.state)); await page.screenshot({ path: "releases/navigation-blocked.png" }); throw error; });
  await page.keyboard.up("w");
  const state = await page.evaluate(() => window.__skate.state);
  assert.ok(
    state.position.y > 0.5,
    "the new rider crosses the bridge on physical ground",
  );
  assert.equal(state.navigation.goal, null, "the waypoint clears when reached");
  await page.keyboard.press("Escape");
  await page.locator("#return-lobby").click();
  await page.screenshot({ path: "releases/rider-v04.png" });
  assert.deepEqual(errors, []);
  console.log(
    "Anatomical rider loaded; minimap zoom and waypoint route passed; physical bridge crossed; waypoint arrival cleared; zero runtime/shader errors.",
  );
} finally {
  await browser.close();
}
