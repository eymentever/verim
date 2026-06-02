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
 * Kademeli su tarifesine göre toplam maliyet hesapla (vergi dahil)
 */
export function calculateWaterCost(
  city: string,
  consumption: number,
  regionStatus?: 'center' | 'town' | 'rural'
): number {
  const config = getCityConfig(city);
  if (!config) return 0;

  let remaining = consumption;
  let cost = 0;
  let prevLimit = 0;

  let discountFactor = 1.0;
  if (regionStatus === 'town') discountFactor = 0.50;
  else if (regionStatus === 'rural') discountFactor = 0.25;

  for (const tier of config.waterTiers) {
    if (remaining <= 0) break;
    const tierVolume = Math.min(remaining, tier.limit - prevLimit);
    cost += tierVolume * (tier.rate * discountFactor);
    remaining -= tierVolume;
    prevLimit = tier.limit;
  }

  // Vergi uygula
  const { kdv, ctv, abonelikUcreti } = config.taxes;
  cost = cost * (1 + kdv + ctv) + (abonelikUcreti * discountFactor);
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
  currentIndex: number,
  regionStatus?: 'center' | 'town' | 'rural'
): { consumption: number; cost: number } {
  const consumption = Math.max(0, currentIndex - prevIndex);
  const cost = type === 'water'
    ? calculateWaterCost(city, consumption, regionStatus)
    : calculateGasCost(city, consumption);
  return { consumption, cost };
}
