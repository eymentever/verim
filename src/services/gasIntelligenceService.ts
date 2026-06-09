// ─────────────────────────────────────────────────────────────────────────────
// Verim — Gas Intelligence Service
//
// Doğalgaz tüketimini mevsime göre normalleştirir,
// kaçak/sızıntı riskini puanlar,
// ısıtma optimizasyon önerileri üretir,
// belediye faturasıyla fark analizi yapar.
// ─────────────────────────────────────────────────────────────────────────────

import { ConsumptionLog } from '../store/useUtilityStore';

// ── Tipler ────────────────────────────────────────────────────────────────────

export type RiskLevel = 'safe' | 'elevated' | 'high' | 'critical';

export interface QuickAction {
  label:   string;   // buton metni
  phone?:  string;   // tel: numarası (arama)
  url?:    string;   // https: link
  emoji:   string;
  /** true = kırmızı/acil buton */
  urgent?: boolean;
}

export interface LeakRiskReport {
  level:       RiskLevel;
  score:       number;        // 0–100
  title:       string;
  description: string;
  /** Kullanıcının yapması gereken somut adımlar */
  actions:     string[];
  /** Tek tıkla erişim — acil hat, usta, vs. */
  quickActions?: QuickAction[];
  /** Tahmini aylık TL kayıp (kaçak varsa) */
  estimatedLoss?: number;
}

export interface HeatingOptimization {
  /** Öneri var mı? */
  hasAdvice:        boolean;
  title:            string;
  description:      string;
  /** Aylık tahmini TL tasarruf */
  estimatedSaving:  number;
  tips:             string[];
}

export interface BillingAudit {
  /** Verim'in hesapladığı beklenen tutar */
  expectedCost:   number;
  /** Belediyenin fatura tutarı (kullanıcı girişi) */
  actualBill?:    number;
  /** Fark (+ = belediye fazla fatura etmiş, - = eksik) */
  diff?:          number;
  /** Fark yüzdesi */
  diffPct?:       number;
  verdict:        'match' | 'overcharged' | 'undercharged' | 'unknown';
  message:        string;
}

// ── Acil Hat & Usta Aksiyonları ───────────────────────────────────────────────

/** Şehre göre doğalgaz acil/müşteri hattı */
function gasEmergencyActions(city: string): QuickAction[] {
  const emergencyPhone: Record<string, string> = {
    'İstanbul': '444 1 555',   // İGDAŞ
    'Ankara':   '444 1 212',   // BAŞKENTGAZ
    'İzmir':    '444 0 496',   // İZMİRGAZ
    'Sakarya':  '444 2 432',   // AGDAŞ
  };
  const phone = emergencyPhone[city] ?? '187';

  return [
    { label: 'Acil Hat 187',    phone: '187',   emoji: '🚨', urgent: true },
    { label: `Gaz Şirketi`,     phone,           emoji: '📞' },
    { label: 'Kombi Teknisyeni', phone: '116',   emoji: '🔧' },
  ];
}

// ── Mevsim Modeli ─────────────────────────────────────────────────────────────

/**
 * Türkiye iklim verilerine göre aylık gaz tüketim endeksi.
 * Ocak = 1.0 (baz), yaz ayları ~0.05 (pilot alev vs.)
 * Kaynak: EPDK Türkiye konut gaz tüketim profili
 */
const SEASONAL_GAS_INDEX: Record<number, number> = {
  1: 1.00,   // Ocak   — zirve
  2: 0.92,   // Şubat
  3: 0.65,   // Mart
  4: 0.35,   // Nisan
  5: 0.12,   // Mayıs
  6: 0.05,   // Haziran
  7: 0.05,   // Temmuz
  8: 0.05,   // Ağustos
  9: 0.10,   // Eylül
  10: 0.42,  // Ekim
  11: 0.75,  // Kasım
  12: 0.95,  // Aralık
};

/**
 * Tüketimi mevsimden arındırır.
 * Örn: Ocak'ta 200 m³ vs Temmuz'da 200 m³ çok farklı anlam taşır.
 */
function normalizeGasConsumption(consumption: number, month: number): number {
  const idx = SEASONAL_GAS_INDEX[month] ?? 0.5;
  return idx > 0 ? consumption / idx : consumption;
}

// ── Kaçak Risk Analizi ────────────────────────────────────────────────────────

/**
 * Gaz kaçak/sızıntı riskini hesaplar.
 *
 * Algoritma:
 * 1. Mevsim-normalize edilmiş tüketim geçmiş normalin kaç katı?
 * 2. Yaz aylarında (Haz–Ağu) sıfır olması gereken ısıtma tüketimi var mı?
 * 3. Art arda 2+ anormal okuma = risk yüksel
 *
 * @param logs - Gaz kayıtları (yeni → eski)
 */
export function analyzeGasLeakRisk(logs: ConsumptionLog[], city = 'İstanbul'): LeakRiskReport {
  const gasLogs = logs
    .filter(l => l.type === 'gas' && l.consumption > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (gasLogs.length < 2) {
    return {
      level:       'safe',
      score:       0,
      title:       '📊 Veri Toplanıyor',
      description: 'Kaçak analizi için en az 2 okuma gerekli.',
      actions:     ['Her ay düzenli sayaç okuma yaparak sistemi eğitin.'],
    };
  }

  // Normalize edilmiş tüketim geçmişi
  const normalized = gasLogs.map(l => ({
    norm:  normalizeGasConsumption(l.consumption, new Date(l.date).getMonth() + 1),
    month: new Date(l.date).getMonth() + 1,
    raw:   l.consumption,
    cost:  l.cost,
  }));

  const recent    = normalized[0];
  const baseline  = normalized.slice(1);
  const baselineAvg = baseline.reduce((s, x) => s + x.norm, 0) / baseline.length;

  if (baselineAvg === 0) {
    return {
      level: 'safe', score: 0,
      title: '✅ Normal',
      description: 'Tüketim geçmiş verilerle tutarlı.',
      actions: [],
    };
  }

  const ratio = recent.norm / baselineAvg;

  // Yaz anomalisi: Haz–Ağu'da ısıtma tüketimi olmamalı
  const isSummer = recent.month >= 6 && recent.month <= 8;
  // Yaz anomalisi: mutlak eşik (>15 m³) VE normalize tüketim de yüksek olmalı (ratio >= 1.0).
  // ratio < 1 olduğunda kullanıcı normalden AZ kullanmış demektir — kaçak değil, uyarı yanlış olur.
  const summerAnomaly = isSummer && recent.raw > 15 && ratio >= 1.0;

  // Art arda anomali kontrolü
  const consecutiveAnomalies = normalized
    .slice(0, 3)
    .filter(x => x.norm / baselineAvg > 1.4)
    .length;

  let score = 0;
  if (ratio > 2.5 || summerAnomaly)          score = 90;
  else if (ratio > 2.0)                       score = 75;
  else if (ratio > 1.6)                       score = 55;
  else if (ratio > 1.3)                       score = 30;
  else if (consecutiveAnomalies >= 2)         score = 45;

  // Tahmini kayıp — ratio < 1 durumunda negatif olmasını engelle
  const estimatedLoss = score >= 30
    ? Math.max(0, Math.round((recent.cost - recent.cost / ratio) * 10) / 10)
    : undefined;

  const level: RiskLevel =
    score >= 75 ? 'critical' :
    score >= 50 ? 'high'     :
    score >= 25 ? 'elevated' : 'safe';

  const emergencyActions = gasEmergencyActions(city);

  if (level === 'critical') {
    return {
      level, score,
      title:       '🚨 Gaz Kaçağı Şüphesi',
      description: summerAnomaly
        ? `Yaz ayında beklenmedik yüksek gaz tüketimi (${recent.raw} m³). Bu dönemde ısıtma kullanılmamalı.`
        : `Normalize tüketim geçmiş ortalamanın ${ratio.toFixed(1)}x'i. Ciddi sızıntı olabilir.`,
      actions: [
        'Tüm gaz vanalarını kapatın, sayacın döndüğünü gözlemleyin.',
        'Dönüyorsa ana vanayı kapatın ve derhal gaz şirketini arayın.',
        'Pencere ve kapıları açın, elektrik düğmelerine dokunmayın.',
        '24 saat içinde yetkili teknisyen kontrolü yaptırın.',
      ],
      quickActions: emergencyActions,
      estimatedLoss,
    };
  }

  if (level === 'high') {
    return {
      level, score,
      title:       '⚠️ Yüksek Gaz Tüketimi',
      description: `Tüketim mevsim normalinin ${ratio.toFixed(1)}x'i. Arıza veya verimsiz kullanım söz konusu olabilir.`,
      actions: [
        'Kombinin bakım tarihini kontrol edin (yıllık bakım önerilir).',
        'Radyatör vanalarında kaçak olup olmadığını kontrol edin.',
        'Termostat ayarını kontrol edin — 20°C ideal iç sıcaklıktır.',
        'Gece 23:00–07:00 arası sıcaklığı 17°C\'ye düşürün.',
      ],
      quickActions: [
        { label: 'Kombi Teknisyeni', phone: '116', emoji: '🔧' },
        { label: 'Gaz Şirketi',      phone: emergencyActions[1].phone ?? '187', emoji: '📞' },
      ],
      estimatedLoss,
    };
  }

  if (level === 'elevated') {
    return {
      level, score,
      title:       '📈 Tüketim Artışı',
      description: `Bu ayki tüketim normale göre %${Math.round((ratio - 1) * 100)} yüksek.`,
      actions: [
        'Kombi sıcaklık ayarını kontrol edin.',
        'Pencere/kapı yalıtımını gözden geçirin.',
        'Gereksiz açık bırakılan radyatörler var mı?',
      ],
      estimatedLoss,
    };
  }

  return {
    level: 'safe',
    score,
    title:       '✅ Normal Gaz Tüketimi',
    description: `Tüketim mevsimsel beklentiyle uyumlu (${recent.raw} m³).`,
    actions:     [],
  };
}

// ── Isıtma Optimizasyonu ──────────────────────────────────────────────────────

/**
 * Tüketim profiline ve mevsime göre tasarruf önerileri üretir.
 *
 * @param logs      - Gaz kayıtları
 * @param gasRate   - ₺/m³ birim fiyat (tariffEngine'dan)
 */
export function getHeatingOptimization(
  logs:    ConsumptionLog[],
  gasRate: number = 13.45,
): HeatingOptimization {
  const gasLogs = logs
    .filter(l => l.type === 'gas' && l.consumption > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const month = new Date().getMonth() + 1;
  const isHeatingSeason = month <= 4 || month >= 10;

  if (!isHeatingSeason) {
    return {
      hasAdvice:       false,
      title:           '☀️ Isıtma Sezonu Dışı',
      description:     'Şu an ısıtma gerekmiyor. Kombinin bakımını yaptırmak için ideal zaman.',
      estimatedSaving: 0,
      tips:            ['Sonbaharda kombi bakımı yaptırın — kış öncesi hazırlık.'],
    };
  }

  if (gasLogs.length === 0) {
    return {
      hasAdvice:       true,
      title:           '💡 Isıtma İpuçları',
      description:     'Tüketiminizi kaydetmeye başlayın, kişiselleştirilmiş tasarruf önerileri sunalım.',
      estimatedSaving: 0,
      tips:            GENERAL_HEATING_TIPS,
    };
  }

  const avgMonthlyM3 = gasLogs
    .slice(0, 3)
    .reduce((s, l) => s + l.consumption, 0) / Math.min(gasLogs.length, 3);

  // Her 1°C termostat düşüşü ~%6 tasarruf sağlar (Enerji Bakanlığı verisi)
  const savingPer1Degree = avgMonthlyM3 * 0.06 * gasRate;

  // 2°C düşüş potansiyeli (20°C → 18°C)
  const potentialSaving = Math.round(savingPer1Degree * 2);

  const tips: string[] = [
    `Termostatı 20°C'den 18°C'ye düşür → aylık ~₺${potentialSaving} tasarruf.`,
    'Gece 23:00–07:00 arası kombiyi 16°C\'ye ayarla (uyurken az ısınma yeterli).',
    'Gün içinde evden 3+ saat çıkıyorsan kombini kapat, donma riski yoksa.',
    'Radyatör üstünü kapatma — ısı dağılımını engeller.',
    'Perdeleri gündüz aç (güneş ısısı), gece kapat (yalıtım).',
  ];

  if (avgMonthlyM3 > 150) {
    tips.unshift(`⚡ Aylık ${avgMonthlyM3.toFixed(0)} m³ tüketimin bölge ortalamasının üzerinde. Bina yalıtımı kontrol edilmeli.`);
  }

  return {
    hasAdvice:       true,
    title:           '🌡️ Isıtma Optimizasyonu',
    description:     `Aylık ort. ${avgMonthlyM3.toFixed(0)} m³ gaz kullanıyorsun. Basit ayarlarla ₺${potentialSaving}+ tasarruf edilebilir.`,
    estimatedSaving: potentialSaving,
    tips,
  };
}

const GENERAL_HEATING_TIPS = [
  'Termostatı 20°C\'de sabitle — her ekstra derece %6 fazla maliyet.',
  'Gece kombini 16°C\'ye al.',
  'Yılda bir kombi bakımı yaptır — verimlilik %15 artar.',
  'Kapı ve pencere kenarlarını kontrol et, hava akımını kes.',
];

// ── Fatura Denetimi ───────────────────────────────────────────────────────────

/**
 * Verim'in hesapladığı maliyet ile belediyenin gönderdiği faturayı karşılaştırır.
 *
 * Türkiye'de belediyeler zaman zaman yanlış okuma yapabilir.
 * %10+ fark → itiraz hakkı.
 *
 * @param expectedCost - Verim'in tarife motorundan hesapladığı tutar
 * @param actualBill   - Kullanıcının fatura tutarını girdiği değer (opsiyonel)
 */
export function auditBill(
  expectedCost: number,
  actualBill?:  number,
): BillingAudit {
  if (actualBill === undefined || actualBill <= 0) {
    return {
      expectedCost,
      verdict: 'unknown',
      message: 'Belediye fatura tutarını girin — Verim\'in hesabıyla karşılaştıralım.',
    };
  }

  const diff    = actualBill - expectedCost;
  const diffPct = (diff / expectedCost) * 100;
  const absPct  = Math.abs(diffPct);

  if (absPct <= 10) {
    return {
      expectedCost, actualBill, diff, diffPct,
      verdict: 'match',
      message: `Fatura beklentiyle uyumlu (±%${absPct.toFixed(1)}). ✅`,
    };
  }

  if (diff > 0) {
    return {
      expectedCost, actualBill, diff, diffPct,
      verdict: 'overcharged',
      message: `Belediye ₺${diff.toFixed(2)} fazla fatura etmiş (%${diffPct.toFixed(1)}). İtiraz hakkın var — sayaç fotoğrafıyla müdürlüğe başvur.`,
    };
  }

  return {
    expectedCost, actualBill, diff, diffPct,
    verdict: 'undercharged',
    message: `Fatura beklentinin %${Math.abs(diffPct).toFixed(1)} altında. Sayaç okuması eksik yapılmış olabilir.`,
  };
}

// ── Birleşik Akıllı Analiz ────────────────────────────────────────────────────

export interface GasIntelligenceReport {
  leak:     LeakRiskReport;
  heating:  HeatingOptimization;
  billing:  BillingAudit;
  /** Kullanıcıya gösterilecek en kritik tek mesaj */
  topAlert: string | null;
}

export function getGasIntelligence(
  logs:         ConsumptionLog[],
  gasRate?:     number,
  actualBill?:  number,
  expectedCost?: number,
  city?:        string,
): GasIntelligenceReport {
  const leak    = analyzeGasLeakRisk(logs, city);
  const heating = getHeatingOptimization(logs, gasRate);
  const billing = auditBill(expectedCost ?? 0, actualBill);

  let topAlert: string | null = null;

  if (leak.level === 'critical') {
    topAlert = '🚨 Gaz kaçağı şüphesi! Hemen sayacınızı kontrol edin.';
  } else if (billing.verdict === 'overcharged') {
    topAlert = `💸 Faturanız ₺${(billing.diff ?? 0).toFixed(2)} fazla kesilmiş. İtiraz için sayaç fotoğrafı çekin.`;
  } else if (leak.level === 'high') {
    topAlert = '⚠️ Gaz tüketiminiz normalin çok üzerinde. Kombi bakımı gerekebilir.';
  } else if (heating.hasAdvice && heating.estimatedSaving > 50) {
    topAlert = `💡 Termostat ayarıyla aylık ₺${heating.estimatedSaving} tasarruf edebilirsin.`;
  }

  return { leak, heating, billing, topAlert };
}
