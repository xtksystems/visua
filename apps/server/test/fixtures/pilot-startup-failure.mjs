// Execute the real rehearsal with Docker replaced before module import. This
// subprocess must never start a real container or contact an existing service.
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2];
assert(['persistent', 'retry-success'].includes(mode));
process.argv = [process.execPath, fileURLToPath(new URL('../../../../scripts/pilot-rehearsal.mjs', import.meta.url))];
let owner, removals = 0, captured;
const originalSpawn = cp.spawn, originalLog = console.log;
cp.spawn = (command, args) => {
  assert.equal(command, 'docker');
  const child = new EventEmitter();
  child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
  child.kill = () => true;
  let output = '', error = '', code = 0;
  if (args[0] === 'info' || args[0] === 'image') output = '{}';
  else if (args[0] === 'run') {
    owner = args[args.indexOf('--label') + 1].split('=')[1]; output = 'owned-fixture-id';
  } else if (args[0] === 'inspect' && args[args.indexOf('--format') + 1].includes('imageId')) {
    code = 1; error = 'Injected startup inspection failure';
  } else if (args[0] === 'inspect') output = JSON.stringify({ id: 'owned-fixture-id', owner });
  else if (args[0] === 'rm') {
    assert.equal(args.at(-1), 'owned-fixture-id'); removals++;
    if (mode === 'persistent' || removals === 1) { code = 1; error = 'Injected cleanup failure'; }
  } else assert.fail('Unexpected Docker operation');
  queueMicrotask(() => { child.stdout.end(output); child.stderr.end(error); child.emit('close', code); });
  return child;
};
syncBuiltinESMExports(); console.log = text => { captured = JSON.parse(text); };
try {
  await import('../../../../scripts/pilot-rehearsal.mjs');
  assert.equal(captured.status, 'failed'); // Startup failure stays a failure even after cleanup recovers.
  assert.equal(captured.failure.stage, 'resource-startup');
  assert.equal(removals, 2);
  assert.equal(captured.resources.containers.length, 1);
  assert.match(captured.resources.containers[0].name, /^visua-pilot-pg-/);
  if (mode === 'persistent') {
    assert.equal(captured.cleanupComplete, false);
    assert.equal(captured.resources.cleanup.status, 'failed');
    assert.deepEqual(captured.cleanupFailures, ['Owned Docker resources']);
  } else {
    assert.equal(captured.cleanupComplete, true);
    assert.equal(captured.resources.cleanup.status, 'complete');
    assert.equal(captured.cleanupFailures, undefined);
  }
  originalLog(JSON.stringify({ mode, status: 'passed', realDockerCalls: 0, removals }));
  process.exitCode = 0;
} finally {
  cp.spawn = originalSpawn; syncBuiltinESMExports(); console.log = originalLog;
  if (captured?.reportPath) {
    const check = fileURLToPath(new URL('../../../../.check/', import.meta.url));
    const output = dirname(resolve(captured.reportPath));
    assert.equal(dirname(output), resolve(check));
    assert.match(output.slice(resolve(check).length + 1), /^pilot-[A-Za-z0-9]+$/);
    await rm(output, { recursive: true });
  }
}
