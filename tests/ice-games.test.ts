import { describe, it, expect } from "vitest";
import { IceGame, recordIceWin, validIceRecords, type IceGameSample } from "../src/ice-games";
import { figureDefinition, type FigureResult } from "../src/figure-skating";
import type { FigureAction } from "../src/input";
import { iceRinks } from "../src/ice-rinks";
const rink = iceRinks[0];
const sample = (): IceGameSample => ({ x: rink.x, z: rink.z, onIce: true, grounded: true, figure: null, partner: null });
const result = (id: number, action: FigureAction): FigureResult => ({ id, action, name: figureDefinition(action).name, points: figureDefinition(action).points, quality: "clean" });
describe("ice arena games", () => {
  it("requires fresh, correctly ordered elements and saves the best medal, score and time", () => {
    const game = new IceGame(rink, "spotlight", 4), s = sample();
    s.figure = result(4, "upright"); game.tick(s, 1); expect(game.stage).toBe(0);
    s.figure = result(5, "camel"); game.tick(s, 1); expect(game.stage).toBe(0);
    game.sequence.forEach((a, i) => { s.figure = result(6 + i, a); game.tick(s, 4); game.tick(s, .1); expect(game.stage).toBe(i + 1); });
    expect(game.status).toBe("won"); expect(game.medal).toBe("gold");
    const records = recordIceWin({}, game); expect(validIceRecords(records)).toBe(true);
    const key = `${rink.id}:spotlight`, old = records[key];
    game.score = old.score - 1; game.elapsed = old.seconds + 1; game.medal = "bronze";
    expect(recordIceWin(records, game)[key]).toEqual(old);
    expect(recordIceWin({}, new IceGame(rink, "duet"))).toEqual({});
  });
  it("requires each gate in order on the ice, without accepting airborne passes", () => {
    const game = new IceGame(rink, "slalom"), s = sample();
    Object.assign(s, game.gates[1]); game.tick(s, 1); expect(game.stage).toBe(0);
    Object.assign(s, game.gates[0]); s.grounded = false; game.tick(s, 1); expect(game.stage).toBe(0);
    s.grounded = true;
    game.gates.forEach(g => { Object.assign(s, g); game.tick(s, 1); });
    expect(game.status).toBe("won"); expect(game.stage).toBe(8); expect(game.score).toBe(1100);
  });
  it("fails on timeout or leaving the arena", () => {
    const game = new IceGame(rink, "slalom"); game.tick(sample(), 61); expect(game.status).toBe("failed");
    const other = new IceGame(rink, "spotlight"), s = sample(); s.onIce = false; other.tick(s, 1); expect(other.status).toBe("failed");
  });
  it("judges both partners, rejects mismatched/out-of-sync elements, and tolerates recalling Taqee", () => {
    const game = new IceGame(rink, "duet"), s = sample(); s.partner = { active: true, x: s.x + 2, z: s.z, generation: 1, figure: null };
    s.figure = result(1, "upright"); game.tick(s, 1); expect(game.stage).toBe(0);
    s.partner.figure = result(1, "sit"); game.tick(s, 1); expect(game.stage).toBe(0);
    s.partner.figure = result(2, "upright"); game.tick(s, 3); expect(game.stage).toBe(0);
    s.figure = result(2, "upright"); s.partner.figure = result(3, "upright"); game.tick(s, 1); expect(game.stage).toBe(1);
    s.partner.generation = 2; s.partner.figure = result(1, "toeloop"); s.figure = result(3, "toeloop"); game.tick(s, 1); expect(game.stage).toBe(2);
    s.partner.figure = result(2, "spiral"); s.figure = result(4, "spiral"); game.tick(s, 1); expect(game.status).toBe("won");
  });
  it("rejects unknown arenas and malformed stored records", () => {
    expect(validIceRecords({})).toBe(true);
    for (const value of [null, [], { fake: { score: 100, seconds: 20, medal: "gold" } }, { [`${rink.id}:duet`]: { score: -1, seconds: 3, medal: "gold" } }, { [`${rink.id}:duet`]: { score: 100, seconds: 0, medal: "platinum" } }]) expect(validIceRecords(value)).toBe(false);
  });
});
