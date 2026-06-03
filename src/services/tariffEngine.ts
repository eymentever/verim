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
  /** true = resmi tarife doğrulandı, false = belediye verisi bekleniyor (tahmini) */
  verified?: boolean;
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

  // ── Ek Şehirler ──────────────────────────────────────────────────────────────

  Bursa: {
    city: 'Bursa', verified: true,
    districts: ['Nilüfer','Osmangazi','Yıldırım','Gemlik','Görükle','Kestel','Mustafakemalpaşa','Orhangazi','İnegöl','Karacabey','Mudanya'],
    waterTiers: [
      { limit: 10,  rate: 41.00 },
      { limit: 30,  rate: 62.00 },
      { limit: 999, rate: 85.00 },
    ],
    gasRate: 13.20,
    taxes: { kdv: 0.10, ctv: 0.02, abonelikUcreti: 22.00 },
    currency: 'TRY', lastUpdated: '2026-06',
  },

  Antalya: {
    city: 'Antalya', verified: true,
    districts: ['Muratpaşa','Kepez','Konyaaltı','Alanya','Manavgat','Serik','Aksu','Döşemealtı','Kemer','Kaş','Finike','Kumluca'],
    waterTiers: [
      { limit: 15,  rate: 38.50 },
      { limit: 30,  rate: 57.00 },
      { limit: 999, rate: 78.00 },
    ],
    gasRate: 13.30,
    taxes: { kdv: 0.10, ctv: 0.02, abonelikUcreti: 21.00 },
    currency: 'TRY', lastUpdated: '2026-06',
  },

  Kocaeli: {
    city: 'Kocaeli', verified: true,
    districts: ['İzmit','Gebze','Darıca','Körfez','Derince','Başiskele','Çayırova','Dilovası','Gölcük','Kandıra','Karamürsel','Kartepe'],
    waterTiers: [
      { limit: 15,  rate: 43.00 },
      { limit: 30,  rate: 65.00 },
      { limit: 999, rate: 88.00 },
    ],
    gasRate: 13.45,
    taxes: { kdv: 0.10, ctv: 0.02, abonelikUcreti: 23.00 },
    currency: 'TRY', lastUpdated: '2026-06',
  },

  Konya: {
    city: 'Konya', verified: false,
    districts: ['Selçuklu','Karatay','Meram','Ereğli','Akşehir','Beyşehir','Cihanbeyli','Çumra','Ilgın','Kadınhanı','Kulu','Seydişehir'],
    waterTiers: [
      { limit: 15,  rate: 35.00 },
      { limit: 999, rate: 52.00 },
    ],
    gasRate: 12.90,
    taxes: { kdv: 0.10, ctv: 0.02, abonelikUcreti: 19.00 },
    currency: 'TRY', lastUpdated: '2026-06',
  },

  Gaziantep: {
    city: 'Gaziantep', verified: false,
    districts: ['Şahinbey','Şehitkamil','Oğuzeli','Nizip','İslahiye','Nurdağı','Araban','Yavuzeli','Karkamış','Halfeti'],
    waterTiers: [
      { limit: 15,  rate: 33.00 },
      { limit: 999, rate: 50.00 },
    ],
    gasRate: 12.70,
    taxes: { kdv: 0.10, ctv: 0.02, abonelikUcreti: 18.00 },
    currency: 'TRY', lastUpdated: '2026-06',
  },

  Adana: {
    city: 'Adana', verified: false,
    districts: ['Seyhan','Çukurova','Yüreğir','Sarıçam','Ceyhan','Kozan','İmamoğlu','Karataş','Pozantı','Tufanbeyli'],
    waterTiers: [
      { limit: 15,  rate: 34.00 },
      { limit: 999, rate: 51.00 },
    ],
    gasRate: 12.80,
    taxes: { kdv: 0.10, ctv: 0.02, abonelikUcreti: 19.00 },
    currency: 'TRY', lastUpdated: '2026-06',
  },

  Mersin: {
    city: 'Mersin', verified: false,
    districts: ['Toroslar','Mezitli','Akdeniz','Yenişehir','Tarsus','Erdemli','Silifke','Anamur','Mut','Gülnar'],
    waterTiers: [
      { limit: 15,  rate: 34.50 },
      { limit: 999, rate: 51.50 },
    ],
    gasRate: 12.85,
    taxes: { kdv: 0.10, ctv: 0.02, abonelikUcreti: 19.50 },
    currency: 'TRY', lastUpdated: '2026-06',
  },

  Eskişehir: {
    city: 'Eskişehir', verified: true,
    districts: ['Odunpazarı','Tepebaşı','Alpu','Beylikova','Çifteler','İnönü','Mahmudiye','Mihalgazi','Mihalıççık','Sarıcakaya','Seyitgazi','Sivrihisar'],
    waterTiers: [
      { limit: 15,  rate: 37.00 },
      { limit: 30,  rate: 55.00 },
      { limit: 999, rate: 74.00 },
    ],
    gasRate: 13.10,
    taxes: { kdv: 0.10, ctv: 0.02, abonelikUcreti: 20.50 },
    currency: 'TRY', lastUpdated: '2026-06',
  },

  Kayseri: {
    city: 'Kayseri', verified: false,
    districts: ['Kocasinan','Melikgazi','Talas','Hacılar','İncesu','Pınarbaşı','Bünyan','Develi','Felahiye','Sarız','Tomarza','Yahyalı'],
    waterTiers: [
      { limit: 15,  rate: 36.00 },
      { limit: 999, rate: 54.00 },
    ],
    gasRate: 13.00,
    taxes: { kdv: 0.10, ctv: 0.02, abonelikUcreti: 20.00 },
    currency: 'TRY', lastUpdated: '2026-06',
  },

  Trabzon: {
    city: 'Trabzon', verified: false,
    districts: ['Ortahisar','Akçaabat','Araklı','Arsin','Çaykara','Düzköy','Maçka','Of','Sürmene','Tonya','Vakfıkebir','Yomra'],
    waterTiers: [
      { limit: 15,  rate: 32.00 },
      { limit: 999, rate: 48.00 },
    ],
    gasRate: 12.60,
    taxes: { kdv: 0.10, ctv: 0.02, abonelikUcreti: 18.00 },
    currency: 'TRY', lastUpdated: '2026-06',
  },

  Diyarbakır: {
    city: 'Diyarbakır', verified: false,
    districts: ['Bağlar','Kayapınar','Sur','Yenişehir','Bismil','Çermik','Çınar','Ergani','Hazro','Kulp','Lice','Silvan'],
    waterTiers: [
      { limit: 15,  rate: 30.00 },
      { limit: 999, rate: 45.00 },
    ],
    gasRate: 12.50,
    taxes: { kdv: 0.10, ctv: 0.02, abonelikUcreti: 17.00 },
    currency: 'TRY', lastUpdated: '2026-06',
  },

  Samsun: {
    city: 'Samsun', verified: false,
    districts: ['Atakum','Canik','İlkadım','Tekkeköy','Bafra','Çarşamba','Terme','Vezirköprü','Alaçam','Havza','Kavak','Ladik','Ondokuzmayıs'],
    waterTiers: [
      { limit: 15,  rate: 33.50 },
      { limit: 999, rate: 50.00 },
    ],
    gasRate: 12.70,
    taxes: { kdv: 0.10, ctv: 0.02, abonelikUcreti: 18.50 },
    currency: 'TRY', lastUpdated: '2026-06',
  },

  Hatay: {
    city: 'Hatay', verified: false,
    districts: ['Antakya','İskenderun','Defne','Payas','Dörtyol','Erzin','Hassa','İslahiye','Kırıkhan','Kumlu','Reyhanlı','Samandağ','Yayladağı'],
    waterTiers: [
      { limit: 15,  rate: 31.00 },
      { limit: 999, rate: 46.50 },
    ],
    gasRate: 12.55,
    taxes: { kdv: 0.10, ctv: 0.02, abonelikUcreti: 17.50 },
    currency: 'TRY', lastUpdated: '2026-06',
  },

  Manisa: {
    city: 'Manisa', verified: false,
    districts: ['Şehzadeler','Yunusemre','Akhisar','Alaşehir','Salihli','Soma','Turgutlu','Demirci','Gördes','Kırkağaç','Köprübaşı','Kula','Sarıgöl','Saruhanlı','Selendi'],
    waterTiers: [
      { limit: 15,  rate: 36.50 },
      { limit: 999, rate: 54.50 },
    ],
    gasRate: 13.05,
    taxes: { kdv: 0.10, ctv: 0.02, abonelikUcreti: 20.00 },
    currency: 'TRY', lastUpdated: '2026-06',
  },

  Balıkesir: {
    city: 'Balıkesir', verified: false,
    districts: ['Altıeylül','Karesi','Ayvalık','Bandırma','Bigadiç','Burhaniye','Dursunbey','Edremit','Erdek','Gömeç','Havran','İvrindi','Kepsut','Manyas','Marmara','Savaştepe','Sındırgı','Susurluk'],
    waterTiers: [
      { limit: 15,  rate: 35.50 },
      { limit: 999, rate: 53.00 },
    ],
    gasRate: 13.00,
    taxes: { kdv: 0.10, ctv: 0.02, abonelikUcreti: 19.50 },
    currency: 'TRY', lastUpdated: '2026-06',
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
