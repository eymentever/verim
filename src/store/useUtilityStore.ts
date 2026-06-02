// ─────────────────────────────────────────────────────────────────────────────
// Verim — Utility Store  (Su & Doğalgaz)
// Zustand + AsyncStorage kalıcı state.
// Elektrik referansı yoktur.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptData, decryptData } from '../utils/security';
import { getCityConfig } from '../services/tariffEngine';

// ── Tipler ────────────────────────────────────────────────────────────────────

export type UtilityType = 'water' | 'gas';

export interface ConsumptionLog {
  id:          string;
  date:        string;       // ISO
  type:        UtilityType;
  /** OCR'dan gelen m³ endeks değeri */
  indexValue:  number;
  /** Net tüketim: yeni endeks − önceki endeks (m³) */
  consumption: number;
  /** Toplam TL maliyet — vergiler dahil */
  cost:        number;
  propertyId:  string;
}

export interface Property {
  id:            string;
  name:          string;
  city:          string;
  district:      string;
  address?:      string;
  type:          'home' | 'office' | 'rental' | 'other';
  isPrepaid?:    boolean;   // kartlı sayaç modu
  prepaidCredit?: number;  // yüklenen kredi (TL)
  regionStatus?: 'center' | 'town' | 'rural'; // bölge statüsü (merkez, belde, kırsal)
}

export interface UserProfile {
  name:          string;
  city:          string;
  district:      string;
  setupComplete: boolean;
}

// ── Tarife Sabitleri ──────────────────────────────────────────────────────────

/**
 * SU — İSKİ 2026 İstanbul MVP kademeli tarife
 *
 * Tier 1 : 0–15 m³   →  32.40 ₺/m³
 * Tier 2 : 15+ m³    →  49.50 ₺/m³
 * ÇTV    : 1.50 ₺/m³  (tüm tüketim)
 * KDV    : %10        (ham tarife + ÇTV toplamına)
 */
const WATER = {
  tier1Limit: 15,
  tier1Rate:  32.40,
  tier2Rate:  49.50,
  ctv:         1.50,
  kdv:         0.10,
} as const;

/**
 * GAZ — Türkiye Doğalgaz EPDK 2026
 *
 * Kalori dönüşümü : m³ × 10.64 = kWh  (Türkiye standardı)
 * Birim fiyat     : 1.15 ₺/kWh
 * KDV             : %10
 */
const GAS = {
  calorificValue: 10.64,
  ratePerKwh:      1.15,
  kdv:             0.10,
} as const;

// ── Tarife Motorları ──────────────────────────────────────────────────────────

/**
 * Su faturası hesapla (vergiler dahil).
 *
 * Adım 1 — Kademeli tarife:
 *   tier1 = min(consumption, 15) × 32.40
 *   tier2 = max(0, consumption − 15) × 49.50
 *   ham   = tier1 + tier2
 *
 * Adım 2 — ÇTV:
 *   ctv = consumption × 1.50
 *
 * Adım 3 — KDV:
 *   kdv = (ham + ctv) × 0.10
 *
 * Adım 4 — Toplam:
 *   total = ham + ctv + kdv
 *
 * @param consumption - Net m³ tüketim (yeni endeks − önceki endeks)
 */
export function calculateWaterBill(consumption: number): number {
  if (consumption <= 0) return 0;

  const tier1   = Math.min(consumption, WATER.tier1Limit) * WATER.tier1Rate;
  const tier2   = Math.max(0, consumption - WATER.tier1Limit) * WATER.tier2Rate;
  const ham     = tier1 + tier2;
  const ctv     = consumption * WATER.ctv;
  const kdv     = (ham + ctv) * WATER.kdv;

  return r2(ham + ctv + kdv);
}

/**
 * Gaz faturası hesapla (vergiler dahil).
 *
 * Adım 1 — Hacim → Enerji:
 *   kWh = consumption × 10.64
 *
 * Adım 2 — Maliyet:
 *   ham = kWh × 1.15
 *
 * Adım 3 — KDV:
 *   kdv = ham × 0.10
 *
 * Adım 4 — Toplam:
 *   total = ham + kdv
 *
 * @param consumption - Net m³ tüketim
 */
export function calculateGasBill(consumption: number): number {
  if (consumption <= 0) return 0;

  const energyKwh = consumption * GAS.calorificValue;
  const ham       = energyKwh * GAS.ratePerKwh;
  const kdv       = ham * GAS.kdv;

  return r2(ham + kdv);
}

/**
 * Doğrulama modalı için vergi dökümü döner.
 */
export interface BillBreakdown {
  consumption: number;   // m³
  rawTariff:   number;   // ₺ (vergisiz tarife)
  ctv?:        number;   // ₺ (sadece su)
  kdv:         number;   // ₺
  totalCost:   number;   // ₺
  energyKwh?:  number;   // kWh (sadece gaz)
}

export function getBillBreakdown(
  type:        UtilityType,
  consumption: number,
  city:        string,
  regionStatus?: 'center' | 'town' | 'rural',
): BillBreakdown {
  const config = getCityConfig(city);
  const { kdv, ctv, abonelikUcreti } = config.taxes;

  let discountFactor = 1.0;
  if (regionStatus === 'town') discountFactor = 0.50;
  else if (regionStatus === 'rural') discountFactor = 0.25;

  if (type === 'water') {
    let remaining = consumption;
    let rawTariff = 0;
    let prevLimit = 0;

    for (const tier of config.waterTiers) {
      if (remaining <= 0) break;
      const tierVolume = Math.min(remaining, tier.limit - prevLimit);
      rawTariff += tierVolume * (tier.rate * discountFactor);
      remaining -= tierVolume;
      prevLimit = tier.limit;
    }

    rawTariff = r2(rawTariff);
    const ctvCost = r2(rawTariff * ctv);
    const kdvCost = r2(rawTariff * kdv);
    const totalCost = r2(rawTariff * (1 + kdv + ctv) + (abonelikUcreti * discountFactor));

    return {
      consumption,
      rawTariff,
      ctv: ctvCost,
      kdv: kdvCost,
      totalCost,
    };
  } else {
    let rawTariff = 0;
    if (config.gasTiers && config.gasTiers.length > 0) {
      let remaining = consumption;
      let prevLimit = 0;
      for (const tier of config.gasTiers) {
        if (remaining <= 0) break;
        const tierVolume = Math.min(remaining, tier.limit - prevLimit);
        rawTariff += tierVolume * tier.rate;
        remaining -= tierVolume;
        prevLimit = tier.limit;
      }
    } else {
      rawTariff = consumption * config.gasRate;
    }

    rawTariff = r2(rawTariff);
    const ctvCost = r2(rawTariff * ctv);
    const kdvCost = r2(rawTariff * kdv);
    const totalCost = r2(rawTariff * (1 + kdv + ctv) + abonelikUcreti); // Gas fixed charge usually does not have regional town discounts
    const energyKwh = r2(consumption * 10.64);

    return {
      consumption,
      rawTariff,
      ctv: ctvCost,
      kdv: kdvCost,
      totalCost,
      energyKwh,
    };
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface UtilityState {
  profile:          UserProfile;
  properties:       Property[];
  activePropertyId: string | null;
  logs:             ConsumptionLog[];

  setProfile:          (p: Partial<UserProfile>) => void;
  completeSetup:       (city: string, district: string, name?: string, address?: string) => void;
  addProperty:         (p: Property) => void;
  updateProperty:      (id: string, updates: Partial<Property>) => void;
  removeProperty:      (id: string) => void;
  setActiveProperty:   (id: string) => void;
  activeProperty:      () => Property | null;
  addLog:              (log: ConsumptionLog) => void;
  removeLog:           (id: string) => void;
  logsForProperty:     (propertyId: string) => ConsumptionLog[];
  activePropertyLogs:  () => ConsumptionLog[];
  /**
   * Belirli mülk + tür için son kaydedilen endeks.
   * scan.tsx backward reading & tüketim hesabı için kullanılır.
   */
  lastIndexForType:    (propertyId: string, type: UtilityType) => number | undefined;
}

export const useUtilityStore = create<UtilityState>()(
  persist(
    (set, get) => ({
      profile:          { name: '', city: 'İstanbul', district: '', setupComplete: false },
      properties:       [],
      activePropertyId: null,
      logs:             [],

      setProfile: (p) =>
        set(s => ({ profile: { ...s.profile, ...p } })),

      completeSetup: (city, district, name, address) => {
        const id   = `prop_${Date.now()}`;
        const prop: Property = { id, name: 'Ana Mülk', city, district, address, type: 'home', regionStatus: 'center' };
        set(s => ({
          profile:          { ...s.profile, city, district, name: name ?? s.profile.name, setupComplete: true },
          properties:       [prop],
          activePropertyId: id,
        }));
      },

      addProperty: (p) =>
        set(s => ({ properties: [...s.properties, p] })),

      updateProperty: (id, updates) =>
        set(s => {
          const properties = s.properties.map(p => p.id === id ? { ...p, ...updates } : p);
          const activeProp = properties.find(p => p.id === s.activePropertyId);
          return {
            properties,
            profile: activeProp
              ? { ...s.profile, city: activeProp.city, district: activeProp.district }
              : s.profile,
          };
        }),

      removeProperty: (id) =>
        set(s => ({
          properties:       s.properties.filter(p => p.id !== id),
          activePropertyId: s.activePropertyId === id
            ? (s.properties.find(p => p.id !== id)?.id ?? null)
            : s.activePropertyId,
        })),

      setActiveProperty: (id) => set({ activePropertyId: id }),

      activeProperty: () => {
        const { properties, activePropertyId } = get();
        return properties.find(p => p.id === activePropertyId) ?? null;
      },

      addLog: (log) =>
        set(s => ({ logs: [log, ...s.logs] })),

      removeLog: (id) =>
        set(s => ({ logs: s.logs.filter(l => l.id !== id) })),

      logsForProperty: (propertyId) =>
        get().logs.filter(l => l.propertyId === propertyId),

      activePropertyLogs: () => {
        const { activePropertyId } = get();
        if (!activePropertyId) return [];
        return get().logsForProperty(activePropertyId);
      },

      lastIndexForType: (propertyId, type) => {
        // logs [yeni→eski] sıralı; [0] en güncel
        const match = get()
          .logsForProperty(propertyId)
          .find(l => l.type === type);
        return match?.indexValue;
      },
    }),
    {
      name:    'verim-utility-store',
      storage: createJSONStorage(() => ({
        getItem: async (name) => {
          const value = await AsyncStorage.getItem(name);
          if (!value) return null;
          try {
            const decrypted = decryptData(value);
            return decrypted || null;
          } catch (e) {
            return value;
          }
        },
        setItem: async (name, value) => {
          const encrypted = encryptData(value);
          await AsyncStorage.setItem(name, encrypted);
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name);
        },
      })),
    },
  ),
);

// ── Yardımcı ─────────────────────────────────────────────────────────────────

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}
