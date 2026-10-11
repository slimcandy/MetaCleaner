import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { createZip } from './zip';

it('writes a zip that unzip can list and verify', () => {
  const zip = createZip([
    { name: 'a.txt', data: new TextEncoder().encode('hello') },
    { name: 'dir/ü.bin', data: new Uint8Array([0, 1, 2, 3, 255]) }
  ]);
  const path = join(mkdtempSync(join(tmpdir(), 'zip-')), 't.zip');
  writeFileSync(path, zip);
  const listing = execFileSync('unzip', ['-t', path], { encoding: 'utf8' });
  expect(listing).toMatch(/testing: a.txt\s+OK/);
  expect(listing).toMatch(/No errors detected/);
});
