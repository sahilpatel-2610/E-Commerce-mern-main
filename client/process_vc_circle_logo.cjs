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

        const dx = x - half;
        const dy = y - half;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const dstIdx = (size * y + x) << 2;

        if (srcX < 0 || srcX >= this.width || srcY < 0 || srcY >= this.height) {
          outPng.data[dstIdx + 3] = 0;
          continue;
        }

        const srcIdx = (this.width * srcY + srcX) << 2;
        const r = this.data[srcIdx];
        const g = this.data[srcIdx + 1];
        const b = this.data[srcIdx + 2];

        if (dist > radius + 1) {
          outPng.data[dstIdx + 3] = 0; // Transparent
        } else if (dist > radius - 1.5) {
          // Smooth edge anti-aliasing
          const edgeAlpha = Math.max(0, Math.min(255, Math.floor((radius + 1 - dist) * 100)));
          outPng.data[dstIdx] = r;
          outPng.data[dstIdx + 1] = g;
          outPng.data[dstIdx + 2] = b;
          outPng.data[dstIdx + 3] = edgeAlpha;
        } else {
          // Inside black circle: keep crisp white and black artwork
          outPng.data[dstIdx] = r;
          outPng.data[dstIdx + 1] = g;
          outPng.data[dstIdx + 2] = b;
          outPng.data[dstIdx + 3] = 255;
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
      console.log('Saved square circular logo to:', t);
    });
  });
