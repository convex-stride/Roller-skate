import type { ActionBuffer, TrickAction } from "./input";

export function createTouchControls(actions: ActionBuffer, callbacks: { pause: () => void; map: () => void; recover: () => void; event: () => void; figure?: () => void; toast: (message: string) => void }) {
  const enabled = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  document.body.classList.toggle("touch-play", enabled);
  const root = document.createElement("div"); root.id = "touch-controls"; root.hidden = true;
  root.innerHTML = `<nav class="touch-toolbar" aria-label="Game controls"><button data-command="pause" aria-label="Pause game">Pause</button><button data-command="map" aria-label="Open world map">Map</button><button data-command="fullscreen" aria-label="Toggle fullscreen">Full screen</button></nav><div id="touch-stick" role="group" aria-label="Skating thumbstick: up to push, left and right to turn, down to brake"><span>PUSH<br>↖ &nbsp; ↗<br>BRAKE</span><i></i></div><div class="touch-buttons"><button data-trick="left" aria-label="Spin left 180">↶ 180</button><button data-hold="jump" class="touch-jump" aria-label="Jump">JUMP</button><button data-trick="right" aria-label="Spin right 180">180 ↷</button><button data-trick="grab" aria-label="Safety grab or soul grind">Grab</button><button data-hold="brake" aria-label="Brake">Brake</button><button data-trick="tweak" aria-label="Mute tweak or royale grind">Tweak</button><button data-command="more" aria-expanded="false">More</button><button data-command="recover" aria-label="Recover rider">Reset</button><button data-command="event" aria-label="Start nearby event or stunt spot">Ride</button></div><div class="touch-more" hidden><button data-trick="star">Spread</button><button data-trick="stale">Stalefish</button><button data-hold="crouch">Crouch</button><button data-hold="manual">Manual</button><button data-hold="slide">Slide</button><button data-hold="grind">Rail assist</button></div>`;
  document.body.append(root);
  const primaryFlip = root.querySelector<HTMLButtonElement>('[data-trick="tweak"]')!;
  let onIce = false; primaryFlip.dataset.command = "figure";
  primaryFlip.dataset.trick = "backflip"; primaryFlip.textContent = "Backflip"; primaryFlip.setAttribute("aria-label", "Backflip");
  root.querySelector(".touch-more")!.insertAdjacentHTML("afterbegin", '<button data-trick="backflip" aria-label="Backflip">Backflip</button><button data-trick="frontflip" aria-label="Frontflip">Frontflip</button><button data-trick="leftflip" aria-label="Left side flip">Flip left</button><button data-trick="rightflip" aria-label="Right side flip">Flip right</button><button data-trick="tweak" aria-label="Mute tweak or royale grind">Tweak</button>');
  const state = { throttle: 0, steer: 0, brake: 0, jump: false, crouch: false, manual: false, slide: false, grind: false };
  const stick = root.querySelector<HTMLElement>("#touch-stick")!, knob = stick.querySelector<HTMLElement>("i")!;
  let stickPointer: number | null = null, active = false;
  const held = new Map<number, string>();
  let stickBrake = 0;
  function refresh() {
    const values = [...held.values()];
    for (const key of ["jump", "crouch", "manual", "slide", "grind"] as const) state[key] = values.includes(key);
    state.brake = Math.max(stickBrake, values.includes("brake") ? 1 : 0);
  }
  function move(e: PointerEvent) {
    const r = stick.getBoundingClientRect(), radius = r.width * 0.34;
    let x = (e.clientX - r.left - r.width / 2) / radius, y = (e.clientY - r.top - r.height / 2) / radius;
    const distance = Math.max(1, Math.hypot(x, y)); x /= distance; y /= distance;
    const dead = (v: number) => Math.abs(v) < 0.12 ? 0 : Math.sign(v) * (Math.abs(v) - 0.12) / 0.88;
    state.steer = -dead(x); state.throttle = Math.max(0, -dead(y)); stickBrake = Math.max(0, dead(y)); refresh();
    knob.style.transform = `translate(${x * radius}px, ${y * radius}px)`;
  }
  stick.addEventListener("pointerdown", e => {
    if (!active || stickPointer !== null) return;
    e.preventDefault(); stickPointer = e.pointerId; stick.setPointerCapture(e.pointerId); move(e);
  });
  stick.addEventListener("pointermove", e => { if (e.pointerId === stickPointer) { e.preventDefault(); move(e); } });
  const releaseStick = (e: PointerEvent) => { if (e.pointerId === stickPointer) { stickPointer = null; state.throttle = state.steer = stickBrake = 0; refresh(); knob.style.transform = ""; } };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) stick.addEventListener(type, releaseStick as EventListener);
  root.querySelectorAll<HTMLButtonElement>("[data-hold], [data-trick]").forEach(button => {
    button.addEventListener("pointerdown", e => {
      if (!active || (!button.dataset.trick && !button.dataset.hold)) return; e.preventDefault(); e.stopPropagation(); button.setPointerCapture(e.pointerId); button.classList.add("pressed");
      if (button.dataset.trick) actions.trick(button.dataset.trick as TrickAction);
      if (button.dataset.hold) { if (button.dataset.hold === "jump" && !state.jump) actions.pressJump(); held.set(e.pointerId, button.dataset.hold); refresh(); }
    });
    const release = (e: PointerEvent) => {
      const wasJump = state.jump; held.delete(e.pointerId); refresh();
      if (wasJump && !state.jump && active) actions.releaseJump(); button.classList.remove("pressed");
    };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) button.addEventListener(type, release as EventListener);
  });
  root.querySelectorAll<HTMLButtonElement>("[data-command]").forEach(button => button.addEventListener("click", async () => {
    if (!active) return;
    const command = button.dataset.command;
    if (command === "figure" && onIce) { root.querySelector<HTMLElement>(".touch-more")!.hidden = true; root.querySelector("[data-command=more]")!.setAttribute("aria-expanded", "false"); callbacks.figure?.(); }
    if (command === "pause") callbacks.pause();
    if (command === "map") callbacks.map();
    if (command === "recover") callbacks.recover();
    if (command === "event") callbacks.event();
    if (command === "more") {
      const tray = root.querySelector<HTMLElement>(".touch-more")!; tray.hidden = !tray.hidden; button.setAttribute("aria-expanded", String(!tray.hidden));
    }
    if (command === "fullscreen") try {
      if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen();
    } catch { callbacks.toast("Full screen is unavailable here. Browser play still works."); }
  }));
  if (!document.fullscreenEnabled) root.querySelector<HTMLElement>('[data-command="fullscreen"]')!.hidden = true;
  function reset() {
    held.clear(); stickPointer = null; stickBrake = 0; state.throttle = state.steer = 0; refresh(); knob.style.transform = "";
    root.querySelectorAll(".pressed").forEach(b => b.classList.remove("pressed"));
  }
  window.addEventListener("blur", reset);
  window.addEventListener("resize", reset);
  document.addEventListener("visibilitychange", () => { if (document.hidden) reset(); });
  root.addEventListener("contextmenu", e => e.preventDefault());
  return { enabled, state, reset, setIce(value: boolean) { if (value === onIce) return; onIce = value; primaryFlip.textContent = value ? "Figure" : "Backflip"; primaryFlip.setAttribute("aria-label", value ? "Figure skating moves" : "Backflip"); if (value) delete primaryFlip.dataset.trick; else primaryFlip.dataset.trick = "backflip"; }, show(visible: boolean) { active = enabled && visible; root.hidden = !active; if (!active) reset(); } };
}
