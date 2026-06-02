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
      { limit: 10,  rate: 32.40 },   // 0-10 m³
      { limit: 20,  rate: 49.50 },   // 11-20 m³
      { limit: 30,  rate: 68.20 },   // 21-30 m³
      { limit: 999, rate: 89.80 },   // 30+ m³
    ],
    gasRate: 9.327,   // IGDAŞ 2026 konut tarifesi (₺/m³)
    taxes: {
      kdv: 0.10,
      ctv: 0.02,
      abonelikUcreti: 24.50,
    },
    currency: 'TRY',
    lastUpdated: '2026-01',
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
      { limit: 10,  rate: 28.10 },
      { limit: 20,  rate: 43.70 },
      { limit: 30,  rate: 61.40 },
      { limit: 999, rate: 82.00 },
    ],
    gasRate: 8.754,  // BAŞKENTGAZ 2026 konut tarifesi
    taxes: {
      kdv: 0.10,
      ctv: 0.02,
      abonelikUcreti: 20.00,
    },
    currency: 'TRY',
    lastUpdated: '2026-01',
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
      { limit: 10,  rate: 29.80 },
      { limit: 20,  rate: 45.20 },
      { limit: 30,  rate: 63.90 },
      { limit: 999, rate: 85.50 },
    ],
    gasRate: 9.102,  // İZGAZ 2026 konut tarifesi
    taxes: {
      kdv: 0.10,
      ctv: 0.02,
      abonelikUcreti: 22.00,
    },
    currency: 'TRY',
    lastUpdated: '2026-01',
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

const ALL_TURKISH_CITIES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya',
  'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik',
  'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum',
  'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir',
  'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
  'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale',
  'Kırklareli', 'Kırşehir', 'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa',
  'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize',
  'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak', 'Tekirdağ',
  'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
].sort((a, b) => a.localeCompare(b, 'tr'));

export function getCityConfig(city: string): CityTariffConfig {
  return CITY_TARIFFS[city] ?? { ...DEFAULT_TARIFF, city };
}

export function getAllCities(): string[] {
  return ALL_TURKISH_CITIES;
}

export function getDistricts(city: string): string[] {
  return CITY_TARIFFS[city]?.districts ?? [];
}

/**
 * Kademeli su tarifesine göre toplam maliyet hesapla (vergi dahil)
 */
export function calculateWaterCost(city: string, consumption: number): number {
  const config = getCityConfig(city);
  if (!config) return 0;

  let remaining = consumption;
  let cost = 0;
  let prevLimit = 0;

  for (const tier of config.waterTiers) {
    if (remaining <= 0) break;
    const tierVolume = Math.min(remaining, tier.limit - prevLimit);
    cost += tierVolume * tier.rate;
    remaining -= tierVolume;
    prevLimit = tier.limit;
  }

  // Vergi uygula
  const { kdv, ctv, abonelikUcreti } = config.taxes;
  cost = cost * (1 + kdv + ctv) + abonelikUcreti;
  return Math.round(cost * 100) / 100;
}

/**
 * Gaz maliyeti hesapla (vergi dahil)
 */
export function calculateGasCost(city: string, consumption: number): number {
  const config = getCityConfig(city);
  if (!config) return 0;

  let cost = 0;

  if (config.gasTiers && config.gasTiers.length > 0) {
    let remaining = consumption;
    let prevLimit = 0;
    for (const tier of config.gasTiers) {
      if (remaining <= 0) break;
      const tierVolume = Math.min(remaining, tier.limit - prevLimit);
      cost += tierVolume * tier.rate;
      remaining -= tierVolume;
      prevLimit = tier.limit;
    }
  } else {
    cost = consumption * config.gasRate;
  }

  const { kdv, ctv, abonelikUcreti } = config.taxes;
  cost = cost * (1 + kdv + ctv) + abonelikUcreti;
  return Math.round(cost * 100) / 100;
}

/**
 * İki endeks değeri arasındaki tüketim ve maliyeti hesapla
 */
export function calculateFromIndex(
  city: string,
  type: 'water' | 'gas',
  prevIndex: number,
  currentIndex: number
): { consumption: number; cost: number } {
  const consumption = Math.max(0, currentIndex - prevIndex);
  const cost = type === 'water'
    ? calculateWaterCost(city, consumption)
    : calculateGasCost(city, consumption);
  return { consumption, cost };
}
