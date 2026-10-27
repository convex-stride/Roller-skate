import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
async function skateToObjective(page) {
  await page.waitForFunction(() => {
    const s = window.__skate.state;
    const endpoint = s.navigation.route.at(-1);
    return s.quest?.goal && endpoint?.x === s.quest.goal.x && endpoint?.z === s.quest.goal.z;
  }, null, { timeout: 30000 }).catch(async e => { console.log(await page.evaluate(() => window.__skate.state)); throw e; });
  let state = await page.evaluate(() => window.__skate.state);
  const goal = state.quest.goal, route = [...state.navigation.route];
  assert.ok(route.length, "quest objective has a planned route");
  let index = 0;
  const held = new Set(), started = state.simTime; let reported = started;
  async function controls(wanted) {
    for (const key of held) if (!wanted.includes(key)) { await page.keyboard.up(key); held.delete(key); }
    for (const key of wanted) if (!held.has(key)) { await page.keyboard.down(key); held.add(key); }
  }
  try {
    while (state.simTime - started < 120) {
      const p = state.position, distance = Math.hypot(goal.x - p.x, goal.z - p.z);
      if (distance < 4 && state.speed < 1) return;
      while (index < route.length - 1 && Math.hypot(route[index].x - p.x, route[index].z - p.z) < 1 && state.speed < 0.6) index++;
      const target = route[index], d = Math.hypot(target.x - p.x, target.z - p.z);
      const desired = Math.atan2(target.x - p.x, target.z - p.z), error = Math.atan2(Math.sin(desired - state.heading), Math.cos(desired - state.heading));
      const limit = distance < 4 || (index < route.length - 1 && d < 0.8) ? 0 : Math.min(2, Math.max(0.45, d * 0.45));
      const wanted = Math.abs(error) > 0.07 ? [error > 0 ? "a" : "d"] : [];
      if (state.speed > limit + 0.1 || (Math.abs(error) > 0.2 && state.speed > 0.25)) wanted.push("s");
      else if (Math.abs(error) < 0.2 && state.speed < limit) wanted.push("w");
      await controls(wanted);
      await page.waitForFunction(t => window.__skate.state.simTime > t + 0.08, state.simTime, { timeout: 30000 });
      state = await page.evaluate(() => window.__skate.state);
      if (state.simTime - reported > 20) { reported = state.simTime; console.log(JSON.stringify({ navigating: state.position, goal, index, speed: state.speed })); }
    }
    throw Error(`Could not reach objective: ${JSON.stringify({ position: state.position, goal, speed: state.speed, route, index })}`);
  } finally { await controls([]); }
}
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && /shader|THREE|WebGLProgram/i.test(m.text())) errors.push(m.text()); });
  await page.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
  await page.getByRole("button", { name: "Find your line" }).click({ timeout: 60000 });
  await page.keyboard.press("j");
  assert.equal(await page.locator("[data-quest]:visible").count(), 32);
  assert.equal(await page.locator("[data-race]:visible").count(), 0);
  await page.screenshot({ path: "releases/layans-skate-quest-map.png" });
  await page.locator('[data-quest="quest-gdansk-0-3"]').click();
  await page.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.queuedChunks === 0);
  assert.match(await page.locator("#quest-title").innerText(), /Courtyard/);
  await page.screenshot({ path: "releases/layans-skate-gdansk-quest.png" });
  await page.locator("#quest-accept").click();
  await page.keyboard.down("Space");
  await page.waitForFunction(() => window.__skate.state.verticalSpeed > 2);
  await page.keyboard.press("z"); await page.keyboard.press("f");
  await page.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.lastTrick.includes("landed"));
  await page.keyboard.up("Space");
  await page.waitForFunction(() => window.__skate.state.quest?.stage === "return", null, { timeout: 30000 });
  await page.keyboard.down("w");
  await page.waitForFunction(() => window.__skate.state.position.z > window.__skate.state.quest.goal.z - 4);
  await page.keyboard.up("w"); await page.keyboard.down("s");
  await page.waitForFunction(() => window.__skate.state.speed < 0.5);
  await page.keyboard.up("s");
  await page.locator("#quest-interact").click();
  await page.waitForFunction(() => window.__skate.state.completedQuests.length === 1);
  assert.equal(await page.evaluate(() => window.__skate.state.questXP), 160);
  await page.screenshot({ path: "releases/layans-skate-quest-complete.png" });
  await page.reload();
  await page.getByRole("button", { name: "Find your line" }).click({ timeout: 60000 });
  assert.deepEqual(await page.evaluate(() => window.__skate.state.completedQuests), ["quest-gdansk-0-3"]);
  assert.equal(await page.evaluate(() => window.__skate.state.quest), null);
  await page.keyboard.press("j");
  await page.locator('[data-quest="quest-riyadh-0-1"]').click();
  await page.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.queuedChunks === 0);
  await page.screenshot({ path: "releases/layans-skate-riyadh-quest.png" });
  await page.locator("#quest-accept").click();
  assert.equal(await page.evaluate(() => window.__skate.state.quest.id), "quest-riyadh-0-1");
  await page.reload();
  await page.getByRole("button", { name: "Find your line" }).click({ timeout: 60000 });
  assert.equal(await page.evaluate(() => window.__skate.state.quest.id), "quest-riyadh-0-1");
  await page.locator("#quest-abandon").click();
  assert.equal(await page.evaluate(() => window.__skate.state.quest), null);
  await page.setViewportSize({ width: 900, height: 650 });
  await page.keyboard.press("j");
  await page.locator('[data-quest="quest-riyadh-0-0"]').click();
  await page.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.queuedChunks === 0);
  await page.locator("#quest-accept").click();
  for (let i = 0; i < 3; i++) {
    await skateToObjective(page); await page.locator("#quest-interact").click();
    assert.equal(await page.evaluate(() => window.__skate.state.quest.visited.length), i + 1);
    console.log(`Delivery ${i + 1}/3 handed over using physical skating`);
  }
  await skateToObjective(page); await page.locator("#quest-interact").click();
  await page.waitForFunction(() => window.__skate.state.completedQuests.length === 2);
  assert.equal(await page.evaluate(() => window.__skate.state.questXP), 340);
  await page.screenshot({ path: "releases/layans-skate-delivery-complete.png" });
  await page.keyboard.press("Escape"); await page.locator("#wardrobe").click();
  assert.equal(await page.locator("#outfit-swatches button:enabled").count(), 3, "two quests unlock a jacket colour");
  await page.close();
  const phone = await browser.newPage({ viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true });
  phone.on("pageerror", e => errors.push(e.message));
  await phone.goto(process.env.GAME_URL || "http://127.0.0.1:4173");
  await phone.getByRole("button", { name: "Find your line" }).tap({ timeout: 60000 });
  await phone.getByRole("button", { name: "Open world map", exact: true }).tap();
  await phone.getByRole("button", { name: "Quests", exact: true }).tap();
  await phone.locator('[data-quest="quest-riyadh-0-0"]').tap();
  await phone.waitForFunction(() => window.__skate.state.grounded && window.__skate.state.queuedChunks === 0);
  await phone.locator("#quest-accept").tap();
  assert.equal(await phone.evaluate(() => window.__skate.state.quest.id), "quest-riyadh-0-0");
  assert.equal(await phone.locator("#touch-controls").isVisible(), true);
  await phone.screenshot({ path: "releases/layans-skate-phone-quest.png" });
  for (const selector of ["#quest-card", "#touch-stick", ".touch-buttons"]) {
    const rect = await phone.locator(selector).boundingBox();
    assert.ok(rect && rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 394 && rect.y + rect.height <= 853, `${selector} fits portrait`);
  }
  await phone.setViewportSize({ width: 852, height: 393 });
  await phone.screenshot({ path: "releases/layans-skate-phone-quest-landscape.png" });
  const card = await phone.locator("#quest-card").boundingBox(); assert.ok(card.y + card.height < 393);
  const stick = await phone.locator("#touch-stick").boundingBox(); assert.ok(card.y + card.height <= stick.y, "quest card leaves landscape thumbstick clear");
  assert.deepEqual(errors, []);
  console.log("32 quest destinations, real-input style and three-stop delivery completion, XP/reload, active quest restore/abandon and phone quest travel/layout passed; no runtime/shader errors.");
} finally { await browser.close(); }
