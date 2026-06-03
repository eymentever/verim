import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { C, FONT, RADIUS } from '../src/theme';
import { useUtilityStore } from '../src/store/useUtilityStore';
import { getAllCities, getDistricts, getCityConfig } from '../src/services/tariffEngine';
import { Sparkles, Check } from 'lucide-react-native';

export default function SetupScreen() {
  const router = useRouter();
  const { completeSetup } = useUtilityStore();

  const [step, setStep]                   = useState<1 | 2 | 3 | 4>(1);
  const [name, setName]                   = useState('');
  const [selectedCity, setSelectedCity]   = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districtSearch, setDistrictSearch]     = useState('');
  const [address, setAddress]             = useState('');

  const districts         = selectedCity ? getDistricts(selectedCity) : [];
  const filteredDistricts = districts.filter(d =>
    d.toLowerCase().includes(districtSearch.toLowerCase())
  );

  const handleFinish = () => {
    if (!selectedCity || !selectedDistrict) {
      Alert.alert('Eksik Bilgi', 'Lütfen şehir ve ilçe seçin.');
      return;
    }
    completeSetup(selectedCity, selectedDistrict, name.trim() || undefined, address.trim() || undefined);
    router.replace('/');
  };

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={s.logoArea}>
          <View style={s.logoBadge}>
            <Sparkles size={40} color={C.brand} />
          </View>
          <Text style={s.appName}>Verim</Text>
          <Text style={s.tagline}>Akıllı Sayaç & Fatura Takibi</Text>
        </View>

        {/* Adım İndikatörü */}
        <View style={s.steps}>
          {[1, 2, 3, 4].map(n => (
            <View key={n} style={[s.stepDot, step >= n && s.stepDotActive]}>
              <Text style={[s.stepNum, step >= n && s.stepNumActive]}>{n}</Text>
            </View>
          ))}
        </View>

        {/* ADIM 1 — İsim */}
        {step === 1 && (
          <View style={s.card}>
            <Text style={s.stepTitle}>Merhaba! 👋</Text>
            <Text style={s.stepDesc}>Seni nasıl çağıralım? (isteğe bağlı)</Text>
            <TextInput
              style={s.input}
              placeholder="Adın"
              placeholderTextColor={C.textMuted}
              value={name}
              onChangeText={setName}
              maxLength={40}
            />
            <TouchableOpacity style={s.primaryBtn} onPress={() => setStep(2)}>
              <Text style={s.primaryBtnText}>Devam →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ADIM 2 — Şehir */}
        {step === 2 && (
          <View style={s.card}>
            <Text style={s.stepTitle}>Şehrin Hangisi?</Text>
            <Text style={s.stepDesc}>Doğru tarifeyi uygulayabilmemiz için şehrini seç.</Text>
            <View style={s.cityGrid}>
              {['İstanbul', 'Ankara', 'İzmir', 'Sakarya'].map(c => (
                <TouchableOpacity
                  key={c}
                  style={[s.cityBtn, selectedCity === c && s.cityBtnActive]}
                  onPress={() => { setSelectedCity(c); setSelectedDistrict(''); setDistrictSearch(''); }}
                >
                  <Text style={[s.cityLabel, selectedCity === c && { color: C.water }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[s.primaryBtn, !selectedCity && s.btnDisabled]}
              disabled={!selectedCity}
              onPress={() => setStep(3)}
            >
              <Text style={s.primaryBtnText}>Devam →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ADIM 3 — İlçe */}
        {step === 3 && (
          <View style={s.card}>
            <Text style={s.stepTitle}>{selectedCity} — İlçen?</Text>
            {districts.length > 0 ? (
              <>
                <Text style={s.stepDesc}>Belediyeye göre tarife farkı olabilir.</Text>
                <TextInput
                  style={s.input}
                  placeholder="İlçe ara..."
                  placeholderTextColor={C.textMuted}
                  value={districtSearch}
                  onChangeText={setDistrictSearch}
                />
                <ScrollView style={s.districtList} nestedScrollEnabled>
                  {filteredDistricts.map(d => (
                    <TouchableOpacity
                      key={d}
                      style={[s.districtBtn, selectedDistrict === d && s.districtBtnActive]}
                      onPress={() => setSelectedDistrict(d)}
                    >
                      <Text style={[s.districtLabel, selectedDistrict === d && { color: C.water }]}>{d}</Text>
                      {selectedDistrict === d && <Check size={16} color={C.water} strokeWidth={3} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <Text style={s.stepDesc}>Doğru fatura hesabı için lütfen ilçeni yaz.</Text>
                <TextInput
                  style={s.input}
                  placeholder="İlçe adı (örn: Osmangazi, Yenişehir)"
                  placeholderTextColor={C.textMuted}
                  value={selectedDistrict}
                  onChangeText={setSelectedDistrict}
                  maxLength={40}
                />
              </>
            )}
            <TouchableOpacity
              style={[s.primaryBtn, (!selectedDistrict || selectedDistrict.trim() === '') && s.btnDisabled, { marginTop: 12 }]}
              disabled={!selectedDistrict || selectedDistrict.trim() === ''}
              onPress={() => setStep(4)}
            >
              <Text style={s.primaryBtnText}>Devam →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ADIM 4 — Mahalle ve Sokak */}
        {step === 4 && (
          <View style={s.card}>
            <Text style={s.stepTitle}>Mahalle ve Sokak? 🏠</Text>
            <Text style={s.stepDesc}>Tüketim analizi ve fatura adresi doğrulaması için girin.</Text>
            <TextInput
              style={s.input}
              placeholder="Mahalle, sokak, apartman adı..."
              placeholderTextColor={C.textMuted}
              value={address}
              onChangeText={setAddress}
              maxLength={100}
            />
            <TouchableOpacity
              style={[s.primaryBtn, (!address || address.trim() === '') && s.btnDisabled]}
              disabled={!address || address.trim() === ''}
              onPress={handleFinish}
            >
              <Text style={s.primaryBtnText}>Başla 🚀</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tarife Önizleme */}
        {selectedCity && step >= 2 && (() => {
          const config = getCityConfig(selectedCity);
          return (
            <>
              <View style={s.tariffPreview}>
              <View style={s.tariffHeader}>
                <Text style={s.tariffTitle}>📋 {selectedCity} Tarifesi (2026)</Text>
                <View style={s.sourceBadge}>
                  <Text style={s.sourceText}>Resmi Tarife</Text>
                </View>
              </View>
              {config.waterTiers.map((tier, idx) => {
                const prevLimit = idx === 0 ? 0 : config.waterTiers[idx - 1].limit;
                const limitStr = tier.limit === 999 ? `${prevLimit}+` : `${prevLimit}–${tier.limit}`;
                return (
                  <Text key={idx} style={s.tariffRow}>
                    💧 Su Kademe {idx + 1}: {limitStr} m³ → {tier.rate.toFixed(2)} ₺/m³
                  </Text>
                );
              })}
              <Text style={s.tariffRow}>
                🔥 Gaz: {config.gasRate.toFixed(3)} ₺/m³ (ÖTV + %20 KDV ayrıca)
              </Text>
              <Text style={s.tariffSource}>
                Kaynak: {
                  selectedCity === 'İstanbul' ? 'İSKİ & İGDAŞ' :
                  selectedCity === 'Ankara'   ? 'ASKİ & BAŞKENTGAZ' :
                  selectedCity === 'İzmir'    ? 'İZSU & İZMİRGAZ' : 'SASKİ & AGDAŞ'
                } · {config.lastUpdated}
              </Text>
            </View>

            <View style={s.privacyNote}>
              <Text style={s.privacyText}>
                🔒 Verileriniz yalnızca cihazınızda şifreli saklanır. Sunucuya gönderilmez, üçüncü taraflarla paylaşılmaz.
              </Text>
            </View>
            </>
          );
        })()}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  scroll:        { padding: 24, paddingTop: 60, paddingBottom: 60 },
  logoArea:      { alignItems: 'center', marginBottom: 32 },
  logoBadge:     { width: 72, height: 72, borderRadius: RADIUS.xl, backgroundColor: C.brandDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: `${C.brand}30` },
  appName:       { fontSize: 36, fontWeight: '900', color: C.text, marginTop: 12 },
  tagline:       { fontSize: FONT.sm, color: C.textDim, marginTop: 4 },
  steps:         { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 28 },
  stepDot:       { width: 32, height: 32, borderRadius: RADIUS.full, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: C.water, borderColor: C.water },
  stepNum:       { color: C.textDim, fontWeight: '700', fontSize: FONT.md },
  stepNumActive: { color: C.bg },
  card:          { backgroundColor: C.card, borderRadius: RADIUS.xl, padding: 24, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 16 },
  stepTitle:     { color: C.text, fontSize: FONT.xl, fontWeight: '900', marginBottom: 6 },
  stepDesc:      { color: C.textDim, fontSize: FONT.sm, marginBottom: 20 },
  input:         { backgroundColor: C.bg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.border, color: C.text, padding: 14, fontSize: FONT.md, marginBottom: 16 },
  cityGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  cityBtn:       { paddingHorizontal: 18, paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  cityBtnActive: { borderColor: C.water, backgroundColor: C.waterDim },
  cityLabel:     { color: C.textDim, fontWeight: '600', fontSize: FONT.md },
  cityList:      { maxHeight: 220, marginBottom: 12 },
  cityRowBtn:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.divider },
  cityRowLabel:  { color: C.text, fontSize: FONT.md },
  districtList:  { maxHeight: 220, marginBottom: 4 },
  districtBtn:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.divider },
  districtBtnActive: {},
  districtLabel: { color: C.text, fontSize: FONT.md },
  checkmark:     { color: C.water, fontWeight: '900' },
  primaryBtn:    { backgroundColor: C.water, borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center' },
  btnDisabled:   { opacity: 0.35 },
  primaryBtnText:{ color: C.bg, fontWeight: '900', fontSize: FONT.base },
  tariffPreview: { backgroundColor: C.card, borderRadius: RADIUS.md, padding: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 10 },
  tariffHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tariffTitle:   { color: C.water, fontWeight: '700', fontSize: FONT.sm },
  sourceBadge:   { backgroundColor: `${C.brand}20`, borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: `${C.brand}40` },
  sourceText:    { color: C.brand, fontSize: 9, fontWeight: '800' },
  tariffRow:     { color: C.textDim, fontSize: FONT.sm, marginBottom: 4 },
  tariffSource:  { color: C.textMuted, fontSize: 10, marginTop: 6, fontStyle: 'italic' },
  privacyNote:   { backgroundColor: `${C.brand}08`, borderRadius: RADIUS.md, padding: 12, borderWidth: 1, borderColor: `${C.brand}20` },
  privacyText:   { color: C.textDim, fontSize: FONT.xs, lineHeight: 17 },
});
