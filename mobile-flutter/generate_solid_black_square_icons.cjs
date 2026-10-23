const fs = require('fs');
const path = require('path');
const { PNG } = require('d:/E-Commerce-mern-main/client/node_modules/pngjs');

const srcPath = 'C:\\Users\\kakad\\.gemini\\antigravity-ide\\brain\\c467f36f-2897-4044-91e4-3e37c64a5e09\\.user_uploaded\\media_1787208143704.png';
const resDir = 'd:\\E-Commerce-mern-main\\mobile-flutter\\android\\app\\src\\main\\res';

const srcData = fs.readFileSync(srcPath);
const srcPng = PNG.sync.read(srcData);

// Find exact bounding box of white artwork
let minX = srcPng.width, maxX = 0, minY = srcPng.height, maxY = 0;
for (let y = 0; y < srcPng.height; y++) {
  for (let x = 0; x < srcPng.width; x++) {
    const idx = (y * srcPng.width + x) * 4;
    const a = srcPng.data[idx + 3];
    const r = srcPng.data[idx];
    const g = srcPng.data[idx + 1];
    const b = srcPng.data[idx + 2];
    if (a > 30 && (r > 40 || g > 40 || b > 40)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const logoWidth = maxX - minX;
const logoHeight = maxY - minY;

function createPureBlackSquareIcon(targetSize, scaleRatio = 0.85) {
  const png = new PNG({ width: targetSize, height: targetSize });

  // 1. Fill entire canvas with 100% OPAQUE SOLID BLACK (Alpha = 255)
  for (let i = 0; i < targetSize * targetSize; i++) {
    const idx = i << 2;
    png.data[idx] = 0;     // R
    png.data[idx + 1] = 0; // G
    png.data[idx + 2] = 0; // B
    png.data[idx + 3] = 255; // 100% OPAQUE - ZERO TRANSPARENCY
  }

  // 2. Draw white logo centered with scaleRatio
  const drawWidth = Math.floor(targetSize * scaleRatio);
  const drawHeight = Math.floor(targetSize * scaleRatio);
  const startX = Math.floor((targetSize - drawWidth) / 2);
  const startY = Math.floor((targetSize - drawHeight) / 2);

  for (let dy = 0; dy < drawHeight; dy++) {
    for (let dx = 0; dx < drawWidth; dx++) {
      const srcX = minX + Math.floor((dx / drawWidth) * logoWidth);
      const srcY = minY + Math.floor((dy / drawHeight) * logoHeight);

      if (srcX >= 0 && srcX < srcPng.width && srcY >= 0 && srcY < srcPng.height) {
        const srcIdx = (srcY * srcPng.width + srcX) << 2;
        const a = srcPng.data[srcIdx + 3];
        const r = srcPng.data[srcIdx];
        const g = srcPng.data[srcIdx + 1];
        const b = srcPng.data[srcIdx + 2];

        if (a > 30 && (r > 40 || g > 40 || b > 40)) {
          const dstIdx = ((startY + dy) * targetSize + (startX + dx)) << 2;
          // Crisp pure white artwork
          png.data[dstIdx] = 255;
          png.data[dstIdx + 1] = 255;
          png.data[dstIdx + 2] = 255;
          png.data[dstIdx + 3] = 255;
        }
      }
    }
  }

  return PNG.sync.write(png);
}

const densities = [
  { name: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { name: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { name: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { name: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { name: 'mipmap-xxxhdpi', size: 192, fgSize: 432 }
];

for (const d of densities) {
  const dir = path.join(resDir, d.name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // 100% Solid Black Square PNGs (Alpha = 255 everywhere)
  const legacyBuf = createPureBlackSquareIcon(d.size, 0.88);
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), legacyBuf);
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), legacyBuf);

  const fgBuf = createPureBlackSquareIcon(d.fgSize, 0.72);
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fgBuf);

  console.log(`Generated 100% solid black icons for ${d.name} (${d.size}x${d.size}, fg: ${d.fgSize}x${d.fgSize})`);
}

// Generate in-app assets as 100% solid black squares
const appLogoBuf = createPureBlackSquareIcon(512, 0.88);
fs.writeFileSync('d:\\E-Commerce-mern-main\\mobile-flutter\\assets\\logo.png', appLogoBuf);
fs.writeFileSync('d:\\E-Commerce-mern-main\\mobile-flutter\\assets\\logo_brand.png', appLogoBuf);
console.log('Generated full solid black assets/logo.png (512x512, Alpha 255)');
