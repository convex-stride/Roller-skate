# Publish Layan's Skate and future updates

## Current state

Browser and Windows builds have passed GitHub CI. The Android debug build passed in earlier CI. The **production-signed Android APK has not been generated** because signing credentials must be configured and the release workflow manually started.

## Setup in itch.io (once)

1. Sign into https://itch.io/game/new and create a project named **Layan's Skate**, with kind **HTML**.
2. Set price to Free (or your preferred price) and keep it Draft while testing.
3. Choose your game URL slug; note the exact `username/game-slug` combination.
4. In itch.io account settings, create a Butler API key. In GitHub repository **Settings → Secrets and variables → Actions**, create the repository secret `BUTLER_API_KEY`. Do not copy the API key into code or chat.

## Android signing (once)

Follow `ANDROID_PRODUCTION_RELEASE.md`. Create a long-lived local keystore, back it up privately, and set `ANDROID_KEY_BASE64`, `ANDROID_KEY_PASSWORD`, and `ANDROID_KEY_ALIAS` in repository Actions secrets.

## Release builds

- Merge the reviewed release setup PR into `main` after testing and verifying the changes.
- In GitHub Actions, use **itch.io build artifacts → Run workflow** on `main`.
- The workflow builds the HTML5 ZIP, Windows EXE/MSI and (when credentials exist) signed Android APK.
- Download and test all selected artifacts before publishing; the release build's signing check does not prove Android gameplay performance.

## Upload from GitHub Actions (manual and opt-in)

1. Go to **Actions → Publish approved artifacts to itch.io → Run workflow**.
2. Enter the **completed build run ID** (not the PR number).
3. Enter your itch target in the form `username/game-slug`.
4. Select channels to upload:
   - Browser: extracts the HTML5 ZIP and uploads its contents on `html5`.
   - Windows: uploads the EXE and MSI files on `windows`.
   - Android: uploads ONLY the **production-signed** APK on `android`, never the debug APK.
5. Start the publishing workflow only after testing and account configuration.

Butler uploads update the selected channel; existing player access depends on itch.io visibility settings. Do not select Android until its production APK is ready.

## Every future game update

1. Ask Codex to modify the game and commit the changes.
2. Increment versions in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`; Android's versionCode must also increase for over-the-top installs.
3. Run tests and build all releases.
4. Test the results, then manually trigger the publishing workflow with the new build run ID.
5. Keep the Android signing key and the app identifier `com.convexstride.layansskate` unchanged across updates.

## Security

Only run the publishing workflow for trusted commits. Keep Butler credentials and Android signing keys in GitHub Secrets; never put them in pull requests, issues, or commit history.
