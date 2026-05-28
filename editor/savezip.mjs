// web-pio editor
// savezip.mjs
// ©2026 by D.F.Mac. @TripArts Music
//
// Packages the current script together with the bone template files
// into a downloadable zip archive.
//
// Version:
// - 2026.05.28 start writing
//

// CRC-32 lookup table (IEEE polynomial)
const _crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function _crc32(data) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = _crcTable[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

async function _deflateRaw(data) {
  const cs = new CompressionStream("deflate-raw");
  const writer = cs.writable.getWriter();
  writer.write(data);
  writer.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

function _concat(arrays) {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const a of arrays) { out.set(a, pos); pos += a.length; }
  return out;
}

function _u16(v) {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, v, true);
  return b;
}

function _u32(v) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, v, true);
  return b;
}

async function _buildZip(files) {
  const enc = new TextEncoder();
  const now = new Date();
  const dosTime = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff;
  const dosDate = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

  // Build compressed entries
  const entries = [];
  for (const file of files) {
    const raw = enc.encode(file.text);
    const comp = await _deflateRaw(raw);
    const useDeflate = comp.length < raw.length;
    entries.push({
      nameBytes: enc.encode(file.path),
      method: useDeflate ? 8 : 0,
      data: useDeflate ? comp : raw,
      rawSize: raw.length,
      crc: _crc32(raw)
    });
  }

  // Local file records
  const localParts = [];
  const offsets = [];
  let offset = 0;

  for (const e of entries) {
    offsets.push(offset);
    const header = _concat([
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
      _u16(20), _u16(0), _u16(e.method),
      _u16(dosTime), _u16(dosDate),
      _u32(e.crc), _u32(e.data.length), _u32(e.rawSize),
      _u16(e.nameBytes.length), _u16(0),
      e.nameBytes
    ]);
    localParts.push(header, e.data);
    offset += header.length + e.data.length;
  }

  const cdOffset = offset;

  // Central directory
  const cdParts = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    cdParts.push(_concat([
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]),
      _u16(0x1400), _u16(20), _u16(0), _u16(e.method),
      _u16(dosTime), _u16(dosDate),
      _u32(e.crc), _u32(e.data.length), _u32(e.rawSize),
      _u16(e.nameBytes.length), _u16(0), _u16(0), _u16(0), _u16(0),
      _u32(0), _u32(offsets[i]),
      e.nameBytes
    ]));
  }

  const cdSize = cdParts.reduce((n, p) => n + p.length, 0);

  // End of central directory record
  const eocd = _concat([
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    _u16(0), _u16(0),
    _u16(entries.length), _u16(entries.length),
    _u32(cdSize), _u32(cdOffset),
    _u16(0)
  ]);

  return _concat([...localParts, ...cdParts, eocd]);
}

class SaveZip {
  async make(name, jstext) {
    const [appMjs, indexHtml, readmeMd, pkgJson, pioMin, loggerMjs] = await Promise.all([
      fetch("/examples/bone/app.mjs").then(r => r.text()),
      fetch("/examples/bone/index.html").then(r => r.text()),
      fetch("/examples/bone/README.md").then(r => r.text()),
      fetch("/examples/bone/package.json").then(r => r.text()),
      fetch("/dist/pio.min.mjs").then(r => r.text()),
      fetch("/examples/browser/logger.mjs").then(r => r.text())
    ]);

    const pkg = JSON.parse(pkgJson);
    pkg.description = `${pkg.description} for ${name}`;
    const patchedPkg = JSON.stringify(pkg, null, 2);

    // Rewrite the pio import path to the local copy bundled in the zip
    const patchedJs = jstext.replace(
      /from\s+["'][^"']*pio\.min\.mjs["']/,
      'from "./pio.min.mjs"'
    );

    const files = [
      { path: `${name}/app.mjs`,       text: appMjs },
      { path: `${name}/index.html`,    text: indexHtml.replaceAll("bone", name) },
      { path: `${name}/${name}.mjs`,   text: patchedJs },
      { path: `${name}/README.md`,      text: readmeMd.replaceAll("bone", name) },
      { path: `${name}/package.json`,  text: patchedPkg },
      { path: `${name}/pio.min.mjs`,   text: pioMin },
      { path: `${name}/logger.mjs`,    text: loggerMjs }
    ];

    return await _buildZip(files);
  }
}

export default new SaveZip();
