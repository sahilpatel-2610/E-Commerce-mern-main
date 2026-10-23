const fs = require('fs');
const { PNG } = require('pngjs');

const srcPath = 'C:\\Users\\kakad\\.gemini\\antigravity-ide\\brain\\7fb38b70-4b75-44dd-beb6-f05f3630c4e7\\.user_uploaded\\media_1787041761563.png';

fs.createReadStream(srcPath)
  .pipe(new PNG())
  .on('parsed', function() {
    // Circle center and radius
    const cx = 310.5;
    const cy = 285.5;
    const radius = 282;

    const size = Math.ceil(radius * 2);
    const outPng = new PNG({ width: size, height: size });
    const half = size / 2;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const srcX = Math.round(cx - half + x);
        const srcY = Math.round(cy - half + y);

        const dstIdx = (size * y + x) << 2;

        if (srcX < 0 || srcX >= this.width || srcY < 0 || srcY >= this.height) {
          outPng.data[dstIdx + 3] = 0;
          continue;
        }

        const srcIdx = (this.width * srcY + srcX) << 2;
        const r = this.data[srcIdx];
        const g = this.data[srcIdx + 1];
        const b = this.data[srcIdx + 2];

        // Brightness of pixel (white artwork vs black background)
        const brightness = (r + g + b) / 3;

        // Outside original logo circle bounds or background outside
        const dx = x - half;
        const dy = y - half;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > radius + 4) {
          outPng.data[dstIdx + 3] = 0;
          continue;
        }

        // If pixel is white/light artwork:
        if (brightness > 90) {
          // Pure crisp white artwork with anti-aliasing
          outPng.data[dstIdx] = 255;
          outPng.data[dstIdx + 1] = 255;
          outPng.data[dstIdx + 2] = 255;
          outPng.data[dstIdx + 3] = Math.min(255, Math.floor((brightness / 255) * 255));
        } else if (brightness > 45) {
          // Soft anti-aliased edge
          const alpha = Math.min(255, Math.floor(((brightness - 45) / 45) * 180));
          outPng.data[dstIdx] = 255;
          outPng.data[dstIdx + 1] = 255;
          outPng.data[dstIdx + 2] = 255;
          outPng.data[dstIdx + 3] = alpha;
        } else {
          // Black background inside circle -> 100% transparent!
          outPng.data[dstIdx + 3] = 0;
        }
      }
    }

    const buffer = PNG.sync.write(outPng);

    const targets = [
      'd:\\E-Commerce-mern-main\\client\\src\\assets\\frontend_assets\\logo.png',
      'd:\\E-Commerce-mern-main\\admin\\src\\assets\\admin_assets\\logo.png',
      'd:\\E-Commerce-mern-main\\client\\public\\logo.png',
      'd:\\E-Commerce-mern-main\\admin\\public\\logo.png'
    ];

    targets.forEach(t => {
      fs.writeFileSync(t, buffer);
      console.log('Saved pure transparent white logo to:', t);
    });
  });
