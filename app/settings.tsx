import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Switch, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { C, FONT, RADIUS } from '../src/theme';
import { useUtilityStore } from '../src/store/useUtilityStore';
import { useSubscriptionStore, PLANS } from '../src/store/useSubscriptionStore';
import { generateHandoverPDF } from '../src/services/pdfReportService';
import { usePrepaidMeter } from '../src/hooks/usePrepaidMeter';

// ── Tier renk haritası ────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  free:       C.textDim,
  pro:        C.pro,
  landlord:   C.brand,
  enterprise: C.gold,
};

// ── Bölüm başlığı ─────────────────────────────────────────────────────────────

function SectionTitle({ title }: { title: string }) {
  return <Text style={st.sTitle}>{title}</Text>;
}

// ── Satır bileşeni ────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.infoRow}>
      <Text style={st.infoLabel}>{label}</Text>
      <Text style={st.infoValue}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  sTitle:    { color: C.textDim, fontSize: FONT.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.divider },
  infoLabel: { color: C.textDim, fontSize: FONT.sm },
  infoValue: { color: C.text, fontSize: FONT.sm, fontWeight: '600' },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router   = useRouter();
  const store    = useUtilityStore();
  const subStore = useSubscriptionStore();

  const prop = store.activeProperty();
  const plan = subStore.currentPlan();
  const tier = subStore.tier;
  const tierColor = TIER_COLOR[tier] ?? C.textDim;

  // Profil
  const [name, setName] = useState(store.profile.name);

  // Kartlı sayaç
  const [isPrepaid, setIsPrepaid]       = useState(prop?.isPrepaid ?? false);
  const [creditStr, setCreditStr]       = useState(String(prop?.prepaidCredit ?? 500));

  // Devir PDF
  const [genPDF, setGenPDF] = useState(false);

  // Prepaid hook — bilgilendirme için
  const activeLogs   = store.activePropertyLogs();
  const prepaidStatus = usePrepaidMeter(isPrepaid, parseFloat(creditStr) || 0, activeLogs);

  const handleSaveName = () => {
    store.setProfile({ name: name.trim() });
    Alert.alert('✓ Kaydedildi', 'Profil güncellendi.');
  };

  const handleDevir = async () => {
    if (!prop) { Alert.alert('Mülk Yok', 'Önce setup ekranından bir mülk ekleyin.'); return; }
    if (tier === 'free') { router.push('/paywall'); return; }
    setGenPDF(true);
    try {
      const result = await generateHandoverPDF({
        propertyName:    prop.name,
        propertyAddress: prop.address ?? `${prop.district}, ${prop.city}`,
        city:            prop.city,
        district:        prop.district,
        tenantName:      'Kiracı (Girilmedi)',
        landlordName:    store.profile.name || 'Ev Sahibi',
        handoverDate:    new Date().toISOString(),
        waterIndex:      store.lastIndexForType(prop.id, 'water') ?? 0,
        gasIndex:        store.lastIndexForType(prop.id, 'gas')   ?? 0,
        logs:            activeLogs,
      });
      Alert.alert('📄 Tutanak Hazır',
        `Dosya: ${result.filePath}\n\n(Gerçek cihazda expo-print ile kaydedilir.)`,
        [{ text: 'Tamam' }]);
    } finally {
      setGenPDF(false);
    }
  };

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Text style={s.title}>Ayarlar ⚙️</Text>
        </View>

        {/* ── Abonelik Durumu ────────────────────────── */}
        <TouchableOpacity
          style={[s.planCard, { borderColor: tierColor }]}
          onPress={() => router.push('/paywall')}
          activeOpacity={0.85}
        >
          <View style={{ flex: 1 }}>
            <Text style={s.planLabel}>Mevcut Plan</Text>
            <Text style={[s.planName, { color: tierColor }]}>{PLANS[tier].name}</Text>
            <Text style={s.planSub}>
              {tier === 'free'
                ? `Aylık ${plan.maxScansPerMonth} tarama · Reklamlı`
                : 'Sınırsız tarama · Reklamsız'}
            </Text>
          </View>
          <Text style={[s.planArrow, { color: tierColor }]}>
            {tier === 'free' ? '⭐ Pro\'ya Geç →' : '✓ Aktif'}
          </Text>
        </TouchableOpacity>

        {/* ── Profil ─────────────────────────────────── */}
        <SectionTitle title="Profil" />
        <View style={s.card}>
          <Text style={s.fieldLabel}>İsim</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Adın"
            placeholderTextColor={C.textMuted}
            maxLength={40}
          />
          <InfoRow label="Aktif Şehir" value={prop?.city     ?? store.profile.city} />
          <InfoRow label="İlçe"        value={prop?.district ?? store.profile.district} />
          <InfoRow label="Mülk Adı"    value={prop?.name     ?? '—'} />
          <TouchableOpacity style={[s.saveBtn, { backgroundColor: C.water }]} onPress={handleSaveName}>
            <Text style={[s.saveBtnText, { color: C.bg }]}>Kaydet</Text>
          </TouchableOpacity>
        </View>

        {/* ── Kartlı (Prepaid) Sayaç ─────────────────── */}
        <SectionTitle title="Kartlı (Prepaid) Sayaç" />
        <View style={s.card}>
          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchLabel}>Kartlı Sayaç Modu</Text>
              <Text style={s.switchSub}>Fatura yerine kalan kredi takibi</Text>
            </View>
            <Switch
              value={isPrepaid}
              onValueChange={setIsPrepaid}
              trackColor={{ false: C.border, true: C.water }}
              thumbColor="#fff"
            />
          </View>

          {isPrepaid && (
            <>
              <Text style={[s.fieldLabel, { marginTop: 14 }]}>Yüklenen Kredi (₺)</Text>
              <TextInput
                style={s.input}
                value={creditStr}
                onChangeText={setCreditStr}
                keyboardType="numeric"
                placeholderTextColor={C.textMuted}
              />

              {/* Prepaid durum göstergesi */}
              {prepaidStatus.isPrepaid && (
                <View style={[
                  s.prepaidStatus,
                  prepaidStatus.isCritical
                    ? { backgroundColor: C.dangerDim, borderColor: C.danger }
                    : prepaidStatus.isLow
                    ? { backgroundColor: C.warnDim,   borderColor: C.warn }
                    : { backgroundColor: C.successDim, borderColor: C.success },
                ]}>
                  <Text style={[
                    s.prepaidStatusText,
                    { color: prepaidStatus.isCritical ? C.danger : prepaidStatus.isLow ? C.warn : C.success },
                  ]}>
                    {prepaidStatus.alertMessage ?? `✓ Kalan: ₺${prepaidStatus.remainingCredit.toFixed(2)}`}
                  </Text>
                </View>
              )}

              <Text style={s.prepaidNote}>
                Kullanılan: ₺{prepaidStatus.usedCredit.toFixed(2)} · Kalan: ₺{prepaidStatus.remainingCredit.toFixed(2)}
              </Text>
            </>
          )}
        </View>

        {/* ── Mülklerim ──────────────────────────────── */}
        <SectionTitle title="Mülklerim" />
        <View style={s.card}>
          {store.properties.length === 0 ? (
            <Text style={s.emptyText}>Henüz mülk eklenmedi.</Text>
          ) : (
            store.properties.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[s.propRow, p.id === store.activePropertyId && { borderColor: C.water }]}
                onPress={() => store.setActiveProperty(p.id)}
              >
                <Text style={s.propIcon}>
                  {p.type === 'home' ? '🏠' : p.type === 'office' ? '🏢' : p.type === 'rental' ? '🔑' : '🏗️'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.propName}>{p.name}</Text>
                  <Text style={s.propDetail}>{p.city} / {p.district}</Text>
                </View>
                {p.id === store.activePropertyId && (
                  <Text style={[s.propActive, { color: C.water }]}>Aktif</Text>
                )}
              </TouchableOpacity>
            ))
          )}
          {!plan.b2bDashboard && plan.maxProperties !== -1 && store.properties.length >= plan.maxProperties && (
            <TouchableOpacity onPress={() => router.push('/paywall')} style={s.lockedRow}>
              <Text style={s.lockedText}>🔒 Daha fazla mülk için Pro'ya geç</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Sayaç Özeti (Son endeksler) ───────────── */}
        {prop && (
          <>
            <SectionTitle title="Son Endeks Değerleri" />
            <View style={s.card}>
              <InfoRow
                label="💧 Su (son endeks)"
                value={`${store.lastIndexForType(prop.id, 'water') ?? '—'} m³`}
              />
              <InfoRow
                label="🔥 Gaz (son endeks)"
                value={`${store.lastIndexForType(prop.id, 'gas') ?? '—'} m³`}
              />
              <InfoRow
                label="Toplam Kayıt"
                value={`${activeLogs.length} adet`}
              />
            </View>
          </>
        )}

        {/* ── Sayaç Devir Modu ───────────────────────── */}
        <SectionTitle title="Sayaç Devir Modu" />
        <View style={s.card}>
          <Text style={s.devirDesc}>
            Kiracı devri veya mülk satışında anlık sayaç endekslerini, tarih damgasını
            ve GPS konumunu içeren resmi tutanak oluşturur.
          </Text>

          {tier === 'free' && (
            <TouchableOpacity onPress={() => router.push('/paywall')} style={s.proAlert}>
              <Text style={s.proAlertText}>🔒 Ev Sahibi / Pro planı gerektirir → Yükselt</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[s.devirBtn, { backgroundColor: C.brand }, (tier === 'free' || genPDF) && { opacity: 0.35 }]}
            onPress={handleDevir}
            disabled={tier === 'free' || genPDF}
          >
            <Text style={[s.devirBtnText, { color: C.bg }]}>
              {genPDF ? '⏳ Oluşturuluyor...' : '📄 Devir Tutanağı Oluştur'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Veri & Gizlilik ────────────────────────── */}
        <SectionTitle title="Veri & Gizlilik" />
        <View style={s.card}>
          <TouchableOpacity style={st.infoRow}
            onPress={() => Alert.alert('Emin misin?', 'Tüm kayıtlar silinecek.', [
              { text: 'İptal', style: 'cancel' },
              { text: 'Sil', style: 'destructive', onPress: () => {} },
            ])}>
            <Text style={[st.infoLabel, { color: C.danger }]}>🗑️ Tüm Verileri Sil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.infoRow}
            onPress={() => Alert.alert('Gizlilik', 'verim.app/privacy')}>
            <Text style={st.infoLabel}>🔏 Gizlilik Politikası</Text>
          </TouchableOpacity>
          <Text style={s.version}>Verim v1.0.0 · Su & Doğalgaz Takip</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: C.bg },
  scroll:           { padding: 20, paddingBottom: 60 },
  header:           { marginBottom: 20, paddingTop: 48 },
  title:            { color: C.text, fontSize: FONT.xl, fontWeight: '900' },

  // Plan kartı
  planCard:         { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 16, marginBottom: 20, borderWidth: 2, flexDirection: 'row', alignItems: 'center' },
  planLabel:        { color: C.textMuted, fontSize: FONT.xs, textTransform: 'uppercase', letterSpacing: 0.8 },
  planName:         { fontSize: FONT.lg, fontWeight: '900', marginTop: 2 },
  planSub:          { color: C.textDim, fontSize: FONT.xs, marginTop: 2 },
  planArrow:        { fontWeight: '800', fontSize: FONT.sm },

  // Genel kart
  card:             { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 16 },
  fieldLabel:       { color: C.textDim, fontSize: FONT.xs, marginBottom: 6 },
  input:            { backgroundColor: C.bg, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: C.border, color: C.text, padding: 12, fontSize: FONT.md, marginBottom: 12 },
  saveBtn:          { borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  saveBtnText:      { fontWeight: '800', fontSize: FONT.md },

  // Switch
  switchRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel:      { color: C.text, fontSize: FONT.md, fontWeight: '600' },
  switchSub:        { color: C.textDim, fontSize: FONT.xs, marginTop: 2 },

  // Prepaid
  prepaidStatus:    { borderRadius: RADIUS.sm, padding: 10, borderWidth: 1, marginTop: 8, marginBottom: 8 },
  prepaidStatusText:{ fontWeight: '700', fontSize: FONT.sm },
  prepaidNote:      { color: C.textDim, fontSize: FONT.xs, lineHeight: 16 },

  // Mülkler
  propRow:          { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: C.border, paddingHorizontal: 10, marginBottom: 8, gap: 10 },
  propIcon:         { fontSize: 20 },
  propName:         { color: C.text, fontSize: FONT.sm, fontWeight: '600' },
  propDetail:       { color: C.textDim, fontSize: FONT.xs },
  propActive:       { fontWeight: '800', fontSize: FONT.xs },
  lockedRow:        { marginTop: 8, padding: 12, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: C.pro, borderStyle: 'dashed', alignItems: 'center' },
  lockedText:       { color: C.pro, fontSize: FONT.sm, fontWeight: '600' },
  emptyText:        { color: C.textDim, fontSize: FONT.sm },

  // Devir
  devirDesc:        { color: C.textDim, fontSize: FONT.sm, lineHeight: 18, marginBottom: 14 },
  proAlert:         { backgroundColor: `${C.pro}12`, borderRadius: RADIUS.sm, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: `${C.pro}40` },
  proAlertText:     { color: C.pro, fontSize: FONT.sm, fontWeight: '600' },
  devirBtn:         { borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center' },
  devirBtnText:     { fontWeight: '900', fontSize: FONT.md },

  version:          { color: C.textMuted, fontSize: FONT.xs, marginTop: 12 },
});
