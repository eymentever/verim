import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Alert, Dimensions, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { C, FONT, RADIUS, SHADOW } from '../src/theme';
import { useUtilityStore, getBillBreakdown, BillBreakdown } from '../src/store/useUtilityStore';
import { useSubscriptionStore } from '../src/store/useSubscriptionStore';
import {
  simulateOCR, validateReading, computeConsumption,
  MeterType, OCRResult,
} from '../src/services/ocrService';

const { width: SW } = Dimensions.get('window');
const VF_W = SW - 48;
const VF_H = 240;

// ── Glow Grid ────────────────────────────────────────────────────────────────

function GlowGrid({ color }: { color: string }) {
  const COLS = 6, ROWS = 4;
  const cw = VF_W / COLS, rh = VF_H / ROWS;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: ROWS - 1 }).map((_, r) => (
        <View key={`h${r}`} style={{ position: 'absolute', top: (r + 1) * rh, left: 0, right: 0, height: 1, backgroundColor: `${color}22` }} />
      ))}
      {Array.from({ length: COLS - 1 }).map((_, c) => (
        <View key={`v${c}`} style={{ position: 'absolute', left: (c + 1) * cw, top: 0, bottom: 0, width: 1, backgroundColor: `${color}22` }} />
      ))}
    </View>
  );
}

// ── Köşe İşaretleri ───────────────────────────────────────────────────────────

function Corners({ color }: { color: string }) {
  const S = 24, T = 3;
  return (
    <>
      {[
        { top: 8,    left: 8,   borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
        { top: 8,    right: 8,  borderLeftWidth: 0,  borderBottomWidth: 0, borderTopRightRadius: 6 },
        { bottom: 8, left: 8,   borderRightWidth: 0, borderTopWidth: 0,    borderBottomLeftRadius: 6 },
        { bottom: 8, right: 8,  borderLeftWidth: 0,  borderTopWidth: 0,    borderBottomRightRadius: 6 },
      ].map((style, i) => (
        <View key={i} style={[{ position: 'absolute', width: S, height: S, borderColor: color, borderWidth: T }, style]} />
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ScanScreen() {
  const router   = useRouter();
  const store    = useUtilityStore();
  const subStore = useSubscriptionStore();

  const { profile, activePropertyId } = store;
  const city = store.activeProperty()?.city ?? profile.city ?? 'İstanbul';

  const [meterType, setMeterType] = useState<MeterType>('water');
  const [scanning,  setScanning]  = useState(false);
  const [torchOn,   setTorchOn]   = useState(true);  // auto-torch açık

  // OCR sonucu + hesaplanan döküm — onay modalı için
  const [ocrResult,  setOcrResult]  = useState<OCRResult | null>(null);
  const [breakdown,  setBreakdown]  = useState<BillBreakdown | null>(null);
  const [consumption, setConsumption] = useState<number>(0);
  const [modalVisible, setModalVisible] = useState(false);

  const scanAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scanLoop = useRef<Animated.CompositeAnimation | null>(null);

  const color    = meterType === 'water' ? C.water : C.gas;
  const plan     = subStore.currentPlan();

  // Auto-torch — ekran mount olduğunda açık; gerçek entegrasyon expo-camera ile
  useEffect(() => {
    setTorchOn(true);
    return () => setTorchOn(false);
  }, []);

  // ── Animasyon ──────────────────────────────────────────────────────────────

  const startAnim = () => {
    scanLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1600, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1600, useNativeDriver: true }),
      ])
    );
    scanLoop.current.start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  };

  const stopAnim = () => {
    scanLoop.current?.stop();
    scanAnim.setValue(0);
    glowAnim.setValue(0);
  };

  // ── Tarama Akışı ───────────────────────────────────────────────────────────

  const handleScan = async () => {
    // 1. Scan limiti kontrolü
    if (!subStore.canScan(meterType)) {
      Alert.alert(
        '🔒 Tarama Limiti Doldu',
        `Bu ay ${meterType === 'water' ? 'su' : 'gaz'} için ${plan.maxScansPerMonth} tarama hakkın bitti.`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Pro\'ya Geç', onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }

    setScanning(true);
    startAnim();

    try {
      // 2. OCR
      const result = await simulateOCR(`mock://${meterType}`, meterType);

      // 3. Son kayıtlı endeks — backward reading & tüketim hesabı için
      const propId    = activePropertyId ?? 'default';
      const lastIndex = store.lastIndexForType(propId, meterType);

      // 4. Doğrulama (backward reading + anomali)
      const daysSince = lastIndex !== undefined
        ? daysBetween(store.logs.find(l => l.type === meterType && l.propertyId === propId)?.date)
        : 1;

      const validation = validateReading(meterType, result.indexValue, lastIndex, daysSince);

      if (validation.severity === 'error') {
        // Kesin hata → kaydetme, kullanıcıya bilgi
        Alert.alert('❌ Geçersiz Okuma', validation.message);
        return;
      }

      if (validation.severity === 'warning') {
        // Anomali → onay gerektiriyor
        const confirmed = await new Promise<boolean>(resolve => {
          Alert.alert(
            '⚠️ Anormal Tüketim Tespit Edildi',
            `${validation.message}\n\nYine de kaydetmek istiyor musunuz?`,
            [
              { text: 'İptal', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Devam Et', onPress: () => resolve(true) },
            ],
            { cancelable: false }
          );
        });
        if (!confirmed) return;
      }

      // 5. Tüketim hesapla
      const netConsumption = lastIndex !== undefined
        ? (computeConsumption(result.indexValue, lastIndex) ?? 0)
        : result.indexValue; // ilk okumada endeksin kendisi tüketim sayılır

      // 6. Tarife dökümü (modalda gösterilecek)
      const bd = getBillBreakdown(meterType, netConsumption);

      setOcrResult(result);
      setBreakdown(bd);
      setConsumption(netConsumption);
      setModalVisible(true);

    } catch (err: any) {
      Alert.alert('Tarama Başarısız', err?.message ?? 'Lütfen tekrar deneyin.');
    } finally {
      setScanning(false);
      stopAnim();
    }
  };

  // ── Onay / Kaydetme ────────────────────────────────────────────────────────

  const handleConfirm = () => {
    if (!ocrResult || !breakdown) return;

    const propId = activePropertyId ?? 'default';
    store.addLog({
      id:          Date.now().toString(),
      date:        new Date().toISOString(),
      type:        meterType,
      indexValue:  ocrResult.indexValue,
      consumption,
      cost:        breakdown.totalCost,
      propertyId:  propId,
    });

    subStore.incrementScan(meterType);

    setModalVisible(false);
    setOcrResult(null);
    setBreakdown(null);

    Alert.alert(
      '✅ Kaydedildi',
      `₺${breakdown.totalCost.toFixed(2)} maliyet eklendi.\nEndeks: ${ocrResult.indexValue} m³ · Tüketim: ${consumption.toFixed(1)} m³`,
      [{ text: 'Tamam', onPress: () => router.back() }]
    );
  };

  const scanY       = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, VF_H - 4] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <View style={s.root}>

      {/* ── Başlık ─────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backText, { color }]}>← Geri</Text>
        </TouchableOpacity>
        <Text style={s.title}>Sayaç Tara</Text>
        <TouchableOpacity onPress={() => setTorchOn(v => !v)} style={s.torchBtn}>
          <Text style={[s.torchIcon, torchOn && { color: C.gas }]}>🔦</Text>
        </TouchableOpacity>
      </View>

      {/* ── Tip Seçici ─────────────────────────────── */}
      <View style={s.typeRow}>
        {(['water', 'gas'] as MeterType[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[
              s.typeBtn,
              meterType === t && {
                backgroundColor: t === 'water' ? C.waterDim : C.gasDim,
                borderColor:     t === 'water' ? C.water    : C.gas,
              },
            ]}
            onPress={() => setMeterType(t)}
          >
            <Text style={s.typeEmoji}>{t === 'water' ? '💧' : '🔥'}</Text>
            <Text style={[s.typeLabel, meterType === t && { color: t === 'water' ? C.water : C.gas }]}>
              {t === 'water' ? 'Su Sayacı' : 'Gaz Sayacı'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Viewfinder ─────────────────────────────── */}
      <View style={s.vfWrap}>
        <View style={[s.vf, { borderColor: `${color}40` }]}>
          <GlowGrid color={color} />
          <Corners color={color} />

          {scanning && (
            <Animated.View
              style={[
                s.scanLine,
                {
                  backgroundColor: color,
                  opacity:         glowOpacity,
                  transform:       [{ translateY: scanY }],
                  shadowColor:     color,
                  shadowOpacity:   0.9,
                  shadowRadius:    8,
                  elevation:       6,
                },
              ]}
            />
          )}

          {torchOn && (
            <View style={s.torchBadge}>
              <Text style={[s.torchBadgeText, { color: C.gas }]}>🔦 Işık Açık</Text>
            </View>
          )}

          <Text style={[s.vfHint, { color: `${color}70` }]}>
            {scanning
              ? 'Taranıyor...'
              : meterType === 'water'
                ? 'Siyah tekerlekleri kadrajlayın (kırmızı bölüm hariç)'
                : 'Ondalık ayırıcı öncesi rakamları kadrajlayın'}
          </Text>
        </View>

        {/* OCR hint */}
        <Text style={s.regexHint}>
          {meterType === 'water'
            ? 'Regex: 5–7 basamak (ör. 43817)'
            : 'Regex: 5–8 basamak (ör. 284510)'}
        </Text>
      </View>

      {/* ── Footer ─────────────────────────────────── */}
      <View style={s.footer}>
        <Text style={s.cityHint}>{city} tarifesi aktif</Text>
        {plan.maxScansPerMonth !== -1 && (
          <Text style={s.scanCountHint}>
            Kalan tarama: {plan.maxScansPerMonth - subStore.monthlyScanCount(meterType)}
          </Text>
        )}
        <TouchableOpacity
          style={[
            s.scanBtn,
            { backgroundColor: color, ...(SHADOW[meterType === 'water' ? 'water' : 'gas']) },
            scanning && s.scanBtnOff,
          ]}
          onPress={handleScan}
          disabled={scanning}
          activeOpacity={0.8}
        >
          <Text style={s.scanBtnText}>{scanning ? '⏳  Taranıyor...' : '📷  Tara'}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Doğrulama + Tarife Döküm Modalı ───────── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            {/* Üst renk şerit */}
            <View style={[s.modalAccent, { backgroundColor: color }]} />

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalTitle}>Okuma Doğrula</Text>

              {/* OCR bilgisi */}
              <View style={s.section}>
                <Text style={s.sectionHead}>📷 OCR Sonucu</Text>
                <Row label="Sayaç Türü"   value={meterType === 'water' ? '💧 Su' : '🔥 Doğalgaz'} />
                <Row label="Ham Metin"     value={ocrResult?.rawText ?? '—'} />
                <Row label="Ayrıştırılan" value={ocrResult?.parsedText ?? '—'} color={color} />
                <Row label="Endeks"        value={`${ocrResult?.indexValue ?? 0} m³`} color={color} />
                <Row label="OCR Güveni"    value={`%${((ocrResult?.confidence ?? 0) * 100).toFixed(0)}`}
                  color={(ocrResult?.confidence ?? 0) >= 0.9 ? C.brand : C.warn} />
              </View>

              {/* Tüketim */}
              <View style={s.section}>
                <Text style={s.sectionHead}>📊 Tüketim</Text>
                <Row label="Net Tüketim" value={`${consumption.toFixed(2)} m³`} color={color} bold />
              </View>

              {/* Tarife dökümü */}
              {breakdown && (
                <View style={s.section}>
                  <Text style={s.sectionHead}>🧾 Tarife Dökümü</Text>

                  {meterType === 'water' ? (
                    <>
                      <Row label="Ham Tarife (İSKİ kademeli)" value={`₺${breakdown.rawTariff.toFixed(2)}`} />
                      <Row label="ÇTV (1.50 ₺/m³)"           value={`₺${(breakdown.ctv ?? 0).toFixed(2)}`} />
                      <Row label="KDV (%10)"                  value={`₺${breakdown.kdv.toFixed(2)}`} />
                    </>
                  ) : (
                    <>
                      <Row label={`Enerji (${consumption.toFixed(2)} m³ × 10.64)`}
                        value={`${breakdown.energyKwh?.toFixed(2) ?? '—'} kWh`} />
                      <Row label="Ham Tarife (1.15 ₺/kWh)"   value={`₺${breakdown.rawTariff.toFixed(2)}`} />
                      <Row label="KDV (%10)"                  value={`₺${breakdown.kdv.toFixed(2)}`} />
                    </>
                  )}

                  <View style={[s.totalRow, { borderTopColor: color }]}>
                    <Text style={s.totalLabel}>TOPLAM</Text>
                    <Text style={[s.totalValue, { color }]}>₺{breakdown.totalCost.toFixed(2)}</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Butonlar */}
            <View style={s.modalActions}>
              <TouchableOpacity
                style={s.retryBtn}
                onPress={() => { setModalVisible(false); setOcrResult(null); setBreakdown(null); }}
              >
                <Text style={s.retryBtnText}>Yeniden Tara</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: color }]}
                onPress={handleConfirm}
              >
                <Text style={s.confirmBtnText}>Kaydet ✓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Yardımcı bileşenler ───────────────────────────────────────────────────────

function Row({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={row.wrap}>
      <Text style={row.label}>{label}</Text>
      <Text style={[row.value, color && { color }, bold && { fontWeight: '900' }]}>{value}</Text>
    </View>
  );
}
const row = StyleSheet.create({
  wrap:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.divider },
  label: { color: C.textDim, fontSize: FONT.sm, flex: 1 },
  value: { color: C.text, fontSize: FONT.sm, fontWeight: '600', maxWidth: '55%', textAlign: 'right' },
});

// ── Yardımcı fonksiyon ────────────────────────────────────────────────────────

function daysBetween(isoDate?: string): number {
  if (!isoDate) return 1;
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.max(1, Math.round(diff / 86_400_000));
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: C.bg },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  backBtn:         { width: 56 },
  backText:        { fontSize: FONT.md, fontWeight: '700' },
  title:           { color: C.text, fontSize: FONT.lg, fontWeight: '800' },
  torchBtn:        { width: 56, alignItems: 'flex-end' },
  torchIcon:       { fontSize: 22, color: C.textDim },

  typeRow:         { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  typeBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: RADIUS.lg, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  typeEmoji:       { fontSize: 20 },
  typeLabel:       { color: C.textDim, fontWeight: '700', fontSize: FONT.md },

  vfWrap:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  vf:              { width: '100%', height: VF_H, borderRadius: RADIUS.lg, backgroundColor: '#050810', borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  scanLine:        { position: 'absolute', left: 0, right: 0, height: 2, borderRadius: 1 },
  torchBadge:      { position: 'absolute', top: 10, right: 10, backgroundColor: `${C.gas}25`, borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  torchBadgeText:  { fontSize: FONT.xs, fontWeight: '700' },
  vfHint:          { fontSize: FONT.sm, textAlign: 'center', paddingHorizontal: 32 },
  regexHint:       { color: C.textMuted, fontSize: FONT.xs, marginTop: 10, fontFamily: 'monospace' },

  footer:          { padding: 24, gap: 6 },
  cityHint:        { color: C.textDim, fontSize: FONT.xs, textAlign: 'center' },
  scanCountHint:   { color: C.textDim, fontSize: FONT.xs, textAlign: 'center' },
  scanBtn:         { borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center' },
  scanBtnOff:      { opacity: 0.5 },
  scanBtnText:     { color: C.bg, fontSize: FONT.lg, fontWeight: '900' },

  // Modal
  overlay:         { flex: 1, backgroundColor: `${C.bg}CC`, justifyContent: 'flex-end' },
  modal:           { backgroundColor: C.card, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], padding: 24, borderTopWidth: 1, borderColor: C.cardBorder, maxHeight: '85%', overflow: 'hidden' },
  modalAccent:     { height: 3, borderRadius: 2, marginBottom: 16 },
  modalTitle:      { color: C.text, fontSize: FONT.xl, fontWeight: '900', marginBottom: 16 },
  section:         { marginBottom: 16 },
  sectionHead:     { color: C.textDim, fontSize: FONT.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  totalRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 2 },
  totalLabel:      { color: C.textDim, fontSize: FONT.sm, fontWeight: '800', letterSpacing: 1 },
  totalValue:      { fontSize: FONT['2xl'], fontWeight: '900' },
  modalActions:    { flexDirection: 'row', gap: 12, marginTop: 20 },
  retryBtn:        { flex: 1, borderRadius: RADIUS.lg, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  retryBtnText:    { color: C.textDim, fontWeight: '700' },
  confirmBtn:      { flex: 1, borderRadius: RADIUS.lg, paddingVertical: 15, alignItems: 'center' },
  confirmBtnText:  { color: C.bg, fontWeight: '900', fontSize: FONT.md },
});
