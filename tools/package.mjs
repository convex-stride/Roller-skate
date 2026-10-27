import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

// Inline the production assets for hosts that preview one HTML file rather than
// serving a complete ZIP. Rapier compat already embeds its WASM payload.
const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
let html = await readFile(resolve(dist, "index.html"), "utf8");
const script = /<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g;
for (const match of [...html.matchAll(script)]) {
  const path = resolve(dist, match[1]);
  if (!path.startsWith(dist + "/"))
    throw Error("Asset escapes distribution directory");
  const js = await readFile(path, "utf8");
  html = html.replace(
    match[0],
    () =>
      `<script type="module">${js.replace(/<\/script/gi, "<\\/script")}</script>`,
  );
}
const stylesheet = /<link\b[^>]*href="([^"]+\.css)"[^>]*>/g;
for (const match of [...html.matchAll(stylesheet)]) {
  const path = resolve(dist, match[1]);
  if (!path.startsWith(dist + "/"))
    throw Error("Asset escapes distribution directory");
  const css = await readFile(path, "utf8");
  html = html.replace(
    match[0],
    () => `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`,
  );
}
const notices = await readFile(
  resolve(dist, "THIRD_PARTY_NOTICES.txt"),
  "utf8",
);
html = html.replace(
  "</body>",
  () =>
    `<script type="text/plain" id="bundled-licenses">${notices.replace(/<\/script/gi, "<\\/script")}</script></body>`,
);
// Keep credits available in a standalone file without an external fetch.
html = html.replace(
  "</body>",
  '<script>document.addEventListener("click",function(e){var a=e.target.closest("a[href=\\"./THIRD_PARTY_NOTICES.txt\\"]");if(a){e.preventDefault();var u=URL.createObjectURL(new Blob([document.getElementById("bundled-licenses").textContent],{type:"text/plain"}));window.open(u,"_blank");setTimeout(function(){URL.revokeObjectURL(u)},60000)}})</script></body>',
);
await mkdir(resolve(root, "releases"), { recursive: true });
await writeFile(resolve(root, "releases/Between-Cities.html"), html);
await writeFile(resolve(root, "releases/Between-Cities-Streets.html"), html);
await writeFile(resolve(root, "releases/Between-Cities-Lobby.html"), html);
await writeFile(resolve(root, "releases/Between-Cities-Ride.html"), html);
await writeFile(resolve(root, "releases/Between-Cities-Landmarks.html"), html);
await writeFile(resolve(root, "releases/Between-Cities-Flow.html"), html);
await writeFile(resolve(root, "releases/Between-Cities-Pirate.html"), html);
await writeFile(resolve(root, "releases/Between-Cities-Rails.html"), html);
await writeFile(resolve(root, "releases/Between-Cities-Contrasts.html"), html);
await writeFile(resolve(root, "releases/Between-Cities-Play.html"), html);
await writeFile(resolve(root, "releases/Between-Cities-Alive.html"), html);
await writeFile(resolve(root, "releases/Between-Cities-Races.html"), html);
execFileSync(
  "zip",
  ["-q", "-FS", "-r", resolve(root, "releases/between-cities-v0.12.zip"), "."],
  { cwd: dist },
);
console.log(
  "Packaged releases/Between-Cities.html (self-contained browser build)",
);
console.log("Packaged releases/between-cities-v0.12.zip (itch.io build)");
