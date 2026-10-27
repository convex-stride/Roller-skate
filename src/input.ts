export type FlipAction = "frontflip" | "backflip" | "leftflip" | "rightflip";
export type FigureAction = "upright" | "sit" | "camel" | "spiral" | "eagle" | "axel" | "salchow" | "toeloop";
export type TrickAction = "left" | "right" | "grab" | "tweak" | "star" | "stale" | FlipAction | FigureAction;
export const isFlip = (action: TrickAction): action is FlipAction => ["frontflip", "backflip", "leftflip", "rightflip"].includes(action);
export const isFigure = (action: TrickAction): action is FigureAction => ["upright", "sit", "camel", "spiral", "eagle", "axel", "salchow", "toeloop"].includes(action);

/** Edges survive render frames that run no fixed physics step. */
export class ActionBuffer {
  jumpPressed = false;
  jumpReleased = false;
  tricks: TrickAction[] = [];
  pressJump() { this.jumpPressed = true; }
  releaseJump() { this.jumpReleased = true; }
  trick(action: TrickAction) { if (this.tricks.length < 8) this.tricks.push(action); }
  clear() { this.jumpPressed = false; this.jumpReleased = false; this.tricks = []; }
}

/** Embedded hosts may deny gamepads. Keyboard play must remain available. */
export function createGamepadReader(
  read: () => ArrayLike<Gamepad | null> = () => navigator.getGamepads?.() ?? [],
) {
  let permitted = true;
  return (): Gamepad | undefined => {
    if (!permitted) return undefined;
    try {
      const pads = read();
      for (let i = 0; i < pads.length; i++) {
        if (pads[i]?.connected) return pads[i]!;
      }
    } catch {
      // Permissions Policy and opaque sandbox origins can throw SecurityError.
      // Permission will not change during this page session; stop polling it.
      permitted = false;
    }
    return undefined;
  };
}
