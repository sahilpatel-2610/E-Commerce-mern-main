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

// 1. Generate Legacy Icon (Solid Black Canvas with White Logo)
function createLegacyIcon(targetSize) {
  const png = new PNG({ width: targetSize, height: targetSize });

  // Solid black background (Alpha = 255)
  for (let i = 0; i < targetSize * targetSize; i++) {
    const idx = i << 2;
    png.data[idx] = 0;     // R
    png.data[idx + 1] = 0; // G
    png.data[idx + 2] = 0; // B
    png.data[idx + 3] = 255; // Alpha
  }

  // Draw white logo scaled to 88%
  const scale = 0.88;
  const drawWidth = Math.floor(targetSize * scale);
  const drawHeight = Math.floor(targetSize * scale);
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

// 2. Generate Adaptive Foreground (Transparent Background with White Logo)
function createAdaptiveForeground(targetSize) {
  const png = new PNG({ width: targetSize, height: targetSize });

  // 100% Transparent background (Alpha = 0)
  for (let i = 0; i < targetSize * targetSize; i++) {
    const idx = i << 2;
    png.data[idx] = 0;
    png.data[idx + 1] = 0;
    png.data[idx + 2] = 0;
    png.data[idx + 3] = 0; // Transparent
  }

  // Draw white logo scaled to safe zone (66%)
  const scale = 0.66;
  const drawWidth = Math.floor(targetSize * scale);
  const drawHeight = Math.floor(targetSize * scale);
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

// 3. Generate Solid Black Background Bitmap
function createSolidBlackBackground(targetSize) {
  const png = new PNG({ width: targetSize, height: targetSize });
  for (let i = 0; i < targetSize * targetSize; i++) {
    const idx = i << 2;
    png.data[idx] = 0;     // R
    png.data[idx + 1] = 0; // G
    png.data[idx + 2] = 0; // B
    png.data[idx + 3] = 255; // Solid Black
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

  // 1. Legacy full black square
  const legacyBuf = createLegacyIcon(d.size);
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), legacyBuf);
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), legacyBuf);

  // 2. Adaptive foreground (transparent + white logo)
  const fgBuf = createAdaptiveForeground(d.fgSize);
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fgBuf);

  // 3. Adaptive solid black background
  const bgBuf = createSolidBlackBackground(d.fgSize);
  fs.writeFileSync(path.join(dir, 'ic_launcher_background.png'), bgBuf);

  console.log(`Generated perfect icons for ${d.name}`);
}

// Write colors.xml with pure black
const valuesDir = path.join(resDir, 'values');
if (!fs.existsSync(valuesDir)) fs.mkdirSync(valuesDir, { recursive: true });
fs.writeFileSync(path.join(valuesDir, 'colors.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#000000</color>
</resources>
`);

// Write anydpi-v26 XMLs using @color/ic_launcher_background
const anydpiDir = path.join(resDir, 'mipmap-anydpi-v26');
if (!fs.existsSync(anydpiDir)) fs.mkdirSync(anydpiDir, { recursive: true });

const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;

fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), adaptiveXml);
fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), adaptiveXml);

// Update assets
const appLogo = createLegacyIcon(512);
fs.writeFileSync('d:\\E-Commerce-mern-main\\mobile-flutter\\assets\\logo.png', appLogo);
fs.writeFileSync('d:\\E-Commerce-mern-main\\mobile-flutter\\assets\\logo_brand.png', appLogo);

console.log('ALL ANDROID LAUNCHER ICONS CONFIGURED WITH 100% PURE BLACK BACKGROUND!');
