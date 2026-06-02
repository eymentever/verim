export interface TariffTier {
  limit: number;   // m³ üst sınır (999 = sınırsız)
  rate: number;    // ₺/m³
}

export interface TaxMultipliers {
  kdv: number;          // KDV oranı (örn. 0.10 = %10)
  ctv: number;          // Çevre Temizlik Vergisi katsayısı
  abonelikUcreti: number; // Sabit aylık abonelik ücreti (₺)
}

export interface CityTariffConfig {
  city: string;
  districts: string[];
  waterTiers: TariffTier[];    // kademeli su tarifeleri
  gasRate: number;              // düz ₺/m³ (IGDAS/GAZDAŞ vb. değişkeni)
  gasTiers?: TariffTier[];      // opsiyonel kademeli gaz
  taxes: TaxMultipliers;
  currency: 'TRY';
  lastUpdated: string;          // 'YYYY-MM'
}

export const CITY_TARIFFS: Record<string, CityTariffConfig> = {
  İstanbul: {
    city: 'İstanbul',
    districts: [
      'Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler',
      'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü',
      'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt',
      'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane',
      'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer',
      'Silivri', 'Sultanbeyli', 'Sultangazi', 'Şile', 'Şişli', 'Tuzla', 'Ümraniye',
      'Üsküdar', 'Zeytinburnu',
    ],
    waterTiers: [
      { limit: 15,  rate: 44.50 },   // 0-15 m³
      { limit: 30,  rate: 68.20 },   // 15-30 m³
      { limit: 999, rate: 89.80 },   // 30+ m³
    ],
    gasRate: 13.45,   // İGDAŞ 2026 konut tarifesi (₺/m³)
    taxes: {
      kdv: 0.10,
      ctv: 0.02,
      abonelikUcreti: 24.50,
    },
    currency: 'TRY',
    lastUpdated: '2026-06',
  },

  Ankara: {
    city: 'Ankara',
    districts: [
      'Akyurt', 'Altındağ', 'Ayaş', 'Bala', 'Beypazarı', 'Çamlıdere', 'Çankaya',
      'Çubuk', 'Elmadağ', 'Etimesgut', 'Evren', 'Gölbaşı', 'Güdül', 'Haymana',
      'Kalecik', 'Kahramankazan', 'Keçiören', 'Kızılcahamam', 'Mamak', 'Nallıhan',
      'Polatlı', 'Pursaklar', 'Sincan', 'Şereflikoçhisar', 'Yenimahalle',
    ],
    waterTiers: [
      { limit: 15,  rate: 58.40 },   // 0-15 m³
      { limit: 30,  rate: 75.00 },   // 15-30 m³
      { limit: 999, rate: 92.00 },   // 30+ m³
    ],
    gasRate: 12.80,  // BAŞKENTGAZ 2026 konut tarifesi (₺/m³)
    taxes: {
      kdv: 0.10,
      ctv: 0.02,
      abonelikUcreti: 20.00,
    },
    currency: 'TRY',
    lastUpdated: '2026-06',
  },

  İzmir: {
    city: 'İzmir',
    districts: [
      'Aliağa', 'Balçova', 'Bayındır', 'Bayraklı', 'Bergama', 'Beydağ', 'Bornova',
      'Buca', 'Çeşme', 'Çiğli', 'Dikili', 'Foça', 'Gaziemir', 'Güzelbahçe',
      'Karabağlar', 'Karaburun', 'Karşıyaka', 'Kemalpaşa', 'Kınık', 'Kiraz',
      'Konak', 'Menderes', 'Menemen', 'Narlıdere', 'Ödemiş', 'Seferihisar',
      'Selçuk', 'Tire', 'Torbalı', 'Urla',
    ],
    waterTiers: [
      { limit: 6,   rate: 25.00 },   // 0-6 m³ (İndirimli ilk kademe)
      { limit: 20,  rate: 60.00 },   // 6-20 m³
      { limit: 40,  rate: 99.83 },   // 20-40 m³
      { limit: 999, rate: 145.00 },  // 40+ m³
    ],
    gasRate: 13.10,  // İZMİRGAZ 2026 konut tarifesi (₺/m³)
    taxes: {
      kdv: 0.10,
      ctv: 0.02,
      abonelikUcreti: 22.00,
    },
    currency: 'TRY',
    lastUpdated: '2026-06',
  },

  Sakarya: {
    city: 'Sakarya',
    districts: [
      'Adapazarı', 'Akyazı', 'Arifiye', 'Erenler', 'Ferizli', 'Geyve',
      'Hendek', 'Karapürçek', 'Karasu', 'Kaynarca', 'Kocaali', 'Pamukova',
      'Sapanca', 'Serdivan', 'Söğütlü', 'Taraklı'
    ],
    waterTiers: [
      { limit: 15,  rate: 42.77 },   // SASKİ 2026 Konut 1 (su + atıksu)
      { limit: 999, rate: 60.00 },   // 15+ m³
    ],
    gasRate: 13.00,   // AGDAŞ / Aksa 2026 konut tarifesi (₺/m³)
    taxes: {
      kdv: 0.10,
      ctv: 0.02,
      abonelikUcreti: 20.00,
    },
    currency: 'TRY',
    lastUpdated: '2026-06',
  },
};

export const DEFAULT_TARIFF: CityTariffConfig = {
  city: 'Genel',
  districts: [],
  waterTiers: [
    { limit: 15,  rate: 30.00 },   // 0-15 m³
    { limit: 999, rate: 45.00 },   // 15+ m³
  ],
  gasRate: 9.00,
  taxes: {
    kdv: 0.10,
    ctv: 0.02,
    abonelikUcreti: 20.00,
  },
  currency: 'TRY',
  lastUpdated: '2026-01',
};

export function getCityConfig(city: string): CityTariffConfig {
  return CITY_TARIFFS[city] ?? { ...DEFAULT_TARIFF, city };
}

export function getAllCities(): string[] {
  return Object.keys(CITY_TARIFFS);
}

export function getDistricts(city: string): string[] {
  return CITY_TARIFFS[city]?.districts ?? [];
}

/**
 * İlçe bazlı resmi su fiyatı indirim oranını döner (ASKİ ve İZSU çevre yerleşim/ilçe tarifeleri)
 */
export function getDistrictWaterMultiplier(city: string, district: string): number {
  if (city === 'Ankara') {
    const outerDistricts = [
      'Akyurt', 'Ayaş', 'Bala', 'Beypazarı', 'Çamlıdere', 'Çubuk', 'Elmadağ',
      'Evren', 'Güdül', 'Haymana', 'Kalecik', 'Kahramankazan', 'Kızılcahamam',
      'Polatlı', 'Şereflikoçhisar',
    ];
    if (outerDistricts.includes(district)) {
      return 0.60; // ASKİ çevre yerleşim/ilçe %40 resmi indirimli tarife
    }
  }

  if (city === 'İzmir') {
    const outerDistricts = [
      'Aliağa', 'Bayındır', 'Bergama', 'Beydağ', 'Çeşme', 'Dikili', 'Foça',
      'Karaburun', 'Kemalpaşa', 'Kınık', 'Kiraz', 'Menderes', 'Menemen',
      'Ödemiş', 'Seferihisar', 'Selçuk', 'Tire', 'Torbalı', 'Urla',
    ];
    if (outerDistricts.includes(district)) {
      return 0.60; // İZSU çevre yerleşimler %40 resmi indirimli tarife
    }
  }

  if (city === 'Sakarya') {
    const outerDistricts = [
      'Akyazı', 'Hendek', 'Karapürçek', 'Geyve', 'Pamukova', 'Taraklı',
    ];
    if (outerDistricts.includes(district)) {
      return 0.80; // SASKİ Konut 2 çevre yerleşim/ilçe %20 resmi indirimli tarife
    }
  }

  return 1.0; // İstanbul ve diğer merkez ilçeler için standart tarife (%100)
}

/**
 * Kademeli su tarifesine göre toplam maliyet hesapla (vergi dahil)
 */
export function calculateWaterCost(
  city: string,
  consumption: number,
  district?: string
): number {
  const config = getCityConfig(city);
  if (!config) return 0;

  let remaining = consumption;
  let rawTariff = 0;
  let prevLimit = 0;

  // İlçe bazlı resmi katsayı çarpanı
  const discountFactor = district ? getDistrictWaterMultiplier(city, district) : 1.0;

  for (const tier of config.waterTiers) {
    if (remaining <= 0) break;
    const tierVolume = Math.min(remaining, tier.limit - prevLimit);
    rawTariff += tierVolume * (tier.rate * discountFactor);
    remaining -= tierVolume;
    prevLimit = tier.limit;
  }

  // Resmi Bakanlık ve Belediye Vergilendirmesi (2026):
  // 1. Su KDV (%1 su + %10 atıksu = Ortalama %4.0 KDV)
  const kdvCost = rawTariff * 0.04;
  // 2. ÇTV (Büyükşehirlerde m³ başına maktu 4.00 ₺)
  const ctvCost = consumption * 4.00;
  // 3. Sabit Bakım/Abonelik Ücreti (%10 KDV dahil)
  const subCost = (config.taxes.abonelikUcreti * discountFactor) * 1.10;

  const total = rawTariff + kdvCost + ctvCost + subCost;
  return Math.round(total * 100) / 100;
}

/**
 * Gaz maliyeti hesapla (vergi dahil)
 */
export function calculateGasCost(city: string, consumption: number): number {
  const config = getCityConfig(city);
  if (!config) return 0;

  let rawTariff = 0;

  if (config.gasTiers && config.gasTiers.length > 0) {
    let remaining = consumption;
    let prevLimit = 0;
    for (const tier of config.gasTiers) {
      if (remaining <= 0) break;
      const tierVolume = Math.min(remaining, tier.limit - prevLimit);
      rawTariff += tierVolume * tier.rate;
      remaining -= tierVolume;
      prevLimit = tier.limit;
    }
  } else {
    rawTariff = consumption * config.gasRate;
  }

  // Resmi EPDK ve Maliye Bakanlığı Vergilendirmesi (2026):
  // 1. ÖTV (Maktu 0.074077 ₺/m³)
  const otvCost = consumption * 0.074077;
  // 2. KDV (Tüketim bedeli ve ÖTV toplamı üzerinden %20)
  const kdvCost = (rawTariff + otvCost) * 0.20;
  // 3. Sabit Bakım/Servis Bedeli (%20 KDV dahil)
  const subCost = config.taxes.abonelikUcreti * 1.20;

  const total = rawTariff + otvCost + kdvCost + subCost;
  return Math.round(total * 100) / 100;
}

/**
 * İki endeks değeri arasındaki tüketim ve maliyeti hesapla
 */
export function calculateFromIndex(
  city: string,
  type: 'water' | 'gas',
  prevIndex: number,
  currentIndex: number,
  district?: string
): { consumption: number; cost: number } {
  const consumption = Math.max(0, currentIndex - prevIndex);
  const cost = type === 'water'
    ? calculateWaterCost(city, consumption, district)
    : calculateGasCost(city, consumption);
  return { consumption, cost };
}
