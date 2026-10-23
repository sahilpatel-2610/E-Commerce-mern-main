# Vraj Creation - React Native Mobile App

Bespoke Luxury Menswear Mobile Application built with **React Native & Expo**, connected directly to **Firebase Firestore**.

## Features
- **Live Firebase Firestore Integration**: Fetches real-time products, hero showcase banners, and dynamic categories.
- **Cart Context & State**: Global cart with size options, badge indicator, and Cash on Delivery order placement.
- **Screens**:
  - `HomeScreen`: Hero Showcase, Latest Collections, and Brand heritage.
  - `CollectionScreen`: Searchable, filterable catalog grid by category and search keyword.
  - `ProductDetailScreen`: Luxury image display, size selector, and Add-to-Bag flow.
  - `CartScreen`: Dynamic quantity adjustment, price calculation, and delivery checkout.
  - `ProfileScreen`: Customer account and atelier contact.

## How to Run on Mobile Device or Emulator

### Option 1: Run instantly on your phone with Expo Go
1. Install **Expo Go** from Google Play Store or Apple App Store.
2. Open terminal in this folder and run:
   ```bash
   cd mobile-react-native
   npm install
   npx expo start
   ```
3. Scan the QR code displayed in the terminal using the Expo Go app.

### Option 2: Run in Android Emulator
```bash
npx expo start --android
```
