// ─────────────────────────────────────────────────────────────────────────────
// Verim — useIntelligenceAlerts
//
// Her yeni okuma kaydedildiğinde su ve gaz zekasını çalıştırır.
// Kritik/yüksek risk varsa push notification gönderir.
// _layout.tsx veya index.tsx'te bir kez mount edilmeli.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { ConsumptionLog } from '../store/useUtilityStore';
import { analyzeWaterLeakRisk } from '../services/waterIntelligenceService';
import { analyzeGasLeakRisk }   from '../services/gasIntelligenceService';
import {
  notifyLeakSuspicion,
  requestNotificationPermission,
} from '../services/notificationService';
import { getCityConfig } from '../services/tariffEngine';

interface Options {
  logs:   ConsumptionLog[];
  city:   string;
}

/**
 * Log sayısı değiştiğinde (yeni okuma eklendi) zeka analizini tetikler.
 * Kritik veya yüksek risk tespit edilirse push notification gönderir.
 */
export function useIntelligenceAlerts({ logs, city }: Options) {
  // Bir önceki log sayısını hatırla — sadece yeni ekleme olduğunda çalışsın
  const prevCountRef = useRef(logs.length);

  useEffect(() => {
    const currentCount = logs.length;

    // Yeni okuma eklenmediyse (silme veya ilk yükleme) çalışma
    if (currentCount <= prevCountRef.current) {
      prevCountRef.current = currentCount;
      return;
    }
    prevCountRef.current = currentCount;

    // Kısa gecikme — state tam yerleşsin
    const timer = setTimeout(async () => {
      const hasPermission = await requestNotificationPermission().catch(() => false);
      if (!hasPermission) return;

      const config    = getCityConfig(city);
      const waterRate = config.waterTiers[0]?.rate ?? 44.50;
      const gasRate   = config.gasRate ?? 13.45;

      // ── Su analizi ──────────────────────────────────────────────────────────
      const waterLogs = logs.filter(l => l.type === 'water');
      if (waterLogs.length >= 2) {
        const waterRisk = analyzeWaterLeakRisk(waterLogs, waterRate);
        if (waterRisk.level === 'critical' || waterRisk.level === 'high') {
          await notifyLeakSuspicion('water', waterRisk.score).catch(() => {});
        }
      }

      // ── Gaz analizi ─────────────────────────────────────────────────────────
      const gasLogs = logs.filter(l => l.type === 'gas');
      if (gasLogs.length >= 2) {
        const gasRisk = analyzeGasLeakRisk(gasLogs);
        if (gasRisk.level === 'critical' || gasRisk.level === 'high') {
          await notifyLeakSuspicion('gas', gasRisk.score).catch(() => {});
        }
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [logs.length, city]);
}
