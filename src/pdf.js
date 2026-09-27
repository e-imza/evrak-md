import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
export async function readPdf(buffer, context) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const root = path.dirname(require.resolve('pdfjs-dist/package.json'));
  // PDF.js validates a forward-slash suffix even when Node reads a Windows path.
  const resourcePath = name => path.join(root, name).replaceAll('\\', '/') + '/';
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false,
    useSystemFonts: false, cMapUrl: resourcePath('cmaps'), cMapPacked: true,
    standardFontDataUrl: resourcePath('standard_fonts'), wasmUrl: resourcePath('wasm') });
  let doc;
  try {
    doc = await task.promise;
    if (doc.numPages > context.limits.maxPages) throw new Error('PDF sayfa sayısı sınırı aşıldı.');
    context.document.pagination = 'original-pages';
    context.document.signatureValidation = 'not-performed';
    context.warn('PDF okuma sırası karmaşık sütunlarda farklı olabilir; sayfa görselleriyle karşılaştırın.');
    for (let number = 1; number <= doc.numPages; number++) {
      const page = await doc.getPage(number);
      const content = await page.getTextContent();
      let text = '', previousY;
      const spans = [];
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const y = item.transform[5];
        if (previousY !== undefined && Math.abs(y - previousY) > 3 && !text.endsWith('\n')) text += '\n';
        text += item.str + (item.hasEOL ? '\n' : ' ');
        previousY = y;
        spans.push({ text: item.str, transform: item.transform, width: item.width, height: item.height });
      }
      text = text.trim();
      const viewport = page.getViewport({ scale: context.options.dpi / 72 });
      if (viewport.width * viewport.height > context.limits.maxPixels) throw new Error('PDF sayfa piksel sınırı aşıldı.');
      const canvas = doc.canvasFactory.create(Math.ceil(viewport.width), Math.ceil(viewport.height));
      let image;
      try {
        await page.render({ canvasContext: canvas.context, viewport }).promise;
        image = canvas.canvas.toBuffer('image/png');
      } finally { doc.canvasFactory.destroy(canvas); }
      const asset = await context.asset(image, `page-${number}`);
      const shouldOcr = context.options.ocr === 'always' || (context.options.ocr === 'auto' && text.replace(/\s/g, '').length < 40);
      const ocr = shouldOcr ? await context.ocr.recognize(image) : null;
      await context.write(`pages/page-${number}.text.json`, JSON.stringify({ coordinateSystem: 'PDF points, original transform', spans }, null, 2));
      context.page({ number, text: ocr?.text || text, nativeText: text, method: ocr?.text ? 'ocr' : 'pdf-text',
        image: asset.path, width: asset.width, height: asset.height, ocr });
      page.cleanup();
    }
  } finally { await task.destroy(); }
}
