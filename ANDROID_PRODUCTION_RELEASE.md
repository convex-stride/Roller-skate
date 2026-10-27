# One production Android APK

This repository's `android-release` job builds **one signed release APK** (`Layans-Skate-v0.23.0-android-release.apk`) using Tauri 2. Unlike the debug APK, this is intended for distribution through itch.io.

## One-time setup (do not share credentials in chat)

1. Install Java/JDK or Android Studio locally.
2. Create a durable private keystore locally (on Windows PowerShell):

   ```powershell
   & "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -keystore "$env:USERPROFILE\layans-skate-release.jks" -alias layans-skate -keyalg RSA -keysize 3072 -validity 10000
   ```

3. Keep the `.jks` file and its password backed up privately. **Losing this key prevents normal Android updates** to apps signed by it.
4. Convert your key to one-line base64 locally:

   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:USERPROFILE\layans-skate-release.jks")) | Set-Clipboard
   ```

5. In GitHub repository **Settings → Secrets and variables → Actions → New repository secret**, create:

   - `ANDROID_KEY_BASE64`: paste clipboard base64 value
   - `ANDROID_KEY_PASSWORD`: keystore password
   - `ANDROID_KEY_ALIAS`: `layans-skate`

   Never commit your keystore or paste secrets into an issue, PR, or chat.

6. Once this release branch is merged, open **Actions → itch.io build artifacts → Run workflow**, choose `main`, and run the workflow. If running the workflow from the feature branch is available in GitHub's UI, select that branch instead. The Android release job intentionally runs only on manual dispatch; it does not expose secret signing keys to PR builds.
7. When the workflow succeeds, download the `layans-skate-android-release` artifact. Extract the outer GitHub Actions archive; inside is **one APK** `Layans-Skate-v0.23.0-android-release.apk`.
8. Install on a real Android phone and verify graphics, gameplay, UI and touch controls before uploading to itch.io. The workflow checks APK cryptographic signing, **not runtime functionality**.

If the job fails saying an Android signing secret is missing, create all three GitHub repository secrets above and rerun it.

No automatic itch.io publication is configured.
