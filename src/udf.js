import { readArchive, parseXml, tag, attrs, children, textOf } from './archive.js';

export async function readUdf(buffer, context) {
  const entries = await readArchive(buffer, context.limits);
  const xml = entries.get('content.xml');
  if (!xml) throw new Error('UDF arşivinde content.xml bulunamadı.');
  const tree = parseXml(xml);
  const root = tree.find(node => tag(node) === 'template');
  if (!root) throw new Error('Desteklenen UYAP template XML kökü bulunamadı.');
  const nodes = children(root);
  const rawNode = nodes.find(node => tag(node) === 'content');
  const raw = rawNode ? textOf(children(rawNode)) : '';
  await context.write('source-text.txt', raw);
  context.document.signaturePresent = [...entries.keys()].some(name => /\.(sgn|p7s)$/i.test(name));
  context.document.signatureValidation = 'not-performed';
  context.document.xmlVersion = attrs(root).format_id ?? null;
  context.document.pagination = 'logical-not-original-pages';
  context.warn('UDF düzeni mantıksal bloklara dönüştürülür; özgün sayfa düzeni yeniden oluşturulmaz.');
  if (context.document.signaturePresent) context.warn('İmza dosyası bulundu; imza geçerliliği denetlenmedi.');
  const sections = nodes.find(node => tag(node) === 'elements');
  const unknown = new Set();
  let imageIndex = 0;
  const markdown = s => s.replace(/([\\`*_{}[\]<>#|])/g, '\\$1');

  async function render(node, depth = 0) {
    if (depth > 100) throw new Error('XML iç içe öğe sınırı aşıldı.');
    const name = tag(node), a = attrs(node), nested = children(node);
    if (name === '#text') return String(node['#text']).trim() ? markdown(String(node['#text'])) : '';
    if (name === 'content' || (a.startOffset !== undefined && a.length !== undefined && name !== 'image')) {
      const start = Number(a.startOffset), length = Number(a.length);
      if (!Number.isInteger(start) || !Number.isInteger(length) || start < 0 || length < 0 || start + length > raw.length)
        throw new Error('UDF metin aralığı kaynak metnin dışında.');
      // Java Swing offsets and JavaScript string indices both count UTF-16 units.
      let value = markdown(raw.slice(start, start + length));
      const wrap = (text, marker) => text.replace(/^(\s*)([\s\S]*?)(\s*)$/, (_, before, body, after) => `${before}${marker}${body}${marker}${after}`);
      if (a.bold === 'true' && value.trim()) value = wrap(value, '**');
      if (a.italic === 'true' && value.trim()) value = wrap(value, '*');
      return value;
    }
    if (name === 'image') {
      const base64 = (a.imageData ?? '').replace(/\s/g, '');
      if (!base64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
        context.warn('UDF içinde okunamayan bir görsel kaydı var.'); return '\n[Görsel çıkarılamadı]\n';
      }
      const asset = await context.asset(Buffer.from(base64, 'base64'), `udf-image-${++imageIndex}`);
      let value = `\n![Belge görseli ${imageIndex}](${asset.path})\n`;
      if (context.options.ocr !== 'never') {
        const ocr = await context.ocr.recognize(await context.read(asset.path));
        asset.ocr = { text: ocr.text, confidence: ocr.confidence };
        await context.write(`assets/udf-image-${imageIndex}.ocr.json`, JSON.stringify(ocr, null, 2));
        if (ocr.text) value += `\nGörsel OCR (doğrulanmalı):\n\n${markdown(ocr.text)}\n`;
      }
      return value;
    }
    if (name === 'tab') return '\t';
    if (name === 'space') return ' ';
    if (name === 'page-break') return '\n\n---\n\n';
    if (name === 'table') {
      const rows = nested.filter(n => tag(n) === 'row');
      const table = [];
      for (const row of rows) {
        const values = [];
        for (const cell of children(row).filter(n => tag(n) === 'cell')) {
          if (attrs(cell).colSpan || attrs(cell).rowSpan) context.warn('UDF birleşik tablo hücreleri düzleştirildi.');
          values.push((await render(cell, depth + 1)).trim().replace(/\r?\n/g, '<br>'));
        }
        table.push(values);
      }
      const width = Math.max(0, ...table.map(row => row.length));
      if (!width) return '';
      // Empty header avoids inventing a semantic header from the first data row.
      return '\n\n| ' + Array(width).fill(' ').join(' | ') + ' |\n| ' + Array(width).fill('---').join(' | ') + ' |\n' +
        table.map(row => '| ' + Array.from({ length: width }, (_, i) => row[i] ?? '').join(' | ') + ' |').join('\n') + '\n\n';
    }
    let value = '';
    for (const child of nested) value += await render(child, depth + 1);
    if (name === 'paragraph') return value + '\n\n';
    if (name === 'header') return '\n\n### Üstbilgi\n\n' + value;
    if (name === 'footer') return '\n\n### Altbilgi\n\n' + value;
    if (!['elements', 'cell', 'row'].includes(name)) unknown.add(name);
    return value;
  }
  let body = sections ? await render(sections) : '';
  if (!body.trim()) { body = markdown(raw); context.warn('Yapısal öğeler bulunamadı; ham metin kullanıldı.'); }
  if (unknown.size) context.warn(`Tanınmayan UDF öğeleri düzleştirildi: ${[...unknown].join(', ')}`);
  context.page({ number: 1, text: body.trim(), method: 'udf-structure', markdown: true });
}
