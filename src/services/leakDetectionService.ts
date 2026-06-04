import { ConsumptionLog } from '../store/useUtilityStore';

export type AnomalyLevel = 'none' | 'warning' | 'critical';

export interface AnomalyReport {
  level: AnomalyLevel;
  score: number;          // 0-100
  title: string;
  description: string;
  recommendation: string;
  affectedType: 'water' | 'gas' | 'both' | null;
}

interface MonthStats {
  total: number;
  count: number;
  avg: number;
}

function groupByMonth(logs: ConsumptionLog[], type: 'water' | 'gas'): MonthStats[] {
  const map = new Map<string, { vals: number[]; dateKey: string }>();
  logs
    .filter((l) => l.type === type)
    .forEach((l) => {
      const d = new Date(l.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
      if (!map.has(key)) map.set(key, { vals: [], dateKey: key });
      map.get(key)!.vals.push(l.consumption);
    });

  // Tarihe göre artan sırada sırala — son eleman en güncel ay olsun
  return Array.from(map.values())
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .map(({ vals }) => {
      const total = vals.reduce((s, v) => s + v, 0);
      return { total, count: vals.length, avg: total / vals.length };
    });
}

export function analyzeConsumption(logs: ConsumptionLog[]): AnomalyReport {
  if (logs.length < 4) {
    return {
      level: 'none',
      score: 0,
      title: 'Yeterli Veri Yok',
      description: 'Anomali tespiti için en az 4 kayıt gerekli.',
      recommendation: 'Düzenli sayaç okuma yaparak sistemin öğrenmesini sağlayın.',
      affectedType: null,
    };
  }

  const waterMonths = groupByMonth(logs, 'water');
  const gasMonths = groupByMonth(logs, 'gas');

  let maxScore = 0;
  let affectedType: 'water' | 'gas' | 'both' | null = null;

  const calcScore = (months: MonthStats[]): number => {
    if (months.length < 2) return 0;
    const recent = months[months.length - 1].avg;
    const historical = months.slice(0, -1).reduce((s, m) => s + m.avg, 0) / (months.length - 1);
    if (historical === 0) return 0;
    const ratio = recent / historical;
    if (ratio > 2.0) return 90;
    if (ratio > 1.5) return 65;
    if (ratio > 1.3) return 40;
    if (ratio > 1.15) return 20;
    return 0;
  };

  const waterScore = calcScore(waterMonths);
  const gasScore = calcScore(gasMonths);

  if (waterScore > 0 && gasScore > 0) {
    maxScore = Math.max(waterScore, gasScore);
    affectedType = 'both';
  } else if (waterScore > gasScore) {
    maxScore = waterScore;
    affectedType = 'water';
  } else if (gasScore > 0) {
    maxScore = gasScore;
    affectedType = 'gas';
  }

  if (maxScore >= 65) {
    return {
      level: 'critical',
      score: maxScore,
      affectedType,
      title: '🚨 Kritik Tüketim Artışı',
      description: `${affectedType === 'water' ? 'Su' : affectedType === 'gas' ? 'Doğalgaz' : 'Su ve Doğalgaz'} tüketiminiz geçen aylara kıyasla anormal biçimde yüksek. Kaçak veya sızıntı şüphesi var.`,
      recommendation: 'Gece saatlerinde tüm musluklarınızı kapatıp sayacı kontrol edin. Gerekirse bir tesisatçı çağırın.',
    };
  }

  if (maxScore >= 30) {
    return {
      level: 'warning',
      score: maxScore,
      affectedType,
      title: '⚠️ Yüksek Tüketim',
      description: `${affectedType === 'water' ? 'Su' : affectedType === 'gas' ? 'Doğalgaz' : 'Bazı sayaç'} değerleriniz normalin üzerinde.`,
      recommendation: 'Damlayan musluk veya kombi arızası olabilir. Ayda bir kontrol önerilir.',
    };
  }

  return {
    level: 'none',
    score: maxScore,
    affectedType: null,
    title: '✅ Normal Tüketim',
    description: 'Tüketim değerleriniz geçmiş aylarla tutarlı.',
    recommendation: 'Tasarrufu artırmak için Marketplace önerilerimize göz atın.',
  };
}

export function calculateLeakRisk(logs: ConsumptionLog[]): number {
  const report = analyzeConsumption(logs);
  return report.score;
}
