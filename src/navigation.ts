import {
  buildings,
  streets,
  centers,
  clearGround,
  inWorld,
  activities,
  tokens,
  type City,
  type Activity,
} from "./world";
import { landmarks } from "./city-profile";
import { spots } from "./spots";
export type Point = { x: number; z: number };
export type Goal = Point & { label: string };
const cell = 10;
const groundCache = new Map<string, boolean>();
function traversable(x: number, z: number) {
  const key = `${x}:${z}`;
  if (!groundCache.has(key))
    groundCache.set(key, clearGround(x * cell, z * cell, 1));
  return groundCache.get(key)!;
}
/** Bounded A* over the actual city footprints, canal, bridge, and building plots. */
export function findRoute(start: Point, end: Point): Point[] {
  if (!inWorld(end.x, end.z) || !clearGround(end.x, end.z, 0.7)) return [];
  const sx = Math.round(start.x / cell),
    sz = Math.round(start.z / cell),
    gx = Math.round(end.x / cell),
    gz = Math.round(end.z / cell);
  const key = (x: number, z: number) => `${x}:${z}`;
  type Node = { x: number; z: number; g: number; f: number; parent?: Node };
  const open: Node[] = [
      { x: sx, z: sz, g: 0, f: Math.hypot(gx - sx, gz - sz) },
    ],
    best = new Map<string, number>([[key(sx, sz), 0]]);
  function push(n: Node) {
    open.push(n);
    let i = open.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (open[p].f <= n.f) break;
      open[i] = open[p];
      i = p;
    }
    open[i] = n;
  }
  function pop() {
    const top = open[0],
      last = open.pop()!;
    if (open.length) {
      let i = 0;
      while (i * 2 + 1 < open.length) {
        let j = i * 2 + 1;
        if (j + 1 < open.length && open[j + 1].f < open[j].f) j++;
        if (open[j].f >= last.f) break;
        open[i] = open[j];
        i = j;
      }
      open[i] = last;
    }
    return top;
  }
  let visited = 0;
  while (open.length && visited++ < 16000) {
    const n = pop();
    if (n.g > (best.get(key(n.x, n.z)) ?? Infinity)) continue;
    if (Math.hypot(n.x - gx, n.z - gz) < 1.5) {
      const result: Point[] = [end];
      let p: Node | undefined = n;
      while (p) {
        result.push({ x: p.x * cell, z: p.z * cell });
        p = p.parent;
      }
      result.push(start);
      return result.reverse();
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      const x = n.x + dx,
        z = n.z + dz;
      if (
        !traversable(x, z) ||
        (dx &&
          dz &&
          (!traversable(n.x + dx, n.z) || !traversable(n.x, n.z + dz)))
      )
        continue;
      const g = n.g + Math.hypot(dx, dz),
        k = key(x, z);
      if (g >= (best.get(k) ?? Infinity)) continue;
      best.set(k, g);
      push({ x, z, g, f: g + Math.hypot(gx - x, gz - z), parent: n });
    }
  }
  return [];
}
export type MapState = {
  position: Point;
  heading: number;
  speed: number;
  collected: string[];
  records: Record<string, number>;
  rails: { x: number; z: number; length: number; axis: "x" | "z" }[];
  goal: Goal | null;
};
export class NavigationMap {
  radius = 110;
  route: Point[] = [];
  private lastGoal = "";
  private lastStart: Point = { x: Infinity, z: Infinity };
  setZoom(delta: number) {
    this.radius = Math.max(65, Math.min(240, this.radius + delta));
  }
  update(state: MapState) {
    const g = state.goal,
      key = g ? `${Math.round(g.x)}:${Math.round(g.z)}` : "";
    if (
      key !== this.lastGoal ||
      Math.hypot(
        state.position.x - this.lastStart.x,
        state.position.z - this.lastStart.z,
      ) > 45
    ) {
      this.lastGoal = key;
      this.lastStart = { ...state.position };
      this.route = g ? findRoute(state.position, g) : [];
    }
  }
  render(canvas: HTMLCanvasElement, s: MapState, large = false) {
    const ctx = canvas.getContext("2d")!,
      w = canvas.width,
      h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#102225";
    ctx.fillRect(0, 0, w, h);
    const scale = large
      ? Math.min(w / 3800, (h - 40) / 1800)
      : Math.min(w, h) / (2 * this.radius);
    const project = (x: number, z: number): [number, number] =>
      large
        ? [w / 2 + x * scale, h / 2 + z * scale]
        : [
            w / 2 +
              (-(x - s.position.x) * Math.cos(s.heading) +
                (z - s.position.z) * Math.sin(s.heading)) *
                scale,
            h * 0.55 -
              ((x - s.position.x) * Math.sin(s.heading) +
                (z - s.position.z) * Math.cos(s.heading)) *
                scale,
          ];
    function polygon(points: Point[], color: string) {
      ctx.fillStyle = color;
      ctx.beginPath();
      points.forEach((p, i) => {
        const [x, z] = project(p.x, p.z);
        if (i === 0) ctx.moveTo(x, z);
        else ctx.lineTo(x, z);
      });
      ctx.closePath();
      ctx.fill();
    }
    function rect(x: number, z: number, dx: number, dz: number, color: string) {
      polygon(
        [
          { x: x - dx / 2, z: z - dz / 2 },
          { x: x + dx / 2, z: z - dz / 2 },
          { x: x + dx / 2, z: z + dz / 2 },
          { x: x - dx / 2, z: z + dz / 2 },
        ],
        color,
      );
    }
    for (const city of ["gdansk", "riyadh"] as const) {
      rect(
        centers[city],
        0,
        1600,
        1600,
        city === "gdansk" ? "#344643" : "#514b3e",
      );
      const near = large ? Infinity : this.radius + 150;
      for (let ix = 0; ix < 8; ix++)
        for (let iz = 0; iz < 8; iz++) {
          const x = centers[city] - 700 + ix * 200,
            z = -700 + iz * 200;
          if (
            Math.abs(x - s.position.x) > near ||
            Math.abs(z - s.position.z) > near
          )
            continue;
          for (const road of streets(x, z, city))
            rect(road.x, road.z, road.w, road.d, city === "gdansk" ? "#77867a" : "#717879");
          if (city === "gdansk" && !(Math.abs(x + 1000) < 101 && Math.abs(z) < 101))
            for (const side of [-1, 1]) rect(x + side * 65, z + 12, 42, 126, "#465f47");
          for (const b of buildings(x, z, city)) {
            rect(b.x + 1, b.z + 1, b.w, b.d, "#192b2b");
            rect(b.x, b.z, b.w, b.d, city === "gdansk" ? "#98a99a" : "#b5aa87");
          }
        }
      rect(centers[city], 0, city === "gdansk" ? 37 : 80, 166, city === "gdansk" ? "#7c8874" : "#a5977c");
      if (city === "riyadh") rect(centers[city], 0, 28, 166, "#717879");
    }
    rect(0, 0, 400, 300, "#6c7863");
    for (const spot of spots) {
      rect(spot.x, spot.z, 128, 202, spot.city === "gdansk" ? "#42616b" : "#7e7860");
      rect(spot.x, spot.z, 10, 132, "#b2c4b1");
      const [x, y] = project(spot.x, spot.z - 78);
      ctx.fillStyle = spot.city === "gdansk" ? "#ffaa76" : "#93e6d1";
      ctx.beginPath(); ctx.arc(x, y, large ? 5 : 7, 0, Math.PI * 2); ctx.fill();
      if (large) { ctx.font = "bold 9px Arial"; ctx.fillText(spot.name, x + 8, y + 3); }
    }
    rect(-1000, 98, 200, 24, "#2b7185");
    rect(-1000, 98, 12, 28, "#a8b494");
    for (const l of landmarks) {
      rect(l.x, l.z, l.w, l.d, l.city === "gdansk" ? "#a88469" : "#87a3ad");
      if (large) {
        const [x, z] = project(l.x, l.z);
        ctx.fillStyle = "#f4e1ac";
        ctx.beginPath();
        ctx.arc(x, z, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = "9px Arial";
        ctx.fillText(l.name, x + 7, z - 5);
      }
    }
    if (!large)
      for (const r of s.rails)
        rect(
          r.x,
          r.z,
          r.axis === "x" ? r.length : 1.1,
          r.axis === "z" ? r.length : 1.1,
          "#81bec9",
        );
    if (this.route.length) {
      ctx.strokeStyle = "#ddff63";
      ctx.lineWidth = large ? 2 : 4;
      ctx.lineJoin = "round";
      ctx.beginPath();
      this.route.forEach((p, i) => {
        const [x, z] = project(p.x, p.z);
        i ? ctx.lineTo(x, z) : ctx.moveTo(x, z);
      });
      ctx.stroke();
    }
    for (const t of tokens) {
      if (s.collected.includes(t.id)) continue;
      if (
        !large &&
        Math.hypot(t.x - s.position.x, t.z - s.position.z) > this.radius
      )
        continue;
      const [x, y] = project(t.x, t.z);
      ctx.fillStyle = "#e7edbb";
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
    for (const a of activities) {
      const [x, y] = project(a.x, a.z);
      if (
        !large &&
        Math.hypot(a.x - s.position.x, a.z - s.position.z) > this.radius
      )
        continue;
      ctx.fillStyle =
        s.records[a.id] !== undefined
          ? "#a0b2a1"
          : a.kind === "sprint"
            ? "#dcff51"
            : a.kind === "jam"
              ? "#ef9a67"
              : "#8bc6dd";
      ctx.beginPath();
      ctx.arc(x, y, large ? 4 : 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (s.goal) {
      let [x, y] = project(s.goal.x, s.goal.z);
      if (!large) {
        x = Math.max(14, Math.min(w - 14, x));
        y = Math.max(14, Math.min(h - 14, y));
      }
      ctx.strokeStyle = "#dcff51";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x, y + 8);
      ctx.lineTo(x - 8, y);
      ctx.closePath();
      ctx.stroke();
    }
    const [px, py] = project(s.position.x, s.position.z);
    ctx.save();
    ctx.translate(px, py);
    if (large) ctx.rotate(-s.heading + Math.PI);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#12272b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
    ctx.font = `bold ${large ? 15 : 17}px Arial`;
    ctx.fillStyle = "#dce8d6";
    if (large) {
      ctx.fillText("GDAŃSK", ...project(-1680, -650));
      ctx.fillText("RIYADH", ...project(340, -650));
    } else {
      const angle = Math.PI + s.heading;
      const nx = w / 2 + Math.sin(angle) * (w / 2 - 21),
        ny = h * 0.55 - Math.cos(angle) * (h / 2 - 23);
      ctx.fillStyle = "#dce8d6";
      ctx.textAlign = "center";
      ctx.fillText(
        "N",
        Math.max(14, Math.min(w - 14, nx)),
        Math.max(20, Math.min(h - 10, ny)),
      );
      ctx.textAlign = "left";
      ctx.font = "13px Arial";
      ctx.fillStyle = "#e4eed6";
      ctx.fillRect(16, h - 20, 50 * scale, 2);
      ctx.fillText("50 m", 16, h - 26);
    }
  }
  worldPoint(
    canvas: HTMLCanvasElement,
    clientX: number,
    clientY: number,
  ): Point | null {
    const r = canvas.getBoundingClientRect(),
      scale = Math.min(canvas.width / 3800, (canvas.height - 40) / 1800);
    const p = {
      x:
        (((clientX - r.left) / r.width) * canvas.width - canvas.width / 2) /
        scale,
      z:
        (((clientY - r.top) / r.height) * canvas.height - canvas.height / 2) /
        scale,
    };
    return inWorld(p.x, p.z) && clearGround(p.x, p.z, 0.7) ? p : null;
  }
}
