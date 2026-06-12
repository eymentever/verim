// ─────────────────────────────────────────────────────────────────────────────
// Verim — Local Push Notification Service
// expo-notifications ile yerel bildirimler.
// Kaçak tespiti ve anomali uyarıları için kullanılır.
// ─────────────────────────────────────────────────────────────────────────────

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { ValidationResult } from './ocrService';

// ── Bildirim davranışı (uygulama ön plandayken de göster) ─────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
});

// ── İzin Yönetimi ─────────────────────────────────────────────────────────────

/**
 * Bildirim izni ister. iOS'ta kullanıcıdan onay alınır.
 * @returns true → izin verildi, false → reddedildi
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowSound: true,
      allowBadge: false,
    },
  });

  return status === 'granted';
}

// ── Android Kanal Kurulumu ────────────────────────────────────────────────────

/**
 * Android 8+ için bildirim kanalları oluşturur.
 * _layout.tsx içinde uygulama başlarken bir kez çağrılmalı.
 */
export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('leak_alert', {
    name:                   'Kaçak Uyarıları',
    importance:             Notifications.AndroidImportance.HIGH,
    vibrationPattern:       [0, 250, 250, 250],
    lightColor:             '#FF4757',
    sound:                  'default',
    description:            'Anormal tüketim ve kaçak tespiti bildirimleri',
  });

  await Notifications.setNotificationChannelAsync('general', {
    name:                   'Genel Bildirimler',
    importance:             Notifications.AndroidImportance.DEFAULT,
    sound:                  'default',
    description:            'Kayıt hatırlatıcıları ve bilgi mesajları',
  });
}

// ── Bildirim Gönderici Fonksiyonlar ───────────────────────────────────────────

/**
 * OCR doğrulama sonucuna göre uygun bildirimi tetikler.
 * ANOMALY_SPIKE → yüksek öncelikli kaçak uyarısı.
 *
 * @param validation - validateReading() çıktısı
 * @param meterType  - 'water' | 'gas'
 */
export async function notifyValidationResult(
  validation: ValidationResult,
  meterType:  'water' | 'gas',
): Promise<void> {
  if (validation.severity !== 'warning') return;
  if (validation.code    !== 'ANOMALY_SPIKE') return;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const emoji = meterType === 'water' ? '💧' : '🔥';
  const label = meterType === 'water' ? 'Su'  : 'Doğalgaz';

  await Notifications.scheduleNotificationAsync({
    content: {
      title:    `${emoji} Anormal ${label} Tüketimi Tespit Edildi`,
      body:     validation.message,
      data:     { type: 'ANOMALY_SPIKE', meterType },
      sound:    'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    // Android'de leak_alert kanalını kullan; null trigger varsayılan kanala düşer
    trigger: Platform.OS === 'android' ? { channelId: 'leak_alert' } : null,
  });
}

/**
 * Kaçak şüphesi bildirimi — arka plan veya analiz ekranından tetiklenir.
 * Pro kullanıcılar için 7/24 AI Kaçak Koruması bildirimi.
 *
 * @param meterType   - 'water' | 'gas'
 * @param anomalyScore - 0–100 anomali skoru
 */
export async function notifyLeakSuspicion(
  meterType:    'water' | 'gas',
  anomalyScore: number,
): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const emoji = meterType === 'water' ? '🚨' : '⚠️';
  const label = meterType === 'water' ? 'Su'  : 'Doğalgaz';
  const level = anomalyScore >= 65 ? 'Kritik' : 'Şüpheli';

  await Notifications.scheduleNotificationAsync({
    content: {
      title:    `${emoji} ${level} ${label} Kaçağı`,
      body:     `${label} tüketiminizde anormal bir artış var (skor: ${anomalyScore}/100). Sayacınızı kontrol edin.`,
      data:     { type: 'LEAK_SUSPICION', meterType, anomalyScore },
      sound:    'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: Platform.OS === 'android' ? { channelId: 'leak_alert' } : null,
  });
}

/**
 * Aylık okuma hatırlatıcısı — her ayın belirli bir gününde tetiklenir.
 *
 * @param dayOfMonth - Hatırlatıcı günü (1–28)
 */
export async function scheduleMonthlyReminder(dayOfMonth = 1): Promise<string> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return '';

  // Önce mevcut hatırlatıcıyı iptal et
  await cancelMonthlyReminder();

  // CALENDAR trigger yalnızca iOS'ta çalışır; MONTHLY her iki platformda desteklenir
  const trigger: Notifications.NotificationTriggerInput =
    Platform.OS === 'ios'
      ? {
          type:    Notifications.SchedulableTriggerInputTypes.CALENDAR,
          day:     dayOfMonth,
          hour:    9,
          minute:  0,
          repeats: true,
        }
      : {
          type:      Notifications.SchedulableTriggerInputTypes.MONTHLY,
          day:       dayOfMonth,
          hour:      9,
          minute:    0,
          channelId: 'general',
        };

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '📊 Aylık Sayaç Okuması Zamanı',
      body:  'Su ve doğalgaz sayaçlarınızı okuyarak Verim\'e kaydedin.',
      data:  { type: 'MONTHLY_REMINDER' },
      sound: 'default',
    },
    trigger,
  });

  return id;
}

export async function cancelMonthlyReminder(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if ((notif.content.data as any)?.type === 'MONTHLY_REMINDER') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

/**
 * Prepaid kredi düşük uyarısı.
 */
export async function notifyLowPrepaidCredit(
  remaining: number,
  isCritical: boolean,
): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: isCritical ? '🚨 Kartlı Sayaç Krediniz Bitiyor!' : '⚠️ Kartlı Sayaç Krediniz Azalıyor',
      body:  `Kalan kredi: ₺${remaining.toFixed(2)}. ${isCritical ? 'Hemen yükleyin!' : 'Yakında dolacak.'}`,
      data:  { type: 'LOW_PREPAID_CREDIT', remaining },
      sound: 'default',
    },
    trigger: null,
  });
}

// ── Bildirime Tıklama Dinleyicisi ─────────────────────────────────────────────

/**
 * Kullanıcı bildirimine tıkladığında çalışır.
 * _layout.tsx içinde useEffect ile kurulmalı.
 *
 * @param onNotification - Bildirim verisini işleyen callback
 */
export function addNotificationResponseListener(
  onNotification: (data: Record<string, unknown>) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    onNotification(data);
  });
}
