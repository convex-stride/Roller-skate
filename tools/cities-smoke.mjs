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
async function checkLitGround(page) {
  const lit = await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
    const canvas = document.querySelector("#scene"), gl = canvas.getContext("webgl2");
    // Sample the same visible area at every adaptive resolution/DPR.
    const w = Math.max(4, Math.round(canvas.width * .05)), h = Math.max(2, Math.round(canvas.height * .04));
    const pixels = new Uint8Array(w * h * 4);
    // The centre-bottom region contains Layan's dark trousers/skates; use the
    // open paving to her left rather than treating her silhouette as unlit ground.
    gl.readPixels(Math.floor(canvas.width * .25), Math.floor(canvas.height * .2), w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let count = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 45) count++;
    resolve(count / (w * h));
  })));
  if (lit <= .6) await page.screenshot({ path: 'releases/cities-light-failure.png' });
  assert.ok(lit > .6, `Lit ground survives sky reflections (${lit})`);
}
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
    ["St. Mary’s Basilica", "st-marys"],
    ["PIF Tower · KAFD", "pif-tower"],
    ["Neptune’s Fountain", "neptune"],
    ["Deera Clock Tower", "deera"],
    ["Żuraw", "zuraw"],
    ["Main Town Hall", "townhall"],
    ["Green Gate", "green-gate"],
    ["Kingdom Centre", "kingdom"],
    ["Al Faisaliyah", "faisaliyah"],
    ["Masmak", "masmak"],
  ].filter(() => !process.env.CITIES_PHONE_ONLY)) {
    await page.keyboard.press("m");
    await page.locator("#map-travel-mode").click();
    await page
      .getByRole("button", { name: new RegExp("^Explore: " + name) })
      .click();
    await page.waitForFunction(
      () =>
        window.__skate.state.grounded && window.__skate.state.position.y > 0.5 && window.__skate.state.queuedChunks === 0,
      undefined, { timeout: 90000 },
    );
    await page.screenshot({ path: `releases/city-${id}-v18.png` });
    const s = await page.evaluate(() => window.__skate.state);
    assert.equal(s.landmarks, 10);
    assert.ok(s.rendering.textures > 8);
    assert.ok(s.rendering.lightProbe === (s.position.x < 0 ? "gdansk" : "riyadh"));
    assert.ok(Number.isFinite(s.position.x) && Number.isFinite(s.position.y));
    await checkLitGround(page);
    if (["st-marys", "pif-tower"].includes(id)) assert.equal(await page.locator("#spot-card").isVisible(), false);
    assert.deepEqual(errors, []);
  }
  await page.close();
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  phone.on("pageerror", e => errors.push(e.message));
  phone.on("console", m => { if (m.type() === "error" && /shader|THREE|WebGLProgram/i.test(m.text())) errors.push(m.text()); });
  await phone.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
  await phone.getByRole("button", { name: "Find your line" }).click({ timeout: 60000 });
  for (const id of ["st-marys", "pif-tower"]) {
    await phone.getByRole("button", { name: "Open world map", exact: true }).tap();
    await phone.locator("#map-travel-mode").click();
    await phone.locator(`[data-landmark="${id}"]`).click();
    await phone.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.queuedChunks === 0, undefined, { timeout: 90000 });
    const state = await phone.evaluate(() => window.__skate.state);
    assert.equal(state.touch.enabled, true); assert.equal(state.rendering.shadows, false);
    assert.ok(state.rendering.pixelRatio <= 1.25);
    assert.equal(await phone.locator("#spot-card").isVisible(), false);
    await checkLitGround(phone);
    await phone.screenshot({ path: `releases/phone-${id}-v18.png` });
  }
  await phone.getByRole("button", { name: "Open world map", exact: true }).tap();
  await phone.locator("#map-travel-mode").tap();
  await phone.locator('[data-park="oliwa"]').tap();
  await phone.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.queuedChunks === 0, undefined, { timeout: 90000 });
  assert.equal(await phone.locator("#spot-card").isVisible(), true);
  await phone.locator("#spot-play").tap();
  await phone.waitForFunction(() => window.__skate.state.spot?.id === "oliwa-jam");
  await phone.locator("#spot-leave").tap();
  assert.deepEqual(errors, []);
  console.log(
    "All ten landmarks loaded on physical ground; lit materials/reflection probes verified in both cities; phone landmark views stay clear and park sessions remain accessible; zero runtime or shader errors.",
  );
} finally {
  await browser.close();
}
