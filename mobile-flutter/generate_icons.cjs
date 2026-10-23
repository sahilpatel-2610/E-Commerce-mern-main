const fs = require('fs');
const path = require('path');
const { PNG } = require('d:/E-Commerce-mern-main/client/node_modules/pngjs');

const srcPath = 'C:\\Users\\kakad\\.gemini\\antigravity-ide\\brain\\c467f36f-2897-4044-91e4-3e37c64a5e09\\.user_uploaded\\media_1787208143704.png';
const resDir = 'd:\\E-Commerce-mern-main\\mobile-flutter\\android\\app\\src\\main\\res';

const srcData = fs.readFileSync(srcPath);
const srcPng = PNG.sync.read(srcData);

// Nearest neighbor resize with background control
function createSquareIcon(targetSize, isForeground) {
  const png = new PNG({ width: targetSize, height: targetSize });
  
  // Safe zone scale for foreground in adaptive icons (approx 72%)
  const scale = isForeground ? 0.72 : 0.90;
  const drawWidth = Math.floor(targetSize * scale);
  const drawHeight = Math.floor(targetSize * scale);
  const offsetX = Math.floor((targetSize - drawWidth) / 2);
  const offsetY = Math.floor((targetSize - drawHeight) / 2);

  for (let y = 0; y < targetSize; y++) {
    for (let x = 0; x < targetSize; x++) {
      const dstIdx = (targetSize * y + x) << 2;

      // Base background
      if (isForeground) {
        png.data[dstIdx] = 0;
        png.data[dstIdx + 1] = 0;
        png.data[dstIdx + 2] = 0;
        png.data[dstIdx + 3] = 0; // Transparent for adaptive foreground
      } else {
        png.data[dstIdx] = 0;
        png.data[dstIdx + 1] = 0;
        png.data[dstIdx + 2] = 0;
        png.data[dstIdx + 3] = 255; // Solid black square for legacy
      }

      // Check if inside logo area
      if (x >= offsetX && x < offsetX + drawWidth && y >= offsetY && y < offsetY + drawHeight) {
        const srcX = Math.floor(((x - offsetX) / drawWidth) * srcPng.width);
        const srcY = Math.floor(((y - offsetY) / drawHeight) * srcPng.height);
        const srcIdx = (srcPng.width * srcY + srcX) << 2;

        const r = srcPng.data[srcIdx];
        const g = srcPng.data[srcIdx + 1];
        const b = srcPng.data[srcIdx + 2];
        const brightness = (r + g + b) / 3;

        if (brightness > 60) {
          // White logo artwork
          png.data[dstIdx] = 255;
          png.data[dstIdx + 1] = 255;
          png.data[dstIdx + 2] = 255;
          png.data[dstIdx + 3] = 255;
        } else if (!isForeground) {
          // Solid black background
          png.data[dstIdx] = 0;
          png.data[dstIdx + 1] = 0;
          png.data[dstIdx + 2] = 0;
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

  // Full black square legacy icons
  const iconBuf = createSquareIcon(d.size, false);
  fs.writeFileSync(path.join(dir, 'ic_launcher.png'), iconBuf);
  fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), iconBuf);

  // Adaptive foreground with safe-zone margin
  const fgBuf = createSquareIcon(d.fgSize, true);
  fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), fgBuf);

  console.log(`Generated icons for ${d.name} (${d.size}x${d.size}, fg: ${d.fgSize}x${d.fgSize})`);
}

// Generate assets/logo.png
const appLogoBuf = createSquareIcon(512, false);
fs.writeFileSync('d:\\E-Commerce-mern-main\\mobile-flutter\\assets\\logo.png', appLogoBuf);
fs.writeFileSync('d:\\E-Commerce-mern-main\\mobile-flutter\\assets\\logo_brand.png', appLogoBuf);
console.log('Generated full square black assets/logo.png (512x512)');
