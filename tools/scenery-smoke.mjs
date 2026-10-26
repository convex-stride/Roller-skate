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
    viewport: { width: 1100, height: 760 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /THREE|shader|WebGLProgram/i.test(m.text()))
      errors.push(m.text());
  });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
  await page.getByRole("button", { name: "Find your line" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.selectOption("#quality", "0.5");
  await page.getByRole("button", { name: /Apply changes/ }).click();
  await page.locator("#settings-back").click();
  await page.getByRole("button", { name: "Keep skating" }).click();
  await mkdir(new URL("../releases/", import.meta.url), { recursive: true });
  await page.screenshot({ path: "releases/gdansk-streets.png" });
  await page.keyboard.down("w");
  await page.waitForFunction(() => window.__skate.state.position.z > 68, null, {
    timeout: 60000,
  });
  await page.keyboard.up("w");
  await page.screenshot({ path: "releases/gdansk-waterfront.png" });
  await page.keyboard.down("w");
  await page.waitForFunction(
    () => window.__skate.state.position.z > 125,
    null,
    { timeout: 60000 },
  );
  await page.keyboard.up("w");
  const crossing = await page.evaluate(() => window.__skate.state);
  assert.ok(
    crossing.position.y > 0.5,
    "the physical bridge must carry the skater across the canal",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Riyadh plaza" }).click();
  await page.waitForFunction(() => window.__skate.state.grounded);
  await page.screenshot({ path: "releases/riyadh-streets.png" });
  assert.deepEqual(
    errors,
    [],
    "new materials and scenery must render without runtime or shader errors",
  );
  console.log(
    "New scenery: physical canal bridge crossed; both arrival streets rendered; zero runtime or shader errors.",
  );
} finally {
  await browser.close();
}
