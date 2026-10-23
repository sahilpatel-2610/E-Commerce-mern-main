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

// 1. Full edge-to-edge solid black legacy icon (filling 95% of box)
function createFullBoxLegacyIcon(targetSize) {
  const png = new PNG({ width: targetSize, height: targetSize });

  // 100% Solid Black background (Alpha = 255)
  for (let i = 0; i < targetSize * targetSize; i++) {
    const idx = i << 2;
    png.data[idx] = 0;
    png.data[idx + 1] = 0;
    png.data[idx + 2] = 0;
    png.data[idx + 3] = 255;
  }

  // Draw white logo filling 95% of box edge to edge
  const scale = 0.95;
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

// 2. Adaptive Foreground (100% Transparent background + White logo only)
function createTransparentForeground(targetSize) {
  const png = new PNG({ width: targetSize, height: targetSize });

  // 100% Transparent canvas (Alpha = 0)
  for (let i = 0; i < targetSize * targetSize; i++) {
    const idx = i << 2;
    png.data[idx] = 0;
    png.data[idx + 1] = 0;
    png.data[idx + 2] = 0;
    png.data[idx + 3] = 0; // Transparent
  }

  // Draw white logo filling 75% safe zone of adaptive layer
  const scale = 0.75;
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
          png.data[dstIdx + 3] = 255; // Solid white logo text
        }
      }
    }
  }

  return PNG.sync.write(png);
}

const densities = [
  { mipmap: 'mipmap-mdpi', drawable: 'drawable-mdpi', size: 48, fgSize: 108 },
  { mipmap: 'mipmap-hdpi', drawable: 'drawable-hdpi', size: 72, fgSize: 162 },
  { mipmap: 'mipmap-xhdpi', drawable: 'drawable-xhdpi', size: 96, fgSize: 216 },
  { mipmap: 'mipmap-xxhdpi', drawable: 'drawable-xxhdpi', size: 144, fgSize: 324 },
  { mipmap: 'mipmap-xxxhdpi', drawable: 'drawable-xxxhdpi', size: 192, fgSize: 432 }
];

for (const d of densities) {
  const mDir = path.join(resDir, d.mipmap);
  const dDir = path.join(resDir, d.drawable);
  if (!fs.existsSync(mDir)) fs.mkdirSync(mDir, { recursive: true });
  if (!fs.existsSync(dDir)) fs.mkdirSync(dDir, { recursive: true });

  // 1. Full black square legacy icons
  const fullBoxIcon = createFullBoxLegacyIcon(d.size);
  fs.writeFileSync(path.join(mDir, 'ic_launcher.png'), fullBoxIcon);
  fs.writeFileSync(path.join(mDir, 'ic_launcher_round.png'), fullBoxIcon);

  // 2. Transparent foreground with white logo (put in BOTH drawable-* and mipmap-*)
  const fgIcon = createTransparentForeground(d.fgSize);
  fs.writeFileSync(path.join(dDir, 'ic_launcher_foreground.png'), fgIcon);
  fs.writeFileSync(path.join(mDir, 'ic_launcher_foreground.png'), fgIcon);

  console.log(`Generated edge-to-edge icons for ${d.mipmap} & ${d.drawable}`);
}

// 3. colors.xml with pure solid black
const valuesDir = path.join(resDir, 'values');
fs.writeFileSync(path.join(valuesDir, 'colors.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#000000</color>
</resources>
`);

// 4. mipmap-anydpi-v26 XMLs using black background color and transparent foreground
const anydpiDir = path.join(resDir, 'mipmap-anydpi-v26');
const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>
`;

fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), adaptiveXml);
fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), adaptiveXml);

// 5. In-app assets
const appLogo = createFullBoxLegacyIcon(512);
fs.writeFileSync('d:\\E-Commerce-mern-main\\mobile-flutter\\assets\\logo.png', appLogo);
fs.writeFileSync('d:\\E-Commerce-mern-main\\mobile-flutter\\assets\\logo_brand.png', appLogo);

console.log('PERFECT EDGE-TO-EDGE BLACK SQUARE LOGO CONFIGURED 100%!');
