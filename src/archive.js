import yauzl from 'yauzl';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export async function readArchive(buffer, limits) {
  const zip = await new Promise((resolve, reject) => yauzl.fromBuffer(buffer,
    { lazyEntries: true, validateEntrySizes: true, strictFileNames: true },
    (error, value) => error ? reject(error) : resolve(value)));
  return new Promise((resolve, reject) => {
    const entries = new Map();
    let count = 0, total = 0, ended = false;
    const fail = error => { if (!ended) { ended = true; zip.close(); reject(error); } };
    zip.on('error', fail);
    zip.on('end', () => { if (!ended) { ended = true; resolve(entries); } });
    zip.on('entry', entry => {
      try {
        if (++count > limits.maxEntries) throw new Error('Arşiv dosya sayısı sınırı aşıldı.');
        const name = entry.fileName;
        if (name.includes('\\') || name.startsWith('/') || name.split('/').includes('..') || /^[A-Za-z]:/.test(name))
          throw new Error('Güvenli olmayan arşiv yolu.');
        if (entries.has(name)) throw new Error('Arşivde yinelenen dosya adı.');
        if (entry.isEncrypted()) throw new Error('Şifreli arşiv desteklenmiyor.');
        if (((entry.externalFileAttributes >>> 16) & 0xf000) === 0xa000) throw new Error('Arşiv sembolik bağlantı içeriyor.');
        total += entry.uncompressedSize;
        if (total > limits.maxExpandedBytes || entry.uncompressedSize > limits.maxExpandedBytes)
          throw new Error('Arşiv açılmış boyut sınırı aşıldı.');
        if (name.endsWith('/')) { entries.set(name, Buffer.alloc(0)); zip.readEntry(); return; }
        zip.openReadStream(entry, (error, stream) => {
          if (error) return fail(error);
          const chunks = []; let actual = 0;
          stream.on('error', fail);
          stream.on('data', chunk => {
            actual += chunk.length;
            if (actual > entry.uncompressedSize || actual > limits.maxExpandedBytes) {
              stream.destroy(); fail(new Error('Arşiv boyutu bildirilen boyutla uyuşmuyor.'));
            } else chunks.push(chunk);
          });
          stream.on('end', () => {
            if (!ended) { entries.set(name, Buffer.concat(chunks)); zip.readEntry(); }
          });
        });
      } catch (error) { fail(error); }
    });
    zip.readEntry();
  });
}

export function parseXml(buffer) {
  const xml = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('DTD ve XML varlık tanımları kabul edilmiyor.');
  const valid = XMLValidator.validate(xml);
  if (valid !== true) throw new Error(`Geçersiz XML: ${valid.err.msg}`);
  return new XMLParser({ preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: '',
    trimValues: false, parseTagValue: false, parseAttributeValue: false, processEntities: true }).parse(xml);
}

export const tag = node => Object.keys(node).find(key => key !== ':@');
export const children = node => Array.isArray(node[tag(node)]) ? node[tag(node)] : [];
export const attrs = node => node[':@'] ?? {};
export function textOf(nodes) {
  return nodes.map(node => tag(node) === '#text' ? node['#text'] : textOf(children(node))).join('');
}
