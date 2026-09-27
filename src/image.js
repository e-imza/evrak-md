import sharp from 'sharp';
import { createWorker, OEM } from 'tesseract.js';
import { createRequire } from 'node:module';
import { mkdtemp, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
export function createOcr(languages = 'tur+eng') {
  let worker, cache;
  return {
    async recognize(image) {
      if (!worker) {
        cache = await mkdtemp(path.join(tmpdir(), 'evrak-md-models-'));
        // The model files ship as npm dependencies. No document or model network requests.
        for (const language of languages.split('+')) {
          const model = require(`@tesseract.js-data/${language}`);
          await cp(path.join(model.langPath, `${language}.traineddata.gz`), path.join(cache, `${language}.traineddata.gz`));
        }
        worker = await createWorker(languages, OEM.LSTM_ONLY, { langPath: cache, cacheMethod: 'none', gzip: true });
      }
      const { data } = await worker.recognize(image, {}, { text: true, blocks: true, tsv: true });
      const header = 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n';
      const tsv = data.tsv ?? '';
      return { text: data.text.trim(), confidence: data.confidence, blocks: data.blocks ?? [],
        coordinateSystem: 'pixels, normalized PNG, origin top-left',
        tsv: tsv.startsWith('level\t') ? tsv : header + tsv };
    },
    async close() {
      try { if (worker) await worker.terminate(); }
      finally { if (cache) await rm(cache, { recursive: true, force: true }); }
    },
  };
}

export async function normalizeImage(buffer, page, maxPixels) {
  return sharp(buffer, { page, pages: 1, limitInputPixels: maxPixels, failOn: 'error' })
    .rotate().flatten({ background: '#ffffff' }).toColourspace('srgb').png().toBuffer();
}

export async function imagePages(buffer, context) {
  const metadata = await sharp(buffer, { limitInputPixels: context.limits.maxPixels }).metadata();
  const count = metadata.pages ?? 1;
  if (count > context.limits.maxPages) throw new Error('Görsel sayfa sayısı sınırı aşıldı.');
  for (let i = 0; i < count; i++) {
    const image = await normalizeImage(buffer, i, context.limits.maxPixels);
    const asset = await context.asset(image, `page-${i + 1}`);
    const ocr = context.options.ocr === 'never' ? null : await context.ocr.recognize(image);
    context.page({ number: i + 1, text: ocr?.text ?? '', method: ocr ? 'ocr' : 'image-only',
      image: asset.path, width: asset.width, height: asset.height, ocr });
  }
}
