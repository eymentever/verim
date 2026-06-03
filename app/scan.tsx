import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Alert, Dimensions, ScrollView,
  Vibration, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { C, FONT, RADIUS } from '../src/theme';
import {
  useUtilityStore,
  getBillBreakdown,
  BillBreakdown,
} from '../src/store/useUtilityStore';
import { useSubscriptionStore } from '../src/store/useSubscriptionStore';
import {
  simulateOCR,
  validateReading,
  computeConsumption,
  MeterType,
  OCRResult,
} from '../src/services/ocrService';
import { notifyValidationResult } from '../src/services/notificationService';
import { formatTRY, formatM3 } from '../src/utils/format';

// ─────────────────────────────────────────────────────────────────────────────

const { width: SW }     = Dimensions.get('window');
const VF_H              = 210;
const AUTO_SCAN_DELAY   = 2400; // ms — ML Kit entegrasyonunda kaldırılır

type ScanMode  = 'auto' | 'manual';
type ScanPhase = 'idle' | 'scanning' | 'detected' | 'processing';

// ── Köşe İşaretleri ───────────────────────────────────────────────────────────

function Corners({ color, lit }: { color: string; lit: boolean }) {
  const S = 30, T = 3;
  const bc = lit ? C.brand : color;
  return (
    <>
      {([
        { top: 0,    left: 0,  borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius:     8 },
        { top: 0,    right: 0, borderLeftWidth: 0,  borderBottomWidth: 0, borderTopRightRadius:    8 },
        { bottom: 0, left: 0,  borderRightWidth: 0, borderTopWidth: 0,    borderBottomLeftRadius:  8 },
        { bottom: 0, right: 0, borderLeftWidth: 0,  borderTopWidth: 0,    borderBottomRightRadius: 8 },
      ] as const).map((style, i) => (
        <View
          key={i}
          style={[{ position: 'absolute', width: S, height: S, borderColor: bc, borderWidth: T }, style]}
        />
      ))}
    </>
  );
}

// ── Durum Etiketi ─────────────────────────────────────────────────────────────

const PHASE_LABEL: Record<ScanPhase, string> = {
  idle:       '📷  Sayacı kadrajlayın',
  scanning:   '🔍  Rakamlar aranıyor...',
  detected:   '✅  Rakamlar bulundu!',
  processing: '⏳  Hesaplanıyor...',
};

function PhaseTag({ phase, color }: { phase: ScanPhase; color: string }) {
  const highlight = phase === 'detected' || phase === 'processing';
  return (
    <View style={[
      ptag.wrap,
      { borderColor: highlight ? C.brand + '60' : color + '40' },
      highlight && { backgroundColor: C.brandDim },
    ]}>
      <Text style={[ptag.text, { color: highlight ? C.brand : '#fff' }]}>
        {PHASE_LABEL[phase]}
      </Text>
    </View>
  );
}
const ptag = StyleSheet.create({
  wrap: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: RADIUS.full, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  text: { fontSize: FONT.sm, fontWeight: '700' },
});

// ── Satır (modal içi) ─────────────────────────────────────────────────────────

function Row({ label, value, color, bold }: {
  label: string; value: string; color?: string; bold?: boolean;
}) {
  return (
    <View style={row.wrap}>
      <Text style={row.label}>{label}</Text>
      <Text style={[row.value, color ? { color } : null, bold ? { fontWeight: '900' } : null]}>
        {value}
      </Text>
    </View>
  );
}
const row = StyleSheet.create({
  wrap:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.divider },
  label: { color: C.textDim, fontSize: FONT.sm, flex: 1 },
  value: { color: C.text, fontSize: FONT.sm, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Ana Ekran
// ─────────────────────────────────────────────────────────────────────────────

export default function ScanScreen() {
  const router    = useRouter();
  const store     = useUtilityStore();
  const subStore  = useSubscriptionStore();
  const camRef    = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();

  const activeProp = store.activeProperty();
  const city       = activeProp?.city     ?? store.profile.city     ?? 'İstanbul';
  const district   = activeProp?.district ?? store.profile.district ?? '';

  // ── UI state ──────────────────────────────────────────────────────────────
  const params = useLocalSearchParams<{ type?: string }>();
  const [meterType,    setMeterType]    = useState<MeterType>(
    params.type === 'gas' ? 'gas' : 'water'
  );
  const [mode,         setMode]         = useState<ScanMode>('manual');
  const [phase,        setPhase]        = useState<ScanPhase>('idle');
  const [torchOn,      setTorchOn]      = useState(false);
  const [manualInput,  setManualInput]  = useState('');

  // ── Sonuç state ───────────────────────────────────────────────────────────
  const [modalVisible, setModalVisible] = useState(false);
  const [ocrResult,    setOcrResult]    = useState<OCRResult | null>(null);
  const [breakdown,    setBreakdown]    = useState<BillBreakdown | null>(null);
  const [consumption,  setConsumption]  = useState(0);
  const [isBaseline,   setIsBaseline]   = useState(false);

  // ── Animasyon ref'leri ────────────────────────────────────────────────────
  const scanAnim  = useRef(new Animated.Value(0)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const loopRef   = useRef<Animated.CompositeAnimation | null>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running   = useRef(false);

  const color = meterType === 'water' ? C.water : C.gas;
  const plan  = subStore.currentPlan();

  // ── İzin ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (permission === null) return;
    if (!permission.granted && permission.canAskAgain) requestPermission();
  }, [permission]);

  // ── Animasyon yardımcıları ─────────────────────────────────────────────────
  function startScanAnim() {
    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    loopRef.current.start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }

  function stopScanAnim() {
    loopRef.current?.stop();
    scanAnim.setValue(0);
    glowAnim.setValue(0);
  }

  function doPulse() {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 120, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1.05, duration: 120, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1,    duration: 120, useNativeDriver: true }),
    ]).start();
  }

  // ── Sıfırlama ─────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    stopScanAnim();
    running.current = false;
    setPhase('idle');
    setOcrResult(null);
    setBreakdown(null);
  }, []);

  useEffect(() => { reset(); }, [meterType, mode]);
  useEffect(() => () => { reset(); }, []);

  // ── Ortak: sonucu işle ve modal aç ────────────────────────────────────────
  async function processResult(rawIndex: number): Promise<boolean> {
    const propId    = store.activePropertyId ?? 'default';
    const lastIndex = store.lastIndexForType(propId, meterType);
    const daysSince = (() => {
      const log = store.logs.find(l => l.type === meterType && l.propertyId === propId);
      if (!log) return 1;
      return Math.max(1, Math.round((Date.now() - new Date(log.date).getTime()) / 86_400_000));
    })();

    const validation = validateReading(meterType, rawIndex, lastIndex, daysSince);

    if (validation.severity === 'error') {
      Alert.alert('❌ Geçersiz Okuma', validation.message, [
        { text: 'Tekrar Dene', onPress: reset },
      ]);
      running.current = false;
      setPhase('idle');
      return false;
    }

    if (validation.severity === 'warning') {
      notifyValidationResult(validation, meterType).catch(() => {});
      const confirmed = await new Promise<boolean>(resolve =>
        Alert.alert(
          '⚠️ Yüksek Tüketim',
          `${validation.message}\n\nYine de kaydetmek istiyor musunuz?`,
          [
            { text: 'İptal',   style: 'cancel', onPress: () => resolve(false) },
            { text: 'Devam Et',                  onPress: () => resolve(true) },
          ],
          { cancelable: false }
        )
      );
      if (!confirmed) { reset(); return false; }
    }

    const isFirst        = lastIndex === undefined;
    const netConsumption = isFirst ? 0 : (computeConsumption(rawIndex, lastIndex!) ?? 0);
    const bd: BillBreakdown = isFirst
      ? { consumption: 0, rawTariff: 0, kdv: 0, totalCost: 0, subCost: 0 }
      : getBillBreakdown(meterType, netConsumption, city, district);

    setConsumption(netConsumption);
    setIsBaseline(isFirst);
    setBreakdown(bd);
    return true;
  }

  // ── Otomatik Tarama ───────────────────────────────────────────────────────
  const handleAutoScan = useCallback(async () => {
    if (running.current) return;
    if (!subStore.canScan(meterType)) {
      Alert.alert(
        '🔒 Tarama Limiti',
        `Bu ay ${meterType === 'water' ? 'su' : 'gaz'} tarama hakkın bitti.`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: "Pro'ya Geç", onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }

    running.current = true;
    setPhase('scanning');
    startScanAnim();

    timerRef.current = setTimeout(async () => {
      setPhase('detected');
      stopScanAnim();
      doPulse();
      Vibration.vibrate(60);

      timerRef.current = setTimeout(async () => {
        setPhase('processing');
        try {
          // ML Kit gelince: simulateOCR → gerçek frame processor ile değiştirilir
          const result = await simulateOCR(`frame://${meterType}`, meterType);
          setOcrResult(result);
          const ok = await processResult(result.indexValue);
          if (ok) setModalVisible(true);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Lütfen tekrar deneyin.';
          Alert.alert('Okuma Başarısız', msg, [{ text: 'Tekrar Dene', onPress: reset }]);
        } finally {
          running.current = false;
          setPhase('idle');
        }
      }, 350);
    }, AUTO_SCAN_DELAY);
  }, [meterType, city, district]);

  // ── Manuel Giriş ──────────────────────────────────────────────────────────
  const handleManualSubmit = useCallback(async () => {
    const trimmed = manualInput.trim().replace(',', '.');
    const val     = parseFloat(trimmed);

    if (!trimmed || isNaN(val) || val <= 0) {
      Alert.alert('Hatalı Değer', 'Lütfen geçerli bir sayaç değeri girin (örn: 43817)');
      return;
    }
    if (!subStore.canScan(meterType)) {
      Alert.alert('🔒 Tarama Limiti', "Pro'ya geçerek devam edebilirsin.", [
        { text: 'İptal', style: 'cancel' },
        { text: "Pro'ya Geç", onPress: () => router.push('/paywall') },
      ]);
      return;
    }

    const mockResult: OCRResult = {
      type:       meterType,
      indexValue: Math.floor(val),       // tam m³
      confidence: 1.0,                    // manuel giriş = %100 güven
      rawText:    trimmed,
      parsedText: String(Math.floor(val)),
    };
    setOcrResult(mockResult);
    const ok = await processResult(mockResult.indexValue);
    if (ok) setModalVisible(true);
  }, [manualInput, meterType, city, district]);

  // ── Kaydet ────────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (!ocrResult || !breakdown) return;
    const propId = store.activePropertyId ?? 'default';
    store.addLog({
      id:         Date.now().toString(),
      date:       new Date().toISOString(),
      type:       meterType,
      indexValue: ocrResult.indexValue,
      consumption,
      cost:       breakdown.totalCost,
      propertyId: propId,
    });
    subStore.incrementScan(meterType);
    setModalVisible(false);
    setManualInput('');
    reset();
    Alert.alert(
      isBaseline ? '📍 Referans Kaydedildi' : '✅ Kaydedildi',
      isBaseline
        ? `Endeks: ${ocrResult.indexValue} m³ · Başlangıç noktası alındı.`
        : `${formatTRY(breakdown.totalCost)} · ${formatM3(consumption)}`,
      [{ text: 'Tamam', onPress: () => router.back() }]
    );
  };

  const scanY       = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, VF_H - 3] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.0] });

  // ── İzin ekranı ───────────────────────────────────────────────────────────
  if (!permission) {
    return <View style={s.centered}><Text style={s.dimText}>Kamera kontrol ediliyor...</Text></View>;
  }
  if (!permission.granted) {
    return (
      <View style={s.centered}>
        <Text style={{ fontSize: 52, marginBottom: 16 }}>📷</Text>
        <Text style={s.permTitle}>Kamera İzni Gerekli</Text>
        <Text style={s.dimText}>Sayaç okumak için kamera iznine ihtiyaç var.</Text>
        <TouchableOpacity style={[s.bigBtn, { backgroundColor: color, marginTop: 24 }]} onPress={requestPermission}>
          <Text style={s.bigBtnText}>İzin Ver</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginTop: 14 }} onPress={() => router.back()}>
          <Text style={{ color: C.textDim, fontSize: FONT.sm }}>← Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Ana Ekran ─────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Başlık */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[s.backText, { color }]}>← Geri</Text>
        </TouchableOpacity>
        <Text style={s.title}>Sayaç Okuma</Text>
        <TouchableOpacity onPress={() => setTorchOn(v => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[s.torchIcon, torchOn && { color: '#FFD700' }]}>🔦</Text>
        </TouchableOpacity>
      </View>

      {/* Tip Seçici */}
      <View style={s.typeRow}>
        {(['water', 'gas'] as MeterType[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[s.typeBtn, meterType === t && { backgroundColor: t === 'water' ? C.waterDim : C.gasDim, borderColor: t === 'water' ? C.water : C.gas }]}
            onPress={() => setMeterType(t)}
            disabled={phase === 'scanning' || phase === 'processing'}
          >
            <Text style={s.typeEmoji}>{t === 'water' ? '💧' : '🔥'}</Text>
            <Text style={[s.typeLabel, meterType === t && { color: t === 'water' ? C.water : C.gas }]}>
              {t === 'water' ? 'Su Sayacı' : 'Gaz Sayacı'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Mod Seçici */}
      <View style={s.modeRow}>
        {(['auto', 'manual'] as ScanMode[]).map(m => (
          <TouchableOpacity
            key={m}
            style={[s.modeBtn, mode === m && { backgroundColor: `${color}20`, borderColor: color }]}
            onPress={() => setMode(m)}
            disabled={phase === 'scanning' || phase === 'processing'}
          >
            <Text style={[s.modeBtnText, mode === m && { color }]}>
              {m === 'manual' ? '✏️  Manuel Giriş' : '🤖  Oto Tara (Beta)'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── OTOMATİK MOD ──────────────────────────────── */}
      {mode === 'auto' && (
        <View style={s.vfWrap}>
          <Animated.View style={{ width: '100%', transform: [{ scale: pulseAnim }] }}>
            <View style={[s.vf, { borderColor: phase === 'detected' ? C.brand : `${color}50` }]}>
              <CameraView
                ref={camRef}
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={torchOn}
              />
              <Corners color={color} lit={phase === 'detected'} />

              {phase === 'scanning' && (
                <Animated.View style={[s.scanLine, {
                  backgroundColor: color,
                  opacity:   glowOpacity,
                  transform: [{ translateY: scanY }],
                  shadowColor: color, shadowOpacity: 0.9, shadowRadius: 8, elevation: 6,
                }]} />
              )}

              {phase === 'detected' && (
                <View style={s.detectedLayer}>
                  <Text style={s.detectedCheck}>✓</Text>
                </View>
              )}

              {torchOn && (
                <View style={s.torchBadge}>
                  <Text style={s.torchBadgeText}>🔦 Işık</Text>
                </View>
              )}
            </View>
          </Animated.View>

          <View style={{ marginTop: 14, alignItems: 'center' }}>
            <PhaseTag phase={phase} color={color} />
          </View>
          <Text style={s.hint}>
            {meterType === 'water'
              ? 'Siyah tekerlekleri kadrajlayın (kırmızı bölüm hariç)'
              : 'Ondalık ayırıcı öncesini kadrajlayın'}
          </Text>
        </View>
      )}

      {/* ── MANUEL MOD ────────────────────────────────── */}
      {mode === 'manual' && (
        <View style={s.manualWrap}>
          <View style={s.manualCard}>
            <Text style={s.manualLabel}>
              {meterType === 'water' ? '💧 Su Sayacı Değeri (m³)' : '🔥 Gaz Sayacı Değeri (m³)'}
            </Text>
            <TextInput
              style={[s.manualInput, { borderColor: color }]}
              value={manualInput}
              onChangeText={setManualInput}
              placeholder="Örn: 43817"
              placeholderTextColor={C.textMuted}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={handleManualSubmit}
              maxLength={8}
              autoFocus
            />
            <Text style={s.manualHint}>
              {meterType === 'water'
                ? 'Siyah rakamları girin, kırmızı (ondalık) bölümü atlatın.'
                : 'Ondalık ayırıcı öncesindeki rakamları girin.'}
            </Text>
          </View>
        </View>
      )}

      {/* Footer */}
      <View style={s.footer}>
        <Text style={s.cityHint}>{city}{district ? ` · ${district}` : ''} tarifesi aktif</Text>
        {plan.maxScansPerMonth !== -1 && (
          <Text style={s.cityHint}>
            Kalan tarama: {Math.max(0, plan.maxScansPerMonth - subStore.monthlyScanCount(meterType))}
          </Text>
        )}

        {mode === 'auto' ? (
          phase === 'idle' ? (
            <TouchableOpacity style={[s.bigBtn, { backgroundColor: color }]} onPress={handleAutoScan}>
              <Text style={s.bigBtnText}>🔍  Otomatik Oku</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.bigBtn, s.cancelBtn]} onPress={reset}>
              <Text style={[s.bigBtnText, { color: C.danger }]}>✕  İptal Et</Text>
            </TouchableOpacity>
          )
        ) : (
          <TouchableOpacity
            style={[s.bigBtn, { backgroundColor: color }, (!manualInput.trim()) && s.btnDisabled]}
            onPress={handleManualSubmit}
            disabled={!manualInput.trim()}
          >
            <Text style={s.bigBtnText}>✅  Hesapla & Kaydet</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── DOĞRULAMA MODALI ──────────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => { setModalVisible(false); reset(); }}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={[s.modalBar, { backgroundColor: color }]} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              <Text style={s.modalTitle}>Okumayı Onayla</Text>

              {isBaseline && (
                <View style={s.baselineBadge}>
                  <Text style={s.baselineTitle}>📍 İlk Okuma — Referans Endeks</Text>
                  <Text style={s.baselineSub}>
                    Başlangıç noktası. Tüketim ve maliyet bir sonraki okumada hesaplanır.
                  </Text>
                </View>
              )}

              <View style={s.section}>
                <Text style={s.sectionHead}>📷 Okunan Değer</Text>
                <Row label="Sayaç Türü"  value={meterType === 'water' ? '💧 Su' : '🔥 Doğalgaz'} />
                <Row label="Endeks"       value={`${ocrResult?.indexValue ?? 0} m³`} color={color} bold />
                <Row
                  label="Güven"
                  value={mode === 'manual' ? 'Manuel (%100)' : `%${((ocrResult?.confidence ?? 0) * 100).toFixed(0)}`}
                  color={(ocrResult?.confidence ?? 0) >= 0.9 ? C.brand : C.warn}
                />
              </View>

              {!isBaseline && (
                <View style={s.section}>
                  <Text style={s.sectionHead}>📊 Tüketim</Text>
                  <Row label="Bu Dönem" value={formatM3(consumption)} color={color} bold />
                </View>
              )}

              {!isBaseline && breakdown && (
                <View style={s.section}>
                  <Text style={s.sectionHead}>🧾 Fatura Tahmini</Text>
                  {meterType === 'water' ? (
                    <>
                      <Row label={`Su Bedeli (${city})`}    value={formatTRY(breakdown.rawTariff)} />
                      <Row label="Çevre Temizlik Vergisi"   value={formatTRY(breakdown.ctv ?? 0)} />
                      <Row label="Abonelik Gideri"          value={formatTRY(breakdown.subCost)} />
                      <Row label="KDV"                      value={formatTRY(breakdown.kdv)} />
                    </>
                  ) : (
                    <>
                      <Row label={`Gaz Bedeli (${city})`}   value={formatTRY(breakdown.rawTariff)} />
                      <Row label="ÖTV"                      value={formatTRY(breakdown.otv ?? 0)} />
                      <Row label="Servis Bedeli"            value={formatTRY(breakdown.subCost)} />
                      <Row label="KDV (%20)"                value={formatTRY(breakdown.kdv)} />
                    </>
                  )}
                  <View style={[s.totalRow, { borderTopColor: color }]}>
                    <Text style={s.totalLabel}>TAHMİNİ TOPLAM</Text>
                    <Text style={[s.totalValue, { color }]}>{formatTRY(breakdown.totalCost)}</Text>
                  </View>
                </View>
              )}

              {mode === 'auto' && (
                <View style={s.noteBox}>
                  <Text style={s.noteBold}>📷 OCR Beta</Text>
                  <Text style={s.noteText}>
                    Sayaç okuma yapay zeka öğreniyor — endeks değerini faturanızla karşılaştırın.
                    Tarife hesabı resmi {city} tarifesine göre yapılmaktadır.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.retryBtn}
                onPress={() => { setModalVisible(false); reset(); }}
              >
                <Text style={s.retryText}>Yeniden Dene</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: color }]}
                onPress={handleConfirm}
              >
                <Text style={s.confirmText}>Kaydet ✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  centered:      { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  permTitle:     { color: C.text, fontSize: FONT.xl, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  dimText:       { color: C.textDim, fontSize: FONT.sm, textAlign: 'center', lineHeight: 20 },

  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 54, paddingBottom: 10 },
  backText:      { fontSize: FONT.md, fontWeight: '700' },
  title:         { color: C.text, fontSize: FONT.lg, fontWeight: '800' },
  torchIcon:     { fontSize: 22, color: C.textDim },

  typeRow:       { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 10 },
  typeBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderRadius: RADIUS.lg, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  typeEmoji:     { fontSize: 17 },
  typeLabel:     { color: C.textDim, fontWeight: '700', fontSize: FONT.sm },

  modeRow:       { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 12 },
  modeBtn:       { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  modeBtnText:   { color: C.textDim, fontWeight: '700', fontSize: FONT.sm },

  vfWrap:        { flex: 1, paddingHorizontal: 20, justifyContent: 'flex-start', paddingTop: 4 },
  vf:            { width: '100%', height: VF_H, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 2, position: 'relative' },
  scanLine:      { position: 'absolute', left: 0, right: 0, height: 2, borderRadius: 1 },
  detectedLayer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  detectedCheck: { fontSize: 64, color: '#fff', fontWeight: '900' },
  torchBadge:    { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,215,0,0.2)', borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 3 },
  torchBadgeText:{ color: '#FFD700', fontSize: FONT.xs, fontWeight: '700' },
  hint:          { color: C.textMuted, fontSize: FONT.xs, textAlign: 'center', marginTop: 10, paddingHorizontal: 8 },

  manualWrap:    { flex: 1, paddingHorizontal: 20, justifyContent: 'flex-start', paddingTop: 8 },
  manualCard:    { backgroundColor: C.card, borderRadius: RADIUS.xl, padding: 24, borderWidth: 1, borderColor: C.cardBorder },
  manualLabel:   { color: C.text, fontSize: FONT.md, fontWeight: '700', marginBottom: 14 },
  manualInput:   { backgroundColor: C.bg, borderRadius: RADIUS.md, borderWidth: 2, color: C.text, padding: 16, fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: 4, marginBottom: 12 },
  manualHint:    { color: C.textDim, fontSize: FONT.xs, lineHeight: 17, textAlign: 'center' },

  footer:        { padding: 20, paddingBottom: 36, gap: 6 },
  cityHint:      { color: C.textDim, fontSize: FONT.xs, textAlign: 'center' },
  bigBtn:        { borderRadius: RADIUS.xl, paddingVertical: 17, alignItems: 'center', marginTop: 4 },
  bigBtnText:    { color: C.bg, fontSize: FONT.lg, fontWeight: '900' },
  btnDisabled:   { opacity: 0.35 },
  cancelBtn:     { backgroundColor: `${C.danger}15`, borderWidth: 1, borderColor: `${C.danger}40` },

  overlay:       { flex: 1, backgroundColor: `${C.bg}CC`, justifyContent: 'flex-end' },
  modal:         { backgroundColor: C.card, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], padding: 24, borderTopWidth: 1, borderColor: C.cardBorder, maxHeight: '90%' },
  modalBar:      { height: 3, borderRadius: 2, marginBottom: 16 },
  modalTitle:    { color: C.text, fontSize: FONT.xl, fontWeight: '900', marginBottom: 16 },
  section:       { marginBottom: 16 },
  sectionHead:   { color: C.textDim, fontSize: FONT.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 2 },
  totalLabel:    { color: C.textDim, fontSize: FONT.sm, fontWeight: '800', letterSpacing: 1 },
  totalValue:    { fontSize: FONT['2xl'], fontWeight: '900' },
  noteBox:       { backgroundColor: `${C.warn}12`, borderRadius: RADIUS.sm, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: `${C.warn}25` },
  noteBold:      { color: C.warn, fontSize: FONT.xs, fontWeight: '800', marginBottom: 3 },
  noteText:      { color: C.warn, fontSize: FONT.xs, lineHeight: 16 },
  baselineBadge: { backgroundColor: `${C.pro}12`, borderRadius: RADIUS.md, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: `${C.pro}35` },
  baselineTitle: { color: C.pro, fontSize: FONT.sm, fontWeight: '800', marginBottom: 4 },
  baselineSub:   { color: C.textDim, fontSize: FONT.xs, lineHeight: 16 },
  modalActions:  { flexDirection: 'row', gap: 12, marginTop: 16 },
  retryBtn:      { flex: 1, borderRadius: RADIUS.lg, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  retryText:     { color: C.textDim, fontWeight: '700' },
  confirmBtn:    { flex: 1, borderRadius: RADIUS.lg, paddingVertical: 15, alignItems: 'center' },
  confirmText:   { color: C.bg, fontWeight: '900', fontSize: FONT.md },
});
