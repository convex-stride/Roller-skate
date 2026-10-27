import { figureMoves, figureDefinition, type FigureView } from "./figure-skating";
import { iceGameModes, iceRecordKey, type IceGame, type IceGameMode, type IceRecords } from "./ice-games";
import { iceRinks, type IceRink } from "./ice-rinks";
import type { FigureAction } from "./input";
import "./ice-play.css";

export function createIcePlayUI(callbacks: { move: (id: FigureAction) => void; game: (mode: IceGameMode) => void; stop: () => void; partner: () => void }) {
  const panel = document.createElement("aside"); panel.id = "ice-lab"; panel.className = "hidden"; panel.setAttribute("aria-label", "Figure moves and arena games");
  panel.innerHTML = `<div class="ice-lab-heading"><strong>YOUR ICE. YOUR STYLE.</strong><button id="ice-lab-close" aria-label="Close figure moves">×</button></div><nav aria-label="Ice skating activities"><button data-ice-tab="moves" aria-pressed="true">Moves</button><button data-ice-tab="games" aria-pressed="false">Games</button><button data-ice-tab="medals" aria-pressed="false">Medals</button></nav><div data-ice-page="moves" class="figure-moves">${figureMoves.map(m => `<button data-figure="${m.id}" title="${m.tip}"><b>${m.name}</b><small>${m.key} · ${m.points} pts</small></button>`).join("")}</div><div data-ice-page="games" class="ice-game-choices" hidden>${iceGameModes.map(m => `<button data-ice-game="${m.id}"><b>${m.name}</b><small>${m.detail}</small></button>`).join("")}</div><div data-ice-page="medals" id="ice-medals" hidden></div><p class="ice-lab-tip">Tap a move to begin. Brake cancels. Jumps include an assisted entry and takeoff.</p>`;
  document.body.append(panel);
  const card = document.createElement("aside"); card.id = "ice-run-card"; card.className = "hidden"; card.setAttribute("aria-label", "Arena challenge");
  card.innerHTML = '<small id="ice-run-kicker"></small><strong id="ice-run-title"></strong><span id="ice-run-clock"></span><b id="ice-run-goal"></b><p id="ice-run-detail"></p><div><button id="ice-run-next">Perform element</button><button id="ice-run-partner">Call Taqee</button><button id="ice-run-retry" hidden>Play again</button><button id="ice-run-stop">Free skate</button></div>';
  document.getElementById("hud")!.append(card);
  const node = (id: string) => document.getElementById(id)!;
  let lastRecords = "";
  let current: IceGame | null = null;
  function open(tab = "moves") {
    panel.classList.remove("hidden");
    panel.querySelectorAll<HTMLButtonElement>("[data-ice-tab]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.iceTab === tab)));
    panel.querySelectorAll<HTMLElement>("[data-ice-page]").forEach(p => { p.hidden = p.dataset.icePage !== tab; });
  }
  panel.onclick = e => {
    const button = (e.target as HTMLElement).closest<HTMLButtonElement>("button"); if (!button) return;
    if (button.id === "ice-lab-close") { panel.classList.add("hidden"); document.getElementById("scene")?.focus(); return; }
    if (button.dataset.iceTab) open(button.dataset.iceTab);
    if (button.dataset.figure) { callbacks.move(button.dataset.figure as FigureAction); panel.classList.add("hidden"); }
    if (button.dataset.iceGame) { callbacks.game(button.dataset.iceGame as IceGameMode); panel.classList.add("hidden"); }
  };
  node("ice-run-next").onclick = () => { if (current?.targetMove) callbacks.move(current.targetMove); };
  node("ice-run-partner").onclick = callbacks.partner;
  node("ice-run-stop").onclick = callbacks.stop;
  node("ice-run-retry").onclick = () => { if (current) callbacks.game(current.mode); };
  return {
    open,
    close() { panel.classList.add("hidden"); },
    get opened() { return !panel.classList.contains("hidden"); },
    update(rink: IceRink | undefined, onIce: boolean, figure: FigureView, game: IceGame | null, records: IceRecords, paused: boolean) {
      current = game;
      if (!rink || !onIce || paused) panel.classList.add("hidden");
      panel.querySelectorAll<HTMLButtonElement>("[data-figure]").forEach(b => { b.disabled = !!figure.action || !onIce; });
      card.classList.toggle("hidden", !game || !rink || paused);
      if (game) {
        node("ice-run-kicker").textContent = game.rink.name;
        node("ice-run-title").textContent = game.title;
        node("ice-run-clock").textContent = `${Math.max(0, Math.ceil(game.limit - game.elapsed))}s · ${game.stage}/${game.total} · ${game.score} pts`;
        node("ice-run-goal").textContent = game.status === "playing" ? game.targetMove ? `Next: ${figureDefinition(game.targetMove).name}` : `Gate ${game.stage + 1} / 8` : game.status === "won" ? `${game.medal!.toUpperCase()} MEDAL` : "TRY ANOTHER LINE";
        node("ice-run-detail").textContent = figure.action ? figure.message : game.message || (game.mode === "duet" ? "Stay close. Both skaters must finish the matching element." : game.mode === "slalom" ? "Follow the gold gate. Use gentle turns on the ice." : "Complete each element. Clean entries earn extra points.");
        const next = node("ice-run-next") as HTMLButtonElement;
        next.hidden = !game.targetMove; next.disabled = !!figure.action; if (game.targetMove) next.textContent = `Do ${figureDefinition(game.targetMove).name}`;
        node("ice-run-retry").hidden = game.status === "playing";
        node("ice-run-partner").hidden = game.mode !== "duet" || game.status !== "playing";
      }
      const stamp = JSON.stringify(records);
      if (this.opened && stamp !== lastRecords) {
        lastRecords = stamp;
        const count = Object.keys(records).length;
        node("ice-medals").innerHTML = `<strong>${count} / 18 arena medals</strong>${iceRinks.map(r => `<div class="ice-medal-venue"><b>${r.name}</b>${iceGameModes.map(m => { const result = records[iceRecordKey(r, m.id)]; return `<span>${m.name}: ${result ? `${result.medal.toUpperCase()} · ${result.score} pts · ${result.seconds.toFixed(1)}s` : "Not completed"}</span>`; }).join("")}</div>`).join("")}`;
      }
    },
  };
}
