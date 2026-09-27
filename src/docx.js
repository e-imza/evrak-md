import mammoth from 'mammoth';
import TurndownService from 'turndown';
import gfmPlugin from 'turndown-plugin-gfm';
import { readArchive, parseXml } from './archive.js';

export async function readDocx(buffer, context) {
  const entries = await readArchive(buffer, context.limits);
  if (!entries.has('word/document.xml')) throw new Error('DOCX document.xml bulunamadı.');
  for (const [name, value] of entries) if (/\.(xml|rels)$/i.test(name)) parseXml(value);
  let count = 0;
  const result = await mammoth.convertToHtml({ buffer }, {
    externalFileAccess: false,
    convertImage: mammoth.images.imgElement(async image => {
      const data = await image.read();
      const asset = await context.asset(data, `docx-image-${++count}`);
      if (context.options.ocr !== 'never') {
        const ocr = await context.ocr.recognize(await context.read(asset.path));
        asset.ocr = { text: ocr.text, confidence: ocr.confidence };
        await context.write(`assets/docx-image-${count}.ocr.json`, JSON.stringify(ocr, null, 2));
      }
      return { src: asset.path };
    }),
  });
  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  td.use(gfmPlugin.gfm);
  td.addRule('noExternalImages', { filter: 'img', replacement: (_, node) =>
    /^assets\/docx-image-\d+\.png$/.test(node.getAttribute('src') ?? '') ? `![Belge görseli](${node.getAttribute('src')})` : '[Harici görsel yüklenmedi]' });
  td.addRule('noActiveLinks', { filter: 'a', replacement: content => content });
  td.addRule('safeTables', { filter: 'table', replacement: (_, node) => {
    const rows = Array.from(node.querySelectorAll('tr')).map(row => Array.from(row.children)
      .filter(cell => ['TD', 'TH'].includes(cell.nodeName)).map(cell => {
        if (cell.getAttribute('colspan') || cell.getAttribute('rowspan')) context.warn('DOCX birleşik tablo hücreleri düzleştirildi.');
        return td.turndown(cell.innerHTML).replace(/(?<!\\)\|/g, '\\|').replace(/\r?\n/g, '<br>');
      }));
    const width = Math.max(0, ...rows.map(row => row.length));
    if (!width) return '';
    return '\n\n| ' + Array(width).fill(' ').join(' | ') + ' |\n| ' + Array(width).fill('---').join(' | ') + ' |\n' +
      rows.map(row => '| ' + Array.from({ length: width }, (_, i) => row[i] ?? '').join(' | ') + ' |').join('\n') + '\n\n';
  } });
  let body = td.turndown(result.value);
  for (const asset of context.document.assets) {
    if (asset.ocr?.text) body += `\n\n### Görsel OCR: ${asset.path}\n\n${context.escape(asset.ocr.text)}`;
  }
  for (const message of result.messages) context.warn(`DOCX: ${message.message}`);
  context.document.pagination = 'logical-not-original-pages';
  context.warn('DOCX özgün sayfa düzeni korunmaz; üstbilgi, altbilgi, yorum, izlenen değişiklik ve çizimler eksik kalabilir.');
  context.page({ number: 1, text: body, method: 'docx-structure', markdown: true });
}
