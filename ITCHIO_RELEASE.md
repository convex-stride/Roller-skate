# Layan's Skate: itch.io release checklist

This branch adds a Tauri 2 host for the existing Vite/TypeScript/Three.js game. The current web game remains unchanged. **Builds have not been verified on a Windows PC or Android device.** Do not label the APK/EXE release-ready until tested.

## Browser (itch.io HTML5)

Install Node.js 24+, then `npm ci && npm test && npm run build`.
ZIP the **contents** of `dist` (not the directory itself) so `index.html` is at the archive root. On Windows PowerShell:

```powershell
Compress-Archive -Path .\dist\* -DestinationPath .\layans-skate-web.zip -Force
```

Or run the `itch.io build artifacts` GitHub Actions workflow manually and download the browser artifact.

## Windows

Install Rust and Visual Studio C++ Build Tools (MSVC + Windows SDK). From the project root:

```powershell
npm ci
npx --yes @tauri-apps/cli@2 icon path/to/your-square-game-art.png
npx --yes @tauri-apps/cli@2 dev
npx --yes @tauri-apps/cli@2 build --bundles nsis
```

The installer, if compilation succeeds, is in `src-tauri/target/release/bundle/nsis/`. Check the installer on another Windows PC with WebView2. Provide your own app artwork and generate icons before a real release. The bundled native host does not replace the renderer: WebGL2 and physics WASM must still run in WebView2.

## Android

Install Android Studio, Android SDK, NDK, Java 17, Rust Android targets, and ensure JAVA_HOME, ANDROID_HOME, NDK_HOME are correct per the Tauri Android prerequisites. In the project root:

```powershell
npm ci
npx --yes @tauri-apps/cli@2 android init
npx --yes @tauri-apps/cli@2 android dev
npx --yes @tauri-apps/cli@2 android build --apk
```

A **distributable release APK must be signed**. Follow https://v2.tauri.app/distribute/sign/android/ and never commit your keystore, credentials or passwords. Check `src-tauri/gen/android/app/build/outputs/apk/` for generated APKs. Android init generates additional Gradle project files locally. Test on an actual phone: WebGL2, Rapier WASM, tap/swipe UI, frame rate, sound, and screen rotation.

## itch.io

Create an HTML project at https://itch.io/game/new. Upload the web ZIP as **play in browser** and select HTML5. Upload the Windows NSIS installer (.exe) and a **signed, tested** Android APK as separate downloadable files. Configure an appropriate game viewport (start at 1280x720), select the proper platforms, test all three artifacts, and publish only after testing. You must perform the account-side upload, or explicitly authorize a compatible tool with itch.io access.

## Known limits

- This branch is a starting configuration, not proof of successful builds.
- Windows icons must be generated from a source image; the native bundle may fail until they exist.
- Android initialization, release signing and real-phone testing are required.
- Only the browser and Windows jobs are configured in GitHub Actions. Android is intentionally manual until device testing and private signing configuration are complete.
- Source files and game features are not changed by this branch.
