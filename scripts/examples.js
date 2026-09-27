import { mkdir, writeFile } from 'node:fs/promises';
import { udf, pdf, docx, scan } from '../tests/fixtures.js';
import { convert } from '../src/index.js';

await mkdir('artifacts/examples/input', { recursive: true });
for (const [name, bytes] of [['ornek.udf', await udf({ image: true })], ['metin.pdf', await pdf()],
  ['taranmis.pdf', await pdf({ scanned: true })], ['dilekce.docx', await docx()], ['tarama.png', scan()]]) {
  const input = `artifacts/examples/input/${name}`;
  await writeFile(input, bytes, { flag: 'wx' });
  const result = await convert(input, { output: `artifacts/examples/${name}` });
  console.log(name, result.document.pages.map(p => p.method).join(', '), result.output);
}
