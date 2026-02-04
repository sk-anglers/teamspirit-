// Simple PNG icon generator
// Creates basic TeamSpirit icons

const fs = require('fs');
const path = require('path');

// Minimal PNG structure
function createPNG(size, color) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);  // width
  ihdrData.writeUInt32BE(size, 4);  // height
  ihdrData.writeUInt8(8, 8);        // bit depth
  ihdrData.writeUInt8(2, 9);        // color type (RGB)
  ihdrData.writeUInt8(0, 10);       // compression
  ihdrData.writeUInt8(0, 11);       // filter
  ihdrData.writeUInt8(0, 12);       // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT chunk - raw image data
  const rawData = [];

  // Parse color
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  // Create image data with a simple "TS" pattern
  for (let y = 0; y < size; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < size; x++) {
      // Create a simple gradient/pattern
      const inBorder = x < 2 || x >= size - 2 || y < 2 || y >= size - 2;
      const centerX = size / 2;
      const centerY = size / 2;
      const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
      const maxDist = size / 2;

      if (inBorder) {
        // Border - darker
        rawData.push(Math.floor(r * 0.7));
        rawData.push(Math.floor(g * 0.7));
        rawData.push(Math.floor(b * 0.7));
      } else if (dist < maxDist * 0.6) {
        // Inner circle - main color
        rawData.push(r);
        rawData.push(g);
        rawData.push(b);
      } else {
        // Outer area - lighter
        rawData.push(Math.min(255, Math.floor(r * 1.2)));
        rawData.push(Math.min(255, Math.floor(g * 1.2)));
        rawData.push(Math.min(255, Math.floor(b * 1.2)));
      }
    }
  }

  // Compress the data using zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 implementation
function crc32(data) {
  let crc = 0xffffffff;
  const table = makeCrcTable();

  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }

  return crc ^ 0xffffffff;
}

function makeCrcTable() {
  const table = new Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

// Generate icons
const sizes = [16, 48, 128];
const color = '#0070d2'; // TeamSpirit blue

sizes.forEach(size => {
  const png = createPNG(size, color);
  const filename = path.join(__dirname, 'icons', `icon${size}.png`);
  fs.writeFileSync(filename, png);
  console.log(`Created ${filename}`);
});

console.log('Icons generated successfully!');
