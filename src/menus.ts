const skyline = (city: "gdansk" | "riyadh") =>
  city === "gdansk"
    ? `<svg viewBox="0 0 260 100" aria-hidden="true"><path d="M0 100V72h18V39l16-19 16 19v33h13V28L80 6l17 22v44h12V45l17-21 17 21v27h16V37l17-23 17 23v35h16V48l17-17 17 17v24h25v28" fill="currentColor"/><path d="M0 87h260M28 47h13m32-9h15m29 16h15m35-7h15m34 9h14" stroke="#132c2c" stroke-width="4"/></svg>`
    : `<svg viewBox="0 0 260 100" aria-hidden="true"><path d="M0 100V72h24V50h18v22h17V24h21v48h19V8h31v64h16V38h23v34h20V20h28v52h18V51h25v49" fill="currentColor"/><path d="M106 17h17v24h-17zM64 30h11m-11 9h11m77 9h11m31-21h16m-16 9h16" stroke="#1e2b28" stroke-width="4"/></svg>`;
const header = (active: string) =>
  `<header class="shell-header"><div class="wordmark"><span class="brand-symbol">L<span>∕</span>S</span><span>LAYAN'S<br>SKATE</span></div><div class="header-rule"></div><span class="section-label">${active}</span><div class="rider-profile"><span class="profile-avatar">01</span><span>LOCAL RIDER<small>SOLO SESSION</small></span></div></header>`;
const row = (label: string, description: string, control: string) =>
  `<div class="setting-row"><div><span class="setting-name">${label}</span><small>${description}</small></div>${control}</div>`;
const range = (
  id: string,
  label: string,
  min: number,
  max: number,
  step = 1,
  unit = "%",
) =>
  `<div class="range-control"><input type="range" id="${id}" aria-label="${label}" min="${min}" max="${max}" step="${step}" data-pref="${id}"><output for="${id}" data-unit="${unit}"></output></div>`;
const toggle = (id: string, label: string) =>
  `<label class="switch"><input id="${id}" type="checkbox" data-pref="${id}" aria-label="${label}"><span aria-hidden="true"></span></label>`;
export const menus = `
<section id="menu" class="shell lobby" aria-label="Game lobby">
 ${header("THE STREETS ARE YOURS")}
 <nav class="lobby-nav" aria-label="Main navigation"><button class="nav-item selected" aria-current="page">PLAY</button><button id="lobby-world" class="nav-item" data-ready disabled>WORLD</button><button id="lobby-rider" class="nav-item" data-ready disabled>RIDER</button><button id="lobby-settings" class="nav-item" data-ready disabled>SETTINGS</button></nav>
 <div class="lobby-copy"><div class="edition-tag"><i></i> FREE SKATE · OPEN WORLD</div><h1>LAYAN'S<br><em>SKATE.</em></h1><p>Two cities. Endless possibilities.<br>Make the streets your own.</p><button id="play" class="launch-button" disabled><span class="play-triangle">▶</span><span>Preparing physics…</span><span class="button-arrow">↗</span></button><div class="ride-location"><span class="location-dot"></span><span id="lobby-location">GDAŃSK / FIND YOUR NEXT LINE</span><button id="lobby-shuffle" data-ready disabled>Shuffle start ↻</button></div><span id="loading" class="loading">Getting your ride ready</span></div>
 <div class="rider-caption"><span class="tiny-kicker">YOUR RIDER</span><strong>FREESTYLE / INLINE</strong><button id="lobby-customize" data-ready disabled>Customize rider <span>↗</span></button></div>
 <div class="lobby-bottom"><div class="section-heading"><span>CHOOSE YOUR NEXT SESSION</span><span>01 — 03</span></div><div class="session-cards">
 <button id="select-gdansk" class="session-card baltic selected" aria-pressed="true" data-ready disabled><div class="card-art">${skyline("gdansk")}</div><span class="card-number">01 / DESTINATION</span><strong>GDAŃSK</strong><span class="card-detail">Baltic brick. Waterfront lines.</span><span class="card-corner">↗</span></button>
 <button id="select-riyadh" class="session-card desert" aria-pressed="false" data-ready disabled><div class="card-art">${skyline("riyadh")}</div><span class="card-number">02 / DESTINATION</span><strong>RIYADH</strong><span class="card-detail">Golden light. Open courtyards.</span><span class="card-corner">↗</span></button>
 <button id="featured-event" class="session-card featured" data-ready disabled><span class="card-number">03 / STREET CHALLENGE</span><span class="event-stripes" aria-hidden="true">&gt;&gt;&gt;</span><strong>QUAY RUN</strong><span class="card-detail">Sprint · Chase your personal best</span><span class="card-corner">↗</span></button></div></div>
 <footer class="shell-footer"><div><span class="footer-dot"></span><span id="lobby-progress">YOUR WORLD. YOUR PACE.</span></div><div><button id="how">CONTROLS <kbd>?</kbd></button><span class="build-label">V0.3 / LOBBY UPDATE</span></div></footer>
</section>
<section id="pause" class="shell pause-shell hidden" aria-label="Pause menu">${header("SESSION PAUSED")}<div class="pause-layout"><div><span class="tiny-kicker">TAKE A BREATHER</span><h2>BACK IN<br>A <em>BEAT.</em></h2><nav class="pause-nav" aria-label="Pause navigation"><button id="resume" class="selected">Keep skating <span>↗</span></button><button id="map-open">World map <span>↗</span></button><button id="pause-night">Switch to night <span>☾</span></button><button id="pause-settings">Settings <span>↗</span></button><button id="wardrobe">Your rider <span>↗</span></button><button id="help-open">Controls <span>↗</span></button><button id="return-lobby">Return to lobby <span>↗</span></button></nav></div><aside class="session-summary"><span class="tiny-kicker">SESSION SNAPSHOT</span><h3>Every line counts.</h3><p id="progress"></p><div class="summary-stat"><span>BEST COMBO</span><strong id="pause-best">0</strong><small>POINTS BANKED</small></div><span class="tiny-kicker">QUICK TRAVEL</span><div class="travel-buttons"><button id="gdansk">Gdańsk · fresh start <span>↗</span></button><button id="riyadh">Riyadh · fresh start <span>↗</span></button><button id="rail-practice">Practise rails <span>↗</span></button></div></aside></div><footer class="shell-footer"><span>YOUR SESSION IS PAUSED</span><span><kbd>ESC</kbd> BACK TO THE STREETS</span></footer></section>
<section id="settings-screen" class="shell settings-shell hidden" aria-label="Settings">${header("PREFERENCES")}<div class="settings-title"><div><span class="tiny-kicker">MAKE IT YOURS</span><h2>SETTINGS<span class="title-period">.</span></h2></div><span id="settings-status" role="status">ALL CHANGES SAVED</span></div><div class="settings-layout"><nav class="settings-tabs" role="tablist" aria-label="Settings categories" aria-orientation="vertical">
 ${[
   ["graphics", "01", "Graphics"],
   ["sound", "02", "Audio"],
   ["camera", "03", "Camera & controls"],
   ["accessibility", "04", "Accessibility"],
   ["save", "05", "Save & credits"],
 ]
   .map(
     ([id, n, label], i) =>
       `<button role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? "0" : "-1"}" data-tab="${id}"><span>${n}</span>${label}<b>›</b></button>`,
   )
   .join("")}
 </nav><div class="settings-panels">
 <section role="tabpanel" id="panel-graphics" aria-labelledby="tab-graphics"><div class="panel-heading"><h3>Graphics</h3><span>FIND YOUR BALANCE</span></div>
 ${row("Graphics preset", "Choose fidelity or a smoother ride.", '<select id="quality" aria-label="Graphics preset" data-pref="quality"><option value="auto">Automatic</option><option value="1">High</option><option value="0.75">Balanced</option><option value="0.5">Low</option><option value="custom">Custom</option></select>')}
 ${row("Night mode", "Moonlight, lit streets and fireworks spelling I LOVE YOU LAYAN.", toggle("nightMode", "Night mode"))}
 ${row("Resolution scale", "Render resolution relative to the display.", range("resolution", "Resolution scale", 50, 100, 5))}
 ${row("Real-time shadows", "Detailed shadows from buildings, trees, and rails.", toggle("shadows", "Real-time shadows"))}
 ${row("Field of view", "A wider view shows more of the upcoming line.", range("fov", "Field of view", 55, 85, 1, "°"))}
 ${row("Brightness", "Adjust the exposure of the world.", range("brightness", "Brightness", 70, 130, 5))}
 ${row("Display mode", "Expand the game when your browser permits it.", '<button id="fullscreen" class="setting-action">Toggle fullscreen ↗</button>')}
 </section>
 <section role="tabpanel" id="panel-sound" aria-labelledby="tab-sound" hidden><div class="panel-heading"><h3>Audio</h3><span>HEAR THE STREETS</span></div>
 ${row("Skate sounds", "Rolling sound responds to your speed.", toggle("audio", "Skate sounds"))}
 ${row("Master volume", "Overall sound level.", range("master", "Master volume", 0, 100, 5))}
 ${row("Effects volume", "The level of wheel and skating effects.", range("effects", "Effects volume", 0, 100, 5))}
 <div class="settings-tip"><span>GOOD TO KNOW</span><p>Sound starts after you interact with the game. You can keep the streets quiet and still use all visual cues.</p></div></section>
 <section role="tabpanel" id="panel-camera" aria-labelledby="tab-camera" hidden><div class="panel-heading"><h3>Camera & controls</h3><span>YOUR WAY TO RIDE</span></div>
 ${row("Look sensitivity", "Mouse drag and right-stick camera speed.", range("sensitivity", "Look sensitivity", 0.25, 2.5, 0.05, "×"))}
 ${row("Invert vertical look", "Reverse vertical mouse and right-stick look.", toggle("invert", "Invert vertical look"))}
 ${row("Controller dead zone", "Ignore small resting-stick movements.", range("deadzone", "Controller dead zone", 0.05, 0.35, 0.01, "ratio"))}
 ${row("Camera auto-center", "Bring the view back behind your rider.", toggle("autoCenter", "Camera auto-center"))}
 ${row("Dynamic camera", "Speed changes the camera distance and field of view.", toggle("motion", "Dynamic camera"))}
 ${row("Control reference", "Keyboard and standard controller layout.", '<button id="settings-controls" class="setting-action">View controls ↗</button>')}
 </section>
 <section role="tabpanel" id="panel-accessibility" aria-labelledby="tab-accessibility" hidden><div class="panel-heading"><h3>Accessibility</h3><span>COMFORT COMES FIRST</span></div>
 ${row("Reduce camera motion", "Disable lobby motion and speed-driven camera effects.", toggle("reducedMotion", "Reduce camera motion"))}
 ${row("HUD size", "Scale the speedometer, hints, map, and event display.", range("hudScale", "HUD size", 80, 130, 5))}
 ${row("Show gameplay HUD", "Keep the view clear during free skate.", toggle("showHud", "Show gameplay HUD"))}
 ${row("High-contrast interface", "Stronger panel backgrounds and clearer UI outlines.", toggle("contrast", "High-contrast interface"))}
 </section>
 <section role="tabpanel" id="panel-save" aria-labelledby="tab-save" hidden><div class="panel-heading"><h3>Save & credits</h3><span>KEEP YOUR PROGRESS</span></div>
 ${row("Export progress", "Download a backup of your medals, tokens, and outfit.", '<button id="export" class="setting-action">Export save ↓</button>')}
 ${row("Import progress", "Restore a compatible Layan's Skate save.", '<button id="import" class="setting-action">Import save ↑</button><input id="save-file" type="file" accept="application/json" hidden>')}
 <div class="settings-tip"><span>LOCAL SAVES</span><p>Your progress and preferences stay in this browser. In previews that block storage, you can play for the session and export your progress.</p></div><div class="credits-block"><b>LAYAN'S SKATE</b><p>An original inline skating experiment. Original procedural artwork and synthesized skate audio.</p><small>Rendering · Three.js &nbsp; Physics · Rapier</small><a href="./THIRD_PARTY_NOTICES.txt" target="_blank" rel="noopener">Third-party credits & licenses ↗</a></div></section>
 </div></div><footer class="shell-footer settings-footer"><button id="settings-back" class="text-button">← Back</button><div><button id="settings-reset" class="text-button">Restore defaults</button><button id="settings-apply" class="apply-button" disabled>Apply changes <span>↗</span></button></div></footer></section>
<section id="wardrobe-screen" class="shell wardrobe-shell hidden" aria-label="Rider customization">${header("RIDER CUSTOMIZATION")}<div class="wardrobe-content"><span class="tiny-kicker">EXPRESS YOURSELF</span><h2>YOUR<br><em>COLOURS.</em></h2><p>Change your look. Keep your flow.</p><span class="tiny-kicker">JACKET COLOUR</span><div id="outfit-swatches" class="outfit-swatches"></div><p id="outfit-status" class="notice"></p></div><footer class="shell-footer"><button id="wardrobe-back" class="text-button">← Back</button><span>COSMETICS ONLY. YOUR SKILLS DO THE REST.</span></footer></section>`;
