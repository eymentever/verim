import { useMemo } from 'react';
import { ConsumptionLog } from '../store/useUtilityStore';

export interface PrepaidStatus {
  isPrepaid: boolean;
  loadedCredit: number;       // TL - kullanıcının yüklediği
  usedCredit: number;         // TL
  remainingCredit: number;    // TL
  isLow: boolean;             // kalan < %20
  isCritical: boolean;        // kalan < %5
  alertMessage: string | null;
}

/**
 * Kartlı (prepaid) sayaç mantığı.
 * `isPrepaid` ve `loadedCredit` kullanıcı profilinden gelir.
 */
export function usePrepaidMeter(
  isPrepaid: boolean,
  loadedCredit: number,
  logs: ConsumptionLog[]
): PrepaidStatus {
  return useMemo(() => {
    if (!isPrepaid) {
      return {
        isPrepaid: false,
        loadedCredit: 0,
        usedCredit: 0,
        remainingCredit: 0,
        isLow: false,
        isCritical: false,
        alertMessage: null,
      };
    }

    const usedCredit = logs.reduce((s, l) => s + l.cost, 0);
    const remainingCredit = Math.max(0, loadedCredit - usedCredit);
    const ratio = loadedCredit > 0 ? remainingCredit / loadedCredit : 0;
    const isLow = ratio < 0.20;
    const isCritical = ratio < 0.05;

    let alertMessage: string | null = null;
    if (isCritical) {
      alertMessage = `🚨 Kritik: Sadece ₺${remainingCredit.toFixed(2)} krediniz kaldı! Hemen yükleyin.`;
    } else if (isLow) {
      alertMessage = `⚠️ Kredinizin %${Math.round(ratio * 100)}'i kaldı (₺${remainingCredit.toFixed(2)}). Yakında bitecek.`;
    }

    return {
      isPrepaid: true,
      loadedCredit,
      usedCredit,
      remainingCredit,
      isLow,
      isCritical,
      alertMessage,
    };
  }, [isPrepaid, loadedCredit, logs]);
}
