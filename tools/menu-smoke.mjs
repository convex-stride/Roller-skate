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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  const url = process.env.GAME_URL || "http://127.0.0.1:4173";
  await page.goto(url);
  await page
    .getByRole("button", { name: "Find your line" })
    .waitFor({ timeout: 60000 });
  await mkdir("releases", { recursive: true });
  await page.screenshot({ path: "releases/lobby-v03.png" });
  await page.locator("#select-riyadh").click();
  assert.ok((await page.evaluate(() => window.__skate.state.position.x)) > 200);
  assert.equal(await page.evaluate(() => window.__skate.state.paused), true);
  await page.locator("#lobby-settings").click();
  await page.screenshot({ path: "releases/settings-v03.png" });
  assert.equal(await page.locator("#settings-apply").isDisabled(), true);
  await page.selectOption("#quality", "0.5");
  assert.equal(await page.locator("#resolution").inputValue(), "50");
  assert.equal(await page.locator("#shadows").isChecked(), false);
  assert.equal(
    await page.evaluate(() => window.__skate.state.rendering.shadows),
    false,
  );
  await page.locator("#fov").focus();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowLeft");
  assert.equal(
    await page.evaluate(() => window.__skate.state.preferences.fov),
    84,
  );
  await page.getByRole("tab", { name: /Camera & controls/ }).click();
  await page.getByRole("checkbox", { name: "Invert vertical look" }).check();
  await page.locator("#sensitivity").focus();
  await page.keyboard.press("End");
  await page.getByRole("tab", { name: /Accessibility/ }).click();
  await page.getByRole("checkbox", { name: "Reduce camera motion" }).check();
  await page.getByRole("checkbox", { name: "High-contrast interface" }).check();
  await page.locator("#hudScale").focus();
  await page.keyboard.press("End");
  await page.getByRole("button", { name: /Apply changes/ }).click();
  await page.locator("#settings-back").click();
  await page.reload();
  await page
    .getByRole("button", { name: "Find your line" })
    .waitFor({ timeout: 60000 });
  const prefs = await page.evaluate(() => window.__skate.state.preferences);
  assert.equal(prefs.fov, 84);
  assert.equal(prefs.invert, true);
  assert.equal(prefs.sensitivity, 2.5);
  assert.equal(prefs.hudScale, 130);
  assert.equal(prefs.reducedMotion, true);
  assert.equal(prefs.quality, "0.5");
  await page.locator("#lobby-settings").click();
  await page.locator("#fov").focus();
  await page.keyboard.press("Home");
  assert.equal(
    await page.evaluate(() => window.__skate.state.preferences.fov),
    55,
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page.evaluate(() => window.__skate.state.preferences.fov),
    84,
  );
  await page.locator("#lobby-rider").click();
  await page
    .getByRole("button", { name: "Terracotta jacket", exact: true })
    .click();
  await page.locator("#wardrobe-back").click();
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("between-cities-v1")).outfit,
    ),
    1,
  );
  await page.locator("#lobby-world").click();
  await page.locator("#map-close").click();
  assert.equal(await page.locator("#menu").isVisible(), true);
  assert.equal(await page.evaluate(() => window.__skate.state.paused), true);
  await page.getByRole("button", { name: "Find your line" }).click();
  await page.keyboard.press("Escape");
  await page.locator("#pause-settings").click();
  await page.locator("#settings-back").click();
  assert.equal(await page.locator("#pause").isVisible(), true);
  await page.getByRole("button", { name: "Keep skating" }).click();
  await page.waitForFunction(
    () => window.__skate.state.rendering.fov > 80,
    null,
    { timeout: 15000 },
  );
  await page.keyboard.down("w");
  await page.waitForFunction(() => window.__skate.state.speed > 3, null, {
    timeout: 30000,
  });
  await page.keyboard.up("w");
  assert.deepEqual(errors, []);
  console.log(
    "Lobby destinations, settings preview/apply/discard/persistence, wardrobe, menu return paths, actual camera/render preferences, and skating passed.",
  );
  await page.setViewportSize({ width: 768, height: 700 });
  await page.keyboard.press("Escape");
  await page.locator("#pause-settings").click();
  await page.screenshot({ path: "releases/settings-compact-v03.png" });
  assert.ok(await page.locator("#settings-apply").isVisible());
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
} finally {
  await browser.close();
}
