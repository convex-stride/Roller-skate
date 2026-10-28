import { packager } from '@electron/packager';
import { mkdir, copyFile, writeFile, readFile, access, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const target = process.argv[2];
const run = (cmd, args, options = {}) => execFileSync(cmd, args, { stdio: 'inherit', ...options });
const build = join(root, '.native-build');
await mkdir(build, { recursive: true });
const html = join(root, 'releases/Layans-Skate.html');
await access(html); // npm run package builds the shared offline game first.

if (target === 'windows') {
  const source = join(build, 'windows-source');
  await mkdir(source, { recursive: true });
  await copyFile(join(root, 'native/windows/main.cjs'), join(source, 'main.cjs'));
  await copyFile(html, join(source, 'game.html'));
  await copyFile(join(root, 'public/THIRD_PARTY_NOTICES.txt'), join(source, 'THIRD_PARTY_NOTICES.txt'));
  await writeFile(join(source, 'package.json'), JSON.stringify({ name: 'layans-skate', productName: "Layan's Skate", author: "Layan's Skate contributors", version, main: 'main.cjs' }));
  const [folder] = await packager({
    dir: source, out: join(build, 'windows'), name: 'Layans Skate', executableName: 'Layans Skate',
    platform: 'win32', arch: 'x64', electronVersion: '45.1.0', appVersion: version,
    overwrite: true, asar: true, prune: false,
    download: { cacheRoot: process.env.ELECTRON_CACHE || '/tmp/layans-electron-cache' },
  });
  await writeFile(join(folder, 'START-HERE.txt'), "Layan's Skate\r\n\r\nExtract the whole ZIP, then run Layans Skate.exe. Keep the other files beside it.\r\nWindows 10/11 x64. No internet needed. F11 toggles full screen.\r\nThis independent preview is not code-signed. Saves stay in your Windows app profile.\r\n");
  await copyFile(join(root,'public/THIRD_PARTY_NOTICES.txt'),join(folder,'GAME-CREDITS.txt'));
  await copyFile(join(root,'public/ARTWORK_CREDITS.txt'),join(folder,'ARTWORK-CREDITS.txt'));
  const zip = join(root, `releases/layans-skate-${version}-windows-x64.zip`);
  run('zip', ['-q', '-FS', '-r', zip, '.'], { cwd: folder });
  console.log(`Windows portable app: ${zip}`);
} else if (target === 'android') {
  const sdk = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME;
  if (!sdk) throw Error('Set ANDROID_SDK_ROOT; install platforms;android-35 and build-tools;35.0.0 with sdkmanager.');
  const tools = join(sdk, 'build-tools/35.0.0'), android = join(sdk, 'platforms/android-35/android.jar');
  const out = join(build, 'android'), assets = join(out, 'assets'), classes = join(out, 'classes'), dex = join(out, 'dex');
  for (const folder of [out, assets, classes, dex]) await mkdir(folder, { recursive: true });
  await copyFile(html, join(assets, 'index.html'));
  await copyFile(join(root, 'public/THIRD_PARTY_NOTICES.txt'), join(assets, 'THIRD_PARTY_NOTICES.txt'));
  run(join(tools, 'aapt2'), ['compile', '--dir', join(root, 'native/android/res'), '-o', join(out, 'resources.zip')]);
  const unsigned = join(out, 'unsigned.apk');
  run(join(tools, 'aapt2'), ['link', '-o', unsigned, '-I', android, '--manifest', join(root, 'native/android/AndroidManifest.xml'), '-A', assets, join(out, 'resources.zip')]);
  run('javac', ['-source', '8', '-target', '8', '-classpath', android, '-d', classes, join(root, 'native/android/MainActivity.java')]);
  const javaClasses = (await readdir(join(classes, 'com/layansskate/game'))).filter(f => f.endsWith('.class')).map(f => join(classes, 'com/layansskate/game', f));
  run(join(tools, 'd8'), ['--min-api', '26', '--lib', android, '--output', dex, ...javaClasses]);
  run('zip', ['-q', '-j', unsigned, join(dex, 'classes.dex')]);
  const aligned = join(out, 'aligned.apk');
  run(join(tools, 'zipalign'), ['-f', '-p', '4', unsigned, aligned]);
  // Stable local preview key permits installing subsequent builds over this one.
  // Never commit the keystore. Set all LAYANS_ANDROID_* vars for your own release key.
  const keystore = process.env.LAYANS_ANDROID_KEYSTORE || join(root, '.local-signing/android-preview.jks');
  const alias = process.env.LAYANS_ANDROID_KEY_ALIAS || 'layans-preview';
  const password = process.env.LAYANS_ANDROID_KEY_PASSWORD || 'android';
  await mkdir(resolve(keystore, '..'), { recursive: true });
  try { await access(keystore); } catch {
    if (process.env.LAYANS_ANDROID_KEYSTORE) throw Error('Specified signing keystore does not exist.');
    run('keytool', ['-genkeypair', '-keystore', keystore, '-alias', alias, '-storepass', password, '-keypass', password, '-dname', "CN=Layan's Skate Preview", '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000']);
  }
  const apk = join(root, `releases/layans-skate-${version}-android.apk`);
  const env = { ...process.env, LAYANS_SIGNING_PASSWORD: password };
  run(join(tools, 'apksigner'), ['sign', '--ks', keystore, '--ks-key-alias', alias, '--ks-pass', 'env:LAYANS_SIGNING_PASSWORD', '--key-pass', 'env:LAYANS_SIGNING_PASSWORD', '--out', apk, aligned], { env });
  run(join(tools, 'apksigner'), ['verify', '--verbose', apk]);
  run(join(tools, 'aapt2'), ['dump', 'badging', apk]);
  console.log(`Android offline APK: ${apk}`);
} else throw Error('Use: node tools/package-native.mjs windows|android');
