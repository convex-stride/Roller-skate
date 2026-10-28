# Layan's Skate

A playable Three.js inline-skating prototype connecting procedural Gdańsk and Riyadh.

## Windows and Android downloads (0.24)

`releases/layans-skate-0.24.0-windows-x64.zip`: extract the whole ZIP and run **Layans Skate.exe**. Keep its other files together. Windows 10/11 x64; **F11** toggles fullscreen. The portable preview is unsigned. Settings and progress stay in the app's Windows user profile.

`releases/layans-skate-0.24.0-android.apk`: install on Android 8.0 or newer with a current Android System WebView and OpenGL ES 3 support. Android may ask to allow installation from the browser/file manager used to open the APK. Touch controls support portrait and landscape. The app bundles the full game, uses no network permission, and works offline. App switching pauses play; the system Back action opens/closes game menus. Saves stay in the app's private WebView storage. Browser, Windows and Android saves are separate. Uninstalling clears app saves.

Both are preview builds, not Microsoft Store/Google Play releases. APK signatures and package metadata are checked during packaging. Windows serves the game at a stable private `layans://game/` origin; Android uses a virtual asset origin. Chromium checks the exact offline payload using equivalent secure origins (the cloud browser blocks direct file URLs and cannot register Electron protocols); this does not replace testing on physical Windows/Android devices.

Build the web game with `npm run package`, then `npm run package:windows` (downloads Electron 45.1.0) and `npm run package:android`. Native scripts require Node 22.12+, `zip` and `unzip`; Android also requires JDK 21 and `ANDROID_SDK_ROOT` pointing to an SDK with `platforms;android-35` and `build-tools;35.0.0` installed. No Gradle or remote runtime assets are needed. In proxy-only environments, use `ELECTRON_GET_USE_PROXY=1` for the Windows package command.

The Android build creates a stable local preview signing key in `.local-signing/`, which is ignored by git. Keep this key if you want future APKs to install over the existing app. For your own release key set `LAYANS_ANDROID_KEYSTORE`, `LAYANS_ANDROID_KEY_ALIAS` and `LAYANS_ANDROID_KEY_PASSWORD`. Do not commit keys or passwords. The optional **Download builds** GitHub Actions workflow builds these packages on demand; its preview-key cache is separate from your local key and is not a durable release signing setup.

## Museums, green parks and street flow courts (0.24)

The map now has **Art museums**, **Green parks** and **Street stunts** filters. There are 34 small fictional art pavilions (21 Gdańsk, 13 Riyadh), 32 marked green parks and 30 marked flow courts. Many more garden patches and skate obstacles fill the surrounding streamed courts. Gdańsk galleries use Baltic brick and cool timber; Riyadh galleries use warm plaster and shaded courtyard roofs. Gallery interiors and eight-metre doorways share their visible wall geometry with collision and navigation, while existing quest entrances and original bank locations remain open.

Every pavilion displays five genuine public-domain artworks: Van Gogh’s *The Starry Night* (a cropped detail), Hokusai’s *The Great Wave off Kanagawa*, Kandinsky’s *Composition VII*, Munch’s *The Scream*, and Picabia’s *Udnie*. Approach a gallery and choose **View paintings** for the full image, title, artist and notes; Back to skating or Escape resumes play. The viewer supports phone portrait/landscape and keyboard focus. Reproductions, credits and labels are bundled offline; source details are in `src/assets/art/README.md` and `public/ARTWORK_CREDITS.txt`.

Green spaces have lawns, crossing paths, trees and existing seating/planting. Street courts add closed, physically colliding curved quarter pipes and two-sided funboxes alongside the original banks and grind rails. Their visible and collision meshes use the same profile. Map routes and Taqee avoid their obstacle footprints.

Uncovered NPCs now have layered crops, curls, bobs, braided napes and swept waves beneath their helmets, with lighter instanced hair at a distance. Taqee has dark swept locks and a tapered nape. Layan retains her hijab and pirate-style bandana under her helmet; all protective equipment remains in place.

## Smoother frame pacing (0.24)

Auto graphics now adjusts resolution gradually after sustained slow frames and restores detail only after a long stable interval. It ignores startup/streaming spikes, uses a bounded scale, lowers crowd detail and turns off shadows under pressure, and leaves manual settings alone. Applying settings resets adaptation. The HUD updates at 20 Hz and minimap at 10 Hz while physics remains fixed at 60 Hz with interpolated positions. Rail arrays are cached until world geometry changes, repeated help HTML is reused, inactive touch controls stop resetting every frame, and hidden apps stop rendering. These changes reduce avoidable work; frame rate still depends on the device, graphics settings and nearby scenery.

Distant NPC helmets and all six guards use simpler meshes with matching bounds: 708 triangles per rider instead of 7,124, a reduction of about 90%. Nearby protective equipment keeps its detailed geometry. Distant hair also uses fewer subdivisions. These changes reduce crowded-scene geometry without removing helmets or guards; they are not a measured frame-rate guarantee.

`npm run test:all` runs the unit suite and every browser smoke script sequentially against the production preview on port 4173. It writes each log and `results.json` under `test-results/full-suite`. Set `TEST_ONLY=unit,rails-smoke` to rerun specific suites. The long quest/companion/race flows accept `PHYSICS_TEST_DPR` (the runner uses 0.5) to lower rendering cost while preserving their viewport, physical movement, checkpoints and assertions; normal layout/visual suites retain their configured density. Browser tests use Chromium's software renderer in this cloud environment, so their frame rates are not a hardware performance benchmark.

## Run

Requires Node.js 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev
```

Open the address printed by Vite in a desktop browser with WebGL2 enabled.

```sh
npm test
npm run build
npm run preview
```

The production build uses relative asset paths for itch.io. ZIP the contents of `dist`, with `index.html` at the archive root, and upload as an HTML5 game. Publication has not been performed.

For a self-contained HTML build and an updated itch.io ZIP, run `npm run package` (requires the `zip` utility). This writes `releases/Layans-Skate-Railflow.html` and older HTML filename aliases, with JavaScript, styles, physics WASM, rider mesh, and license notices embedded, plus `releases/layans-skate-v0.24.zip`. The HTML version is suitable for hosts that preview individual files. If a chat viewer itself fails, download that HTML and open it in a compatible desktop browser instead.

Embedded previews may deny controller access through Permissions Policy. The game detects that restriction and keeps keyboard controls working; it also supports session-only play when sandboxed storage is unavailable. `npm run test:embed`, against the production preview on port 4173, verifies keyboard movement and pause in both a restricted iframe and an opaque single-file sandbox. The exact chat application's visualization wrapper is not accessible from this repository.

## Rail flow, shuffled starts and ride presentation

Version 0.23 fixes grinds slowing to zero while the rider remains locked on the rail. Rail momentum is stored independently of transient contact velocity, friction is lower, and **W / Up** (or the phone stick) adds assisted speed. Slow aligned catches work when Push or Rail assist is held; fast perpendicular approaches still do not catch. Backward grinds keep their direction. A blocked grind releases after a short stall, and scoring counts actual travel rather than requested motion. **Space / JUMP** pops off; **S / Brake** exits. Rail assistance is a game mechanic rather than a full simulation of pumping on a real rail.

The grind display shows style, actual distance, progress along the rail and remaining distance. Small contact particles follow the skates; reduced motion hides them. On phone, the main stunt button becomes **Royale** while grinding, and returns to Backflip or Figure afterwards. Pause → **Practise rails** takes Layan to a clear approach in the current city, for a repeatable practice route.

Free-skate sessions and city quick travel now use a shuffled bag of curated landmark viewpoints and street locations. Every selected spot has a clear run-out, and locations do not repeat within a bag. The last choice is remembered so reloading avoids the same start. **Shuffle start** in the lobby previews another location; returning to the lobby also chooses a fresh start. Arrival titles introduce the area. Resume keeps the current location; recovery, races, quests, chosen map destinations and practice approaches retain their defined locations.

`npm run test:rails` checks shuffled starts/reload, both practice approaches, real jump-on-rail catches, moving royale grinds, pop-outs and stunt landings. `npm run test:phone-rails` checks the same core controls with multi-touch, contextual Royale, the grind display and phone layouts. Rapier regressions cover slow catches, backward motion, pumping and blocked rails, and spawn tests check clear ground and run-outs.

## Movement polish, variety and love fireworks

Version 0.22 fixes gameplay input losing WASD after clicking a button, manual jumps overlapping assisted ice takeoffs, abrupt transitions into the next figure pose, twizzles unwinding after completion, and duplicate generic spin awards on named figure jumps. Duet controls wait for Taqee to finish before starting the next element. The completed-round clock now shows elapsed time.

The follow camera ignores other riders as obstacles while retaining wall avoidance, and follows jump height more gently. Foot probes ignore other dynamic riders as ground. Shared instance batches are split into 200 m cells so offscreen scenery from the other city can be culled. City detail builds over several short steps instead of constructing a complete chunk during one moving frame, and appears once batched. Nearby detailed NPCs use quality budgets (desktop 4/8/12, phone 2/4/6 for Low/Balanced/High); surrounding residents continue their routines using instanced models. Automatic quality can reduce both resolution and NPC detail. These changes reduce workload and camera jolts; browser checks use software graphics and do not certify a frame rate on every device.

**Four extra figure moves:** **U** single loop, **O** single Lutz, **Y** travelling twizzles, **−** Ina Bauer. The Figure menu includes all 12 moves on desktop and phone. Different jump preparations, changing arm positions, distinct inline flip tucks and checked exits give moves different silhouettes. Replaying a routine or duet changes its required elements, and neon gate layouts vary. Repeating the same scored move loses freshness; banking three distinct elements adds a variety bonus. Recovery and bails clear the current style chain.

To enable night, **Pause → Switch to night → Keep skating**, or use **Settings → Graphics → Night mode → Apply**. This choice is saved. Across both cities and World Link, night skies have pink, gold, teal and violet heart/ring/starburst fireworks and glowing world-space messages reading **I LOVE YOU LAYAN**. Fireworks use one bounded particle draw, eight launch sites on desktop or four on phone, and no extra lights. Buildings and arena roofs occlude them. Reduced motion replaces launches and bursts with stationary sky messages; daylight hides the whole show.

`npm run test:polish` checks gameplay-button keyboard focus, Taqee camera spacing, rendering budgets, the new figure moves, varied replays, saved night shortcuts/fireworks in both cities, reduced motion and phone layouts. `npm run test:flow` checks jumping, trick landing and continuous skating across a city chunk boundary. Unit tests cover the movement regressions, all 12 moves in Rapier, varied programs, style scoring and bounded fireworks geometry.

## Figure moves and arena games

Version 0.21 introduced eight assisted figure-skating moves at every ice arena. Open **Map → Ice arenas**, travel to a rink, then choose **Moves & games** or press **I**. On phone, the primary Backflip button becomes **Figure** while on ice; inline flips remain in **More**. Tap a move to begin its assisted entry, and brake to cancel. Leave room on the ice for travelling moves.

| Keys | Moves |
| --- | --- |
| 5 / 6 / 7 | Upright, sit and camel spins |
| 8 / 9 | Spiral and spread-eagle glides |
| 0 / L / K | Single Axel, single Salchow and single toe loop |

The moves animate the rider's arms, legs and torso, with a preparation, performance and exit. Spins slow the skater before rotating; glides need sustained momentum; jumps use the existing Rapier gravity, contact, takeoff and landing calculation with assisted rotation. Completed moves feed the combo system, and interrupted moves do not receive the figure bonus. These are accessible game interpretations with assisted entries and game scoring, rather than an official competition judging simulation.

**Games** offers three activities in all six arenas:

- **Spotlight routine:** perform four elements in order under a moving pool of light. Programs vary by arena.
- **Neon ribbon run:** skate through eight ordered glowing gates, follow the next gate on the minimap, and draw a cyan trail across the ice.
- **Taqee mirror duet:** Taqee enters pairs mode and mirrors the figure poses. Both skaters must finish each matching element within 2.5 seconds of each other and stay within 12 metres.

Timed rounds award bronze, silver or gold medals and a completion bonus with a confetti celebration. The **Medals** tab tracks 18 arena records; best score, fastest completion and highest medal persist alongside existing saves and export/import. New arena medals also count toward jacket unlocks. **Perform element** on the challenge card (or **Move** on phone) runs the next required move. **Free skate** leaves a round, and **Play again** restarts it.

`npm run test:figures` drives all eight keyboard moves, a complete routine and mirror duet, medal reload, neon gates and phone controls/layouts in Chromium. Unit tests exercise every move in Rapier, failed/cancelled moves, ordered gates, paired timing and stored-record validation.

## Mall ice arenas and Taqee pairs skating

Version 0.20 adds six indoor ice arenas. Open **Map → Ice arenas**, select a venue, and use **Travel here** or **Fast travel** to visit. **Guide me** routes through the mall entrance to the ice instead of teleporting. The minimap and world map show the arenas in ice blue.

| Gdańsk · four venues | Riyadh · two venues |
| --- | --- |
| Baltic Galleria Ice Arena | Olaya Mall Ice Arena |
| Oliwa Winter Pavilion | Palm Galleria Ice Stadium |
| Motława Mall Ice Hall | |
| Shipyard Centre Ice Stadium | |

Each venue has a 30 × 60 m ice sheet with rounded corners and rink markings, protective boards and glass, tiered stadium seating, a roof with light strips, and mall shop fronts for skate hire, cafés and lockers. Local skaters circulate on the ice; spectators and vendors occupy the concourse. Shop fronts and seating are simplified set dressing. These are fictional venues, rather than claims about real malls or rink addresses.

Layan automatically switches from wheels to visible ice blades on the ice and back to inline skates in the concourse. Taqee and nearby skaters use blades too. Ice uses lower rolling resistance, reduced lateral edge grip and controlled braking in the existing fixed-step Rapier model. Shared collision/navigation geometry keeps boards and seating solid while leaving wide entrances open. Existing quests, streets, landmarks and skate parks remain accessible; all 128 quest definitions retain their positions and objectives.

Tap **Skate with Taqee** on the arena card to call him onto the ice in **pairs** mode. He tracks a position beside Layan, matches her pace and joins jumps; he returns to following through the mall when she leaves the ice. The companion panel also has **Ice skating partner**. On phone the nearby **Partner** action calls him too. **Mall entrance** returns Layan to the venue entrance so she can skate into it from the street. Helmets, pads, Layan’s hijab and bandana remain equipped.

A small indoor light budget keeps arenas lit in daylight and Night mode. Only nearby arena art renders; riding collision remains present. `npm run test:ice` checks all six destinations, physical entry, automatic skate changes, actual Taqee movement/jumps and phone skating in both cities at night. Unit tests exercise ice gliding/braking, rink collision, navigation entrances and pairs following.

## Night skating

Open **Settings → Graphics → Night mode**, then **Apply changes**. Settings are available from the lobby and pause menu on desktop and phone. The toggle previews immediately; leaving without Apply restores the saved setting. Night mode stays enabled after reload. Older saves start in daylight, and Restore defaults returns to daylight.

Version 0.19 adds a moon and star field, cool moonlight, separate night reflections, lit window patterns and warm street lamps along the roads, Gdańsk quay and Riyadh heritage square. Ground light pools use one instanced draw; only the nearest four lamps use real point lights on desktop, or two on phone, without extra shadow maps. Lamps belong to their streamed district, and nearby illumination updates after travel. Parks and routes remain playable. This is a manual day/night choice, not a simulated clock or NPC day/night schedule.

`npm run test:night` checks preview/discard, Apply and reload, lighting in both cities, readable night ground, daylight restoration, skating and phone controls/light budgets in a browser.

## City graphics and landmarks

Version 0.18 adds St. Mary’s Basilica in Gdańsk and PIF Tower in Riyadh’s KAFD, bringing the landmark map to ten destinations. **Map → Landmarks → Explore** selects one; choose **Travel here** or enable **Fast travel** to visit. Arrivals face the landmark, with the two new tall buildings viewed from a clearer distance. The skate-park suggestion card appears near parks and during sessions, leaving landmark views clear. Drag the scene to look around and up.

Brick, plaster, roof tiles, timber, stone and paving now use shared procedural textures projected in world metres, with surface relief, roughness variation and weathering. Prefiltered outdoor reflection panoramas give glazing and metal a sky reflection; they do not mirror live nearby objects. The Baltic canal has animated ripples, trees use cutout leaf sprays, merchant houses have plaster gables and detailed doors, and Riyadh's modern façades have fins and stone podiums. Road edges have stone curbs and flush drain grates. The two cities retain different skies, materials and architecture. Roofs, foliage and repeated landmark parts are instanced; automatic phone quality keeps reduced resolution and disables shadow maps.

These remain authored, simplified interpretations in fictional connected city layouts, rather than surveyed reconstructions or photogrammetry. See [CITY_ACCURACY.md](CITY_ACCURACY.md). The new footprints preserve all existing 128 quest definitions. `npm run test:cities` checks every landmark arrival, live lit-pixel output (including the reflection black-screen regression), and phone rendering in both cities. Browser checks use software WebGL; they do not substitute for performance testing on actual phones.

## Controls

**1 / 2 / 3 / 4** perform a frontflip / backflip / left side flip / right side flip. A flip tap automatically hops from flat ground or pops out of a grind. Hold **Space** for height and **Shift** for a crouched takeoff; tap the same flip twice for a double when you have enough airtime. Add **Z/C** spins and **F/X/V/B** grabs/tweaks to build a larger combo. Controller D-pad up/down/left/right selects the same four flips. On phone, **Backflip** is on the main controls; **More** contains front/side flips and Tweak. Hold JUMP for more height. A single flip is accessible from flat ground; doubles generally require a bank or elevated takeoff. **Map → Flip challenges** finds the new courts; **Ride bank** places Layan at that court's approach.

The rider is **Layan**. Press **P**, or tap **Call Taqee**, to summon her partner onto nearby clear ground. His panel offers Come here, Follow me, Lead the way, Practise tricks, Cheer me on, Wait here, Race me, Find a quest and See you later. He stays until dismissed, returns after travel in follow/guide modes, and remains in place in Wait mode. Active companionship restores after reloading; he resumes in Follow mode. On a quest, **Lead the way** follows each objective and the return to the giver. **Find a quest** chooses the nearest unfinished job. He waits when Layan falls behind. This is local game AI with the listed commands; no account or online chat service is needed.

**Map → Guide me** is the default: select a destination from the list or tap its marker, then choose **Follow route** or **Ask Taqee to lead**. Selection draws a route without moving Layan. A mint line on the ground and the minimap mark the route; the blue marker identifies Taqee. **Fast travel** switches list selections to visiting/starting the destination immediately; the selected-place card also has **Travel here**. **Both cities / Gdańsk / Riyadh** change the map view, and search finds named quests, parks and landmarks. Gold quest diamonds show all available jobs; completed jobs turn green. Press **J** to open the full quest list.

Open **Map → Quests**, or press **J**, to find neighbourhood jobs. Visit a gold quest marker and accept from the giver. Follow objective markers on the minimap, slow below 2.5 m/s and get within 5 m, then press **Enter**, controller **Y** or tap **Interact**. Delivery jobs have three ordered hand-offs and a 180-second clock; supply crates can be recovered in any order; discovery jobs reveal field notes; skate demos require 300 newly banked points within 55 m. Return to the giver to claim the reward. Accepting a different quest replaces the active one. Quests suspend while racing or riding a timed session; pause and maps freeze the clock. Abandon or retry through the quest card.

Version 0.12 adds four street races. Open **Map → Race:**, choose the featured race in the lobby, or skate inside a checkered start ring and press **Enter / controller Y** or tap **Join race** / **Race** on phone. Hold W/up or the thumbstick after the three-second countdown. Follow the bright checkpoint rings in order; Shift/crouch reduces drag on straights. **R**, **Reset** or **Restart race** restarts at the grid. **Leave race** returns to free skating. Pause freezes the countdown and race clock. Visiting another destination ends the current race.

Version 0.10 adds automatic phone/tablet touch controls. The left thumbstick pushes, turns and brakes; hold **JUMP** for height while another finger taps **180**, **Grab** or **Tweak**. **More** exposes spread eagle, stalefish, crouch, manual, slide and rail assist. Drag an empty part of the scene to look. **Pause**, **Map**, **Reset** and **Ride** are touch buttons. Fullscreen is offered where the browser supports it. Portrait and landscape layouts respect safe areas, and pause, interrupted touches and rotation release held inputs. Auto graphics disables mobile shadows and caps pixel density; manual graphics settings remain available. Keyboard/gamepad controls are retained. Touch controls remain available when the visual HUD is disabled.

For phone access through itch.io, upload the packaged ZIP as HTML5, enable mobile-friendly play and fullscreen in the itch.io embed settings, then open the hosted page in a modern WebGL2 browser. This repository does not publish a live hosting URL. Phone controls have been checked through Chromium touch emulation, not on physical iOS/Android hardware.

Version 0.3 introduces a full-screen sports-game lobby with a cinematic rider view, destination previews, a featured sprint, wardrobe swatches, and a redesigned pause menu. Settings are available from both the lobby and pause menu. Five tabs cover graphics, audio, camera/controls, accessibility, and saves/credits. Changes preview immediately; **Apply changes** saves them, while **Discard & back** or Escape restores the last applied preferences. Keyboard Tab/Shift+Tab navigate menus; arrow keys switch settings tabs and adjust focused sliders. The gamepad Menu button starts/resumes play or closes settings. Directional gamepad navigation of menus is not implemented.

Graphics options affect actual render resolution, shadows, camera field of view, and exposure. Audio options control rolling sound and volume. Look sensitivity, vertical inversion, controller dead zone, auto-centering, and dynamic camera options affect gameplay. Accessibility options cover reduced camera motion, HUD scale/visibility, and stronger UI contrast. Preferences persist separately under `between-cities-settings-v1` and fall back to session-only operation in restricted previews. Progress export/import continues to cover game progress; preferences stay with the browser.

WASD/arrows push, brake, and carve. **Press Space to jump immediately; hold briefly for the full height.** Shift crouches; land a descending jump along a rail to auto-catch and stay supported. E widens the catch assist, Space pops off, S releases, and the end of the rail releases naturally. Hold Q to manual, G to powerslide. **Tap Z/C for a left/right 180; tap again for 360. Tap F for a safety grab, X for a mute tweak, V for a spread eagle or B for a stalefish grab. On rails, F selects a soul grind and X a royale.** Trick taps can be combined with the jump. Drag the mouse to look. Enter starts nearby events; H opens controls; M opens the world map; R recovers; Escape pauses. Standard gamepads are also supported; see the in-game controls screen.

Walkthrough: press Play and hold W toward the rail ahead. Hold Space as you reach the pale takeoff stripes, land along the rail, then tap X to try a royale grind. Pop off near its end with Space and tap V for a spread eagle. Open M to select a landmark or challenge, or follow the map toward the other city. Both cities connect through the central corridor without a level-select requirement.

Version 0.4 adds a heading-up local minimap with nearby building footprints, parks, paths, rails, tokens, event markers, north indicator, and a metric scale. Use its +/− buttons to zoom. Open M and click a clear street or plaza to place a waypoint; A* routing accounts for building footprints and the canal bridge. The waypoint clears on arrival. Small street props still need player steering. Event checkpoints also become navigation targets while an event is active.

## Physical model

Rapier simulates a 75 kg capsule under gravity at 9.81 m/s². A fixed 60 Hz simulation applies forward push forces, quadratic aerodynamic drag, rolling resistance, directional skate grip, and braking impulses. Rapier resolves contacts, ramps, walls, and gravity. Continuous collision detection protects fast movement. Jumping uses a mass-scaled impulse; rail riding uses an assisted constrained path. Rendering and rider animation follow the physics body.

Alternating push strokes use a 600 W power envelope and bounded force, friction-limited turning, centrifugal lean, and preserved horizontal momentum in the air. Tucking lowers aerodynamic drag. Version 0.6 takes off on press at 4.8 m/s vertically (5.2 while crouched), with an early release cutting upward speed for a smaller hop. Inputs have a 180 ms landing buffer and 100 ms coyote window. Input edges survive render frames without a physics step. One-tap spins target multiples of 180° at a bounded rotation rate; this assistance is a game mechanic. Landing alignment and impact speed control speed loss, compression, and a short bail recovery. Grinds lose speed rather than adding motor-like forward velocity. Physics positions interpolate for rendering between fixed steps.

The rider is a 9,546-vertex clothed anatomical mesh built from CC0 MakeHuman core asset data, with generated skin weights, skeleton, vertex-colored athletic clothing, facial geometry and eyes, and detailed four-wheel skates. Version 0.5 gives the rider a fair skin tone, fitted charcoal hijab covering the scalp/ears/neck, and a burgundy paisley bandana tied over the hijab with cloth tails. The headwear replaces the earlier helmet and follows the head bone; the bandana tails move subtly with skating. Wardrobe now frames the upper body more closely for inspection. Procedural two-bone IK controls knees and elbows, places feet against nearby ground, and blends leaning, push strokes, crouches, and landing compression. Rails have round metal tubes and supports; a soft contact shadow keeps the rider visually grounded even on low graphics. This is not a photorealistic character or a complete motion-capture animation set.

Version 0.7 replaces the flared scarf cone with a thin cloth surface fitted to the anatomical neck and shoulders, using the rider's skeleton and skin weights. A rounded loft covers the scalp with smooth normals, fine woven texture, subtle cloth sheen and a closer face opening. The wider weathered burgundy bandana is projected onto that hood, with soft creases, a side knot and unequal tapered pirate-style tails. Fair skin is retained; subtle lip, cheek and brow tones and eye pupils improve facial definition. Open **Rider → Inspect headwear** to zoom in and use **Turn rider** for front, profile and rear views. The cloth uses procedural geometry and animation, rather than a full cloth simulation.

Three lateral support probes and smoothed ground normals, surface-dependent rolling/grip on stone/asphalt/limestone, gradual brake pressure, smoothed residual landing rotation, and finite manuals support the controller. Travel resets ground/contact and pending input state. Version 0.6 adds powerslides, latched grab/tweak poses, blended aerial leg poses, and immediate HUD trick feedback.

This is a game-oriented physical model, not a biomechanics simulator. Lateral grip, jumping, grind assistance, spins, and the 16 m/s safety cap are deliberately tunable. The supplied YouTube reference could not be viewed due to network restrictions, so exact gameplay fidelity is unverified.

## World and content

Version 0.17 adds four flip directions, repeat-tap doubles and combinations with spins/grabs. Aerial pitch and roll rotate the whole rider around her hips, including her helmet, hijab, bandana, pads and skates. The camera stays upright, and the ground shadow follows the physical capsule. The aerial rotation is assisted game control; the ballistic trajectory, bank contacts, takeoff impulse, momentum and landing impacts still use Rapier. Incomplete rotations can bail and clear the combo. Successful flips award 450 points per revolution, with a 75-point perfect-landing bonus when alignment and impact allow it. Points feed the existing combo multiplier and banked score. Taqee can join flips and uses them in practice mode.

Version 0.17 introduced **679 skateable street banks** (675 remain after reserving the new landmark footprints in version 0.18) in full-size off-street activity courts. The visible closed wedge and its collision use identical triangulation. New courts fill more space near the starting districts, with streets, race corridors, landmarks, heritage spaces, skate parks and central arrival facilities reserved. Existing quest locations are retained. More banks make the neighbourhood courts places to ride and link tricks, alongside gardens, markets, stages and rails; these remain modular fictional spaces.

Thirty-two **flip-showcase quests** bring the total to **128 local quests (64 per city)** and 186 ordinary challenges. Each showcase requires two new, different flip styles landed within 55 m of the giver, followed by a return hand-in for 240 XP. Repeating one style, old landings, distant flips or bails do not advance the task. Progress saves with existing quests, including after a reload. The map has a dedicated **Flip challenges** filter, and each new court has a bank-approach shortcut. Four residents per new quest court add walking/social/spectator routines under the existing nearby NPC budget.

Version 0.16 equips **Layan, Taqee and every resident, quest giver and racer** with a vented skate helmet, foam liner/chin straps, and paired knee, elbow and wrist guards. Layan retains her fitted hijab and pirate bandana beneath a larger helmet shell. All characters use fair skin tones. Detailed guards attach to the existing animated joints; distant NPCs have instanced helmets and pads so they retain the equipment when changing detail levels. The equipment is visual and does not change the skating physics or add an injury system.

Version 0.15 names the rider Layan and adds Taqee as a persistent, callable companion. Taqee uses a separate 75 kg Rapier skater with the same push, grip, gravity and jump model as Layan; nearby anatomical animation includes skating, jumping, spins/grabs and celebrations. He has a blue jacket/cap, a taller silhouette, a name label and a map marker. Ground clearance, route planning and forward collider probes guide his movement. Calling him or traveling far in Follow/Guide mode brings him to nearby clear ground. Complex obstacles can still require recalling him; full character intelligence and motion capture remain future work.

**Race me** starts a one-on-one Layan vs Taqee race on the nearest existing city race course. Both have a countdown, ordered checkpoints, standings and saved results. Duet results, wins and best times are separate from the four-rider race records. Leaving/restarting a duet works normally; changing Taqee's role ends the duet. During other races his companion body is suspended so there is no duplicate partner on the track.

There are now **96 local quests, 48 per city**, retaining the original 32 IDs and adding 64 jobs at other courts in each district. New jobs include festival setup, community repair, market breakfast deliveries, missing event kit, hidden-court discoveries and skate showcases. Each quest has a labeled physical board and an activity circle. Four additional residents per quest court have walking, social or spectator routines, subject to the existing nearby render/simulation budget. These residents populate outer neighbourhoods as well as the arrivals. The ordinary challenge count is now 154; partner races have their own records.

Version 0.14 fills suitable off-street lots with workshop yards, community gardens, sculpture courts, festival stages, souq stalls and palm oases: 1,603 full courts and 989 smaller tree-and-bench pockets generated across both cities. Large courts have usable central paths, grind rails or stages, benches, planting and market displays. Gdańsk uses harbour materials and Baltic trees, while Riyadh uses warmer paving, fabric displays and palms. Placement reserves streets, building footprints, landmarks, arrivals, existing skate parks and race corridors. Some clearance remains around these protected spaces; the modular districts are fictional rather than surveyed city blocks.

Thirty-two local quests, sixteen per city, add deliveries, supply recovery, neighbourhood field notes and courtyard skate demos. Nearby givers use animated resident models. Gold map diamonds mark available jobs and green diamonds mark completed ones. Objectives receive world beacons and minimap routes that check the full segments between navigation nodes against solid scenery. Completion awards saved XP and counts toward jacket colours; replaying a finished job does not award XP twice. Active objectives, collected supplies and delivery time save with regular progress, including import/export. There are now 90 challenges overall.

Version 0.13 renames the game **Layan's Skate** and expands it to fourteen skate parks, seven in each city. Gdańsk adds Baltic Flow, Stocznia Street, Oliwa Vert, Brickline Courts, Island Transfer and Canal Pocket. Riyadh adds Wadi Flow, Najdi Lines, Palm Halfpipe, Dune Transfer, Olaya Plaza and Desert Wave. Dockyard Sessions and Sky Garden remain. Layouts include street banks/manual pads/stairs/rails, pump rollers, curved quarter pipes and transfer gaps. Curved surfaces and their side panels have Rapier triangle-mesh collision. New parks have timed trick sessions, for eighteen total park sessions and 58 challenges overall.

Open **Map → Skate parks → Park:** to visit a park in free skate. The map shows each park's footprint and entrance. Riding into a park also suggests that park's session on the HUD. The map filters let you switch between parks, races, sessions, landmarks and events. Nearby parks render in detail while distant parks are hidden; their riding collision stays available. Existing progress and preferences keep their legacy browser storage keys so the rename preserves saves.

Version 0.12 adds **Motława Dash** at the quay, **Olaya Boulevard Sprint**, **Dockyard Circuit** and **Sky Garden Circuit**. The circuits have two laps. Three AI rivals use the same 75 kg Rapier skater controller, 600 W push model, surface grip, drag and braking as the player; they steer through checkpoints and slow for corners. Rivals have anatomical crowd models, live positions on the minimap and a standings panel. Finish times use the fixed simulation step; close finishes interpolate crossing of the same finish plane across all lanes. Checkpoints must be passed in order; the finish line counts on wheels or during a normal jump. Races have a time limit and can be restarted or left at any time.

Best race times, the latest finishing position and win counts persist in the regular save, alongside existing event records. Completing a different race contributes to jacket unlocks. The map flags and permanent checkered arches mark the race locations in free skating. These are single-player races against local AI. The original 36 events and six stunt sessions remain available, for 46 total challenges.

Version 0.11 replaces the twelve looping pedestrian capsules with a resident director. Authored skating, walking, café, market and spectator routes populate the Motława quay, Deera/Masmak square, Olaya pavements and both stunt venues. Ambient residents also populate other neighborhoods as you explore. Residents push and coast, walk, pause to talk or check a phone, serve coffee and cheer nearby landed tricks. Steering uses building/canal clearance, actual collider probes, separation from other residents and the player's predicted path. Their motion interpolates between AI updates. They use steering rather than physical body collisions, so very dense groups can still intersect.

Nearby NPCs share the anatomical rider mesh with independently articulated knees, elbows, feet and hands, varied clothing/skin colours, headwear, shoes/skates, phones and cups. Distant people use instanced articulated silhouettes. The render budget is 84 residents with up to 20 detailed characters on desktop, or 44/10 on touch devices. Only nearby residents are simulated; this is not a continuous simulation of every person across 4 km². Café terraces, a coffee kiosk, books, bicycles, coffee service and market displays give groups visible destinations.

Press **N** or tap **Ride with [name]** in the spot card to invite a nearby local skater for 45 seconds. Lead the route; the companion follows with an offset, avoids obstacles and reacts to tricks. Tap the button again to end the ride. Traveling far away also ends it. Companions are local AI residents in the single-player world. The phone invite button is shown during free skating.

Version 0.10 adds **Dockyard Sessions** in Gdańsk and **Sky Garden** in Riyadh. Both are accessible from the world map, the on-screen spot card, or **T** on keyboard. Each has a physical ramp-to-roof jump course, a slalom past a moving maintenance cart, and a 45-second trick session: six new challenges alongside the original 36 events. Cargo containers, a crane gantry, pennants, palm shade structures and lanterns distinguish the two venues. Elevated decks and landings have persistent colliders; moving carts use Rapier kinematic bodies. These are fictional recreational spaces, not real-city reconstructions.

Runs have ordered checkpoints, time limits, bronze/silver/gold results, quick retries and saved best records. Roof runs require a jump and a grounded finish; gates validate height so skating underneath a roof does not count. Trick parties require 300 newly banked points, with 600/1200 for silver/gold. Each different completed event or spot earns progress toward a jacket colour, unlocked every two completions. **End run** leaves the spot available for free skating; **Try another** switches challenges.

Version 0.9 starts Gdańsk along the Motława waterfront, facing a quay rail and the river, and Riyadh in a limestone heritage square facing Masmak with Souq Al Zal-inspired shop arcades. Each has its own clear approach, practice rail, heading and backdrop. Neptune’s Fountain (bronze figure, trident and basin) and Deera Clock Tower join the landmark destinations. These are handcrafted, compressed interpretations of real city features, not surveyed replicas.

Version 0.8 gives each city its own setting: Gdańsk has cool Baltic daylight, grey stone paving, a street opening toward the quay and a shipyard crane skyline. Riyadh has warm dusty daylight, a dry inland horizon, sandstone souq arcades and low heritage quarters outside the modern central corridor. Riyadh's arrival has asymmetric low and high building fronts and shaded seating bays instead of the shared café umbrellas. Heritage arcade piers are included in navigation clearance. The connected city dimensions remain 1,600 × 1,600 m each. These are stylized architectural interpretations, not surveyed street replicas.

Each city occupies 1,600 × 1,600 m. City floors total 5.12 km² gross, with a separate 400 × 300 m connector. Building footprints are checked to leave more than 2 km² per city; full reachable-surface/navigation certification remains future work. Nearby 200 m cells load/unload their visuals and collision while the static ground remains safe. Repeated geometry is instanced by material, and released cells dispose of instance buffers.

Version 0.6 separates the street generators: Gdańsk uses 7–9 m stone lanes, narrow merchant terraces and green rear courts; Riyadh uses 24–28 m arterials on large blocks, taller glass towers, limestone courts, palms and high shade structures. The arrival streets also have different widths and obstacle placements. The minimap shares street footprints with the renderer. Junction rectangles no longer overlap coplanar surfaces. Duplicate arrival obstacles were removed. Chunk construction is queued one cell per rendered frame, with nearby teleport collisions loaded immediately and a small cache to reduce rebuilding. A sphere cast clamps the actual camera position against walls; the camera follows only part of a jump's vertical rise so takeoff reads clearly.

Includes 36 data-driven event starts (sprint, trick jam, and route challenge), 120 route tokens, local personal records, combo scoring, outfit colors, gamepad input, a world map, optional synthesized skate audio, and save import/export. Event and collectible positions are checked against building footprints.

Version 0.2 adds authored arrival streets in both cities, narrower shopfronts, pitched merchant-house roofs, storefront signs and awnings, stone surrounds and shutters, original plaster/brick/paving textures, café seating, planted skate pockets, and animated pavement pedestrians. Gdańsk has a canal cut into the physical ground, a skateable bridge, quay rails, boats, and a harbor crane. Riyadh has a palm courtyard, fountain, lattice screens, and pergolas. Atmospheric sky lighting, a closer camera, more articulated rider/clothing, and real-world paving scale improve readability. Repeated meshes are instanced, including the arrival streets; sustained low frame rates trigger a lower graphics preset, which can be overridden from pause.

Outer districts still reuse modular layouts, and the visual style remains stylized rather than photorealistic. Full landmark art, bespoke event design, final rider/animations, a full tutorial sequence, richer audio, advanced landing balance, accessibility/rebinding, and measured hardware optimization from [GAME_PLAN.md](GAME_PLAN.md) remain unfinished. This is not the completed release described in that plan. Pedestrians are visual ambient characters rather than collision-enabled traffic.

Version 0.5 adds architectural interpretations of Żuraw, Main Town Hall, Green Gate, Kingdom Centre, Al Faisaliyah, and Masmak. Gdańsk's arrival district has narrower, taller merchant-house fronts. Riyadh has modern glass buildings, an Olaya-style asphalt boulevard, lane markings, parked sedans, and palm-lined pavements. Open the world map and use an **Explore:** destination to visit a landmark. Building generation reserves their footprints and navigation marks them. See [CITY_ACCURACY.md](CITY_ACCURACY.md) for the important geographic limits: these are compressed architectural recreations, not street-accurate replicas or scanned models.

## Validation

`npm run test:flips` checks the four flip directions through real keyboard input, all 32 flip jobs in the map filter, a completed/saved flip quest, riding a new physical bank into a double backflip, phone flip buttons and portrait/landscape layout. Rapier integration tests cover full rotations, scoring, spin/grab combinations, rejected late flips, extra airtime for doubles, the actual bank mesh and flipping out of a caught rail grind. Quest tests require two different new nearby landings and restore partial progress.

`npm run test:gear` (also `test:headwear`) checks Layan's helmet and six guard meshes, three-angle hijab/bandana fit, the shared fair NPC skin palette, detailed and instanced guards, Taqee, both cities and phone rendering. It captures close-ups, the full outfit and gameplay in `releases/` and checks for runtime/shader errors. Phone rendering uses Chromium touch emulation.

`npm run test:companion` checks Layan's name, all 128 quest destinations, city view/search, route selection without teleportation, physical Taqee guiding/waiting/tricks, a completed duet, separate saved results, recall/dismissal and phone layouts. Rapier tests additionally cover companionship beyond 45 seconds, waiting, recall across cities, practice jumps, guide waiting, advancing to the next quest stop and the two-person race grid. Map tests cover destination completeness and click coordinates after city focus/resizing. Phone checks use Chromium touch emulation, not physical iOS/Android devices.

`npm run test:quests` checks all 128 map destinations, completes a demo and a three-stop delivery using keyboard input and physics, verifies XP and save reloads, resumes/abandons an active quest, and checks phone quest entry and portrait/landscape layout. Unit tests check off-street placement and protected routes throughout both cities, clear routes to every objective, ordered deliveries, any-order collection, style scoring, snapshots and timeouts. These browser checks use Chromium touch emulation, not physical phone hardware.

`npm run test:parks` checks the new name, all fourteen free-skate destinations, destination filters, riding the Baltic pump track, starting a local session and phone park travel. Physics tests ride both directions of the curved quarter pipes and traverse the pump rollers using the actual collision mesh. Tests also check park spacing, city coverage, reserved footprints and session starts.

`npm run test:races` checks the countdown lock, pause behavior, moving physical rivals, both completed sprints, standings, results after a save reload, circuit restart/leave, and phone race entry. Unit tests check all four route footprints, checkpoint order, lap counting, jumping through the finish, timeouts, and all three physical AI rivals completing each route. Browser screenshots are saved in `releases/`.

`npm run test:crowd` verifies moving residents in both starting areas, trick reactions, inviting a companion, city travel, spectators at a stunt venue, the phone crowd budget and runtime/shader errors. Unit tests check route progress, legal ground, reactions without repeated scoring triggers, player yielding, companion behavior and blocked movement. Crowd screenshots are saved under `releases/`.

`npm run test:spots` drives both rooftop courses using real input/physics, clears their gaps, finishes with medals, verifies the jacket unlock and reloads the save. `npm run test:touch` uses Chromium's actual multi-touch event pipeline to check simultaneous thumbstick/jump/spin, drag look, cancellation, portrait/landscape layouts, pause, settings and map travel. Screenshots are saved in `releases/`. Unit tests additionally cover ordered elevated gates, failed runs, grounded finishes and timed trick medals.

`npm run test:rails` drives from each new city spawn, jumps onto a solid rail without E, sustains a royale grind, pops off and lands a spread-eagle stunt. It captures each start and rail/stunt poses and checks runtime/shader errors. Rapier tests cover both rail axes, rejected catches, end release, brake release, pop-outs and landing-only stunt scoring.

`npm test` runs real Rapier integration checks for grounded stability, acceleration/coasting/braking, jump gravity, wall collisions, scoring, map connectivity, area after building footprints, and objective placement.

`node tools/smoke.mjs` runs Chromium through Playwright against an already running server. It checks actual movement, jumping, pause, city travel, event start, and uncaught browser errors, and writes screenshots to `/tmp`. Set `CHROMIUM_PATH` if Chromium is elsewhere and `GAME_URL` to test a production preview. This is not a performance certification or a human assessment of movement feel.

`npm run test:menus` checks lobby destinations, live settings, apply/discard, preference persistence across reloads, wardrobe changes, navigation back to the correct screen, actual renderer/camera values, resumed skating, and a compact settings layout. Start the production preview on port 4173 first. It writes lobby/settings screenshots to `releases/`. `node tools/scenery-smoke.mjs` checks the canal bridge and scenery rendering.

`npm run test:navigation` checks the loaded anatomical model, minimap zoom, a clicked world-map waypoint, the planned route, a physical skate across the canal bridge, waypoint arrival, and rendering/runtime errors. Unit tests also check routing around buildings, bridge selection, aerial momentum, and crouched versus upright coasting.

`npm run test:cities` checks the configured fair-skinned hijabi rider/bandana, captures the close-up, visits all eight landmark destinations on physical ground, and checks for runtime/shader errors. Unit tests verify reserved landmark plots, legal arrival points, surface rolling differences, and the manual release requirement.

`npm run test:flow` checks jump-on-press while Space is held, a one-tap 180 plus grab landing, the H controls shortcut, and a continuous 215 m ride through a Riyadh chunk boundary. It saves separate city and aerial screenshots. Unit tests additionally check quick input retention, buffered landing jumps, variable jump height, double-tap 360s, rail pop-outs, distinct building scales, and non-overlapping road junction faces.

`npm run test:headwear` checks the pirate-wrap appearance, close-up camera, rotation control, return to the full outfit and resumed skating. It saves front, profile and rear screenshots for visual fit inspection and checks runtime/shader errors.

## Saves and credits

Progress is stored under `between-cities-v1` in localStorage. Export/import is available in pause. Restricted browser storage falls back to session play. No accounts or external services are required.

World geometry, helmet/skates, and optional noise-based rolling audio are generated in code. Rider anatomy and clothing proxy data come from MakeHuman core assets (CC0 1.0); see `tools/assets/README.md`. Rendering: Three.js (MIT). Physics: Rapier (Apache-2.0). Full runtime license notices are bundled in `public/THIRD_PARTY_NOTICES.txt`, copied to production, and linked from settings. No assets from the referenced commercial games, commercial music, or remote CDN dependencies are used. The complete rider mesh is embedded in the standalone build.
