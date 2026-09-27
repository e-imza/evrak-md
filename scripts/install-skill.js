import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { mkdir, cp, writeFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  const { values, positionals } = parseArgs({ allowPositionals: true,
    options: { project: { type: 'string' }, user: { type: 'boolean' } } });
  const host = positionals[0];
  if (positionals.length !== 1 || !['codex', 'claude'].includes(host) || Boolean(values.project) === Boolean(values.user))
    throw new Error('Kullanım: node scripts/install-skill.js codex|claude --project /proje/yolu veya --user');
  const base = values.user ? homedir() : path.resolve(values.project);
  const destination = path.join(base, host === 'codex' ? '.agents' : '.claude', 'skills', 'evrak-md');
  await mkdir(path.dirname(destination), { recursive: true });
  // Exclusive creation intentionally refuses an existing skill, even an empty one.
  await mkdir(destination);
  try {
    const source = path.join(root, 'skills/evrak-md');
    for (const name of await readdir(source)) {
      await cp(path.join(source, name), path.join(destination, name), { recursive: true, force: false, errorOnExist: true });
    }
    await writeFile(path.join(destination, 'tool.json'), JSON.stringify({ cli: path.join(root, 'bin/evrak-md.js') }, null, 2) + '\n', { flag: 'wx' });
  } catch (error) { await rm(destination, { recursive: true, force: true }); throw error; }
  console.log(`Skill kuruldu: ${destination}\nDönüştürücü deposunu taşımayın. Yeni bir agent oturumunda skill'i seçin.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
