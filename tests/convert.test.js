import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, stat, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import sharp from 'sharp';
import { convert } from '../src/index.js';
import { zip, udf, pdf, docx, scan } from './fixtures.js';

const root = await mkdtemp(path.join(tmpdir(), 'evrak-md-test-'));
const run = promisify(execFile);
let serial = 0;
async function fixture(name, data, options = {}) {
  const folder = path.join(root, String(++serial));
  const { mkdir } = await import('node:fs/promises'); await mkdir(folder);
  const input = path.join(folder, name); await writeFile(input, data);
  const output = path.join(folder, 'result');
  const result = await convert(input, { output, ocr: 'never', ...options });
  return { ...result, input, markdown: await readFile(path.join(output, 'document.md'), 'utf8') };
}

test('UDF preserves Turkish, UTF-16 offsets, tables, signature boundary and source hash', async () => {
  const bytes = await udf(); const result = await fixture('dilekçe.udf', bytes);
  assert.match(result.markdown, /SENTETİK MAHKEME/); assert.match(result.markdown, /😀/);
  assert.match(result.markdown, /2026\/123/); assert.match(result.markdown, /\| Tutar/);
  assert.equal(result.document.signaturePresent, true);
  assert.equal(result.document.signatureValidation, 'not-performed');
  assert.equal(result.document.source.sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.match(await readFile(path.join(result.output, 'source-text.txt'), 'utf8'), /İşbu/);
  for (const file of result.document.files) assert.equal(createHash('sha256').update(await readFile(path.join(result.output, file.path))).digest('hex'), file.sha256);
});

test('embedded UDF image becomes a local full image and preview', async () => {
  const r = await fixture('image.udf', await udf({ image: true }));
  assert.equal(r.document.assets.length, 1);
  assert.match(r.markdown, /assets\/udf-image-1.png/);
  assert.equal((await sharp(await readFile(path.join(r.output, r.document.assets[0].path))).metadata()).format, 'png');
});

test('PDF preserves two pages, text, page renders and coordinate spans', async () => {
  const r = await fixture('evidence.pdf', await pdf());
  assert.equal(r.document.pages.length, 2); assert.match(r.markdown, /Supporting evidence 456/);
  assert.equal(r.document.pages[1].number, 2);
  const coordinates = JSON.parse(await readFile(path.join(r.output, 'pages/page-2.text.json'), 'utf8'));
  assert.ok(coordinates.spans.some(span => span.text.includes('456')));
  assert.ok((await stat(path.join(r.output, 'assets/page-2.png'))).size > 1000);
});

test('DOCX preserves Turkish, table and embedded image without external fetch', async () => {
  const r = await fixture('dilekçe.docx', await docx());
  assert.match(r.markdown, /Türkçe dilekçe: İstanbul, ığüşöç/);
  assert.match(r.markdown, /2026\/123/);
  assert.match(r.markdown, /\| Dosya \| 2026\/123 \|/);
  assert.doesNotMatch(r.markdown, /<table>/);
  assert.equal(r.document.assets.length, 1);
  assert.match(r.markdown, /assets\/docx-image-1.png/);
});

test('image OCR uses bundled models and produces text plus positional data', async () => {
  const r = await fixture('tarama.png', scan(), { ocr: 'auto' });
  assert.match(r.markdown, /2026\/123/); assert.match(r.markdown, /1250/);
  assert.equal(r.document.pages[0].method, 'ocr');
  assert.ok(r.document.pages[0].ocr.confidence > 50);
  assert.ok(r.document.pages[0].ocr.blocks.length);
  assert.match(await readFile(path.join(r.output, 'pages/page-1.ocr.tsv'), 'utf8'), /left\ttop\twidth\theight/);
});

test('scanned PDF auto OCR yields case number and keeps its source image', async () => {
  const r = await fixture('scanned.pdf', await pdf({ scanned: true }), { ocr: 'auto' });
  assert.equal(r.document.pages[0].method, 'ocr'); assert.match(r.markdown, /2026\/123/);
  assert.ok(r.document.pages[0].image);
});

test('multi-page TIFF yields each frame separately', async () => {
  const bytes = await sharp(Buffer.alloc(80 * 240 * 3, 255), { raw: { width: 80, height: 240, channels: 3, pageHeight: 120 } }).tiff().toBuffer();
  const r = await fixture('scan.tiff', bytes);
  assert.equal(r.document.pages.length, 2); assert.equal(r.document.pages[0].method, 'image-only');
  assert.equal(r.document.pages[1].height, 120);
  assert.ok(r.document.warnings.some(w => w.includes('metin çıkarılamadı')));
});

test('plain text escapes active Markdown while chunks retain source text', async () => {
  const r = await fixture('note.txt', 'İstanbul\n<script>alert(1)</script>\n![track](https://example.com/a)');
  assert.doesNotMatch(r.markdown, /<script>/);
  assert.doesNotMatch(r.markdown, /!\[track\]/);
  const chunk = JSON.parse((await readFile(path.join(r.output, 'chunks.jsonl'), 'utf8')).trim());
  assert.match(chunk.text, /<script>/); assert.equal(chunk.sourceSha256, r.document.source.sha256);
});

test('refuses overwriting original or existing output', async () => {
  const r = await fixture('original.txt', 'unchanged');
  await assert.rejects(convert(r.input, { output: r.output }), /zaten var/);
  await assert.rejects(convert(r.input, { output: r.input }), /kaynak dosya/);
  assert.equal(await readFile(r.input, 'utf8'), 'unchanged');
});

test('rejects DTD, bad ranges, bad ZIP and unsupported extensions', async () => {
  await assert.rejects(fixture('xxe.udf', await zip({ 'content.xml': '<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><template>&e;</template>' })), /DTD/);
  await assert.rejects(fixture('bad.udf', await zip({ 'content.xml': '<template><content>x</content><elements><paragraph><content startOffset="99" length="1"/></paragraph></elements></template>' })), /metin aralığı/);
  await assert.rejects(fixture('bad.udf', Buffer.from('not a zip')));
  await assert.rejects(fixture('bad.exe', Buffer.from('bad')), /Desteklenmeyen/);
});

test('enforces input, inflated archive, page and pixel bounds and cleans failed results', async () => {
  await assert.rejects(fixture('large.udf', await udf(), { limits: { maxInputBytes: 10 } }), /boyut/);
  await assert.rejects(fixture('bomb.udf', await zip({ 'content.xml': 'a'.repeat(20000) }), { limits: { maxExpandedBytes: 10000 } }), /açılmış/);
  await assert.rejects(fixture('many.pdf', await pdf(), { limits: { maxPages: 1 } }), /sayfa sayısı/);
  await assert.rejects(fixture('big.png', scan(), { limits: { maxPixels: 1000 } }));
  const folders = await readdir(root);
  assert.ok(folders.length);
});

test('CLI help, JSON result, spaces and failed batch item exit code', async () => {
  const cli = path.resolve('bin/evrak-md.js');
  assert.match((await run(process.execPath, [cli, '--help'])).stdout, /Kullanım/);
  const r = await fixture('a space.txt', 'hello');
  const out = path.join(root, 'cli-result');
  const result = await run(process.execPath, [cli, r.input, '--out', out, '--json']);
  assert.equal(JSON.parse(result.stdout)[0].status, 'ok');
  await assert.rejects(run(process.execPath, [cli, r.input, path.join(root, 'missing.pdf'), '--out', path.join(root, 'batch'), '--json']), error => {
    const data = JSON.parse(error.stdout); return error.code === 1 && data[0].status === 'ok' && data[1].status === 'error';
  });
});
