# Roller-skate — complete game and production plan

Status: production design with an initial playable procedural prototype implemented. See README.md for the implemented features, validation, and remaining limitations. The release checklist below describes the intended finished game, not the current prototype.

## 1. The game we are making

**Working title:** Roller-skate. Choose the public title and check name availability before making final branding.

**Pitch:** A third-person inline skating game where you find your own lines through a colorful Gdańsk waterfront and a warm Riyadh cityscape. Build speed, carve corners, jump gaps, grind rails, and link tricks across two large, connected cities.

**Main reference:** the user supplied https://youtu.be/ma1KNzDIFZc and requested that its gameplay drive the design. Attempts to access the video from this environment returned an HTTP 403 proxy denial, including the access retry. Its contents have not been viewed. Fluid inline skating, expressive movement, and exploration are the provisional interpretation; the mechanics below are proposals, not verified observations from that video. Reviewing accessible footage is required before claiming reference fidelity. Riders Republic is a secondary reference for freedom and recognizable destinations.

Use our own characters, maps, artwork, sounds, interface, and progression. Reference review should record observable qualities—camera distance, turning responsiveness, trick readability, density of useful obstacles—before tuning against a particular video. Do not promise identical physics before testing a controller.

The supplied video's observed gameplay takes priority over provisional movement choices in this document. Review it into a timestamped list covering acceleration/coasting, steering and drifting, jumping and air control, trick inputs, grinding, landing forgiveness, camera behavior, and recovery. Mark features that are not visible as unknown. Revise the controller specification from that evidence rather than treating this initial proposal as a replacement for the requested reference.

**Primary platform:** desktop browsers, published as an HTML5 game on itch.io. Keyboard and a standard gamepad are supported. Build with Three.js and TypeScript. Mobile gameplay is a later project with its own control and performance work.

**Default business scope:** free single-player first release, no account, ads, store, or backend. Start with original procedural art and assets whose licenses allow distribution; no paid purchases are assumed. Pricing can be revisited before publishing.

**Player fantasy:** become familiar enough with a place that a railing, bench, sloping path, and roof edge turn into a continuous skating route.

### Design pillars

1. Movement is enjoyable before a mission starts. A flat plaza with a few obstacles must already feel good.
2. Streets contain readable lines. Landmarks help navigation, and ramps, rails, and safe landings are recognizable at speed.
3. Tricks reward intention. Players can understand why a trick worked, why a combo ended, and how to improve.
4. Both cities have a distinct character. Architecture, route shapes, lighting, materials, sound, and challenges differ.
5. Starting is easy. Open the browser build, choose Play, learn to roll, and reach an interesting obstacle quickly.

## 2. What counts as a finished first release

The release is complete when both cities each provide at least 2 km² of reachable explorable surface, are joined by a continuous skateable connection, the movement and scoring systems work consistently, all launch events and unlocks function, saves survive reloads when browser storage is available, the game meets the agreed performance target, and the actual itch.io upload has passed its checks.

### Launch content budget

| Item | Version 1 target |
| --- | --- |
| Cities | Gdańsk and Riyadh, joined in one continuously skateable fictional world |
| Districts | 6 connected districts per city, 12 total |
| Required area | At least 2 km² of explorable surface per city; at least 4 km² total, excluding the connector and background scenery |
| Authoring footprint | Start with 1.6 × 1.6 km per city, 2.56 km² gross, to allow at least 2 km² after inaccessible footprints are deducted |
| Connection | A roughly 400 × 300 m transitional skate corridor, additional to both city area requirements |
| Tutorials | 8 short lessons in one optional sequence |
| Events | 36 total: one sprint, one trick jam, and one route challenge in each district |
| Event medals | Bronze, silver, gold; thresholds tuned from playtests |
| Collectibles | 120 total, 10 per district |
| Discovery landmarks | 12 total, 6 per city, overlapping with rather than adding to districts |
| Rider | One original customizable rider and a consistent animation set |
| Cosmetic rewards | 12 unlockable choices, plus a usable starter outfit |
| Riding systems | Push, coast, carve, brake, crouch, jump, spins, grabs, grinds, manuals, landing, bail, recovery |
| Modes | Free skate and replayable events |
| Input | Keyboard and standard gamepad |
| Progress | Local save, personal bests, collectibles, medals, cosmetics, settings |
| Online features | None required to play |

These numbers define a finite production target, not work already completed. The user's minimum city areas and connected-world requirement are launch constraints. Small prototype maps are development steps, not substitutes for the requested final maps. Content expansion begins only after the first district and full-size streamed graybox pass their playability and performance gates. If the browser cannot sustain the scope, reduce visual complexity first; do not silently shrink the maps.

**Deferred after version 1:** multiplayer, races against networked players, global leaderboards, user accounts, user-made maps, full pedestrians and traffic simulation, moving vehicles, mobile controls, daily live events, photorealistic scans, full city replicas, wall running, swimming, multiple sports, dynamic weather, a full day/night cycle, advanced replay editing, and character body-type systems. Ghost races and photo mode are possible first updates after release.

## 3. The player experience

### First session

1. A lightweight loading screen introduces the game and explains download progress.
2. The title screen shows the rider and a recognizable city view. Audio begins only after interaction.
3. Play starts in the Gdańsk training plaza. The player can skip the lesson and immediately skate.
4. Short prompts teach pushing, steering, braking, jumping, landing, grinds, manuals, and combos.
5. A nearby first event introduces medals and the first cosmetic reward.
6. Free skate opens the surrounding district. Direction signs and the world map show the continuous route to Riyadh. Both cities are accessible from the start, with optional fast travel to their starting plazas.

Do not lock the second city behind hours of progression. Tutorials and travel must remain accessible later from the pause menu.

### Main play loop

Explore → spot a line → attempt it → land and bank a combo → improve a personal best or event medal → unlock a cosmetic → try a new route.

The player can pursue an event or ignore it. Free skate has no countdown, energy bar, mandatory errands, combat, or lives. Event restarts are quick and clearly labeled.

### Tutorial lessons

| Lesson | Required player action | Success feedback |
| --- | --- | --- |
| Roll | Accelerate and coast through a wide gate | Speed and momentum explained |
| Carve | Follow a broad S-shaped route | Steering and speed tradeoff shown |
| Stop | Brake inside a large marked area | Brake distance demonstrated |
| Jump | Press jump over a low gap; hold briefly for more height | Immediate takeoff and jump arc shown |
| Land | Complete a small jump and continue rolling | Clean versus rough landing explained |
| Grind | Approach a training rail and hold grind | Entry direction and exit shown |
| Manual | Balance briefly between two flat markers | Combo linking shown |
| Flow | Link a jump, grind, and manual, then bank | Combo summary and restart invitation |

Each lesson can be skipped, replayed, or retried. Tutorial checkpoints keep failed attempts short.

## 4. Skating and physical behavior

### Controller model

Use a capsule-shaped gameplay collider with a custom skating controller powered by Rapier scene queries. The visible skater follows the gameplay body through animation. Explicitly own acceleration, ground adhesion, jumps, trick rotation, rail attachment, and recovery rather than expecting a general-purpose rigid body to produce enjoyable skating automatically.

Use a fixed 60 Hz simulation and interpolate rendering. Cap catch-up steps after long stalls. When the tab loses focus, pause and clear held inputs; never feed the entire hidden-tab time into physics.

### Ground movement

- Holding forward produces an alternating push cycle, then a coast at cruising speed.
- Releasing forward preserves momentum, gradually reduced by rolling resistance.
- Turning changes heading smoothly. Tight turns reduce speed; wide carving retains more speed.
- Braking gives visible body lean, skate angle, and a predictable stopping distance.
- Crouching reduces the rider's stance and prepares a jump. It does not create unlimited speed.
- Slopes influence acceleration. Downhill speed can exceed the flat-ground cruise limit up to a safety cap.
- Stop or slide along walls instead of clipping through them. Avoid instant hard stops on small seams.
- Reject impossible steep surfaces as walls; do not let the rider skate vertically up any mesh.
- Small curb forgiveness keeps decorative seams from ruining movement. Larger ledges need a jump.

**Current prototype tuning (0.6):** press-to-jump with 4.8 m/s vertical takeoff, 5.2 m/s while crouched, early-release height control, 100 ms of coyote time, and a 180 ms jump input buffer. These are tunable game parameters, not established biomechanics measurements.

### Jumping and air control

- Press jump to take off immediately. A short tap gives a smaller hop; holding briefly retains the full ballistic arc.
- Preserve jump and trick edges until the next fixed simulation step, including at high display refresh rates.
- Conserve forward momentum during flight. Allow modest air steering without letting the rider hover or reverse instantly.
- Visual spins are separate from small movement corrections. The player must still read the landing direction.
- Mark dangerous water, voids, and inaccessible roofs with recovery volumes.
- Swept collision checks cover fast movement and narrow obstacles, including at the downhill cap.

### Landings and falls

Classify landing quality from velocity, contact normal, body alignment, active trick state, and configured forgiveness. Provide clean, rough, and bail outcomes. Exact tolerances are tuned on the training course.

- Clean: retain most speed and receive a landing bonus.
- Rough: lose some speed and receive reduced scoring; remain controllable.
- Bail: lose the unbanked combo and recover rapidly at the last safe point.

Correctly aligned backward landings enter a readable switch stance. The game must handle both forward and switch skating deliberately. Version 1 uses a brief authored fall/recovery animation; a ragdoll system is optional later.

Recovery should usually take less than two seconds. A reset action is always available when gameplay has focus. Do not count a recovery teleport as passing checkpoints or collecting objects.

### Grinds

- Rails are authored paths with height, direction, usable length, and entry constraints.
- Holding grind near an eligible rail attempts attachment only within a small, visible forgiveness range.
- Require compatible approach direction, adequate height, and plausible speed. Do not snap through walls to a hidden rail.
- While attached, movement follows the rail path and retains readable momentum.
- Support both travel directions, gentle curves, a balance challenge, and a jump-off action.
- Release grind or reach the rail end to exit. Prevent immediate reattachment to the same segment for a short interval.
- Start with three readable grind poses: basic parallel, soul-inspired, and crossed-leg. Final animation and names should match skating references.
- Show balance cues unobtrusively; offer a generous assist setting for casual play.

### Manuals and trick vocabulary

Manuals link flat-ground movement between obstacles. A balance meter, decreasing score return, and a finite balance limit prevent indefinite stationary scoring. Manuals require a minimum speed.

Launch trick families:

- Jump variations: quick tap hop and held full-height jump.
- Spins: 180°, 360°, 540°, and 720° where airtime permits.
- Grabs: two visually distinct poses using the grab action and steering direction.
- Grinds: three poses, with scoring based on actual travel along a rail.
- Manual: one readable balance pose, usable forward or in switch.
- Transfers: bonus for chaining distinct rails or obstacles without an ordinary grounded break.

Build recognition from completed motion and valid contact states. Pressing a trick button without completing the action must not award the full trick.

## 5. Controls and camera

Use an action layer so bindings, tutorial prompts, gamepad icons, and accessibility settings stay consistent. All keyboard bindings should be remappable. Inputs act only while the game has focus; browser shortcuts remain usable.

| Action | Keyboard default | Standard gamepad default |
| --- | --- | --- |
| Push / brake | W / S, or up / down arrows | Left stick forward / back |
| Steer | A / D, or left / right arrows | Left stick left / right |
| Jump on press; hold for height | Space | South face button |
| Crouch without jumping | Shift | Unassigned in current prototype |
| Hold grind / release to leave | E | Left shoulder |
| Hold manual | Q | Right shoulder |
| Tap safety grab / mute tweak | F / X | West face button for safety grab |
| Tap 180 left / right; tap twice for 360 | Z / C | Tap left / right trigger |
| Hold powerslide | G | Left stick click |
| Look around | Mouse drag | Right stick |
| Interact / start event | Enter | North face button |
| Reset to safe position | R | Hold east face button |
| Pause | Escape | Menu button |

Triggers now issue spin taps. Keep crouch on a separate binding when expanding the controller layout. Clear consumed input state on pause and city changes; buffer intentional jump-and-trick combinations through takeoff.

Use click-and-drag camera movement by default so an itch.io iframe does not depend on pointer lock. Optional pointer lock can be enabled after an explicit click. Unlocking with Escape must remain safe and understandable.

### Camera requirements

- Third-person chase camera with a stable view of the upcoming route.
- Gentle auto-centering when the player stops looking around.
- Camera collision checks prevent passing through walls and railings.
- Speed slightly increases camera distance and field of view, with adjustable intensity.
- A jump lifts the framing enough to show the landing.
- Trick spins do not spin the entire camera.
- Camera shake, motion effects, auto-centering strength, sensitivity, and invert-Y are configurable.
- Resetting the skater also resets camera interpolation to avoid a long camera flight.
- Never obscure the next mandatory checkpoint with scoring effects.

## 6. Scoring, events, and progression

### Combo rules

Use a transparent score model: **banked combo = eligible trick points × capped variety multiplier**, with a clean-landing bonus folded into the eligible points.

- A completed trick contributes base points.
- Grind distance and manual distance add bounded increments, requiring actual movement.
- Distinct trick families increase a multiplier up to an initial cap of ×5.
- Repeating the same trick in a combo gives diminishing returns.
- Each continuous grind or manual is one action; do not count a new trick every frame.
- A roughly two-second ground-link window gives time to reach the next action. Active valid grinds and manuals sustain the combo.
- When that window expires safely, bank the combo and show a compact summary.
- A bail discards unbanked points. Already banked event score remains.
- Pausing freezes simulation, timers, and combo decay together.
- Event completion banks a valid landed combo; an airborne attempt must resolve before the final result.

All numeric score values and thresholds live in data files. Tune them after a playable course exists. The target is rewarded variety, not a single high-value action repeated in place.

### Event formats

1. **Sprint:** follow ordered checkpoints to the finish. Medal criteria are time thresholds. Missed gates remain visible; recovery returns to a valid recent checkpoint without advancing the race.
2. **Trick jam:** score within a bounded skating area during a 90-second session. Medal criteria are banked points. Exiting the arena gives a brief return prompt, then resets the rider inside it.
3. **Route challenge:** complete a short sequence of authored tasks such as jump the gap → grind the rail → reach the finish. Bronze requires completion; silver and gold add time or clean-execution requirements.

Every event needs a briefing, visible start, reliable reset, objective tracking, results panel, personal best, medal state, and return-to-free-skate action. Challenges vary through routes and obstacles rather than introducing a new bespoke rule system for every event.

### Rewards

Use a deterministic unlock table: tutorials, medal counts, discovery, and collectible milestones grant 12 cosmetic choices. No random rewards or performance upgrades. A good skater must remain competitive in the starter outfit.

Personal records are stored locally per event and per city combo. Free skate banked points contribute to personal records, not an infinite currency economy. Both cities and their core movement options are available without grinding progression.

### Session length targets

First meaningful movement within a minute after download and entry. An event attempt typically lasts one to three minutes. Aim for a satisfying 10–20 minute session, with several hours of exploration and events across the full world. Completion time must be measured in playtests; do not use the city area alone to promise a fixed number of hours.

## 7. Environment design: shared rules

Build one persistent world containing two large city regions and a continuous connection. Use spatial streaming to load nearby chunks while the rider moves. The player can skate from any connected district in Gdańsk, through the connector, into Riyadh without selecting a teleport or entering a separate game session. Fast travel is optional convenience, not the only city connection.

These are fictionalized arrangements inspired by the places. Gdańsk and Riyadh are far apart in reality; placing them next to each other is an explicit world-design choice. Architectural references and street character matter more than matching a satellite map.

### Measurable scale and layout

Use meters as world units. An initial coordinate layout places Gdańsk at x = −1800…−200 and z = −800…800, Riyadh at x = 200…1800 and z = −800…800, and the connection at x = −200…200 and z = −150…150. Each city has a 2.56 km² gross envelope; the connection adds 0.12 km². Buildings, deep water, closed scenery, and other inaccessible surfaces must leave at least 2 km² of reachable playable horizontal area in each city. Expand the envelope if necessary to retain that minimum.

Measure reachable area from exported walkable/skateable surfaces or a conservative navigation raster, after slope and clearance checks. Count horizontal coverage once, without stacking roof and ground areas or counting distant scenery. Verify connectivity from legal spawns using paths, ramps, and supported jumps. An empty oversized ground plane does not satisfy the environment-completion gate.

The connection is an original **World Link** route: a harbor-side transport plaza opens into a broad bridge/underpass skate park, then shaded gardens introduce Riyadh's materials and lighting. Include an easy continuous path, a parallel technical rail route, safe checkpoints, signs, and a central rest plaza. The fiction is a shared skating world, not a geographically real journey between Poland and Saudi Arabia.

At the initial 8 m/s cruise speed, a straight 1.6 km crossing takes about 200 seconds before corners or stops. Build useful loops and intermediate activities so crossing a city is play, not several minutes of holding forward. Lighting and ambience blend across the connection. Retain distant silhouettes without loading both complete cities.

Each district needs:

- A recognizable landmark visible from several approaches.
- A generous beginner route, a faster technical route, and at least one optional shortcut.
- A useful mix of flat space, curbs, ramps, banks, rails, gaps, and recoverable height changes.
- One sprint, one trick jam, one route challenge, and ten collectibles.
- Safe spawn and recovery points, event boundaries, out-of-bounds volumes, and camera clearance.
- A route back to the central spawn and the other districts.
- Something meaningful to do within roughly 5–10 seconds of normal skating.

Create the graybox first with simple surfaces and readable colors. Confirm route flow before detailed facades. Maintain an explicit distinction between visual meshes and gameplay colliders. Decorative steps may use a smooth collision ramp where that improves consistency, but large visible gaps must behave like gaps.

Use consistent visual cues for grindable rails and ramps without making every object glow. Optional assist outlines can reinforce readability. Background doors and building interiors need not be enterable.

## 8. Gdańsk city: Baltic Lines

**Identity:** cool coastal light, colorful narrow facades, brick, harbor infrastructure, broad water views, and slightly weathered paving. The initial test district uses dry surfaces; shiny patches are visual until wet-surface behavior is intentionally introduced.

| District | Visual references | Skating character | Event concepts |
| --- | --- | --- | --- |
| Motława-inspired quay | Merchant facades, a crane-like waterfront silhouette, boats beyond the boundary | Wide beginner promenade, long ledges, gentle banks, short connecting lanes | Quay Sprint; Riverside Session; Bridge-to-Bank line |
| Shipyard lanes | Brick workshops, cranes, steel walkways, container colors | Longer rails, larger gaps, industrial banks, elevation changes | Dock Dash; Steel Lines Jam; Crane Yard Transfer |
| Old-town square | Gabled roofs, small plazas, cafe terraces, brick archways | Tight carving, benches, low walls, layered shortcuts | Alley Circuit; Square Session; Three-Corner Line |
| Island bridges | Canal edges, pedestrian links, contemporary waterside blocks | Bridge approaches, low banks, connected long lines | Island Loop; Bridge Session; Canal Transfer |
| Coastal park | Broad tree-lined paths, lawns, recreation spaces | Beginner cruising, long curves, gentle slopes | Greenway Sprint; Park Session; Tree-Line route |
| Brick neighborhood | Courtyards, residential brick, small local squares | Medium-height ledges, stair bypasses, local shortcuts | Courtyard Dash; Brick Session; Backstreet Link |

**Layout:** a wide promenade anchors the map. Inland loops pass through the square, brick neighborhood, shipyard, and park; bridge routes connect the island district. The World Link leaves from the inland transport edge. Keep the waterfront visible from elevated points to help orientation. Establish a complete broad beginner loop before adding technical shortcuts.

**Hero features:** a waterfront facade cluster, a distant harbor crane, a brick archway, a pedestrian bridge, a park pavilion, and a neighborhood courtyard. These are the six discovery landmarks and do not require recreating entire real buildings.

**Modular kit:** narrow facade bays, gables, brick walls, quay edges, railings, pavement tiles, stairs, banks, benches, planters, bollards, lamps, and restrained signage.

**Sound:** distant harbor machinery, gulls, water, wind, wheel noise on smooth stone, and brighter rail contact on metal.

**Boundary treatment:** decorative boats and water beyond safe railings; a few intentional gaps can allow falls with quick recovery. No swimming system. Prevent easy accidental exits from the tutorial route.

## 9. Riyadh city: Palm & Concrete

**Identity:** golden late-afternoon light, warm stone, shaded passages, planted plazas, modern vertical forms, and palm-lined paths. Avoid turning the city into an empty desert or a generic skyline.

| District | Visual references | Skating character | Event concepts |
| --- | --- | --- | --- |
| Modern plaza | Contemporary Riyadh architecture, broad paving, geometric shade structures | Sweeping routes, wide stairs with side banks, long ledges | Skyline Sprint; Plaza Session; Shade-to-Stair line |
| Sandstone courts | Najdi-inspired earth-colored facades and patterned screens | Tight shaded passages, compact courtyards, ledge combinations | Courtyard Circuit; Sandstone Session; Screen Passage line |
| Wadi park | Landscaped wadi paths, palms, planted terraces, pedestrian bridges | Gentle descents, curved paths, flowing rails and small transfers | Palm Run; Terrace Session; Wadi Bridge line |
| Palm boulevard | Long planted avenues and shaded pedestrian edges | Sustained speed, broad carving, repeated transfer options | Boulevard Sprint; Palm Session; Canopy Link |
| Arts quarter | Contemporary cultural courtyards and geometric public art | Compact technical plazas, ledges, signature sculptural banks | Gallery Circuit; Geometry Session; Sculpture line |
| Ridge terraces | Landscaped elevation changes with skyline views | Longer descents, switchbacks, controlled jumps | Ridge Run; Overlook Session; Terrace-to-Plaza line |

**Layout:** the modern plaza and ridge terraces provide high points. Broad descents lead into the park, palm boulevard connects districts over longer distances, and the sandstone and arts quarters provide denser local loops. The World Link meets the garden/boulevard edge. Climbing remains practical at normal skating speed, with accessible alternatives to technical descents.

**Hero features:** a distant modern tower silhouette, a large geometric shade structure, a terraced palm garden, a boulevard canopy, an original public artwork, and a ridge overlook. These are the six discovery landmarks.

**Modular kit:** stone wall bays, shade screens, canopy pieces, wide paving, planters, palm trees, terrace walls, rails, stair banks, lamps, and verified signage.

**Sound:** wind through palms, distant city ambience, optional fountain ambience where a fountain exists, and skate sounds that distinguish stone from metal.

**Representation:** use real architectural references, correct place-name spelling, and reviewed signage. Avoid invented Arabic lettering. The main interface can launch in English; full Polish and Arabic localization requires separate translation and, for Arabic, right-to-left layout testing. Place designed skate routes in fictional public plazas and parks.

## 10. Art, rider, and animation

### Visual direction

Stylized 3D with clean silhouettes, restrained surface detail, readable shadows, and a cohesive palette. The camera must distinguish rider, rail, ground, and landing at speed. Use city-specific lighting and materials while keeping a consistent game-wide character style.

Gdańsk uses coastal blues, muted brick reds, cream, green, and warm facade accents. Riyadh uses sand, limestone, terracotta, palm greens, shaded cool tones, and selected contemporary accents. Avoid heavy motion blur and excessive bloom.

### Rider production

Begin with a recognizable procedural placeholder that shows stance, feet, and skates. Replace it before release with one original rigged rider. Keep the collider independent from appearance. A helmet, outfit, and clear skate wheels help movement read from the chase camera.

Starter character customization includes outfit palette, skate palette, and helmet style. The 12 rewards can be distributed as 6 outfit palettes, 4 skate palettes, and 2 helmet styles. Cosmetic changes must not affect the collision body or skating statistics.

### Animation checklist

Idle, left/right push, coast, left/right lean, brake, crouch, charge, takeoff, airborne neutral, two grab poses, grind poses, manual balance, switch stance, clean landing, rough landing, bail, recovery, and menu idle.

Blend based on actual speed and controller state. Avoid sliding feet during push, grinding with skates visibly below the rail, or jumping while the mesh remains in a ground pose. Wheel rotation follows distance traveled. Add foot placement/IK only after the base animation set works.

### Asset workflow

Block out with procedural meshes. Produce or refine hero models in Blender, then export glTF/GLB. Use reusable materials, mesh instancing, compressed textures where supported, and LOD variants for background assets. Keep asset IDs, scale conventions, forward axis, pivot rules, collider tags, and rail paths documented.

Track every asset's source and license in an asset manifest. License terms must allow bundling the actual files in a web download. Preserve attribution text where required. Do not include a soundtrack or model simply because it can be downloaded.

## 11. Interface and accessibility

### Required screens

Boot/load, title, first-run introduction, game HUD, pause, world map, event briefing, event result, wardrobe, settings, credits, save import/export, and a useful error/recovery screen.

The world map represents the entire connected world. Show city and district names, player position and heading, discovered activities, optional navigation markers, collectible totals, and fast-travel plazas. Avoid a compulsory minimap if a simple destination indicator is enough; offer a compact map overlay.

### HUD

- Speed, active event time/objective, and the current combo are the primary information.
- Trick names and score additions appear briefly near the combo display.
- Checkpoint direction appears only when relevant.
- Grind/manual balance is visible only while balancing.
- Control hints adapt to the active device.
- Hide nonessential UI during free skate and offer a HUD visibility setting.

Menus should use accessible HTML rather than drawing all text inside the WebGL canvas. Provide keyboard focus, readable text, adequate contrast, scalable HUD size, and large action targets. Do not communicate event state only by color. Returning from pause restores focus to gameplay deliberately.

### Settings

Graphics preset and resolution scale; shadows; effects density; master/music/effects volume; camera sensitivity and inversion; camera motion intensity; key rebinding; controller dead zone; hold/toggle assistance where appropriate; jump assistance; grind assistance; HUD scale; reduced motion. Include reset-to-defaults per category.

Gamepad disconnect should pause or provide a usable keyboard fallback. A controller must not start moving the rider merely because its resting analog value is noisy. Fullscreen is requested only on a user gesture and is optional.

## 12. Sound and music

Core sounds: push, rolling by surface and speed, jump, landing quality, rail entry/loop/exit, manual feedback, bail, recovery, collectible, objective completion, medal, menu focus, and confirm/cancel.

Rolling and grind loops should crossfade as speed or materials change. Cap simultaneous voices and avoid triggering an impact every simulation frame. Use distance attenuation for world ambience and reduce unnecessary audio while paused or hidden.

Music is optional for the prototype. For launch, use original or properly licensed instrumental tracks suited to skating; a small set of coherent tracks is sufficient. The player can independently mute music and still hear movement cues. Do not assume commercial tracks from the reference can be used. City ambience should be recognizable without caricature.

The browser audio system starts after Play or another explicit gesture. Handle suspended audio contexts and returning from a background tab. No external streaming-music service is required.

## 13. Three.js architecture

### Proposed stack

| Component | Choice | Responsibility |
| --- | --- | --- |
| Language | TypeScript | Typed game state, data schemas, maintainability |
| Build/dev server | Vite | Local development and relative-path static production build |
| Renderer | Three.js, WebGL2 | Scenes, materials, animation, lighting, render quality |
| Physics | Rapier JavaScript/WASM | Shape casts, contacts, collision queries, trigger queries |
| UI | HTML/CSS and small TypeScript view modules | Accessible menus, HUD, settings |
| Art interchange | glTF/GLB | Models, rigs, animation |
| Audio | Web Audio API, optionally through Three.js helpers | Positional audio and sound mixing |
| Save | IndexedDB, with guarded localStorage for small settings | Local progression and records |
| Unit/integration checks | Vitest | Simulation and progression logic |
| Browser checks | Playwright plus real hardware sessions | Loading, menus, saves, basic gameplay, errors |

Pin compatible versions when implementation begins and commit the lockfile. Verify WebGL2, WebAssembly loading, audio, gamepad, and iframe behavior in the first technical spike. Keep all runtime dependencies and assets inside the built game; avoid essential CDN requests. Do not require a backend, SharedArrayBuffer, cross-origin isolation, or WebGPU for launch.

### System boundaries

`Game` coordinates independent systems: input, fixed simulation, skater controller, trick recognition, scoring, camera, world streaming, event state, save state, audio, and UI. The HUD reads state; it does not own movement or scoring rules. Gameplay emits typed events such as `trickCompleted`, `comboBanked`, `checkpointPassed`, and `cityEntered`.

Separate the simulation from rendering enough to run scoring and controller scenarios without creating a WebGL canvas. Avoid a single source file containing the complete game.

Suggested source layout:

```text
src/
  app/          game lifecycle, menu state, configuration
  input/        actions, keyboard, gamepad, rebinding
  simulation/   fixed step, skater controller, collision helpers
  tricks/       recognition, grinds, manuals, score rules
  world/        chunks, city definitions, rails, triggers, recovery
  events/       sprint, jam, route objectives, medals
  render/       renderer, camera, lighting, effects, quality
  rider/        rig, animation, appearance
  audio/        mixing, movement sound, ambience
  persistence/  save schema, migrations, import/export
  ui/           screens, HUD, prompts, styles
  data/         event routes, rewards, tuning, asset manifest
public/assets/  distributable models, textures, audio, decoder files
tools/          map validation, asset checks, packaging helpers
tests/          simulation, integration, browser scenarios
```

This is a proposed structure; these directories and scripts do not yet exist.

### Controller states

Grounded → charging → airborne → landed/rough landing/bail, with explicit grind and manual states. Menu/pause, recovery, and unloaded-world transitions must interrupt safely. Record why each state transition occurs to make movement bugs diagnosable.

Use data-driven colliders, rails, spawn points, event routes, collectibles, and recovery volumes. A shared rail definition drives collision intent, visual placement, and scoring distance. Never derive gameplay solely from an artist's mesh name at runtime without validating it.

### Developer tools

Provide development-only overlays for frame time, active chunks, draw calls, position, velocity, grounded state, current rail, collision shapes, event checkpoints, and combo state. Include city/district spawn shortcuts and repeatable movement scenarios. Keep these out of the normal player flow.

## 14. Streaming a connected world of more than 4 km²

### Spatial structure

Start with 200 × 200 m authoring cells. Each 1.6 km square city contains 8 × 8 cells, or 64 cells; both cities contain 128 cells before connector cells. Empty padding is not playable area. A cell can reference shared geometry/materials rather than duplicate large assets.

Keep global position, player progression, event definitions, and a lightweight world manifest alive. Load detailed meshes, nearby collision, audio emitters, and collectibles only where needed. Unloading a district must not reset its medals or collected objects.

Use three levels of content:

1. Nearby gameplay: full colliders, rail paths, high-enough-detail geometry, interactive objects.
2. Approaching area: prefetched assets and reduced-detail meshes; upgrade before the rider arrives.
3. Distant view: inexpensive skyline/terrain silhouettes without detailed interiors or collision.

An initial low-quality budget is a 3 × 3 near-cell neighborhood, with prediction-based prefetch outside it; higher presets may retain a larger visual ring. Final radii depend on measured visibility and download times, not fixed assumptions. Hysteresis prevents repeated load/unload churn at cell edges. Reference-count shared assets and release GPU resources when their last user disappears.

### Seam rules

- No gaps, double collision walls, misaligned rail endpoints, or abrupt ground heights at boundaries.
- Load mandatory destination collision before allowing the rider to enter it.
- Include player speed and direction in prefetch priority.
- Connected rails and event checkpoints may cross cell boundaries; their state persists while relevant.
- Carry unbanked combos and active events through district and city boundaries.
- City lighting/ambience transitions interpolate by position; do not swap the scene abruptly.
- Fast travel waits for destination readiness before revealing and unpausing the rider.
- If a download fails, retry with a visible status and retain safe ground. Pause at a safe position if needed rather than allowing a fall through missing terrain.
- Cache reusable assets, but do not make service-worker offline support a launch dependency.

The goal is uninterrupted travel under the tested normal conditions. Do not promise zero loading pauses on every connection; validate cache-cold and throttled network cases explicitly.

### Map production method

Generate the road/path skeleton, terrain, and repeated modular placement from deterministic source data. Hand-author signature skate lines, landmarks, major crossings, and event routes. Use generation to achieve area and consistency, then edit for playability. A repeated asset library is acceptable; indistinguishable districts and long empty stretches are not.

Validate scale early with a full-footprint graybox. Check traversal time, sightlines, recovery, and streaming before spending months on finished buildings. Populate and finish one district at a time against shared content templates.

## 15. Performance and delivery targets

These are proposed acceptance targets that require benchmarking, not claims about current performance.

| Measure | Initial target |
| --- | --- |
| Main desktop experience | Approximately 60 fps at 1080p on an agreed representative desktop/laptop |
| Low preset | Playable 30 fps at reduced resolution on the chosen lower-end reference device |
| Hardware baseline | Establish real GPU, RAM, browser, and display resolution during the technical spike |
| Simulation | Fixed 60 Hz with bounded catch-up and render interpolation |
| First playable download | Aim for 25 MB or less compressed for boot plus initial district assets |
| Total release payload | Initial budget of 200 MB compressed; measure and revise with explicit tradeoffs |
| Active draw calls | Start with a budget near 200 in ordinary scenes; profile actual bottlenecks |
| Visible geometry | Aim below roughly 500k triangles in ordinary gameplay, adjusted by measured cost |
| Textures | Mainly 512–1024 px, with selective higher resolution for hero assets |
| Memory | Start with a combined working-set target below roughly 500 MB on the reference browser; measure CPU and GPU allocation separately where tools permit |
| Long-session stability | No sustained growth in retained resources across repeated full-world traversals |

Map dimensions do not require rendering every building at once. Use instancing, merged static batches, texture atlases, LODs, compressed assets, frustum/distance culling, a limited shadow distance, and restrained particles. Profile CPU simulation, draw submission, shader cost, downloads, parsing, and GPU uploads separately.

Disable expensive post-processing on the low preset. Render resolution can change independently of canvas UI text size. Keep main-thread stalls from asset parsing/upload visible in diagnostics and schedule heavy work before the rider reaches it.

Test at least one complete Gdańsk → connection → Riyadh → connection → Gdańsk loop after each major streaming change. A good frame rate in a stationary empty plaza does not validate the full world.

## 16. Saves and failure recovery

Save schema contains a version, settings, safe player location, discovered landmarks, collectible IDs, event results, unlocked/equipped cosmetics, and tutorial progress. Give every persistent world object a stable ID independent of its chunk load order.

Autosave after meaningful progress, settings changes, and safe intervals. Do not rely exclusively on tab-close handlers. Validate data on load and keep migrations when schemas change. Invalid positions fall back to a known safe spawn. Corrupt imported data must produce a clear error without overwriting a valid save.

Provide JSON export/import so players can back up progress or move browsers. Browser saves are device/browser specific and may be unavailable in restricted iframe/private contexts. If saving fails, continue in a clearly indicated session-only mode and offer export. Reset progress requires a confirmation inside the game.

No personal information or telemetry is necessary for launch. A crash report can be manually copied with game version, browser, quality settings, and non-sensitive diagnostics.

## 17. Production phases and exit gates

Build in this order. Each gate is demonstrated in a playable build or measurable artifact before proceeding. The final world scale remains a requirement throughout.

| Phase | Work | Exit gate |
| --- | --- | --- |
| 0. Reference and technical foundation | Review accessible reference footage; establish engine versions, build, input, renderer, Rapier loading, basic save support, and early itch.io packaging | Browser build runs from a nested path; reference observations and provisional mechanics are clearly distinguished |
| 1. Movement laboratory | Flat floor, slopes, curb, wall, small gap, one rail, placeholder rider, chase camera | Push, coast, steer, brake, jump, land, collide, reset; keyboard and gamepad can complete the course |
| 2. Trick systems | Spins, grabs, grind entry/exit, manual, combo bank/loss, basic feedback | A player can deliberately link and bank a jump → grind → manual; repeated input cannot farm points while stationary |
| 3. Full-size world skeleton | Both city envelopes, connector, main loops, 200 m chunk streaming, area measurement, prefetch/failure handling | Reachable area is at least 2 km² per city; skate both directions across the connection; repeat loops without collision holes or unbounded memory growth |
| 4. Gdańsk vertical slice | Finish one waterfront district with representative art, animation, audio, 3 events, 10 collectibles, save/load, HUD and pause | A new player can learn, explore, finish events, earn a reward, reload progress, and reach the neighboring streamed areas |
| 5. Complete Gdańsk | Finish the other five districts, 18 city events total, 60 city collectibles, 6 landmarks | Every route and reward works; full city meets area, density, camera, recovery, and performance checks |
| 6. Complete Riyadh and World Link | Finish six Riyadh districts, 18 events, 60 collectibles, 6 landmarks, connector art and atmosphere transitions | Full connected world is traversable; both directions, fast travel, saves, and effects work at city boundaries |
| 7. Content-complete alpha | Complete menus, 8 lessons, 12 rewards, final rider/animations, sound set, settings, credits, save export | No placeholder-dependent mandatory flow; launch content counts and progression coverage match the plan |
| 8. Beta and optimization | Human playtests, controller tuning, browser/device coverage, performance passes, streaming failures, licensing audit | No unresolved release-blocking defects; target hardware results and known minor issues are recorded |
| 9. Release candidate | Versioned production build, ZIP, page text, screenshots, cover, controls, changelog, draft itch.io upload | The uploaded build passes iframe, fullscreen, save, audio, controller, and whole-world smoke tests |
| 10. Publication and support | Confirm final title/page visibility with the user, publish, verify public page, archive build | Public game loads successfully; release artifact, source version, credits, and rollback path are retained |

Do not assign a reliable calendar from this document alone. Four square kilometers of polished explorable space plus a responsive skating system is a substantial indie production. Use the vertical slice and one finished district to measure actual content throughput, then estimate remaining art, routes, optimization, and testing. A first prototype can arrive far earlier than the finished two-city game.

## 18. First implementation backlog

These are the first tasks when the user asks to start implementation; this planning turn does not create the application.

1. Initialize Vite, TypeScript, Three.js, Rapier, version pins, package scripts, and a relative-path production build.
2. Add renderer initialization, resize handling, WebGL failure messaging, asset loading, and the game lifecycle.
3. Add action-based keyboard/gamepad input, focus handling, pause, and a fixed simulation loop.
4. Build the movement test course with meter-scale geometry and collision visualization.
5. Implement push/coast/steering/braking and slope response. Tune before adding visual effects.
6. Add charge jump, air motion, landing classification, wall collision, safe spawn/reset, and boundary recovery.
7. Add the chase camera, wall avoidance, mouse/gamepad look, and comfort settings.
8. Add a simple readable rider with visible inline skates and push/lean/jump poses.
9. Add one valid rail, attachment/exit rules, a manual, and a small completed-trick scorer.
10. Add a full-world graybox generator and manifest with the required dimensions, connected paths, and reachable-area report.
11. Add chunk activation, predictive preload, collider readiness, unloading, and repeat-traversal measurements.
12. Deliver a playable development build and a test report. Then refine the controller against the accessible video and user playtesting before broad content production.

Reference access is necessary to claim a close match, but it does not prevent bootstrapping the technical foundation or testing generic skating behavior. Record differences explicitly rather than guessing what happens in unseen footage.

## 19. Map and content acceptance checklists

### Per district

- Connected to the city network by at least two useful paths where geography permits.
- Meets its agreed area contribution without counting inaccessible background.
- Has an easy loop and at least one technical line with a reliable landing/reset.
- Landmark, materials, route shapes, and lighting distinguish it from neighboring districts.
- Three functioning events, ten collectibles, and one discovery landmark.
- Event restart points, checkpoint ordering, and medal thresholds tested.
- No mandatory blind jumps, hidden solid barriers, broken curbs, unreachable collectibles, or unavoidable camera clipping.
- Rail paths match the visible rails; collision supports every intended route.
- Shader/material/texture budgets checked on target quality presets.
- Re-entering after streaming unload preserves collected objects and event progress.

### Connected world

- At least 2 km² verified reachable horizontal coverage in each city, connector excluded.
- Both directions across the connection work under cold and warm asset-cache conditions.
- Shared coordinates and cell seams remain consistent for render, collision, events, and saves.
- Every district is reachable from a legal starting point.
- Last safe point never refers to unavailable collision without a readiness check.
- A long combo can cross district boundaries correctly.
- Map markers, travel, and saved positions resolve after reloading the browser.
- Skyline and ambience blend without changing the player's control rules unexpectedly.

## 20. Test plan

### Automated simulation/integration checks

Check movement consistency across rendering at 30, 60, and 120 fps while simulation stays fixed; wall collisions at maximum allowed speed; jump buffering/coyote behavior; slopes and edge transitions; valid/invalid rail attachments; leaving and re-entering grind; landing versus bail outcomes; score repetition limits; checkpoint ordering; medal thresholds; reward unlocks; stable collectible IDs; save migration and corrupt-data handling; chunk seam continuity; and world-area calculations.

Assertions must describe player-visible behavior rather than merely restating implementation formulas. Use deterministic input sequences and tolerances where physics is involved.

### Browser automation

Boot a production build; detect rendering and uncaught errors; use Play; move/jump/reset; pause/resume; complete a small test route; change settings; reload and verify persisted progress; switch input prompts; visit both city spawns; and exercise a representative chunk transition. Verify that intended scenarios actually executed.

Automation cannot decide whether carving feels enjoyable. Treat movement feel, camera comfort, art readability, and challenge fairness as human playtest gates.

### Manual coverage

Test current Chrome/Edge and Firefox on desktop, plus Safari/macOS before claiming Safari support. Cover the selected low-end device, keyboard-only play, standard controllers, controller disconnect/reconnect, tab blur, resize, fullscreen changes, blocked storage, throttled downloads, a failed chunk request, save import, and recovery from water/out-of-bounds.

Test the real itch.io iframe and a standalone browser tab. If mobile is unsupported, make the game page and small-screen message clear rather than showing unusable controls.

### Playtest questions

Can a new player reach an event without help? Do they understand why a grind attached? Can they predict where a jump lands? Does the camera expose the next turn? Can they recognize which city/district they are in? Are long travel routes enjoyable? Is there a dominant scoring exploit? Does any tutorial require unexplained controls?

Record observation, reproduction steps, severity, and the change to try. Repeat the relevant scenario after each change. Collect feedback before building all 36 events around unproven movement.

### Release blockers

Failure to start, repeated crashes, corrupted saves, missing mandatory assets, unsafe missing collision at stream boundaries, cities below the required reachable area, a broken city connection, unreachable mandatory content, event progress that cannot complete, broken supported controls, severe sustained performance failure on the agreed baseline, unlicensed distributed assets, or an itch.io build that cannot run.

Keep minor visual issues and optional enhancements separate. A known blocker is not fixed by describing it in the release notes.

## 21. itch.io packaging and publication

### Build preparation

Use Vite relative asset paths so the game works inside itch.io's hosted directory. Include JS, WASM, model, audio, texture, and decoder files needed at runtime. Test MIME and loading behavior in the actual hosted build. Do not depend on an absolute `/assets` URL, a local server, external font downloads, or a development-only asset endpoint.

Produce a clean versioned build and a ZIP containing the **contents** of the output folder, with `index.html` at the ZIP root. Exclude source caches, node_modules, secrets, test recordings, and unused original art files. Check current itch.io HTML5 upload limits and embedding options at release time rather than assuming them today.

### Project page package

Prepare the final public title, one-sentence pitch, short gameplay description, honest prototype/full-release status, controls, desktop browser requirements, save limitations, accessibility options, credits, version/changelog, cover image, screenshots from both cities and the connector, and an optional gameplay trailer. Use real game screenshots for gameplay claims.

Choose the HTML5/browser-game type, upload the ZIP, mark it playable in the browser, configure a responsive embed and optional fullscreen, and test an initially private/draft page where supported. Start with click-to-play so audio activation and loading are predictable.

### Upload with the assistant

The assistant can build the ZIP, prepare the page materials, validate assets, and use an available authenticated publishing route. If the account is not connected, the user can log in securely or upload the prepared ZIP in their browser. Never put itch.io passwords or API keys in chat, source code, or a release archive. Use existing authorized authentication when available. `butler` is an optional update workflow after checking the current HTML5 channel/file configuration.

Before the first public launch, confirm the actual account/project, title, pricing, and visibility with the user using the finished build and page as the review material. Do not publish an unfinished prototype as the complete planned game. The current task is planning; no upload or publication has occurred.

### Post-upload verification

From the uploaded artifact, test loading, audio activation, keyboard focus, gamepad input, pause/fullscreen, both city areas, the connection, checkpoints, rewards, save reload, settings, and credits. Inspect the browser for missing assets and runtime errors. Archive the exact ZIP, source revision, version, and checks used for that release.

## 22. Working together during development

The assistant handles project code, procedural grayboxes, controller and game systems, build scripts, data formats, test automation, technical documentation, packaging, and supported upload work. It can create placeholder and procedural art, but polished character animation, landmark modeling, soundtrack selection, and final movement tuning need iterative review and appropriate asset workflows.

The user supplies direction and playable feedback: which movement feels right, preferred visual style, whether routes are fun, and approval of final branding/publication. Optional purchased assets or commissioned work need an explicit budget decision. A connected account or user upload is needed for itch.io publication.

Work in playable increments. For each milestone, provide a build, a short account of what works, controls, measured test results, and the next decision. Do not ask for approval of routine local implementation choices already authorized by the build request.

Keep a task board with backlog, current milestone, verification, and done states. Track gameplay defects separately from new ideas. After content completion, new feature requests need an explicit release tradeoff so testing can converge.

## 23. Risks and planned responses

| Risk | Planned response |
| --- | --- |
| Reference video is inaccessible | Retain the supplied link; request accessible footage before claiming exact movement fidelity; continue independent technical work |
| Large maps feel empty | Establish route density, district identities, meaningful loops, 36 events and 120 deliberate collectibles; judge by traversal playtests |
| Large maps overwhelm browser memory | Spatial streaming, shared modular assets, LODs, release of GPU resources, long-loop profiling |
| Skating feels stiff or slippery | Spend early iterations on the movement lab and a real street; tune before content expansion |
| Rail snapping feels arbitrary | Explicit eligibility rules, visible rail geometry, generous but bounded assists, debug visualizations |
| Content production is slower than expected | Measure time per finished district, reuse tested modules, reduce decorative complexity before changing required area |
| Character art lags behind systems | Use readable placeholders early and make final rig/animation a tracked launch deliverable |
| Web embedding breaks storage or input | Test a hosted draft early; provide guarded saves, export, focus management, and optional fullscreen |
| Too many features delay release | Keep the defined launch scope; defer multiplayer, traffic, mobile, weather, and creator tools |

## 24. Completion checklist

- [ ] Gameplay reference reviewed when accessible; observed qualities recorded separately from proposed mechanics.
- [ ] Skating, camera, collisions, jumps, tricks, grinds, manuals, landing, and recovery are enjoyable and consistent.
- [ ] Gdańsk has at least 2 km² of verified reachable explorable area.
- [ ] Riyadh has at least 2 km² of verified reachable explorable area.
- [ ] A continuous playable connection joins both cities; fast travel is optional.
- [ ] All 12 districts, 36 events, 120 collectibles, 12 landmarks, and 12 cosmetic rewards meet their acceptance checks.
- [ ] Eight tutorials, menus, HUD, settings, remapping, audio, rider animation, and credits are complete.
- [ ] Saves, reloads, export/import, and storage-failure fallback work.
- [ ] The full world meets measured browser, memory, and performance requirements on the agreed devices.
- [ ] The real uploaded itch.io build passes its checks and has accurate page materials.
- [ ] The user approves the completed public release details and publication succeeds.
- [ ] Release artifacts and a rollback path are retained; post-launch defects have a reporting route.

No checklist item is marked complete merely by writing this plan. The next implementation milestone is the movement laboratory and technical foundation, followed by the full-size connected-world graybox.
