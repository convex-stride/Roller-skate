# Version 0.24 validation

Checked on 28 October 2026 in the Linux cloud workspace with Node 24.19.0 and Chromium's SwiftShader software renderer.

The full sweep and targeted reruns finished with **25/25 suites passing**: **159 unit tests in 23 files**, plus **24 browser smoke suites**. Detailed logs and the combined results are generated in `test-results/full-suite/` and are ignored by git.

| Area | Passing checks |
| --- | --- |
| World and navigation | Both cities, physical canal bridge, map routes, all 128 quest arrivals, all 34 gallery entrances, physical three-stop deliveries and saved quest progress |
| Skating | Keyboard movement/jumping, continuous riding, flips, rail catches and sustained grinds, real phone multi-touch rail controls, both rooftop courses and fourteen skate parks |
| Activities and residents | Races, completed Layan/Taqee duet and saved results, Taqee guiding/waiting/tricks, moving/reacting residents, six ice arenas, figure moves, combos and progression |
| Art and appearance | Both-city galleries, all five artwork images, phone gallery portrait/landscape, green parks and flow courts, Taqee hair, helmets and six articulated guards, distant gear instances |
| Interface and rendering | Lobby/settings, restricted embeds, touch layouts, headwear inspection, night preview/save/reload, lighting budgets and daylight restoration |
| Offline app payload | Exact bundled HTML at secure app-equivalent origins, desktop/phone controls, movement, jump, native Back dispatch, background pause and saved preferences, with external requests denied |

Production TypeScript/Vite compilation and web packaging passed. Windows and Android packages were rebuilt with the latest crowd geometry. Download verification checked ZIP integrity, Windows executable headers/application version, the packaged Windows ASAR against the verified app, APK HTML against the current standalone build, every itch.io ZIP file against `dist`, and SHA-256 checksums. Android packaging also verified its v2/v3 signatures and SDK/package metadata.

## Downloads

- `releases/layans-skate-0.24.0-windows-x64.zip`: unsigned portable Windows x64 preview, approximately 154 MB.
- `releases/layans-skate-0.24.0-android.apk`: locally signed Android 8+ preview, approximately 2.8 MB; requires a current Android System WebView and OpenGL ES 3.
- `releases/layans-skate-v0.24.zip`: itch.io HTML5 build, approximately 2.8 MB, with `index.html` at the archive root.
- `releases/SHA256SUMS.txt`: checksums of these exact downloads.

Downloads are generated artifacts rather than tracked source files. The **Download builds** GitHub Actions workflow can rebuild them. Packaging instructions and signing-key guidance are in [README.md](README.md).

## Scope of the evidence

Software-rendered browser tests are functional checks, not a device frame-rate benchmark. The measured geometry change reduces distant helmet/guard meshes from 7,124 to 708 triangles per rider, while retaining all six guards and detailed nearby equipment. Adaptive graphics, cached world data and slower HUD/map updates reduce rendering and interface work; actual smoothness depends on hardware and settings.

The Windows executable and Android APK were not run on physical Windows/Android devices. The cloud browser cannot register Electron's private protocol, so offline payload checks use equivalent secure origins and do not replace native installation/lifecycle testing. Phone checks use touch emulation. The cities and new art pavilions are authored interpretations; the paintings are genuine reproductions with bundled credits. itch.io publication has not been performed.

## Repeat the checks

Run `npm test` and `npm run package`, then start `npm run preview -- --port 4173` in a separate terminal. Run `npm run test:all` for all browser/unit checks, or use `TEST_ONLY=headwear-smoke,smoke npm run test:all` for specific suites. Long physical delivery checks can take over fifteen minutes on software rendering; use `SUITE_TIMEOUT=1800000` when the workspace is slow.

After native packaging, run `npm run test:downloads` to verify the generated archives and refresh their checksums.
