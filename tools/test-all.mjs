import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const output = resolve(root, 'test-results/full-suite');
await mkdir(output, { recursive: true });
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const only = process.env.TEST_ONLY?.split(',');
let results = [];
if (only) {
  try {
    const previous = JSON.parse(await readFile(resolve(output, 'results.json'), 'utf8'));
    if (previous.version === pkg.version) results = previous.results;
  } catch {}
}
const checks = [['unit', 'npm', ['test']]];
for (const file of (await readdir(resolve(root, 'tools'))).filter(f => f.endsWith('-smoke.mjs') || f === 'smoke.mjs').sort())
  checks.push([file.replace('.mjs', ''), process.execPath, [resolve(root, 'tools', file)]]);
for (const [name, command, args] of checks) {
  if (only && !only.includes(name)) continue;
  console.log(`START ${name}`);
  const start = Date.now();
  const result = await new Promise(resolveResult => {
    let log = '', timedOut = false;
    const child = spawn(command, args, { cwd: root, detached: true, env: { ...process.env,
      GAME_URL: process.env.GAME_URL || 'http://127.0.0.1:4173', LOW_GRAPHICS: '1', PHYSICS_TEST_DPR:process.env.PHYSICS_TEST_DPR||'.5', FLOW_TIMEOUT: '300000' }, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', d => { log += d; }); child.stderr.on('data', d => { log += d; });
    const killGroup = () => { try { process.kill(-child.pid, 'SIGTERM'); } catch {} };
    const timer = setTimeout(() => { timedOut = true; killGroup(); }, Number(process.env.SUITE_TIMEOUT || 900000));
    child.on('error', e => { log += String(e); });
    child.on('close', code => { clearTimeout(timer); killGroup(); resolveResult({ name, passed: code === 0 && !timedOut, code, timedOut, seconds: Math.round((Date.now() - start) / 1000), log }); });
  });
  await writeFile(resolve(output, `${name}.log`), result.log);
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${name} (${result.seconds}s)${result.passed ? '' : '\n' + result.log.slice(-2200)}`);
  results = results.filter(r => r.name !== name);
  results.push({ ...result, log: `${name}.log`, checkedAt: new Date().toISOString() });
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ version: pkg.version, results }, null, 2));
}
console.log(`${results.filter(r => r.passed).length}/${results.length} suites passed; reports: ${output}`);
process.exitCode = results.every(r => r.passed) ? 0 : 1;
