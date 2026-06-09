// ─────────────────────────────────────────────────────────────────────────────
// Verim — Utility Store  (Su & Doğalgaz)
// Zustand + AsyncStorage kalıcı state.
// Elektrik referansı yoktur.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptData, decryptData } from '../utils/security';
import { getCityConfig, getDistrictWaterMultiplier } from '../services/tariffEngine';

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
}

export interface UserProfile {
  name:          string;
  city:          string;
  district:      string;
  setupComplete: boolean;
  /** Kullanıcının aylık fatura bütçesi (₺). Varsayılan: 0 = belirsiz */
  monthlyBudget: number;
  /** Hane büyüklüğü — su tasarruf hesabı için */
  householdSize: number;
}

/**
 * Doğrulama modalı için vergi dökümü döner.
 * Tüm tarife hesaplamaları tariffEngine.ts üzerinden yapılır (şehir/ilçe bazlı).
 */
export interface BillBreakdown {
  consumption: number;   // m³
  rawTariff:   number;   // ₺ (vergisiz tarife)
  ctv?:        number;   // ₺ (sadece su)
  kdv:         number;   // ₺
  totalCost:   number;   // ₺
  energyKwh?:  number;   // kWh (sadece gaz)
  otv?:        number;   // ₺ (sadece gaz)
  subCost:     number;   // ₺ (abonelik bedeli vergili)
}

export function getBillBreakdown(
  type:        UtilityType,
  consumption: number,
  city:        string,
  district?:   string,
): BillBreakdown {
  const config = getCityConfig(city);
  const discountFactor = district ? getDistrictWaterMultiplier(city, district) : 1.0;

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

    // İnsani su hakkı: ücretsiz m³'ü kademe-1 birim fiyatından kredi olarak düş (İSKİ yöntemi)
    const humanFreeM3 = config.humanWaterRightM3 ?? 0;
    if (humanFreeM3 > 0) {
      const effectiveFree  = Math.min(humanFreeM3, consumption);
      const tier1Rate      = config.waterTiers[0]?.rate ?? 0;
      rawTariff = Math.max(0, rawTariff - effectiveFree * tier1Rate * discountFactor);
    }

    rawTariff = r2(rawTariff);
    const kdvCost = r2(rawTariff * 0.04);
    // ÇTV: büyükşehir merkezleri 4.00 ₺/m³, çevre ilçeler (discountFactor < 1) maktu 2.00 ₺/m³
    const ctvRate = discountFactor < 1 ? 2.00 : 4.00;
    const ctvCost = r2(consumption * ctvRate);
    const subCost = r2((config.taxes.abonelikUcreti * discountFactor) * 1.10);
    const totalCost = r2(rawTariff + kdvCost + ctvCost + subCost);

    return {
      consumption,
      rawTariff,
      ctv: ctvCost,
      kdv: kdvCost,
      subCost,
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
    const otvCost = r2(consumption * 0.074077);
    const kdvCost = r2((rawTariff + otvCost) * 0.20);
    const subCost = r2(config.taxes.abonelikUcreti * 1.20);
    const totalCost = r2(rawTariff + otvCost + kdvCost + subCost);
    const energyKwh = r2(consumption * 10.64);

    return {
      consumption,
      rawTariff,
      kdv: kdvCost,
      otv: otvCost,
      subCost,
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
      profile:          { name: '', city: 'İstanbul', district: '', setupComplete: false, monthlyBudget: 0, householdSize: 3 },
      properties:       [],
      activePropertyId: null,
      logs:             [],

      setProfile: (p) =>
        set(s => ({ profile: { ...s.profile, ...p } })),

      completeSetup: (city, district, name, address) => {
        const id   = `prop_${Date.now()}`;
        const prop: Property = { id, name: 'Ana Mülk', city, district, address, type: 'home' };
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
