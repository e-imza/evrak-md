#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const skill = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try {
  let cli = path.resolve(skill, '../../bin/evrak-md.js');
  try { cli = JSON.parse(await readFile(path.join(skill, 'tool.json'), 'utf8')).cli; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (typeof cli !== 'string' || !path.isAbsolute(cli)) throw new Error('Geçersiz yerel araç yolu.');
  await access(cli);
  const result = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], { stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(`Evrak MD çalıştırılamadı; depoyu geri yükleyin veya skill kurulumunu yenileyin. ${error.message}`);
  process.exitCode = 1;
}
