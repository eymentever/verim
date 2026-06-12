import { ConsumptionLog } from '../store/useUtilityStore';

export type ProductCategory =
  | 'thermostat'
  | 'boiler'
  | 'aerator'
  | 'showerhead'
  | 'insulation'
  | 'solar';

export interface MarketplaceProduct {
  id: string;
  category: ProductCategory;
  name: string;
  brand: string;
  description: string;
  price: number;         // TL (estimated)
  savingsPerYear: number; // TL estimated savings
  commissionRate: number; // 0.0–1.0
  affiliateUrl: string;
  imageEmoji: string;
  triggerType: 'water' | 'gas' | 'both';
  triggerRatio: number;  // anomaly ratio threshold to show
}

export const PRODUCTS: MarketplaceProduct[] = [
  {
    id: 'nest-thermostat',
    category: 'thermostat',
    name: 'Akıllı Termostat Pro',
    brand: 'Cosa',
    description: 'Ev yokken ısıtmayı otomatik kapat, aylık %23 gaz tasarrufu sağla.',
    price: 1499,
    savingsPerYear: 2200,
    commissionRate: 0.08,
    affiliateUrl: 'https://verim.app/marketplace/cosa-thermostat',
    imageEmoji: '🌡️',
    triggerType: 'gas',
    triggerRatio: 1.0,
  },
  {
    id: 'boiler-maintenance',
    category: 'boiler',
    name: 'Kombi Bakım Paketi',
    brand: 'ServisFix',
    description: 'Yıllık kombi bakımı ile verimini %18 artır, arıza riskini sıfıra indir.',
    price: 450,
    savingsPerYear: 800,
    commissionRate: 0.15,
    affiliateUrl: 'https://verim.app/marketplace/servfix-boiler',
    imageEmoji: '🔧',
    triggerType: 'gas',
    triggerRatio: 1.3,
  },
  {
    id: 'water-aerator',
    category: 'aerator',
    name: "Su Tasarruf Seti (5'li)",
    brand: 'EcoFlow TR',
    description: 'Musluk ucu aeratörü ile debit %40 azaltırken baskı aynı kalır.',
    price: 189,
    savingsPerYear: 650,
    commissionRate: 0.12,
    affiliateUrl: 'https://verim.app/marketplace/ecoflow-aerator',
    imageEmoji: '🚿',
    triggerType: 'water',
    triggerRatio: 1.0,
  },
  {
    id: 'smart-showerhead',
    category: 'showerhead',
    name: 'Akıllı Duş Başlığı',
    brand: 'Nebia TR',
    description: 'Su kullanımını %65 düşüren atomize duş teknolojisi.',
    price: 799,
    savingsPerYear: 1100,
    commissionRate: 0.10,
    affiliateUrl: 'https://verim.app/marketplace/nebia-shower',
    imageEmoji: '💧',
    triggerType: 'water',
    triggerRatio: 1.2,
  },
  {
    id: 'window-insulation',
    category: 'insulation',
    name: 'Pencere Yalıtım Bandı Seti',
    brand: 'ThermoSeal',
    description: 'Kış aylarında hava kaçağını önle, ısıtma maliyetini düşür.',
    price: 120,
    savingsPerYear: 400,
    commissionRate: 0.10,
    affiliateUrl: 'https://verim.app/marketplace/thermoseal',
    imageEmoji: '🪟',
    triggerType: 'gas',
    triggerRatio: 1.5,
  },
  {
    id: 'solar-water-heater',
    category: 'solar',
    name: 'Güneş Enerjili Su Isıtıcı',
    brand: 'SolarTR',
    description: 'Yaz aylarında doğalgaz sıfırla. 5 yılda kendini amorti eder.',
    price: 8500,
    savingsPerYear: 2800,
    commissionRate: 0.05,
    affiliateUrl: 'https://verim.app/marketplace/solartr-heater',
    imageEmoji: '☀️',
    triggerType: 'gas',
    triggerRatio: 1.0,
  },
];

export interface Recommendation {
  product: MarketplaceProduct;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  estimatedCommission: number; // TL
}

export function getRecommendations(logs: ConsumptionLog[]): Recommendation[] {
  if (logs.length === 0) return [];

  const now = new Date();
  const recent = logs.filter((l) => {
    const d = new Date(l.date);
    const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    return diffMonths <= 1;
  });

  const historical = logs.filter((l) => {
    const d = new Date(l.date);
    const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    return diffMonths > 1 && diffMonths <= 4;
  });

  const avgRecent = (type: 'water' | 'gas') => {
    const filtered = recent.filter((l) => l.type === type);
    return filtered.length ? filtered.reduce((s, l) => s + l.consumption, 0) / filtered.length : 0;
  };

  const avgHistorical = (type: 'water' | 'gas') => {
    const filtered = historical.filter((l) => l.type === type);
    return filtered.length ? filtered.reduce((s, l) => s + l.consumption, 0) / filtered.length : 0;
  };

  const waterRatio = avgHistorical('water') > 0 ? avgRecent('water') / avgHistorical('water') : 1;
  const gasRatio = avgHistorical('gas') > 0 ? avgRecent('gas') / avgHistorical('gas') : 1;

  const recommendations: Recommendation[] = [];

  PRODUCTS.forEach((product) => {
    const ratio = product.triggerType === 'water' ? waterRatio
      : product.triggerType === 'gas' ? gasRatio
      : Math.max(waterRatio, gasRatio);

    if (ratio >= product.triggerRatio) {
      const urgency: Recommendation['urgency'] = ratio >= 1.5 ? 'high' : ratio >= 1.2 ? 'medium' : 'low';
      const pct = Math.round((ratio - 1) * 100);
      const typeLabel = product.triggerType === 'water' ? 'Su' : 'Doğalgaz';
      recommendations.push({
        product,
        urgency,
        // Artış yoksa "%0 artmış" gibi anlamsız gerekçe üretme
        reason: pct > 0
          ? `${typeLabel} tüketiminiz %${pct} artmış.`
          : `${typeLabel} tüketim profilinize uygun tasarruf önerisi.`,
        estimatedCommission: product.price * product.commissionRate,
      });
    }
  });

  return recommendations.sort((a, b) => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });
}

export function getAllProducts(): MarketplaceProduct[] {
  return PRODUCTS;
}
