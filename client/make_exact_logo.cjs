const fs = require('fs');
const { PNG } = require('pngjs');

const srcPath = 'C:\\Users\\kakad\\.gemini\\antigravity-ide\\brain\\7fb38b70-4b75-44dd-beb6-f05f3630c4e7\\.user_uploaded\\media_1787036208050.png';

fs.createReadStream(srcPath)
  .pipe(new PNG())
  .on('parsed', function() {
    const minX = 14;
    const maxX = 258;
    const minY = 8;
    const maxY = 94;

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

        // Specific artifacts: top curl & left vine
        if ((srcX < 50 && srcY < 24) || srcX < 18) {
          outPng.data[dstIdx + 3] = 0;
          continue;
        }

        // 1. Red badge
        const isRed = r > 100 && r > g * 1.35 && r > b * 1.35;
        // 2. Yellow / gold elements: Vraj 'raj', V-wing, Diamond crest
        const isGold = (r > 100 && g > 80 && b < 90) || (r > 140 && g > 115 && b < 110);
        // 3. White / light orange inside V shield
        const isVShield = (srcX >= 18 && srcX < 75 && srcY >= 20 && srcY < 75 && (r > 150 && g > 110 && b > 70));
        // 4. Cyan lower crest
        const isCyan = (srcX > 140 && srcX < 215 && srcY > 40 && srcY < 75 && b > 85 && g > 85);
        // 5. 'CREATION' text
        const isCreation = (srcX > 125 && srcY > 58 && srcY < 95 && r > 60 && g > 60 && b > 65 && Math.abs(r - g) < 25 && Math.abs(g - b) < 25);
        // 6. Center glowing eye of diamond crest
        const isCrestCenter = (srcX > 150 && srcX < 205 && srcY > 8 && srcY < 60 && (r + g) > 190);

        const isForeground = isRed || isGold || isVShield || isCyan || isCreation || isCrestCenter;

        if (isForeground) {
          outPng.data[dstIdx] = r;
          outPng.data[dstIdx + 1] = g;
          outPng.data[dstIdx + 2] = b;
          outPng.data[dstIdx + 3] = 255;
        } else {
          const brightness = (r + g + b) / 3;
          if (brightness > 60) {
            const alpha = Math.min(255, Math.floor((brightness - 50) * 4));
            outPng.data[dstIdx] = r;
            outPng.data[dstIdx + 1] = g;
            outPng.data[dstIdx + 2] = b;
            outPng.data[dstIdx + 3] = alpha;
          } else {
            outPng.data[dstIdx + 3] = 0;
          }
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
      console.log('Saved to:', t);
    });
  });
