#!/usr/bin/env node
import { parseArgs } from 'node:util';
import path from 'node:path';
import { convert, version } from '../src/index.js';

const help = `evrak-md ${version} — belgeleri yerelde Markdown'a dönüştürür

Kullanım: evrak-md belge.udf [--out yeni-klasor] [--ocr auto|always|never]
         evrak-md bir.pdf iki.docx --out toplu-cikti

  --out PATH        Yeni çıktı klasörü; çoklu girdide dosya başına alt klasör
  --ocr MODE        auto (varsayılan), always, never
  --lang LANG       tur+eng (varsayılan), tur, eng
  --dpi NUMBER      PDF görsel çözünürlüğü: 72–300 (varsayılan 144)
  --json            Sonucu JSON olarak yazdır
  --version         Sürüm
  --help            Yardım

Biçimler: UDF, PDF, DOCX, PNG, JPEG, WebP, TIFF, UTF-8 TXT.
OCR modelleri kurulumla gelir; dönüşüm belge yüklemez. Mevcut çıktılar ezilmez.
Markdown türetilmiş içeriktir. İmza doğrulaması ve hukuki değerlendirme yapmaz.
`;

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    out: { type: 'string' }, ocr: { type: 'string' }, lang: { type: 'string' }, dpi: { type: 'string' },
    json: { type: 'boolean' }, version: { type: 'boolean' }, help: { type: 'boolean', short: 'h' },
  } });
  if (values.help) console.log(help);
  else if (values.version) console.log(version);
  else {
    if (!positionals.length) throw new Error('En az bir girdi dosyası belirtin. Yardım: evrak-md --help');
    const results = [];
    for (let index = 0; index < positionals.length; index++) {
      const input = positionals[index];
      let output = values.out;
      if (positionals.length > 1) output = path.join(output ?? 'output', `${index + 1}-${path.basename(input, path.extname(input))}`);
      try {
        const options = Object.fromEntries(Object.entries({ output, ocr: values.ocr, language: values.lang,
          dpi: values.dpi === undefined ? undefined : Number(values.dpi) }).filter(([, value]) => value !== undefined));
        const result = await convert(input, options);
        results.push({ input, output: result.output, pages: result.document.pages.length, warnings: result.document.warnings, status: 'ok' });
      } catch (error) {
        results.push({ input, status: 'error', error: error.message }); process.exitCode = 1;
      }
    }
    console.log(values.json ? JSON.stringify(results, null, 2) : results.map(r => r.status === 'ok' ?
      `${r.output}/document.md (${r.pages} bölüm/sayfa)${r.warnings.length ? `\n  ${r.warnings.join('\n  ')}` : ''}` : `Hata: ${r.input}: ${r.error}`).join('\n'));
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
