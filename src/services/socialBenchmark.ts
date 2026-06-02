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
  İstanbul: { city: 'İstanbul', avgMonthlyWater: 8.2,  avgMonthlyGas: 28.5, avgMonthlyCost: 820, sampleSize: 125400 },
  Ankara:   { city: 'Ankara',   avgMonthlyWater: 7.6,  avgMonthlyGas: 31.2, avgMonthlyCost: 740, sampleSize: 68200 },
  İzmir:    { city: 'İzmir',    avgMonthlyWater: 7.9,  avgMonthlyGas: 22.1, avgMonthlyCost: 680, sampleSize: 52100 },
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
  const avg = CITY_AVERAGES[city];
  if (!avg || logs.length === 0) return null;

  const now = new Date();
  const thisMonth = logs.filter((l) => {
    const d = new Date(l.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const userWater = thisMonth.filter((l) => l.type === 'water').reduce((s, l) => s + l.indexValue, 0);
  const userGas   = thisMonth.filter((l) => l.type === 'gas').reduce((s, l) => s + l.indexValue, 0);
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
