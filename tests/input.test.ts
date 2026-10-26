import { describe, it, expect, vi } from "vitest";
import { ActionBuffer, createGamepadReader } from "../src/input";

it("retains a quick jump and trick across a render frame without a physics tick", () => {
  const actions = new ActionBuffer();
  actions.pressJump(); actions.trick("left");
  // A high-refresh render frame observes the input but has no fixed step to consume it.
  expect(actions.jumpPressed).toBe(true);
  actions.releaseJump();
  expect(actions.jumpPressed).toBe(true);
  expect(actions.jumpReleased).toBe(true);
  expect(actions.tricks).toEqual(["left"]);
  actions.clear();
  expect(actions.jumpPressed).toBe(false);
  expect(actions.tricks).toEqual([]);
});

describe("embedded controller access", () => {
  it("falls back when the host blocks gamepads, without repeating the error every frame", () => {
    const blocked = vi.fn(() => {
      throw new DOMException("Blocked by permissions policy", "SecurityError");
    });
    const read = createGamepadReader(blocked);
    for (let frame = 0; frame < 120; frame++) expect(read()).toBeUndefined();
    expect(blocked).toHaveBeenCalledTimes(1);
  });

  it("finds a controller even when the first slot is empty", () => {
    const pad = { connected: true, index: 1 } as Gamepad;
    const read = createGamepadReader(() => [null, pad]);
    expect(read()).toBe(pad);
  });

  it("keeps polling when no controller is connected yet", () => {
    const pad = { connected: true } as Gamepad;
    let connected = false;
    const read = createGamepadReader(() => connected ? [pad] : []);
    expect(read()).toBeUndefined();
    connected = true;
    expect(read()).toBe(pad);
  });
});
