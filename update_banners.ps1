$b2 = @{
  fields = @{
    name = @{ stringValue = 'Fashion SaiAagaman' }
    title1 = @{ stringValue = 'Fashion' }
    title2 = @{ stringValue = 'SaiAagaman' }
    subtitle = @{ stringValue = 'Exclusive Showcase' }
    tagline = @{ stringValue = 'Unveiling Modern Elegance & Luxury' }
    video = @{ stringValue = 'https://res.cloudinary.com/dkdvivii2/video/upload/v1787133318/hero_banners/ewk8rjcbmdzorgdtdkyj.mp4' }
    mediaType = @{ stringValue = 'video' }
    link = @{ stringValue = '/collection' }
    createdAt = @{ stringValue = '2026-08-19T06:12:36.522Z' }
  }
} | ConvertTo-Json -Depth 5

$b3 = @{
  fields = @{
    name = @{ stringValue = 'Vraj SaiAagaman' }
    title1 = @{ stringValue = 'Vraj' }
    title2 = @{ stringValue = 'SaiAagaman' }
    subtitle = @{ stringValue = 'Premium Heritage' }
    tagline = @{ stringValue = 'Crafted with Passion & Traditional Grace' }
    video = @{ stringValue = 'https://res.cloudinary.com/dkdvivii2/video/upload/v1787137471/hero_banners/nrcthqkn0crhxompblyo.mp4' }
    mediaType = @{ stringValue = 'video' }
    link = @{ stringValue = '/collection' }
    createdAt = @{ stringValue = '2026-08-19T06:12:36.522Z' }
  }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri 'https://firestore.googleapis.com/v1/projects/ecommerce-mern-main/databases/(default)/documents/homebanners/ban_hero_2' -Method Patch -Body $b2 -ContentType 'application/json'
Invoke-RestMethod -Uri 'https://firestore.googleapis.com/v1/projects/ecommerce-mern-main/databases/(default)/documents/homebanners/ban_hero_3' -Method Patch -Body $b3 -ContentType 'application/json'
Write-Host "Updated Firestore hero banners successfully!"
