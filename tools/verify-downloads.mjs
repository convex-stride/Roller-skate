import { readFile, writeFile, readdir } from 'node:fs/promises';
import { extractFile } from '@electron/asar';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve(import.meta.dirname, '..');
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const html = await readFile(join(root, 'releases/Layans-Skate.html'));
const win = join(root, '.native-build/windows/Layans Skate-win32-x64');
assert.deepEqual(extractFile(join(win, 'resources/app.asar'), 'game.html'), html, 'Windows bundles the current offline game');
const metadata = JSON.parse(extractFile(join(win, 'resources/app.asar'), 'package.json').toString());
assert.equal(metadata.version, version);
const exe = await readFile(join(win, 'Layans Skate.exe'));
assert.equal(exe.subarray(0, 2).toString(), 'MZ');
const apk = join(root, `releases/layans-skate-${version}-android.apk`);
const apkHtml = execFileSync('unzip', ['-p', apk, 'assets/index.html'], { maxBuffer: 16 * 1024 * 1024 });
assert.deepEqual(apkHtml, html, 'Android bundles the same current offline game');
const files = [`layans-skate-${version}-windows-x64.zip`, `layans-skate-${version}-android.apk`, 'layans-skate-v0.24.zip'];
const packedAsar=execFileSync('unzip',['-p',join(root,'releases',files[0]),'resources/app.asar'],{maxBuffer:32*1024*1024});
assert.deepEqual(packedAsar,await readFile(join(win,'resources/app.asar')),'Windows ZIP contains the verified current application');
for(const entry of await readdir(join(root,'dist'),{recursive:true,withFileTypes:true})) {
  if(!entry.isFile())continue;
  const path=join(entry.parentPath,entry.name),relative=path.slice(join(root,'dist').length+1);
  const packed=execFileSync('unzip',['-p',join(root,'releases',files[2]),relative],{maxBuffer:16*1024*1024});
  assert.deepEqual(packed,await readFile(path),`itch.io ZIP contains current ${relative}`);
}
const sums = [];
for (const file of files) {
  const path = join(root, 'releases', file);
  execFileSync('unzip', ['-tq', path], { stdio: 'inherit' });
  sums.push(`${createHash('sha256').update(await readFile(path)).digest('hex')}  ${file}`);
}
await writeFile(join(root, 'releases/SHA256SUMS.txt'), sums.join('\n') + '\n');
console.log('Windows PE, archive integrity, current app version, matching offline game payloads and download checksums passed.');
