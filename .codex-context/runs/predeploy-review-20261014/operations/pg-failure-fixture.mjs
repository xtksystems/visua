import net from 'node:net';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PostgresDriver } from '../../../../apps/server/src/storage/postgres.ts';

const packet = (type, body) => {
  const result = Buffer.alloc(5 + body.length);
  result[0] = type.charCodeAt(0);
  result.writeInt32BE(body.length + 4, 1);
  body.copy(result, 5);
  return result;
};
const ready = packet('Z', Buffer.from('I'));
const auth = packet('R', Buffer.alloc(4));

if (process.argv[2] === 'idle') {
  let socket;
  const server = net.createServer(s => {
    socket = s;
    let started = false;
    s.on('data', () => {
      if (!started) { started = true; s.write(Buffer.concat([auth, ready])); }
      else s.write(Buffer.concat([packet('C', Buffer.from('SELECT 1\0')), ready]));
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const driver = new PostgresDriver(`postgres://fixture@127.0.0.1:${server.address().port}/fixture?sslmode=disable`);
  await driver.query('SELECT 1');
  console.log(JSON.stringify({ scenario: 'idle-connection-loss', poolIdle: driver.pool.idleCount, poolErrorListeners: driver.pool.listenerCount('error') }));
  socket.destroy();
  setTimeout(() => { console.log('process-survived'); process.exit(0); }, 500);
} else if (process.argv[2] === 'stall') {
  const sockets = [];
  const server = net.createServer(s => { sockets.push(s); s.on('data', () => {}); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const driver = new PostgresDriver(`postgres://fixture@127.0.0.1:${server.address().port}/fixture?sslmode=disable`);
  let settled = 0;
  const work = Array.from({ length: 12 }, () => driver.query('SELECT 1').catch(() => {}).finally(() => { settled++; }));
  await new Promise(r => setTimeout(r, 1200));
  console.log(JSON.stringify({ scenario: 'unresponsive-postgres-handshake', elapsedAtLeastMs: 1200, queriesSettled: settled, sockets: sockets.length, total: driver.pool.totalCount, waiting: driver.pool.waitingCount, connectionTimeoutMillis: driver.pool.options.connectionTimeoutMillis ?? null, queryTimeout: driver.pool.options.query_timeout ?? null, statementTimeout: driver.pool.options.statement_timeout ?? null }));
  // Mock-only cleanup: stop this disposable child rather than interact with live services.
  for (const socket of sockets) socket.destroy();
  process.exit(0);
} else {
  for (const mode of ['idle', 'stall']) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url), mode], { encoding: 'utf8', timeout: 4000, env: { PATH: process.env.PATH } });
    console.log(JSON.stringify({ mode, status: result.status, signal: result.signal, error: result.error?.message, stdout: result.stdout, stderr: result.stderr }));
  }
}
