export type Preferences = {
  quality: "auto" | "1" | "0.75" | "0.5" | "custom";
  resolution: number;
  shadows: boolean;
  fov: number;
  brightness: number;
  audio: boolean;
  master: number;
  effects: number;
  sensitivity: number;
  invert: boolean;
  deadzone: number;
  autoCenter: boolean;
  motion: boolean;
  reducedMotion: boolean;
  hudScale: number;
  showHud: boolean;
  contrast: boolean;
};
export const defaults: Preferences = {
  quality: "auto",
  resolution: 75,
  shadows: true,
  fov: 65,
  brightness: 100,
  audio: false,
  master: 80,
  effects: 75,
  sensitivity: 1,
  invert: false,
  deadzone: 0.15,
  autoCenter: true,
  motion: true,
  reducedMotion: false,
  hudScale: 100,
  showHud: true,
  contrast: false,
};
export function sanitizePreferences(value: unknown): Preferences {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const result = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof Preferences)[]) {
    if (typeof defaults[key] === "boolean" && typeof source[key] === "boolean")
      (result as unknown as Record<string, unknown>)[key] = source[key];
  }
  const ranges = {
    resolution: [50, 100],
    fov: [55, 85],
    brightness: [70, 130],
    master: [0, 100],
    effects: [0, 100],
    sensitivity: [0.25, 2.5],
    deadzone: [0.05, 0.35],
    hudScale: [80, 130],
  } as const;
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const v = source[key];
    if (typeof v === "number" && Number.isFinite(v))
      (result as unknown as Record<string, unknown>)[key] = Math.max(
        min,
        Math.min(max, v),
      );
  }
  if (["auto", "1", "0.75", "0.5", "custom"].includes(String(source.quality)))
    result.quality = source.quality as Preferences["quality"];
  return result;
}
export function loadPreferences(): Preferences {
  try {
    return sanitizePreferences(
      JSON.parse(localStorage.getItem("between-cities-settings-v1") || "null"),
    );
  } catch {
    return { ...defaults };
  }
}
export function storePreferences(p: Preferences): boolean {
  try {
    localStorage.setItem("between-cities-settings-v1", JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

export function bindPreferences(
  initial: Preferences,
  preview: (p: Preferences) => void,
  back: () => void,
) {
  let committed = { ...initial },
    draft = { ...initial };
  const root = document.getElementById("settings-screen")!;
  const apply = document.getElementById("settings-apply") as HTMLButtonElement;
  const status = document.getElementById("settings-status")!;
  const close = document.getElementById("settings-back")!;
  const fields = [
    ...root.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      "[data-pref]",
    ),
  ];
  const dirty = () => JSON.stringify(draft) !== JSON.stringify(committed);
  function sync() {
    for (const field of fields) {
      const key = field.dataset.pref as keyof Preferences;
      const value = draft[key];
      if (field instanceof HTMLInputElement && field.type === "checkbox")
        field.checked = !!value;
      else field.value = String(value);
      const output = root.querySelector<HTMLOutputElement>(
        `output[for="${field.id}"]`,
      );
      if (output) {
        const unit = output.dataset.unit;
        output.value =
          unit === "ratio"
            ? `${Math.round(Number(value) * 100)}%`
            : unit === "×"
              ? `${Number(value).toFixed(2)}×`
              : `${value}${unit}`;
      }
    }
    apply.disabled = !dirty();
    status.textContent = dirty() ? "UNSAVED CHANGES" : "ALL CHANGES SAVED";
    close.textContent = dirty() ? "← Discard & back" : "← Back";
  }
  for (const field of fields)
    field.addEventListener("input", () => {
      const key = field.dataset.pref as keyof Preferences;
      const value =
        field instanceof HTMLInputElement
          ? field.type === "checkbox"
            ? field.checked
            : Number(field.value)
          : field.value;
      draft = sanitizePreferences({ ...draft, [key]: value });
      if (key === "quality" && draft.quality !== "custom") {
        const q = draft.quality;
        draft.resolution = q === "1" ? 100 : q === "0.5" ? 50 : 75;
        draft.shadows = q !== "0.5";
      } else if (key === "resolution" || key === "shadows")
        draft.quality = "custom";
      sync();
      preview({ ...draft });
    });
  const tabs = [...root.querySelectorAll<HTMLButtonElement>("[data-tab]")];
  function selectTab(tab: HTMLButtonElement) {
    for (const t of tabs) {
      const selected = t === tab;
      t.setAttribute("aria-selected", String(selected));
      t.tabIndex = selected ? 0 : -1;
      document.getElementById(`panel-${t.dataset.tab}`)!.hidden = !selected;
    }
  }
  tabs.forEach((tab, i) => {
    tab.onclick = () => selectTab(tab);
    tab.onkeydown = (e) => {
      let index = i;
      if (e.key === "ArrowDown" || e.key === "ArrowRight")
        index = (i + 1) % tabs.length;
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft")
        index = (i + tabs.length - 1) % tabs.length;
      else if (e.key === "Home") index = 0;
      else if (e.key === "End") index = tabs.length - 1;
      else return;
      e.preventDefault();
      selectTab(tabs[index]);
      tabs[index].focus();
    };
  });
  document.getElementById("settings-reset")!.onclick = () => {
    draft = { ...defaults };
    sync();
    preview({ ...draft });
  };
  apply.onclick = () => {
    committed = { ...draft };
    const stored = storePreferences(committed);
    sync();
    if (!stored) status.textContent = "APPLIED FOR THIS SESSION";
  };
  function discardAndBack() {
    draft = { ...committed };
    preview({ ...committed });
    sync();
    root.classList.add("hidden");
    back();
  }
  close.onclick = discardAndBack;
  sync();
  return {
    open() {
      draft = { ...committed };
      sync();
      root.classList.remove("hidden");
      tabs.find((t) => t.getAttribute("aria-selected") === "true")?.focus();
    },
    close: discardAndBack,
  };
}
