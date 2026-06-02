// ─────────────────────────────────────────────────────────────────────────────
// Verim — Format Yardımcıları
// Tüm ekranlarda tutarlı Türkçe biçimlendirme için buradan import edin.
// ─────────────────────────────────────────────────────────────────────────────

// ── Para Birimi ───────────────────────────────────────────────────────────────

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', {
  style:                 'currency',
  currency:              'TRY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Sayıyı Türk Lirası formatına çevirir.
 * Çıktı: "1.482,50 ₺"
 *
 * @example
 * formatTRY(1482.5)  // → "1.482,50 ₺"
 * formatTRY(0)       // → "0,00 ₺"
 * formatTRY(49.9)    // → "49,90 ₺"
 */
export function formatTRY(amount: number): string {
  return TRY_FORMATTER.format(amount);
}

/**
 * Küçük yer kaplayan kısa TL formatı — tablo/badge için.
 * Çıktı: "₺1.482,50"
 */
export function formatTRYShort(amount: number): string {
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `₺${formatted}`;
}

// ── Hacim (m³) ────────────────────────────────────────────────────────────────

/**
 * m³ değerini okunabilir stringe çevirir.
 * @example formatM3(12.3456) → "12,35 m³"
 */
export function formatM3(value: number, decimals = 2): string {
  return `${new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)} m³`;
}

// ── Enerji (kWh) ──────────────────────────────────────────────────────────────

/**
 * kWh değerini formatlar.
 * @example formatKwh(301.6)  → "301,60 kWh"
 */
export function formatKwh(value: number): string {
  return `${new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} kWh`;
}

// ── Tarih ─────────────────────────────────────────────────────────────────────

/**
 * ISO tarihi Türkçe kısa tarih formatına çevirir.
 * @example formatDate("2026-06-02T...") → "2 Haz 2026"
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  });
}

/**
 * ISO tarihi gün+saat formatına çevirir.
 * @example formatDateTime("2026-06-02T14:35:00") → "2 Haz 2026, 14:35"
 */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day:    'numeric',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

// ── Yüzde ─────────────────────────────────────────────────────────────────────

/**
 * 0–1 arası oranı yüzde stringine çevirir.
 * @example formatPct(0.876) → "%87,6"
 */
export function formatPct(ratio: number, decimals = 1): string {
  return `%${new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(ratio * 100)}`;
}
