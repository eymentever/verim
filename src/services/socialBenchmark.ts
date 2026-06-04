import { ConsumptionLog } from '../store/useUtilityStore';

export interface CityAverage {
  city: string;
  avgMonthlyWater: number;   // m³
  avgMonthlyGas: number;     // m³
  avgMonthlyCost: number;    // TL
  sampleSize: number;
}

// Türkiye şehir ortalama tüketim verileri (TÜİK + belediye kaynaklı tahmin)
export const CITY_AVERAGES: Record<string, CityAverage> = {
  İstanbul:   { city: 'İstanbul',   avgMonthlyWater: 8.2,  avgMonthlyGas: 28.5, avgMonthlyCost: 820, sampleSize: 125400 },
  Ankara:     { city: 'Ankara',     avgMonthlyWater: 7.6,  avgMonthlyGas: 31.2, avgMonthlyCost: 740, sampleSize: 68200 },
  İzmir:      { city: 'İzmir',      avgMonthlyWater: 7.9,  avgMonthlyGas: 22.1, avgMonthlyCost: 680, sampleSize: 52100 },
  Sakarya:    { city: 'Sakarya',    avgMonthlyWater: 7.8,  avgMonthlyGas: 29.0, avgMonthlyCost: 710, sampleSize: 22400 },
  Bursa:      { city: 'Bursa',      avgMonthlyWater: 7.7,  avgMonthlyGas: 30.0, avgMonthlyCost: 730, sampleSize: 18000 },
  Antalya:    { city: 'Antalya',    avgMonthlyWater: 8.5,  avgMonthlyGas: 18.0, avgMonthlyCost: 650, sampleSize: 15000 },
  Kocaeli:    { city: 'Kocaeli',    avgMonthlyWater: 7.5,  avgMonthlyGas: 29.5, avgMonthlyCost: 720, sampleSize: 12000 },
  Konya:      { city: 'Konya',      avgMonthlyWater: 7.2,  avgMonthlyGas: 32.0, avgMonthlyCost: 710, sampleSize: 10000 },
  Gaziantep:  { city: 'Gaziantep',  avgMonthlyWater: 7.0,  avgMonthlyGas: 30.5, avgMonthlyCost: 700, sampleSize: 9000 },
  Adana:      { city: 'Adana',      avgMonthlyWater: 8.0,  avgMonthlyGas: 20.0, avgMonthlyCost: 660, sampleSize: 8500 },
  Mersin:     { city: 'Mersin',     avgMonthlyWater: 8.1,  avgMonthlyGas: 19.5, avgMonthlyCost: 655, sampleSize: 7500 },
  Kayseri:    { city: 'Kayseri',    avgMonthlyWater: 7.3,  avgMonthlyGas: 33.0, avgMonthlyCost: 725, sampleSize: 7000 },
  Eskişehir:  { city: 'Eskişehir',  avgMonthlyWater: 7.4,  avgMonthlyGas: 30.0, avgMonthlyCost: 715, sampleSize: 6000 },
  Diyarbakır: { city: 'Diyarbakır', avgMonthlyWater: 7.1,  avgMonthlyGas: 28.0, avgMonthlyCost: 690, sampleSize: 5500 },
  Samsun:     { city: 'Samsun',     avgMonthlyWater: 7.6,  avgMonthlyGas: 27.5, avgMonthlyCost: 700, sampleSize: 5000 },
  Manisa:     { city: 'Manisa',     avgMonthlyWater: 7.8,  avgMonthlyGas: 25.0, avgMonthlyCost: 690, sampleSize: 4500 },
  Balıkesir:  { city: 'Balıkesir',  avgMonthlyWater: 7.5,  avgMonthlyGas: 26.0, avgMonthlyCost: 695, sampleSize: 4000 },
  Hatay:      { city: 'Hatay',      avgMonthlyWater: 7.9,  avgMonthlyGas: 21.0, avgMonthlyCost: 665, sampleSize: 3500 },
  Trabzon:    { city: 'Trabzon',    avgMonthlyWater: 7.7,  avgMonthlyGas: 28.0, avgMonthlyCost: 705, sampleSize: 3000 },
  Genel:         { city: 'Genel',         avgMonthlyWater: 7.8,  avgMonthlyGas: 27.0, avgMonthlyCost: 720, sampleSize: 1000 },
  Şanlıurfa:     { city: 'Şanlıurfa',     avgMonthlyWater: 7.5,  avgMonthlyGas: 22.0, avgMonthlyCost: 630, sampleSize: 2500 },
  Aydın:         { city: 'Aydın',         avgMonthlyWater: 8.2,  avgMonthlyGas: 20.0, avgMonthlyCost: 660, sampleSize: 2800 },
  Denizli:       { city: 'Denizli',       avgMonthlyWater: 7.6,  avgMonthlyGas: 25.0, avgMonthlyCost: 650, sampleSize: 2200 },
  Tekirdağ:      { city: 'Tekirdağ',      avgMonthlyWater: 7.8,  avgMonthlyGas: 28.0, avgMonthlyCost: 720, sampleSize: 2400 },
  Muğla:         { city: 'Muğla',         avgMonthlyWater: 8.4,  avgMonthlyGas: 16.0, avgMonthlyCost: 690, sampleSize: 2100 },
  Mardin:        { city: 'Mardin',        avgMonthlyWater: 7.0,  avgMonthlyGas: 20.0, avgMonthlyCost: 520, sampleSize: 1500 },
  Kahramanmaraş: { city: 'Kahramanmaraş', avgMonthlyWater: 7.2,  avgMonthlyGas: 28.0, avgMonthlyCost: 620, sampleSize: 1800 },
  Van:           { city: 'Van',           avgMonthlyWater: 7.0,  avgMonthlyGas: 22.0, avgMonthlyCost: 560, sampleSize: 1400 },
  Malatya:       { city: 'Malatya',       avgMonthlyWater: 7.3,  avgMonthlyGas: 28.0, avgMonthlyCost: 620, sampleSize: 1700 },
  Erzurum:       { city: 'Erzurum',       avgMonthlyWater: 7.1,  avgMonthlyGas: 35.0, avgMonthlyCost: 610, sampleSize: 1600 },
  Ordu:          { city: 'Ordu',          avgMonthlyWater: 7.5,  avgMonthlyGas: 26.0, avgMonthlyCost: 620, sampleSize: 1500 },
};

export interface BenchmarkResult {
  city: string;
  userMonthlyWater: number;
  userMonthlyGas: number;
  userMonthlyCost: number;
  cityAvgCost: number;
  savingsPercent: number;   // pozitif = daha tasarruflu
  waterDiffPercent: number;
  gasDiffPercent: number;
  badge: string;
  message: string;
}

export function calculateBenchmark(
  city: string,
  logs: ConsumptionLog[]
): BenchmarkResult | null {
  const avg = CITY_AVERAGES[city] ?? CITY_AVERAGES['Genel'];
  if (!avg || logs.length === 0) return null;

  const now = new Date();
  const thisMonth = logs.filter((l) => {
    const d = new Date(l.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const userWater = thisMonth.filter((l) => l.type === 'water').reduce((s, l) => s + l.consumption, 0);
  const userGas   = thisMonth.filter((l) => l.type === 'gas').reduce((s, l) => s + l.consumption, 0);
  const userCost  = thisMonth.reduce((s, l) => s + l.cost, 0);

  if (userCost === 0) return null;

  const savingsPercent = Math.round(((avg.avgMonthlyCost - userCost) / avg.avgMonthlyCost) * 100);
  const waterDiff = avg.avgMonthlyWater > 0
    ? Math.round(((userWater - avg.avgMonthlyWater) / avg.avgMonthlyWater) * 100)
    : 0;
  const gasDiff = avg.avgMonthlyGas > 0
    ? Math.round(((userGas - avg.avgMonthlyGas) / avg.avgMonthlyGas) * 100)
    : 0;

  let badge: string;
  let message: string;

  if (savingsPercent >= 20) {
    badge = '🏆 Enerji Şampiyonu';
    message = `Hemşehrilerinizden %${savingsPercent} daha tasarruflusunuz! Olağanüstü.`;
  } else if (savingsPercent >= 5) {
    badge = '🌿 Çevre Dostu';
    message = `${city} ortalamasının %${savingsPercent} altındasınız. Harika gidiyorsunuz.`;
  } else if (savingsPercent >= -10) {
    badge = '⚖️ Ortalama';
    message = `Tüketiminiz ${city} ortalamasıyla uyumlu. Biraz daha tasarruf edebilirsiniz.`;
  } else {
    badge = '📈 İyileştirme Gerekli';
    message = `Hemşehrilerinizden %${Math.abs(savingsPercent)} daha fazla harcıyorsunuz. Marketplace önerilerimize bakın.`;
  }

  return {
    city,
    userMonthlyWater: userWater,
    userMonthlyGas: userGas,
    userMonthlyCost: userCost,
    cityAvgCost: avg.avgMonthlyCost,
    savingsPercent,
    waterDiffPercent: waterDiff,
    gasDiffPercent: gasDiff,
    badge,
    message,
  };
}
