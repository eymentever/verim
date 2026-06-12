// ─────────────────────────────────────────────────────────────────────────────
// Verim — useReadingReminder
// Son okuma tarihine, mevsime ve anomali durumuna göre
// kullanıcıya ne zaman okuma yapması gerektiğini önerir.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { ConsumptionLog, UtilityType } from '../store/useUtilityStore';

// ── Tipler ────────────────────────────────────────────────────────────────────

export type ReminderUrgency = 'ok' | 'soon' | 'due' | 'overdue' | 'never';

export interface ReadingReminder {
  urgency:       ReminderUrgency;
  /** Kullanıcıya gösterilecek kısa başlık */
  title:         string;
  /** Açıklama / gerekçe */
  message:       string;
  /** Son okumadan bu yana geçen gün (okuma yoksa null) */
  daysSinceLast: number | null;
  /** Önerilen sonraki okuma günü (0 = bugün) */
  daysUntilNext: number;
  /** Renk tonu — tema ile eşleşir */
  color:         string;
  /** İkon emoji */
  icon:          string;
}

// ── Sabitler ──────────────────────────────────────────────────────────────────

/** Normal aylık döngü (gün) */
const NORMAL_CYCLE = 30;

/**
 * Belediye okumadan kaç gün önce kullanıcı okumalı?
 * Türkiye'de belediyeler genellikle ayın 1-10'unda okur.
 * Kullanıcı ayın 25-28'inde okursa 3-5 gün önde olur.
 */
const BUFFER_DAYS = 5;

/** Yüksek sezonda kısaltılmış döngü (gün) */
const SEASONAL_CYCLE = 15;

/** Anomali sonrası takip döngüsü (gün) */
const ANOMALY_CYCLE = 7;

// ── Mevsim Tespiti ────────────────────────────────────────────────────────────

type Season = 'winter' | 'summer' | 'shoulder';

function getSeason(): Season {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 11 || month <= 3) return 'winter';  // Kas – Mar: gaz sezonu
  if (month >= 6  && month <= 8) return 'summer';  // Haz – Ağu: su sezonu
  return 'shoulder';
}

/**
 * Mevsime ve sayaç tipine göre önerilen döngüyü döner.
 * Kışın gaz daha kritik, yazın su daha kritik.
 */
function getRecommendedCycle(type: UtilityType, hasRecentAnomaly: boolean): number {
  if (hasRecentAnomaly) return ANOMALY_CYCLE;
  const season = getSeason();
  if (type === 'gas'   && season === 'winter') return SEASONAL_CYCLE;
  if (type === 'water' && season === 'summer') return SEASONAL_CYCLE;
  return NORMAL_CYCLE - BUFFER_DAYS; // ayın 25'inde okuma hedefi
}

// ── Renk Haritası ─────────────────────────────────────────────────────────────

const URGENCY_COLOR: Record<ReminderUrgency, string> = {
  ok:      '#2ED573',   // C.success
  soon:    '#06B6D4',   // C.water
  due:     '#FFA502',   // C.warn
  overdue: '#FF4757',   // C.danger
  never:   '#818CF8',   // C.pro
};

const URGENCY_ICON: Record<ReminderUrgency, string> = {
  ok:      '✅',
  soon:    '📅',
  due:     '⏰',
  overdue: '🚨',
  never:   '📍',
};

// ── Ana Hook ──────────────────────────────────────────────────────────────────

/**
 * @param type            - 'water' | 'gas'
 * @param logs            - Bu mülk + türe ait okuma kayıtları (yeni → eski sıralı)
 * @param hasRecentAnomaly - Son okumada anomali uyarısı geldi mi?
 */
export function useReadingReminder(
  type:             UtilityType,
  logs:             ConsumptionLog[],
  hasRecentAnomaly: boolean = false,
): ReadingReminder {
  return useMemo(() => {
    const label    = type === 'water' ? 'Su' : 'Doğalgaz';
    const lastLog  = logs.find(l => l.type === type);
    const cycle    = getRecommendedCycle(type, hasRecentAnomaly);
    const season   = getSeason();

    // ── Hiç okuma yoksa ───────────────────────────────────────────────────────
    if (!lastLog) {
      return {
        urgency:       'never',
        title:         `İlk ${label} Okuması`,
        message:       'Henüz okuma yapılmadı. Referans endeksi almak için şimdi tara.',
        daysSinceLast: null,
        daysUntilNext: 0,
        color:         URGENCY_COLOR.never,
        icon:          URGENCY_ICON.never,
      };
    }

    // ── Son okumadan geçen gün ────────────────────────────────────────────────
    const daysSinceLast = Math.floor(
      (Date.now() - new Date(lastLog.date).getTime()) / 86_400_000
    );
    const daysUntilNext = Math.max(0, cycle - daysSinceLast);

    // ── Aciliyet belirleme ────────────────────────────────────────────────────
    let urgency:  ReminderUrgency;
    let title:    string;
    let message:  string;

    if (hasRecentAnomaly) {
      // Anomali varsa her durumda 'due'
      urgency = 'due';
      title   = `⚠️ ${label} Takip Okuması Önerilir`;
      message = `Son okumada anormal tüketim tespit edildi. ${ANOMALY_CYCLE} günde bir kontrol et.`;
    } else if (daysSinceLast >= cycle + 12) {
      // döngü + 12 gün: gecikmiş (sezonsal döngüde de tutarlı)
      urgency = 'overdue';
      title   = `🚨 ${label} Okuması Gecikti`;
      message = `Son okumadan ${daysSinceLast} gün geçti. Belediye faturası göndermiş olabilir, kontrol et.`;
    } else if (daysSinceLast >= cycle) {
      // önerilen döngü doldu: tam zamanı
      urgency = 'due';
      title   = `⏰ ${label} Okuma Zamanı`;
      message = seasonalMessage(type, season, daysSinceLast);
    } else if (daysUntilNext <= 5) {
      // 5 gün veya daha az kaldı
      urgency = 'soon';
      title   = `📅 ${label} Okuması Yaklaşıyor`;
      message = `${daysUntilNext === 0 ? 'Bugün' : `${daysUntilNext} gün içinde`} okuma yapman önerilir.`;
    } else {
      // Güncel
      urgency = 'ok';
      title   = `✅ ${label} Güncel`;
      message = `Son okuma ${daysSinceLast} gün önce. Sonraki okuma: ${daysUntilNext} gün içinde.`;
    }

    return {
      urgency,
      title,
      message,
      daysSinceLast,
      daysUntilNext,
      color: URGENCY_COLOR[urgency],
      icon:  URGENCY_ICON[urgency],
    };
  }, [type, logs, hasRecentAnomaly]);
}

// ── Mevsimsel mesaj ───────────────────────────────────────────────────────────

function seasonalMessage(type: UtilityType, season: Season, days: number): string {
  if (type === 'gas' && season === 'winter') {
    return `Kış ayında doğalgaz tüketimi yüksek olur. ${days} gündür okuma yok, fatura sürpriz yapmasın.`;
  }
  if (type === 'water' && season === 'summer') {
    return `Yaz ayında su tüketimi artar. ${days} gündür okuma yok, kaçak kontrolü için tara.`;
  }
  return `${days} gündür ${type === 'water' ? 'su' : 'doğalgaz'} okuması yapılmadı. Aylık fatura dönemine girdiniz.`;
}

// ── Çift tip özet (index.tsx için) ────────────────────────────────────────────

export interface DualReminder {
  water: ReadingReminder;
  gas:   ReadingReminder;
  /** İkisinden daha acil olanı */
  topUrgency: ReminderUrgency;
  topReminder: ReadingReminder;
}

const URGENCY_RANK: Record<ReminderUrgency, number> = {
  ok: 0, never: 1, soon: 2, due: 3, overdue: 4,
};

export function useDualReminder(
  logs:              ConsumptionLog[],
  hasWaterAnomaly?:  boolean,
  hasGasAnomaly?:    boolean,
): DualReminder {
  const waterLogs = useMemo(() => logs.filter(l => l.type === 'water'), [logs]);
  const gasLogs   = useMemo(() => logs.filter(l => l.type === 'gas'),   [logs]);

  const water = useReadingReminder('water', waterLogs, hasWaterAnomaly);
  const gas   = useReadingReminder('gas',   gasLogs,   hasGasAnomaly);

  const topReminder = URGENCY_RANK[water.urgency] >= URGENCY_RANK[gas.urgency] ? water : gas;

  return {
    water,
    gas,
    topUrgency:  topReminder.urgency,
    topReminder,
  };
}
