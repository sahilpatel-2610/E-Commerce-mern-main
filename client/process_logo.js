const fs = require('fs');
const { PNG } = require('pngjs');

const srcPath = 'C:\\Users\\kakad\\.gemini\\antigravity-ide\\brain\\7fb38b70-4b75-44dd-beb6-f05f3630c4e7\\.user_uploaded\\media_1787036208050.png';

fs.createReadStream(srcPath)
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    console.log(`Dimensions: ${this.width}x${this.height}`);

    // Process pixels to remove the outer dark/greenish/grey background and keep only the logo elements
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = (this.width * y + x) << 2;
        const r = this.data[idx];
        const g = this.data[idx + 1];
        const b = this.data[idx + 2];
        const a = this.data[idx + 3];

        // Check if pixel belongs to background (dark murky gray/green/black or near black around logo)
        // Logo colors:
        // - Red badge: r > 120 && r > g * 1.5 && r > b * 1.5
        // - Yellow/gold text & crest: r > 100 && g > 90 && b < 100
        // - White/cream 'V': r > 180 && g > 150 && b > 120
        // - Cyan base: b > 100 && g > 100 && r < 80
        // - Silver CREATION text: r > 90 && g > 90 && b > 90 (grayscale)

        const brightness = (r + g + b) / 3;
        const isRedBadge = r > 90 && r > g * 1.3 && r > b * 1.3;
        const isGoldYellow = (r > 80 && g > 70 && b < 80 && (r + g) > 170) || (r > 130 && g > 100 && b < 90);
        const isWhiteCream = (r > 160 && g > 140 && b > 110) || (r > 190 && g > 190 && b > 170);
        const isCyan = (b > 90 && g > 90 && r < 100);
        const isCreationText = (x > this.width * 0.45 && y > this.height * 0.5 && brightness > 45);

        const isLogoPixel = isRedBadge || isGoldYellow || isWhiteCream || isCyan || isCreationText;

        if (!isLogoPixel && (brightness < 60 || (g > r && g > b && brightness < 90))) {
          // Transparent background
          this.data[idx + 3] = 0;
        } else if (brightness < 40) {
          this.data[idx + 3] = 0;
        }
      }
    }

    // Save to all destinations
    const targets = [
      'd:\\E-Commerce-mern-main\\client\\src\\assets\\frontend_assets\\logo.png',
      'd:\\E-Commerce-mern-main\\admin\\src\\assets\\admin_assets\\logo.png',
      'd:\\E-Commerce-mern-main\\client\\public\\logo.png',
      'd:\\E-Commerce-mern-main\\admin\\public\\logo.png'
    ];

    targets.forEach(t => {
      this.pack().pipe(fs.createWriteStream(t));
      console.log('Saved to:', t);
    });
  });
