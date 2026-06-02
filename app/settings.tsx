import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, TextInput, Switch, Alert, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { C, FONT, RADIUS } from '../src/theme';
import { User, CreditCard, Shield, FileText, Trash2, MapPin, Home, Droplet, Flame, Check } from 'lucide-react-native';
import { useUtilityStore, Property } from '../src/store/useUtilityStore';
import { useSubscriptionStore, PLANS } from '../src/store/useSubscriptionStore';
import { generateHandoverPDF } from '../src/services/pdfReportService';
import { usePrepaidMeter } from '../src/hooks/usePrepaidMeter';
import { getDistricts } from '../src/services/tariffEngine';

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

function InfoRow({ label, value, Icon, onPress }: { label: string; value: string; Icon?: any; onPress?: () => void }) {
  const Content = (
    <View style={st.infoRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        {Icon && <Icon size={16} color={C.textDim} strokeWidth={2} />}
        <Text style={st.infoLabel}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={st.infoValue}>{value}</Text>
        {onPress && <Text style={{ color: C.water, fontSize: FONT.xs, fontWeight: '700' }}>Değiştir</Text>}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {Content}
      </TouchableOpacity>
    );
  }
  return Content;
}

const st = StyleSheet.create({
  sTitle:    { color: C.textDim, fontSize: FONT.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  infoRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.divider },
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

  // Edit Property Modal States
  const [modalVisible, setModalVisible] = useState(false);
  const [editField, setEditField] = useState<'name' | 'city' | 'district' | 'address' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [districtSearch, setDistrictSearch] = useState('');

  // Prepaid hook — bilgilendirme için
  const activeLogs   = store.activePropertyLogs();
  const prepaidStatus = usePrepaidMeter(isPrepaid, parseFloat(creditStr) || 0, activeLogs);

  const handleSaveName = () => {
    store.setProfile({ name: name.trim() });
    Alert.alert('✓ Kaydedildi', 'Profil güncellendi.');
  };

  const handleSaveField = (newValue: string) => {
    if (!prop) return;

    const trimmed = newValue.trim();
    if (editField === 'name' && !trimmed) {
      Alert.alert('Hata', 'Mülk adı boş olamaz.');
      return;
    }
    if (editField === 'city' && !trimmed) {
      Alert.alert('Hata', 'Şehir seçmelisiniz.');
      return;
    }
    if (editField === 'district' && !trimmed) {
      Alert.alert('Hata', 'İlçe seçmelisiniz.');
      return;
    }

    const updates: Partial<Property> = {};
    if (editField === 'name') updates.name = trimmed;
    if (editField === 'city') {
      updates.city = trimmed;
      const availableDistricts = getDistricts(trimmed);
      updates.district = availableDistricts[0] ?? '';
    }
    if (editField === 'district') updates.district = trimmed;
    if (editField === 'address') updates.address = trimmed || undefined;

    store.updateProperty(prop.id, updates);
    setModalVisible(false);
    setEditField(null);
    setEditValue('');
    setDistrictSearch('');
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
          <Text style={s.title}>Ayarlar</Text>
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
          <Text style={s.fieldLabel}>Kullanıcı Adı</Text>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Adın"
            placeholderTextColor={C.textMuted}
            maxLength={40}
          />
          <TouchableOpacity style={[s.saveBtn, { backgroundColor: C.water }]} onPress={handleSaveName}>
            <Text style={[s.saveBtnText, { color: C.bg }]}>Kaydet</Text>
          </TouchableOpacity>
        </View>

        {prop && (
          <>
            <SectionTitle title="Aktif Mülk Bilgileri" />
            <View style={s.card}>
              <InfoRow
                label="Mülk Adı"
                value={prop.name}
                Icon={Home}
                onPress={() => {
                  setEditField('name');
                  setEditValue(prop.name);
                  setModalVisible(true);
                }}
              />
              <InfoRow
                label="Şehir"
                value={prop.city}
                Icon={MapPin}
                onPress={() => {
                  setEditField('city');
                  setEditValue(prop.city);
                  setModalVisible(true);
                }}
              />
              <InfoRow
                label="İlçe"
                value={prop.district}
                Icon={MapPin}
                onPress={() => {
                  setEditField('district');
                  setEditValue(prop.district);
                  setModalVisible(true);
                }}
              />
              <InfoRow
                label="Adres / Sokak"
                value={prop.address ?? 'Girilmedi'}
                Icon={MapPin}
                onPress={() => {
                  setEditField('address');
                  setEditValue(prop.address ?? '');
                  setModalVisible(true);
                }}
              />
            </View>
          </>
        )}

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
                label="Su (son endeks)"
                value={`${store.lastIndexForType(prop.id, 'water') ?? '—'} m³`}
                Icon={Droplet}
              />
              <InfoRow
                label="Gaz (son endeks)"
                value={`${store.lastIndexForType(prop.id, 'gas') ?? '—'} m³`}
                Icon={Flame}
              />
              <InfoRow
                label="Toplam Kayıt"
                value={`${activeLogs.length} adet`}
                Icon={FileText}
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
            onPress={() => Alert.alert('⚠️ Emin misin?', 'Tüm sayaç kayıtları ve mülk bilgileri kalıcı olarak silinecek. Bu işlem geri alınamaz.', [
              { text: 'İptal', style: 'cancel' },
              { text: 'Evet, Sil', style: 'destructive', onPress: () => {
                store.logs.forEach(l => store.removeLog(l.id));
                Alert.alert('✓ Silindi', 'Tüm veriler temizlendi.');
              }},
            ])}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Trash2 size={16} color={C.danger} strokeWidth={2} />
              <Text style={[st.infoLabel, { color: C.danger }]}>Tüm Verileri Temizle</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={st.infoRow}
            onPress={() => Alert.alert('Gizlilik', 'verim.app/privacy')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Shield size={16} color={C.textDim} strokeWidth={2} />
              <Text style={st.infoLabel}>Gizlilik Politikası</Text>
            </View>
          </TouchableOpacity>
          <Text style={s.version}>Verim v1.0.0 · Su & Doğalgaz Takip</Text>
        </View>

      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setEditField(null);
        }}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            <Text style={s.modalTitle}>
              {editField === 'name' && 'Mülk Adını Düzenle'}
              {editField === 'city' && 'Şehir Seçin'}
              {editField === 'district' && 'İlçe Seçin'}
              {editField === 'address' && 'Adres / Sokak Düzenle'}
            </Text>

            {editField === 'name' && (
              <TextInput
                style={s.modalInput}
                value={editValue}
                onChangeText={setEditValue}
                placeholder="Mülk Adı (örn: Evim, Yazlık)"
                placeholderTextColor={C.textMuted}
                maxLength={40}
              />
            )}

            {editField === 'address' && (
              <TextInput
                style={[s.modalInput, { height: 80, textAlignVertical: 'top' }]}
                value={editValue}
                onChangeText={setEditValue}
                placeholder="Mahalle, sokak, apartman adı..."
                placeholderTextColor={C.textMuted}
                multiline
                maxLength={100}
              />
            )}

            {editField === 'city' && (
              <View style={{ gap: 10, marginVertical: 12 }}>
                {['İstanbul', 'Ankara', 'İzmir'].map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[s.modalRowBtn, editValue === c && s.modalRowBtnActive]}
                    onPress={() => handleSaveField(c)}
                  >
                    <Text style={[s.modalRowText, editValue === c && { color: C.water, fontWeight: '700' }]}>{c}</Text>
                    {editValue === c && <Check size={16} color={C.water} strokeWidth={3} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {editField === 'district' && (() => {
              const availableDistricts = prop ? getDistricts(prop.city) : [];
              const filtered = availableDistricts.filter(d =>
                d.toLowerCase().includes(districtSearch.toLowerCase())
              );
              return (
                <View style={{ maxHeight: 300 }}>
                  <TextInput
                    style={s.modalSearchInput}
                    value={districtSearch}
                    onChangeText={setDistrictSearch}
                    placeholder="İlçe ara..."
                    placeholderTextColor={C.textMuted}
                  />
                  <ScrollView style={{ marginTop: 8 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {filtered.map(d => (
                      <TouchableOpacity
                        key={d}
                        style={[s.modalRowBtn, editValue === d && s.modalRowBtnActive]}
                        onPress={() => handleSaveField(d)}
                      >
                        <Text style={[s.modalRowText, editValue === d && { color: C.water, fontWeight: '700' }]}>{d}</Text>
                        {editValue === d && <Check size={16} color={C.water} strokeWidth={3} />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              );
            })()}

            {(editField === 'name' || editField === 'address') && (
              <View style={s.modalActions}>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: C.border }]}
                  onPress={() => {
                    setModalVisible(false);
                    setEditField(null);
                  }}
                >
                  <Text style={{ color: C.text, fontWeight: '600' }}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.modalBtn, { backgroundColor: C.water }]}
                  onPress={() => handleSaveField(editValue)}
                >
                  <Text style={{ color: C.bg, fontWeight: '800' }}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            )}

            {(editField === 'city' || editField === 'district') && (
              <TouchableOpacity
                style={[s.modalCloseBtn, { marginTop: 12 }]}
                onPress={() => {
                  setModalVisible(false);
                  setEditField(null);
                  setDistrictSearch('');
                }}
              >
                <Text style={{ color: C.textDim, fontWeight: '600', textAlign: 'center' }}>Kapat</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1, backgroundColor: C.bg },
  scroll:           { padding: 20, paddingBottom: 110 },
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

  // Modal Styles
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(7,10,19,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer:   { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 20, borderWidth: 1, borderColor: C.cardBorder, width: '100%', maxWidth: 360 },
  modalTitle:       { color: C.text, fontSize: FONT.lg, fontWeight: '900', marginBottom: 16 },
  modalInput:       { backgroundColor: C.bg, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: C.border, color: C.text, padding: 12, fontSize: FONT.md, marginBottom: 16 },
  modalSearchInput: { backgroundColor: C.bg, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: C.border, color: C.text, padding: 10, fontSize: FONT.sm },
  modalRowBtn:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.divider },
  modalRowBtnActive:{},
  modalRowText:     { color: C.text, fontSize: FONT.md },
  modalActions:     { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 8 },
  modalBtn:         { paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  modalCloseBtn:    { paddingVertical: 10, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
});
