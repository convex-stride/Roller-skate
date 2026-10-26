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
      viewport: { width: 1280, height: 850 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /shader|THREE|WebGLProgram/i.test(m.text()))
      errors.push(m.text());
  });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
  await page
    .getByRole("button", { name: "Find your line" })
    .waitFor({ timeout: 60000 });
  const appearance = await page.evaluate(() => window.__skate.state.appearance);
  assert.equal(appearance.skinTone, "fair");
  assert.equal(appearance.headwear, "hijab");
  assert.equal(appearance.accessory, "paisley bandana over hijab");
  await mkdir("releases", { recursive: true });
  await page.locator("#lobby-rider").click();
  await page.screenshot({ path: "releases/hijab-bandana-v05.png" });
  await page.locator("#wardrobe-back").click();
  await page.getByRole("button", { name: "Find your line" }).click();
  for (const [name, id] of [
    ["Neptune’s Fountain", "neptune"],
    ["Deera Clock Tower", "deera"],
    ["Żuraw", "zuraw"],
    ["Main Town Hall", "townhall"],
    ["Green Gate", "green-gate"],
    ["Kingdom Centre", "kingdom"],
    ["Al Faisaliyah", "faisaliyah"],
    ["Masmak", "masmak"],
  ]) {
    await page.keyboard.press("m");
    await page
      .getByRole("button", { name: new RegExp("^Explore: " + name) })
      .click();
    await page.waitForFunction(
      () =>
        window.__skate.state.grounded && window.__skate.state.position.y > 0.5,
    );
    await page.screenshot({ path: `releases/city-${id}-v05.png` });
    const s = await page.evaluate(() => window.__skate.state);
    assert.equal(s.landmarks, 8);
    assert.ok(Number.isFinite(s.position.x) && Number.isFinite(s.position.y));
  }
  assert.deepEqual(errors, []);
  console.log(
    "Fair-skinned hijabi rider with bandana verified; all eight landmark destinations loaded on physical ground; zero runtime or shader errors.",
  );
} finally {
  await browser.close();
}
