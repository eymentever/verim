/**
 * Verim — Cyber Dark Premium Tema
 * Tüm ekranlar bu sabitlerden import etmeli.
 */

export const C = {
  // ── Zemin ──────────────────────────────────────────
  bg:         '#070A13',   // Deep Slate (ana arka plan)
  card:       '#0D1424',   // Semi-transparent card
  cardBorder: 'rgba(255,255,255,0.05)',
  overlay:    'rgba(7,10,19,0.92)',

  // ── Aksanlar ───────────────────────────────────────
  water:      '#06B6D4',   // Cyan (su)
  waterDim:   '#062830',
  gas:        '#F59E0B',   // Amber/Orange (doğalgaz)
  gasDim:     '#2A1A00',
  brand:      '#00FF9D',   // Neon Green (marka / başarı)
  brandDim:   '#002A1A',

  // ── Durum ──────────────────────────────────────────
  danger:     '#FF4757',
  dangerDim:  '#2D0A0E',
  warn:       '#FFA502',
  warnDim:    '#2A1800',
  success:    '#2ED573',
  successDim: '#0A2A18',

  // ── Abonelik ───────────────────────────────────────
  pro:        '#818CF8',   // Indigo
  proDim:     '#1A1E3A',
  gold:       '#FFD700',
  goldDim:    '#2A2200',

  // ── Metin ──────────────────────────────────────────
  text:       '#E2E8F0',
  textMuted:  '#4A5568',
  textDim:    '#718096',

  // ── Kenarlık & Ayrıcı ──────────────────────────────
  border:     '#1A2035',
  divider:    '#111827',
} as const;

export const FONT = {
  xs:   10,
  sm:   12,
  md:   14,
  base: 16,
  lg:   18,
  xl:   22,
  '2xl': 28,
  '3xl': 36,
  '4xl': 48,
} as const;

export const RADIUS = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  '2xl': 28,
  full: 9999,
} as const;

export const SHADOW = {
  water: {
    shadowColor: '#06B6D4',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  brand: {
    shadowColor: '#00FF9D',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  gas: {
    shadowColor: '#F59E0B',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
} as const;
