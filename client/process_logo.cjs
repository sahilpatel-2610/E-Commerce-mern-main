const fs = require('fs');
const { PNG } = require('pngjs');

const srcPath = 'C:\\Users\\kakad\\.gemini\\antigravity-ide\\brain\\7fb38b70-4b75-44dd-beb6-f05f3630c4e7\\.user_uploaded\\media_1787036208050.png';

fs.createReadStream(srcPath)
  .pipe(new PNG())
  .on('parsed', function() {
    const minX = 6;
    const maxX = 260;
    const minY = 6;
    const maxY = 98;

    const outWidth = maxX - minX;
    const outHeight = maxY - minY;
    const outPng = new PNG({ width: outWidth, height: outHeight });

    for (let y = 0; y < outHeight; y++) {
      for (let x = 0; x < outWidth; x++) {
        const srcX = minX + x;
        const srcY = minY + y;
        const srcIdx = (this.width * srcY + srcX) << 2;
        const dstIdx = (outWidth * y + x) << 2;

        const r = this.data[srcIdx];
        const g = this.data[srcIdx + 1];
        const b = this.data[srcIdx + 2];

        const brightness = (r + g + b) / 3;

        // Specific artifacts around edges
        const isTopLeftVine = srcX < 24 && srcY < 32 && !(r > 150 && g > 120 && b < 100);
        const isFarLeftArtifact = srcX < 11;
        const isBottomArtifact = srcY > 90 && brightness < 80;
        const isDarkBackground = brightness < 60;
        const isMurky = g > r && g > b && brightness < 85;

        if (isTopLeftVine || isFarLeftArtifact || isBottomArtifact || isDarkBackground || isMurky) {
          outPng.data[dstIdx + 3] = 0; // Transparent
        } else {
          // Keep the exact photo colors with slight contrast tuning
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
      console.log('Saved clean logo to:', t);
    });
  });
