# Verim — Fatura & Sayaç Takip Uygulaması

React Native (Expo Router + TypeScript) ile geliştirilmiş, Türkiye'ye özgü su ve doğalgaz sayaç takip uygulaması.

---

## Proje Yapısı

```
verim/
├── app/
│   ├── index.tsx          # Ana dashboard (dark premium UI)
│   ├── scan.tsx           # OCR sayaç tarayıcı
│   ├── analytics.tsx      # SVG grafikler & tarife yönetimi
│   └── _layout.tsx        # Expo Router layout
├── src/
│   ├── components/        # Yeniden kullanılabilir UI bileşenleri
│   ├── store/
│   │   └── useUtilityStore.ts   # Zustand + AsyncStorage
│   ├── services/
│   │   └── ocrService.ts        # OCR simülasyonu / gerçek entegrasyon
│   └── hooks/                   # Özel state observer hook'ları
├── package.json
└── tsconfig.json
```

---

## Kurulum

```bash
npx create-expo-app verim --template blank-typescript
cd verim

# Bağımlılıkları yükle
npx expo install expo-router react-native-svg
npm install zustand @react-native-async-storage/async-storage

# Geliştirme sunucusunu başlat
npx expo start
```

---

## Temel Özellikler

- **Dark Premium Dashboard** — aylık toplam, ay sonu tahmini, kaçak uyarısı
- **Sayaç Tarayıcı** — animasyonlu viewfinder, OCR sonuç doğrulama modalı
- **Analitik** — 6 aylık SVG bar grafiği, şehir bazlı tarife yönetimi
- **Kalıcı Depolama** — Zustand + AsyncStorage ile cihaz üzerinde veri saklama
- **Çoklu Şehir Tarifeleri** — İstanbul, Ankara, İzmir (2026 tarifeleri)

---

## Yol Haritası

### Faz 1 — OCR Entegrasyonu
- [ ] Google ML Kit (on-device) ile gerçek OCR
- [ ] Tesseract.js web fallback
- [ ] Sayaç tipine göre model optimizasyonu (7-segment display)

### Faz 2 — Gelişmiş Analitik
- [ ] Yıllık karşılaştırma grafikleri
- [ ] Tüketim anomali tespiti (ML tabanlı)
- [ ] PDF fatura ihracatı

### Faz 3 — Entegrasyonlar
- [ ] TEDAŞ / İGDAŞ API bağlantısı
- [ ] Push notification — fatura son ödeme hatırlatıcısı
- [ ] Widget (iOS/Android) — güncel tüketim özeti

### Faz 4 — Sosyal & Gamification
- [ ] Mahalle bazlı tüketim karşılaştırması
- [ ] Tasarruf rozeti sistemi
- [ ] Aile hesabı paylaşımı

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Framework | Expo SDK 52 + Expo Router v4 |
| Dil | TypeScript 5 |
| State | Zustand 4 + AsyncStorage |
| Grafik | react-native-svg |
| OCR (mock) | simulateOCR → Google ML Kit (planlı) |
| Navigasyon | Expo Router (file-based) |
