import { useState, useEffect, useCallback } from 'react';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  RCPackage,
  PurchaseResult,
} from '../services/revenueCatService';

interface UseRevenueCatReturn {
  offerings: RCPackage[];
  loading: boolean;
  purchasing: boolean;
  isPremium: boolean;
  purchase: (pkg: RCPackage) => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  refresh: () => Promise<void>;
}

export function useRevenueCat(): UseRevenueCatReturn {
  const { tier, upgradeTo } = useSubscriptionStore();
  const [offerings, setOfferings] = useState<RCPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const pkgs = await getOfferings();
      setOfferings(pkgs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, []);

  const purchase = useCallback(async (pkg: RCPackage): Promise<PurchaseResult> => {
    setPurchasing(true);
    try {
      const result = await purchasePackage(pkg);
      if (result.success && result.tier) {
        upgradeTo(result.tier, pkg.period);
      }
      return result;
    } finally {
      setPurchasing(false);
    }
  }, [upgradeTo]);

  const restore = useCallback(async (): Promise<PurchaseResult> => {
    setPurchasing(true);
    try {
      const result = await restorePurchases();
      if (result.success && result.tier) {
        upgradeTo(result.tier, 'monthly');
      }
      return result;
    } finally {
      setPurchasing(false);
    }
  }, [upgradeTo]);

  return {
    offerings,
    loading,
    purchasing,
    isPremium: tier !== 'free',
    purchase,
    restore,
    refresh,
  };
}
