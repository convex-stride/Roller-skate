import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = process.env.GAME_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  for (const standalone of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const frameUrl = `${base}/preview-frame`;
    await page.route(`${base}/embed-test`, route => route.fulfill({
      contentType: "text/html",
      headers: { "Permissions-Policy": "gamepad=()" },
      body: `<iframe title="Game preview" sandbox="allow-scripts${standalone ? "" : " allow-same-origin"}" src="${standalone ? frameUrl : `${base}/`}" width="1200" height="750"></iframe>`,
    }));
    if (standalone) {
      const html = await readFile(new URL("../releases/Between-Cities.html", import.meta.url), "utf8");
      await page.route(frameUrl, route => route.fulfill({ contentType: "text/html", body: html }));
    }
    await page.goto(`${base}/embed-test`);
    const frame = page.frameLocator("iframe");
    const play = frame.getByRole("button", { name: "Find your line" });
    await play.waitFor({ timeout: 60000 });
    if (standalone) {
      await frame.locator("#lobby-settings").click();
      await frame.locator("#nightMode").check();
      await frame.locator("#settings-apply").click();
      await frame.locator("#settings-back").click();
    }
    await play.click();
    const game = page.frames().find(f => f.parentFrame());
    await game.waitForFunction(() => window.__skate.state.grounded, null, { timeout: 30000 });
    const origin = await game.evaluate(() => window.__skate.state.position);
    await page.keyboard.down("w");
    await game.waitForFunction(p => {
      const s = window.__skate.state;
      return s.speed > 3 && Math.hypot(s.position.x - p.x, s.position.z - p.z) > 2;
    }, origin, { timeout: 30000 }).catch(async error => {
      console.log({ standalone, state: await game.evaluate(() => window.__skate.state), errors });
      throw error;
    });
    await page.keyboard.up("w");
    const state = await game.evaluate(() => window.__skate.state);
    assert.equal(state.rendering.night.enabled, standalone);
    assert.ok(state.speed > 3, "keyboard movement must work inside the restricted iframe");
    await page.keyboard.press("Space");
    await game.waitForFunction(() => window.__skate.state.jumps > 0, null, { timeout: 15000 });
    await page.keyboard.press("Escape");
    assert.equal(await game.evaluate(() => window.__skate.state.paused), true);
    assert.deepEqual(errors, [], "no runtime errors when gamepads and storage are blocked");
    console.log(`${standalone ? "Single-file opaque sandbox at night" : "Production iframe in daylight"}: keyboard movement, buffered jump tap, pause, zero runtime errors — passed (movement sim time ${state.simTime.toFixed(2)} s)`);
    await page.close();
  }
} finally {
  await browser.close();
}
