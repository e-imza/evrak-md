import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const run = promisify(execFile);
for (const [host, folder] of [['codex', '.agents'], ['claude', '.claude']]) {
  test(`${host} skill installer and portable runner perform an actual conversion`, async () => {
    const project = await mkdtemp(path.join(tmpdir(), `evrak-skill-${host}-`));
    await run(process.execPath, ['scripts/install-skill.js', host, '--project', project]);
    const skill = path.join(project, folder, 'skills/evrak-md');
    assert.match(await readFile(path.join(skill, 'SKILL.md'), 'utf8'), /name: evrak-md/);
    const input = path.join(project, 'belge.txt'); await writeFile(input, 'Skill gerçek dönüşüm: Türkçe.');
    const output = path.join(project, 'cikti');
    await run(process.execPath, [path.join(skill, 'scripts/run.mjs'), input, '--out', output]);
    assert.match(await readFile(path.join(output, 'document.md'), 'utf8'), /Skill gerçek dönüşüm: Türkçe/);
    await assert.rejects(run(process.execPath, ['scripts/install-skill.js', host, '--project', project]));
    assert.match(await readFile(path.join(skill, 'SKILL.md'), 'utf8'), /name: evrak-md/);
  });
}

test('source skill runner resolves converter without installation', async () => {
  const r = await run(process.execPath, ['skills/evrak-md/scripts/run.mjs', '--version']);
  assert.equal(r.stdout.trim(), '0.1.0');
});
