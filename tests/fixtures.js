import { ZipFile } from 'yazl';
import PDFDocument from 'pdfkit';
import { createCanvas } from '@napi-rs/canvas';

export function zip(files) {
  return new Promise(resolve => {
    const archive = new ZipFile(), parts = [];
    for (const [name, value] of Object.entries(files)) archive.addBuffer(Buffer.from(value), name);
    archive.outputStream.on('data', part => parts.push(part));
    archive.outputStream.on('end', () => resolve(Buffer.concat(parts)));
    archive.end();
  });
}

export function scan() {
  const canvas = createCanvas(1400, 500), ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 1400, 500);
  ctx.fillStyle = '#111'; ctx.font = '44px sans-serif';
  ctx.fillText('SENTETIK TEST BELGESI', 70, 100);
  ctx.fillText('Dosya No: 2026/123', 70, 200);
  ctx.fillText('Toplam: 1250 TL', 70, 300);
  ctx.font = '30px sans-serif';
  ctx.fillText('Gercek kisi ve resmi evrak bilgisi icermez.', 70, 400);
  return canvas.toBuffer('image/png');
}

export async function udf({ image = false } = {}) {
  const text = 'T.C. SENTETİK MAHKEME\nİşbu belge test amacıyla oluşturulmuştur. 😀\nDosya\n2026/123\nTutar\n1.250,00 TL\n';
  const first = text.indexOf('İşbu'), table = text.indexOf('Dosya');
  const slices = ['Dosya\n', '2026/123\n', 'Tutar\n', '1.250,00 TL\n'];
  let start = table;
  const cells = slices.map(value => { const node = `<cell><paragraph><content startOffset="${start}" length="${value.length}"/></paragraph></cell>`; start += value.length; return node; });
  const xml = `<?xml version="1.0" encoding="UTF-8"?><template format_id="1.8"><content><![CDATA[${text}]]></content><elements><paragraph><content startOffset="0" length="${first}" bold="true"/></paragraph><paragraph><content startOffset="${first}" length="${table - first}"/></paragraph><table><row>${cells.slice(0, 2).join('')}</row><row>${cells.slice(2).join('')}</row></table>${image ? `<paragraph><image imageData="${scan().toString('base64')}"/></paragraph>` : ''}</elements></template>`;
  return zip({ 'content.xml': xml, 'sign.sgn': 'SYNTHETIC NOT A REAL SIGNATURE' });
}

export async function docx() {
  return zip({
    '[Content_Types].xml': `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    '_rels/.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    'word/_rels/document.xml.rels': `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/test.png"/></Relationships>`,
    'word/media/test.png': scan(),
    'word/document.xml': `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body><w:p><w:r><w:t>Türkçe dilekçe: İstanbul, ığüşöç.</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Dosya</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>2026/123</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:r><w:drawing><wp:inline><wp:extent cx="1000000" cy="400000"/><wp:docPr id="1" name="Test"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:blipFill><a:blip r:embed="rIdImage"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:body></w:document>`,
  });
}

export function pdf({ scanned = false } = {}) {
  return new Promise(resolve => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 }), parts = [];
    doc.on('data', part => parts.push(part));
    doc.on('end', () => resolve(Buffer.concat(parts)));
    if (scanned) doc.image(scan(), 40, 50, { width: 515 });
    else {
      doc.fontSize(18).text('SYNTHETIC OFFICIAL DOCUMENT TEST');
      doc.fontSize(12).text('Case 2026/123. This synthetic test contains no personal information.');
      doc.addPage().fontSize(16).text('PAGE TWO - Supporting evidence 456');
      doc.fontSize(12).text('The second page must remain linked to the original source.');
    }
    doc.end();
  });
}
