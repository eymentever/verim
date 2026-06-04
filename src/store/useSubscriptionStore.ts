import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubscriptionTier = 'free' | 'pro' | 'landlord' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  monthlyPrice: number;  // TL
  yearlyPrice: number;   // TL
  features: string[];
  maxScansPerMonth: number;   // -1 = unlimited
  maxProperties: number;       // -1 = unlimited
  adsEnabled: boolean;
  leakGuardEnabled: boolean;
  exportEnabled: boolean;
  b2bDashboard: boolean;
}

export const PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    tier: 'free',
    name: 'Ücretsiz',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      'Aylık 4 OCR tarama (her fatura türü için)',
      'Tek mülk takibi',
      'Temel fatura tahmini',
      'Yeşil enerji reklamları',
    ],
    maxScansPerMonth: 4,
    maxProperties: 1,
    adsEnabled: true,
    leakGuardEnabled: false,
    exportEnabled: false,
    b2bDashboard: false,
  },
  pro: {
    tier: 'pro',
    name: 'Verim Pro',
    monthlyPrice: 49.99,
    yearlyPrice: 449.99,
    features: [
      'Sınırsız OCR tarama',
      'AI Kaçak & Anomali Koruması (7/24)',
      '5 mülke kadar takip',
      'PDF / Excel ihracat',
      'Reklamsız deneyim',
      'Öncelikli destek',
    ],
    maxScansPerMonth: -1,
    maxProperties: 5,
    adsEnabled: false,
    leakGuardEnabled: true,
    exportEnabled: true,
    b2bDashboard: false,
  },
  landlord: {
    tier: 'landlord',
    name: 'Ev Sahibi & Yönetici',
    monthlyPrice: 149.99,
    yearlyPrice: 1399.99,
    features: [
      'Sınırsız mülk takibi',
      'Kiracı devir sayacı raporu',
      'Boş mülk kaçak tespiti',
      'Ara sayaç daire bölüştürme',
      'Toplu PDF/Excel ihracat',
      'Kurumsal fatura entegrasyonu (yakında)',
    ],
    maxScansPerMonth: -1,
    maxProperties: -1,
    adsEnabled: false,
    leakGuardEnabled: true,
    exportEnabled: true,
    b2bDashboard: true,
  },
  enterprise: {
    tier: 'enterprise',
    name: 'Kurumsal',
    monthlyPrice: 0, // teklif bazlı
    yearlyPrice: 0,
    features: [
      'Tüm Ev Sahibi özellikleri',
      'API erişimi',
      'Özel ERP/muhasebe entegrasyonu',
      'SLA garantisi',
      'Özel hesap yöneticisi',
    ],
    maxScansPerMonth: -1,
    maxProperties: -1,
    adsEnabled: false,
    leakGuardEnabled: true,
    exportEnabled: true,
    b2bDashboard: true,
  },
};

export interface ScanUsage {
  month: string;  // 'YYYY-MM'
  water: number;
  gas: number;
}

interface SubscriptionState {
  tier: SubscriptionTier;
  billingCycle: BillingCycle;
  expiresAt: string | null;      // ISO date
  scanUsage: ScanUsage[];

  // Computed helpers
  currentPlan: () => SubscriptionPlan;
  /** Abonelik süresi dolduysa free plan döner — feature flag için kullan */
  effectivePlan: () => SubscriptionPlan;
  monthlyScanCount: (type: 'water' | 'gas') => number;
  canScan: (type: 'water' | 'gas') => boolean;
  incrementScan: (type: 'water' | 'gas') => void;
  upgradeTo: (tier: SubscriptionTier, cycle: BillingCycle) => void;
  isActive: () => boolean;
}

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      tier: 'free',
      billingCycle: 'monthly',
      expiresAt: null,
      scanUsage: [],

      currentPlan: () => PLANS[get().tier],

      effectivePlan: () => {
        const { tier } = get();
        if (tier === 'free') return PLANS['free'];
        return get().isActive() ? PLANS[tier] : PLANS['free'];
      },

      monthlyScanCount: (type) => {
        const key = currentMonthKey();
        const usage = get().scanUsage.find((u) => u.month === key);
        return usage?.[type] ?? 0;
      },

      canScan: (type) => {
        const plan = get().currentPlan();
        // Süresi dolmuş abonelik → free limit uygula
        if (plan.maxScansPerMonth === -1 && !get().isActive()) {
          return get().monthlyScanCount(type) < PLANS['free'].maxScansPerMonth;
        }
        if (plan.maxScansPerMonth === -1) return true;
        return get().monthlyScanCount(type) < plan.maxScansPerMonth;
      },

      incrementScan: (type) => {
        const key = currentMonthKey();
        set((s) => {
          const existing = s.scanUsage.find((u) => u.month === key);
          if (existing) {
            return {
              scanUsage: s.scanUsage.map((u) =>
                u.month === key ? { ...u, [type]: u[type] + 1 } : u
              ),
            };
          }
          return {
            scanUsage: [
              ...s.scanUsage,
              { month: key, water: type === 'water' ? 1 : 0, gas: type === 'gas' ? 1 : 0 },
            ],
          };
        });
      },

      upgradeTo: (tier, cycle) => {
        const now = new Date();
        const expires = new Date(now);
        expires.setMonth(expires.getMonth() + (cycle === 'yearly' ? 12 : 1));
        set({ tier, billingCycle: cycle, expiresAt: expires.toISOString() });
      },

      isActive: () => {
        const { tier, expiresAt } = get();
        if (tier === 'free') return true;
        if (!expiresAt) return false;
        return new Date(expiresAt) > new Date();
      },
    }),
    {
      name: 'verim-subscription-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
