import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';

const path = '/app/data/evidence-files-20261004-backup.db';
if (existsSync(path)) throw new Error('Backup already exists; choose a new path before retrying');
const db = new DatabaseSync('/app/data/visua.db', { readOnly: true });
db.exec(`VACUUM INTO '${path}'`);
db.close();
const backup = new DatabaseSync(path, { readOnly: true });
const integrity = backup.prepare('PRAGMA quick_check').get().quick_check;
backup.close();
if (integrity !== 'ok') throw new Error('Backup integrity check failed');
console.log(JSON.stringify({ path, integrity, bytes: statSync(path).size, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') }, null, 2));
