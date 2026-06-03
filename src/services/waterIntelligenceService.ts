// ─────────────────────────────────────────────────────────────────────────────
// Verim — Water Intelligence Service
//
// Su tüketimini mevsime ve hane büyüklüğüne göre normalleştirir,
// kaçak/sızıntı riskini puanlar (damlayan musluk, tuvalet sızıntısı),
// tasarruf önerileri üretir,
// belediye faturasıyla fark analizi yapar.
//
// Kaynak: DSİ / Türkiye Su Verimliliği Eylem Planı 2023
//         Türkiye Kişi Başı Su Tüketimi: 185–220 L/kişi/gün (şehir)
// ─────────────────────────────────────────────────────────────────────────────

import { ConsumptionLog } from '../store/useUtilityStore';

// ── Tipler ────────────────────────────────────────────────────────────────────

export type WaterRiskLevel = 'safe' | 'elevated' | 'high' | 'critical';

export interface QuickAction {
  label:   string;
  phone?:  string;
  url?:    string;
  emoji:   string;
  urgent?: boolean;
}

export interface WaterLeakReport {
  level:           WaterRiskLevel;
  score:           number;         // 0–100
  title:           string;
  description:     string;
  /** Kullanıcının yapması gereken somut adımlar */
  actions:         string[];
  /** Tek tıkla erişim butonları */
  quickActions?:   QuickAction[];
  /** Tahmini günlük su kaybı (litre) */
  estimatedLossL?: number;
  /** Tahmini aylık TL kayıp */
  estimatedCostLoss?: number;
}

export interface WaterSavingAdvice {
  hasAdvice:        boolean;
  title:            string;
  description:      string;
  /** Aylık tahmini TL tasarruf */
  estimatedSaving:  number;
  tips:             string[];
}

export interface WaterBillingAudit {
  expectedCost:  number;
  actualBill?:   number;
  diff?:         number;
  diffPct?:      number;
  verdict:       'match' | 'overcharged' | 'undercharged' | 'unknown';
  message:       string;
  /** İtiraz adımları — sadece overcharged durumunda */
  appealSteps?:  string[];
}

// ── Acil Hat & Usta Aksiyonları ───────────────────────────────────────────────

/** Şehre göre su idaresi acil hattı */
function waterEmergencyActions(city: string): QuickAction[] {
  const emergencyPhone: Record<string, string> = {
    'İstanbul': '185',          // İSKİ arıza
    'Ankara':   '444 1 880',    // ASKİ arıza
    'İzmir':    '444 1 362',    // İZSU arıza
    'Sakarya':  '444 0 727',    // SASKİ arıza
  };
  const phone = emergencyPhone[city] ?? '185';

  return [
    { label: `Su İdaresi Acil`, phone, emoji: '🚨', urgent: true },
    { label: 'Tesisatçı Çağır', phone: '116',  emoji: '🔧' },
    { label: 'Apartman Yöneticisi', emoji: '🏢' },
  ];
}

// ── Mevsim Modeli ─────────────────────────────────────────────────────────────

/**
 * Türkiye konut su tüketim mevsimsel endeksi.
 * Ocak = 1.0 (baz), yaz ayları %30–40 daha yüksek (bahçe, klima, duş sıklığı)
 * Kaynak: İSKİ / ASKİ yıllık tüketim profili raporları
 */
const SEASONAL_WATER_INDEX: Record<number, number> = {
  1:  1.00,  // Ocak   — baz
  2:  1.02,  // Şubat
  3:  1.08,  // Mart
  4:  1.15,  // Nisan
  5:  1.22,  // Mayıs
  6:  1.35,  // Haziran — yaz zirvesi başlangıcı
  7:  1.42,  // Temmuz  — zirve
  8:  1.40,  // Ağustos
  9:  1.25,  // Eylül
  10: 1.10,  // Ekim
  11: 1.03,  // Kasım
  12: 1.00,  // Aralık
};

function normalizeWaterConsumption(m3: number, month: number): number {
  const idx = SEASONAL_WATER_INDEX[month] ?? 1.0;
  return m3 / idx;
}

// ── Referans Eşikler ──────────────────────────────────────────────────────────

/**
 * Türkiye şehir ortalaması: ~6 m³/kişi/ay
 * 3 kişilik hane: ~18 m³/ay → 2 kişilik: ~12, 4 kişilik: ~24
 * Damlayan musluk: 5–50 L/gün → aylık 0.15–1.5 m³ fazla
 * Tuvalet sızıntısı: 100–400 L/gün → aylık 3–12 m³ fazla
 */
const THRESHOLDS = {
  singlePerson:    6,    // m³/ay (1 kişi)
  avgPerPerson:    6,    // m³/ay/kişi
  leakDrip:        0.15, // m³/ay (damlayan musluk alt sınır)
  leakToilet:      3.0,  // m³/ay (tuvalet sızıntısı alt sınır)
  leakPipe:        8.0,  // m³/ay (boru kaçağı alt sınır)
} as const;

// ── Kaçak Risk Analizi ────────────────────────────────────────────────────────

/**
 * Su kaçak/sızıntı riskini mevsimsel normalize ile hesaplar.
 *
 * Anomali kaynakları:
 * - Damlayan musluk: sürekli düşük artış (0.15–1.5 m³ fazla)
 * - Tuvalet sızıntısı: orta artış, sessize alan (3–12 m³ fazla)
 * - Boru kaçağı: ani yüksek artış (8+ m³ fazla)
 * - Sayaç hatası: çok aşırı artış (>%200)
 */
export function analyzeWaterLeakRisk(
  logs:      ConsumptionLog[],
  waterRate: number = 44.50,
  city:      string = 'İstanbul',
): WaterLeakReport {
  const waterLogs = logs
    .filter(l => l.type === 'water' && l.consumption > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (waterLogs.length < 2) {
    return {
      level:       'safe',
      score:       0,
      title:       '📊 Veri Toplanıyor',
      description: 'Su kaçak analizi için en az 2 okuma gerekli.',
      actions:     ['Her ay düzenli okuma yaparak sistemi eğitin.'],
    };
  }

  // Normalize edilmiş tüketim geçmişi
  const normalized = waterLogs.map(l => ({
    norm:  normalizeWaterConsumption(l.consumption, new Date(l.date).getMonth() + 1),
    raw:   l.consumption,
    month: new Date(l.date).getMonth() + 1,
    cost:  l.cost,
  }));

  const recent       = normalized[0];
  const historical   = normalized.slice(1);
  const baselineAvg  = historical.reduce((s, x) => s + x.norm, 0) / historical.length;

  if (baselineAvg === 0) {
    return { level: 'safe', score: 0, title: '✅ Normal', description: 'Tüketim tutarlı.', actions: [] };
  }

  const ratio    = recent.norm / baselineAvg;
  const excessM3 = Math.max(0, recent.raw - baselineAvg * SEASONAL_WATER_INDEX[recent.month]);

  // Art arda anomali
  const consecutiveAnomalies = normalized
    .slice(0, 3)
    .filter(x => x.norm / baselineAvg > 1.35)
    .length;

  // Risk skoru
  let score = 0;
  if      (ratio > 2.5)                   score = 92;
  else if (ratio > 2.0)                   score = 78;
  else if (ratio > 1.6)                   score = 58;
  else if (ratio > 1.35)                  score = 35;
  else if (consecutiveAnomalies >= 2)     score = 45;
  else if (excessM3 >= THRESHOLDS.leakToilet) score = Math.max(score, 40);
  else if (excessM3 >= THRESHOLDS.leakDrip)   score = Math.max(score, 20);

  // Tahmini kayıp
  const estimatedLossL    = score >= 20 ? Math.round(excessM3 * 1000) : undefined;
  const estimatedCostLoss = score >= 20 ? Math.round(excessM3 * waterRate) : undefined;
  const emergencyActions  = waterEmergencyActions(city);

  const level: WaterRiskLevel =
    score >= 75 ? 'critical' :
    score >= 50 ? 'high'     :
    score >= 25 ? 'elevated' : 'safe';

  // ── Kritik ──────────────────────────────────────────────────────────────────
  if (level === 'critical') {
    return {
      level, score,
      title:       '🚨 Su Kaçağı Şüphesi',
      description: `Mevsim normaline göre tüketim ${ratio.toFixed(1)}x yüksek. Boru kaçağı veya sayaç hatası söz konusu olabilir.`,
      actions: [
        'Gece 02:00–05:00 arası tüm musluğu kapatın, sayacın dönüp dönmediğini kontrol edin.',
        'Dönüyorsa apartman ana vanasını kapatın, yöneticiye haber verin.',
        'Tuvaleti kontrol edin: rezervuara renkli boya damlatın, 15 dakika bekleyin.',
        'Belediyeden sayaç okuma tutanağı isteyin, faturayla karşılaştırın.',
      ],
      quickActions: emergencyActions,
      estimatedLossL,
      estimatedCostLoss,
    };
  }

  if (level === 'high') {
    const isToiletRange = excessM3 >= THRESHOLDS.leakToilet;
    return {
      level, score,
      title:       '⚠️ Yüksek Su Tüketimi',
      description: isToiletRange
        ? `Aylık ~${excessM3.toFixed(1)} m³ fazla tüketim. Tuvalet sızıntısı en yaygın sessiz kaçak kaynağıdır.`
        : `Tüketim normalin %${Math.round((ratio - 1) * 100)} üzerinde.`,
      actions: [
        'Tuvalet rezervuarını kontrol edin — en yaygın sessiz kaçak kaynağı.',
        'Tüm musluklarda damlama var mı kontrol edin.',
        'Çamaşır/bulaşık makinesi bağlantılarını gözden geçirin.',
        isToiletRange ? 'Rezervuar floatı veya klapesi değiştirmeyi düşünün (~₺50–200).' : '',
      ].filter(Boolean),
      quickActions: [
        { label: 'Tesisatçı Çağır', phone: '116', emoji: '🔧' },
        { label: 'Su İdaresi', phone: emergencyActions[0].phone ?? '185', emoji: '📞' },
      ],
      estimatedLossL,
      estimatedCostLoss,
    };
  }

  if (level === 'elevated') {
    return {
      level, score,
      title:       '📈 Su Tüketiminde Artış',
      description: `Bu dönem tüketim %${Math.round((ratio - 1) * 100)} artmış. Mevsimsel artış mı yoksa tasarruf fırsatı mı?`,
      actions: [
        'Musluklardan damlama olup olmadığını kontrol edin.',
        'Duş süresini 2 dk kısaltmak aylık ~1.5 m³ tasarruf sağlar.',
        consecutiveAnomalies >= 2 ? 'İki aydır artış var — tuvalet sızıntısı olabilir.' : '',
      ].filter(Boolean),
      estimatedLossL,
      estimatedCostLoss,
    };
  }

  // ── Güvenli ─────────────────────────────────────────────────────────────────
  return {
    level: 'safe',
    score,
    title:       '✅ Normal Su Tüketimi',
    description: `Tüketim mevsimsel beklentiyle uyumlu (${recent.raw} m³).`,
    actions:     [],
  };
}

// ── Su Tasarruf Önerileri ─────────────────────────────────────────────────────

/**
 * Tüketim profiline göre kişiselleştirilmiş su tasarruf önerileri.
 *
 * @param logs        - Su kayıtları
 * @param waterRate   - ₺/m³ (tariffEngine'dan)
 * @param householdSize - Hane büyüklüğü (varsayılan: 3)
 */
export function getWaterSavingAdvice(
  logs:          ConsumptionLog[],
  waterRate:     number = 44.50,
  householdSize: number = 3,
): WaterSavingAdvice {
  const waterLogs = logs
    .filter(l => l.type === 'water' && l.consumption > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (waterLogs.length === 0) {
    return {
      hasAdvice:       true,
      title:           '💧 Su Tasarruf İpuçları',
      description:     'Tüketiminizi kaydetmeye başlayın, kişiselleştirilmiş öneriler sunalım.',
      estimatedSaving: 0,
      tips:            GENERAL_WATER_TIPS,
    };
  }

  // Son 3 ay ortalama
  const avgM3 = waterLogs.slice(0, 3).reduce((s, l) => s + l.consumption, 0) /
    Math.min(waterLogs.length, 3);

  const expectedPerPerson = THRESHOLDS.avgPerPerson * householdSize;
  const excessM3          = Math.max(0, avgM3 - expectedPerPerson);
  const excessCost        = Math.round(excessM3 * waterRate);

  const tips: string[] = [];

  // Kişiselleştirilmiş önce
  if (avgM3 > expectedPerPerson * 1.4) {
    tips.push(`⚡ Aylık ${avgM3.toFixed(0)} m³, ${householdSize} kişilik hane için yüksek. Hedef: ${expectedPerPerson} m³.`);
  }

  const month = new Date().getMonth() + 1;
  if (month >= 6 && month <= 8) {
    tips.push('Yaz aylarında balkon/bahçe sulamasını sabah 06:00–08:00 arası yapın — buharlaşma en az bu saatlerde.');
    tips.push('Klimalar su tüketmez ama duş sıklığı artar — her ek duş ~40 L.');
  }

  // Evrensel öneriler
  tips.push(...[
    'Diş fırçalarken musluğu kapat → günlük 8 L tasarruf.',
    'Duş süresini 8 dk\'dan 6 dk\'ya indir → aylık ~1.2 m³ tasarruf.',
    'Bulaşıkları elle yıkamak yerine makinede yıka (tam dolu) → %40 su tasarrufu.',
    'Çamaşır makinesini tam doldurmadan çalıştırma.',
    'Musluklara perlator tak → su tasarrufu %30–50 (₺20–50 maliyet).',
  ]);

  const estimatedSaving = excessCost > 0
    ? Math.min(excessCost, Math.round(excessM3 * 0.3 * waterRate)) // %30 düşürme potansiyeli
    : Math.round(expectedPerPerson * 0.1 * waterRate); // genel %10 tasarruf

  return {
    hasAdvice:       true,
    title:           excessM3 > 2 ? '💧 Tasarruf Potansiyeli Var' : '💧 Su Kullanım Önerileri',
    description:     excessM3 > 2
      ? `Aylık ~₺${excessCost} tasarruf fırsatı — küçük alışkanlık değişiklikleriyle mümkün.`
      : `Tüketiminiz iyi durumda. Bu önerilerle daha da verimli olabilirsiniz.`,
    estimatedSaving,
    tips: tips.slice(0, 6), // max 6 ipucu
  };
}

const GENERAL_WATER_TIPS = [
  'Diş fırçalarken musluğu kapat → günlük 8 L tasarruf.',
  'Duş süresini 2 dk kısalt → aylık ~1.5 m³ tasarruf.',
  'Musluklara perlator tak → %30–50 su tasarrufu.',
  'Bulaşık makinesini tam dolu çalıştır.',
  'Tuvalet rezervuarını yılda bir kontrol ettir.',
];

// ── Fatura Denetimi ───────────────────────────────────────────────────────────

/**
 * Verim'in kademeli tarife hesabı ile belediye faturasını karşılaştırır.
 * Türkiye'de İSKİ/ASKİ yanlış okuma %3–5 sıklıkta görülür.
 *
 * @param expectedCost - Verim'in tarife motorundan hesapladığı tutar (₺)
 * @param actualBill   - Kullanıcının girdiği belediye fatura tutarı (₺)
 */
export function auditWaterBill(
  expectedCost: number,
  actualBill?:  number,
): WaterBillingAudit {
  if (actualBill === undefined || actualBill <= 0) {
    return {
      expectedCost,
      verdict: 'unknown',
      message: 'Fatura tutarını girin — Verim hesabıyla karşılaştıralım.',
    };
  }

  const diff    = actualBill - expectedCost;
  const diffPct = (diff / expectedCost) * 100;
  const absPct  = Math.abs(diffPct);

  // ±%10 tolerans — küsürat ve vergi farkından kaynaklanabilir
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
      message: `Belediye ₺${diff.toFixed(2)} fazla fatura etmiş (%${diffPct.toFixed(1)}). İtiraz hakkın var.`,
      appealSteps: [
        'Sayaç okumasını fotoğrafla belgele.',
        'İlgili belediye su müdürlüğüne başvuru formu doldur.',
        'Verim\'in hesap dökümünü ekran görüntüsüyle ekle.',
        'Türkiye\'de tüketici şikayetleri için ALO 175 (Enerji Piyasası).',
      ],
    };
  }

  return {
    expectedCost, actualBill, diff, diffPct,
    verdict: 'undercharged',
    message: `Fatura beklentinin %${Math.abs(diffPct).toFixed(1)} altında. Belediye eksik okuma yapmış olabilir — gelecek ay yansıyabilir.`,
  };
}

// ── Birleşik Akıllı Analiz ────────────────────────────────────────────────────

export interface WaterIntelligenceReport {
  leak:         WaterLeakReport;
  saving:       WaterSavingAdvice;
  billing:      WaterBillingAudit;
  /** Kullanıcıya gösterilecek en kritik tek mesaj */
  topAlert:     string | null;
}

export function getWaterIntelligence(
  logs:          ConsumptionLog[],
  waterRate?:    number,
  actualBill?:   number,
  expectedCost?: number,
  householdSize?: number,
  city?:         string,
): WaterIntelligenceReport {
  const leak    = analyzeWaterLeakRisk(logs, waterRate, city);
  const saving  = getWaterSavingAdvice(logs, waterRate, householdSize);
  const billing = auditWaterBill(expectedCost ?? 0, actualBill);

  let topAlert: string | null = null;

  if (leak.level === 'critical') {
    topAlert = `🚨 Su kaçağı şüphesi! Gece sayacı kontrol edin — tahmini kayıp: ${leak.estimatedLossL ?? 0} L/ay.`;
  } else if (billing.verdict === 'overcharged') {
    topAlert = `💸 Su faturanız ₺${(billing.diff ?? 0).toFixed(2)} fazla kesilmiş. Sayaç fotoğrafıyla itiraz edebilirsin.`;
  } else if (leak.level === 'high') {
    topAlert = '⚠️ Su tüketiminiz normalin üzerinde. Tuvalet sızıntısı en yaygın sessiz kaçak kaynağıdır.';
  } else if (saving.estimatedSaving > 80) {
    topAlert = `💡 Aylık ~₺${saving.estimatedSaving} su tasarruf fırsatı var. Küçük değişiklikler büyük fark yaratır.`;
  }

  return { leak, saving, billing, topAlert };
}
