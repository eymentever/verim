import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, Alert, Dimensions, ScrollView,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
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

// ── Köşe İşaretleri ───────────────────────────────────────────────────────────

function Corners({ color }: { color: string }) {
  const S = 28, T = 3;
  return (
    <>
      {[
        { top: 0, left: 0,   borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
        { top: 0, right: 0,  borderLeftWidth: 0,  borderBottomWidth: 0, borderTopRightRadius: 8 },
        { bottom: 0, left: 0,  borderRightWidth: 0, borderTopWidth: 0,  borderBottomLeftRadius: 8 },
        { bottom: 0, right: 0, borderLeftWidth: 0,  borderTopWidth: 0,  borderBottomRightRadius: 8 },
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
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();

  const { profile, activePropertyId } = store;
  const city = store.activeProperty()?.city ?? profile.city ?? 'İstanbul';

  const [meterType, setMeterType] = useState<MeterType>('water');
  const [scanning,  setScanning]  = useState(false);
  const [torchOn,   setTorchOn]   = useState(false);
  const [photoTaken, setPhotoTaken] = useState(false);

  const [ocrResult,   setOcrResult]   = useState<OCRResult | null>(null);
  const [breakdown,   setBreakdown]   = useState<BillBreakdown | null>(null);
  const [consumption, setConsumption] = useState<number>(0);
  const [modalVisible, setModalVisible] = useState(false);

  const scanAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scanLoop = useRef<Animated.CompositeAnimation | null>(null);

  const color = meterType === 'water' ? C.water : C.gas;
  const plan  = subStore.currentPlan();

  // ── İzin kontrolü ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // ── Animasyon ──────────────────────────────────────────────────────────────

  const startAnim = () => {
    scanLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    );
    scanLoop.current.start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
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
    // 1. İzin kontrolü
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Kamera İzni Gerekli', 'Sayaç okumak için kamera iznine ihtiyaç var.', [
          { text: 'Tamam' },
        ]);
        return;
      }
    }

    // 2. Scan limiti kontrolü
    if (!subStore.canScan(meterType)) {
      Alert.alert(
        '🔒 Tarama Limiti Doldu',
        `Bu ay ${meterType === 'water' ? 'su' : 'gaz'} için ${plan.maxScansPerMonth} tarama hakkın bitti.`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: "Pro'ya Geç", onPress: () => router.push('/paywall') },
        ]
      );
      return;
    }

    setScanning(true);
    setPhotoTaken(false);
    startAnim();

    try {
      // 3. Fotoğraf çek
      let imageUri: string | undefined;
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          skipProcessing: false,
        });
        imageUri = photo?.uri;
        setPhotoTaken(true);
      }

      // 4. OCR — gerçek ML Kit entegrasyonuna kadar mock
      // imageUri gerçek üretimde ML Kit'e gönderilecek
      const result = await simulateOCR(imageUri ?? `mock://${meterType}`, meterType);

      // 5. Son endeks + doğrulama
      const propId    = activePropertyId ?? 'default';
      const lastIndex = store.lastIndexForType(propId, meterType);
      const daysSince = lastIndex !== undefined
        ? daysBetween(store.logs.find(l => l.type === meterType && l.propertyId === propId)?.date)
        : 1;

      const validation = validateReading(meterType, result.indexValue, lastIndex, daysSince);

      if (validation.severity === 'error') {
        Alert.alert('❌ Geçersiz Okuma', validation.message);
        return;
      }

      if (validation.severity === 'warning') {
        const confirmed = await new Promise<boolean>(resolve => {
          Alert.alert(
            '⚠️ Anormal Tüketim',
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

      // 6. Tüketim + döküm
      const netConsumption = lastIndex !== undefined
        ? (computeConsumption(result.indexValue, lastIndex) ?? 0)
        : result.indexValue;

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
      `₺${breakdown.totalCost.toFixed(2)} eklendi.\nEndeks: ${ocrResult.indexValue} m³ · Tüketim: ${consumption.toFixed(1)} m³`,
      [{ text: 'Tamam', onPress: () => router.back() }]
    );
  };

  const scanY       = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [0, VF_H - 4] });
  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  // ── İzin yoksa bilgi ekranı ─────────────────────────────────────────────────

  if (!permission) {
    return (
      <View style={s.permWrap}>
        <Text style={s.permText}>Kamera izni kontrol ediliyor...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={s.permWrap}>
        <Text style={s.permEmoji}>📷</Text>
        <Text style={s.permTitle}>Kamera İzni Gerekli</Text>
        <Text style={s.permText}>Sayaç fotoğrafını okumak için kamera iznine ihtiyaç duyulur.</Text>
        <TouchableOpacity style={[s.permBtn, { backgroundColor: color }]} onPress={requestPermission}>
          <Text style={s.permBtnText}>İzin Ver</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.permSkip} onPress={() => router.back()}>
          <Text style={s.permSkipText}>← Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Ana ekran ──────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>

      {/* ── Başlık ─────────────────────────────────── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={[s.backText, { color }]}>← Geri</Text>
        </TouchableOpacity>
        <Text style={s.title}>Sayaç Tara</Text>
        <TouchableOpacity onPress={() => setTorchOn(v => !v)} style={s.torchBtn}>
          <Text style={[s.torchIcon, torchOn && { color: '#FFD700' }]}>🔦</Text>
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

      {/* ── Gerçek Kamera Viewfinder ───────────────── */}
      <View style={s.vfWrap}>
        <View style={[s.vf, { borderColor: `${color}60` }]}>

          {/* Gerçek kamera görüntüsü */}
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torchOn}
          />

          {/* Köşe işaretleri — kameranın üzerinde */}
          <Corners color={color} />

          {/* Tarama çizgisi */}
          {scanning && (
            <Animated.View
              style={[
                s.scanLine,
                {
                  backgroundColor: color,
                  opacity:         glowOpacity,
                  transform:       [{ translateY: scanY }],
                  shadowColor:     color,
                  shadowOpacity:   0.95,
                  shadowRadius:    10,
                  elevation:       8,
                },
              ]}
            />
          )}

          {/* Torch badge */}
          {torchOn && (
            <View style={s.torchBadge}>
              <Text style={s.torchBadgeText}>🔦 Işık Açık</Text>
            </View>
          )}

          {/* Yönlendirme metni */}
          <View style={s.hintBox}>
            <Text style={[s.vfHint, { color: '#fff' }]}>
              {scanning
                ? '📷 Fotoğraf çekiliyor...'
                : meterType === 'water'
                  ? 'Siyah tekerlekleri kadrajlayın'
                  : 'Rakamları kadrajlayın'}
            </Text>
          </View>
        </View>

        <Text style={s.regexHint}>
          {meterType === 'water'
            ? 'Su: 5–7 basamak (kırmızı bölüm hariç)'
            : 'Gaz: 5–8 basamak (virgül öncesi)'}
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
          <Text style={s.scanBtnText}>
            {scanning ? '⏳  Fotoğraf çekiliyor...' : '📷  Fotoğraf Çek & Tara'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Tarife Döküm Modalı ─────────────────────── */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={[s.modalAccent, { backgroundColor: color }]} />

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={s.modalTitle}>Okuma Doğrula</Text>

              <View style={s.section}>
                <Text style={s.sectionHead}>📷 OCR Sonucu</Text>
                <Row label="Sayaç Türü"   value={meterType === 'water' ? '💧 Su' : '🔥 Doğalgaz'} />
                <Row label="Ham Metin"     value={ocrResult?.rawText ?? '—'} />
                <Row label="Ayrıştırılan" value={ocrResult?.parsedText ?? '—'} color={color} />
                <Row label="Endeks"        value={`${ocrResult?.indexValue ?? 0} m³`} color={color} />
                <Row label="OCR Güveni"   value={`%${((ocrResult?.confidence ?? 0) * 100).toFixed(0)}`}
                  color={(ocrResult?.confidence ?? 0) >= 0.9 ? C.brand : C.warn} />
              </View>

              <View style={s.section}>
                <Text style={s.sectionHead}>📊 Tüketim</Text>
                <Row label="Net Tüketim" value={`${consumption.toFixed(2)} m³`} color={color} bold />
              </View>

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

              {/* Uyarı: gerçek ML Kit entegrasyonu bekleniyor */}
              <View style={s.mlNote}>
                <Text style={s.mlNoteText}>
                  ℹ️ Şu an demo modu: OCR sonucu gerçek sayaç değerinizle eşleşmeyebilir.
                  Lütfen aşağıdaki endeks değerini kontrol edin ve gerekirse düzeltin.
                </Text>
              </View>
            </ScrollView>

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

function daysBetween(isoDate?: string): number {
  if (!isoDate) return 1;
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.max(1, Math.round(diff / 86_400_000));
}

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: C.bg },

  // İzin ekranı
  permWrap:         { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  permEmoji:        { fontSize: 56, marginBottom: 16 },
  permTitle:        { color: C.text, fontSize: FONT.xl, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  permText:         { color: C.textDim, fontSize: FONT.sm, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  permBtn:          { borderRadius: RADIUS.lg, paddingVertical: 16, paddingHorizontal: 40, marginBottom: 14 },
  permBtnText:      { color: C.bg, fontWeight: '900', fontSize: FONT.md },
  permSkip:         { padding: 12 },
  permSkipText:     { color: C.textDim, fontSize: FONT.sm },

  // Header
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16 },
  backBtn:          { width: 56 },
  backText:         { fontSize: FONT.md, fontWeight: '700' },
  title:            { color: C.text, fontSize: FONT.lg, fontWeight: '800' },
  torchBtn:         { width: 56, alignItems: 'flex-end' },
  torchIcon:        { fontSize: 24, color: C.textDim },

  // Tip seçici
  typeRow:          { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 16 },
  typeBtn:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: RADIUS.lg, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  typeEmoji:        { fontSize: 20 },
  typeLabel:        { color: C.textDim, fontWeight: '700', fontSize: FONT.md },

  // Viewfinder
  vfWrap:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  vf:               { width: '100%', height: VF_H, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 2, position: 'relative' },
  scanLine:         { position: 'absolute', left: 0, right: 0, height: 2, borderRadius: 1 },
  torchBadge:       { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(255,215,0,0.2)', borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  torchBadgeText:   { color: '#FFD700', fontSize: FONT.xs, fontWeight: '700' },
  hintBox:          { position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: RADIUS.sm, paddingVertical: 6, paddingHorizontal: 10 },
  vfHint:           { fontSize: FONT.sm, textAlign: 'center' },
  regexHint:        { color: C.textMuted, fontSize: FONT.xs, marginTop: 10, fontFamily: 'monospace' },

  // Footer
  footer:           { padding: 24, gap: 6 },
  cityHint:         { color: C.textDim, fontSize: FONT.xs, textAlign: 'center' },
  scanCountHint:    { color: C.textDim, fontSize: FONT.xs, textAlign: 'center' },
  scanBtn:          { borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center' },
  scanBtnOff:       { opacity: 0.5 },
  scanBtnText:      { color: C.bg, fontSize: FONT.lg, fontWeight: '900' },

  // Modal
  overlay:          { flex: 1, backgroundColor: `${C.bg}CC`, justifyContent: 'flex-end' },
  modal:            { backgroundColor: C.card, borderTopLeftRadius: RADIUS['2xl'], borderTopRightRadius: RADIUS['2xl'], padding: 24, borderTopWidth: 1, borderColor: C.cardBorder, maxHeight: '88%', overflow: 'hidden' },
  modalAccent:      { height: 3, borderRadius: 2, marginBottom: 16 },
  modalTitle:       { color: C.text, fontSize: FONT.xl, fontWeight: '900', marginBottom: 16 },
  section:          { marginBottom: 16 },
  sectionHead:      { color: C.textDim, fontSize: FONT.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  totalRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 2 },
  totalLabel:       { color: C.textDim, fontSize: FONT.sm, fontWeight: '800', letterSpacing: 1 },
  totalValue:       { fontSize: FONT['2xl'], fontWeight: '900' },
  mlNote:           { backgroundColor: `${C.warn}15`, borderRadius: RADIUS.sm, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: `${C.warn}30` },
  mlNoteText:       { color: C.warn, fontSize: FONT.xs, lineHeight: 16 },
  modalActions:     { flexDirection: 'row', gap: 12, marginTop: 16 },
  retryBtn:         { flex: 1, borderRadius: RADIUS.lg, paddingVertical: 15, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  retryBtnText:     { color: C.textDim, fontWeight: '700' },
  confirmBtn:       { flex: 1, borderRadius: RADIUS.lg, paddingVertical: 15, alignItems: 'center' },
  confirmBtnText:   { color: C.bg, fontWeight: '900', fontSize: FONT.md },
});
