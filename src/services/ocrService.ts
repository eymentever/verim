// ─────────────────────────────────────────────────────────────────────────────
// Verim — OCR Service  (Su & Doğalgaz)
// Kamera çıktısını parse eder ve doğrulama kurallarını uygular.
// Store import etmez; saf fonksiyonlar.
// ─────────────────────────────────────────────────────────────────────────────

export type MeterType = 'water' | 'gas';

// ── Çıktı tipleri ─────────────────────────────────────────────────────────────

export interface OCRResult {
  type:       MeterType;
  indexValue: number;   // m³ tam sayı endeks
  confidence: number;   // 0–1
  rawText:    string;   // kameradan gelen ham metin
  parsedText: string;   // regex'ten geçmiş temiz rakamlar
}

export type ValidationSeverity = 'ok' | 'warning' | 'error';

export interface ValidationResult {
  severity: ValidationSeverity;
  code:     'OK' | 'BACKWARD_READING' | 'ANOMALY_SPIKE';
  message:  string;
}

// ── Sabitler ──────────────────────────────────────────────────────────────────

const WATER_SPIKE_PER_DAY = 3;   // m³/gün anomali eşiği (konut ~0.88 m³/gün normal)
const GAS_SPIKE_PER_DAY   = 50;  // m³/gün anomali eşiği

// ── Regex filtreleri ──────────────────────────────────────────────────────────

/**
 * Su — siyah tekerlekler: ondalık ayırıcı öncesi 5–7 rakam.
 * Kırmızı/ondalık bölüm kasıtlı olarak kesilir.
 */
const WATER_REGEX = /^(\d{5,8})$/;  // 8 hane: 00043817 gibi sıfır padded sayaçlar

/**
 * Gaz — ana gösterge: ondalık ayırıcı öncesi 5–8 rakam.
 */
const GAS_REGEX = /^(\d{5,8})$/;

// ── Parser fonksiyonları ──────────────────────────────────────────────────────

/**
 * Türkiye sayaç formatlarını doğru parse eder.
 *
 * Su  : 43817 | 43817,05 | 43.817 | 43.817,05 | 200 | 00200
 * Gaz : 284510 | 284510.372 | 281.372 | 28.451 | 8372
 *
 * type='water' → tek nokta + ≤3 önce + tam 3 sonra = binlik ayırıcı
 * type='gas'   → tek nokta her zaman ondalık ayırıcı
 */
export function extractIntegerPart(raw: string, type: MeterType = 'water'): string {
  const s = raw.trim();
  const dotCount   = (s.match(/\./g) ?? []).length;
  const commaCount = (s.match(/,/g) ?? []).length;

  let intStr: string;

  if (commaCount > 0) {
    intStr = s.replace(/\./g, '').split(',')[0];
  } else if (dotCount > 1) {
    intStr = s.replace(/\./g, '');
  } else if (dotCount === 1) {
    const dotIdx = s.indexOf('.');
    const before = s.substring(0, dotIdx);
    const after  = s.substring(dotIdx + 1);
    const isThousand =
      type === 'water' &&
      before.length <= 3 &&
      after.length === 3 &&
      /^\d{3}$/.test(after);
    intStr = isThousand ? before + after : before;
  } else {
    intStr = s;
  }

  return intStr.replace(/^0+(?=\d)/, '').trim() || '0';
}

function parseWater(raw: string): { value: number; parsed: string } | null {
  const intPart = extractIntegerPart(raw, 'water');
  if (!WATER_REGEX.test(intPart)) return null;
  const value = parseInt(intPart, 10);
  if (isNaN(value) || value <= 0) return null;
  return { value, parsed: intPart };
}

function parseGas(raw: string): { value: number; parsed: string } | null {
  const intPart = extractIntegerPart(raw, 'gas');
  if (!GAS_REGEX.test(intPart)) return null;
  const value = parseInt(intPart, 10);
  if (isNaN(value) || value <= 0) return null;
  return { value, parsed: intPart };
}

// ── Doğrulama ─────────────────────────────────────────────────────────────────

/**
 * Yeni okumanın geçerliliğini kontrol eder.
 * Hata → store'a YAZMA. Uyarı → kullanıcı onayı gerektirir.
 *
 * @param type      - 'water' | 'gas'
 * @param newValue  - Yeni OCR endeksi (m³)
 * @param lastValue - Son kayıtlı endeks (undefined = ilk okuma)
 * @param daysSince - Son okumadan bu yana geçen gün sayısı (varsayılan 1)
 */
export function validateReading(
  type:      MeterType,
  newValue:  number,
  lastValue?: number,
  daysSince   = 1,
): ValidationResult {

  // 1. Geri okuma — kesin hata, kaydetme engellenir
  if (lastValue !== undefined && newValue < lastValue) {
    return {
      severity: 'error',
      code:     'BACKWARD_READING',
      message:
        `Hatalı okuma: Yeni değer (${newValue} m³) son kayıttan ` +
        `(${lastValue} m³) düşük. Sayaç geri sarılamaz.`,
    };
  }

  // 2. Günlük anomali sıçraması — uyarı, kullanıcı onayı gerekir
  if (lastValue !== undefined) {
    const diff   = newValue - lastValue;
    const days   = Math.max(1, daysSince);
    const daily  = diff / days;
    const limit  = type === 'water' ? WATER_SPIKE_PER_DAY : GAS_SPIKE_PER_DAY;

    if (daily > limit) {
      return {
        severity: 'warning',
        code:     'ANOMALY_SPIKE',
        message:
          `Anormal tüketim: ${days} günde ${diff.toFixed(1)} m³ ` +
          `(günlük ort. ${daily.toFixed(1)} m³). ` +
          `Normal üst sınır: ${limit} m³/gün. Lütfen sayacı kontrol edin.`,
      };
    }
  }

  return { severity: 'ok', code: 'OK', message: 'Okuma geçerli.' };
}

// ── Ana OCR simülasyonu ───────────────────────────────────────────────────────

/**
 * Kamera görüntüsünü işler; ayrıştırılmış OCR sonucunu döner.
 * rawOcrText verilmezse mock değer üretir (gerçek ML Kit entegrasyonuna kadar).
 *
 * @param imageUri   - Kamera URI
 * @param type       - 'water' | 'gas'
 * @param rawOcrText - Gerçek OCR ham metni (opsiyonel)
 */
export async function simulateOCR(
  imageUri:    string,
  type:        MeterType = 'water',
  rawOcrText?: string,
): Promise<OCRResult> {
  await new Promise(r => setTimeout(r, 1500));

  const raw    = rawOcrText ?? generateMockRaw(type);
  const result = type === 'water' ? parseWater(raw) : parseGas(raw);

  if (!result) {
    throw new Error(
      type === 'water'
        ? 'Su sayacı değeri ayrıştırılamadı. Sadece siyah tekerlekleri kadrajlayın.'
        : 'Gaz sayacı değeri ayrıştırılamadı. Ondalık ayırıcı öncesini tam kadrajlayın.',
    );
  }

  return {
    type,
    indexValue: result.value,
    confidence: 0.86 + Math.random() * 0.13,
    rawText:    raw,
    parsedText: result.parsed,
  };
}

// ── Mock metin üretici ────────────────────────────────────────────────────────

function generateMockRaw(type: MeterType): string {
  if (type === 'water') {
    const base = Math.floor(Math.random() * 90000) + 10000;          // 5 hane
    const dec  = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${base},${dec}`;   // örn. "43817,05"  → parser "43817" alır
  } else {
    const base = Math.floor(Math.random() * 900000) + 100000;        // 6 hane
    const dec  = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${base}.${dec}`;   // örn. "284510.372" → parser "284510" alır
  }
}

// ── Tüketim farkı yardımcısı ──────────────────────────────────────────────────

/**
 * İki endeks arasındaki net tüketimi hesaplar.
 * Negatif (backward reading) durumda null döner.
 */
export function computeConsumption(
  newIndex:      number,
  previousIndex: number,
): number | null {
  const diff = newIndex - previousIndex;
  return diff >= 0 ? diff : null;
}
