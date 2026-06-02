import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { C, FONT, RADIUS } from '../src/theme';
import { useUtilityStore } from '../src/store/useUtilityStore';
import { getAllCities, getDistricts } from '../src/services/tariffEngine';

const CITIES = getAllCities();

export default function SetupScreen() {
  const router = useRouter();
  const { completeSetup } = useUtilityStore();

  const [step, setStep]                   = useState<1 | 2 | 3>(1);
  const [name, setName]                   = useState('');
  const [selectedCity, setSelectedCity]   = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districtSearch, setDistrictSearch]     = useState('');

  const districts         = selectedCity ? getDistricts(selectedCity) : [];
  const filteredDistricts = districts.filter(d =>
    d.toLowerCase().includes(districtSearch.toLowerCase())
  );

  const handleFinish = () => {
    if (!selectedCity || !selectedDistrict) {
      Alert.alert('Eksik Bilgi', 'Lütfen şehir ve ilçe seçin.');
      return;
    }
    completeSetup(selectedCity, selectedDistrict, name.trim() || undefined);
    router.replace('/');
  };

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={s.logoArea}>
          <Text style={s.logo}>💡</Text>
          <Text style={s.appName}>Verim</Text>
          <Text style={s.tagline}>Akıllı Sayaç & Fatura Takibi</Text>
        </View>

        {/* Adım İndikatörü */}
        <View style={s.steps}>
          {[1, 2, 3].map(n => (
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
              {CITIES.map(c => (
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
                  {selectedDistrict === d && <Text style={s.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[s.primaryBtn, !selectedDistrict && s.btnDisabled, { marginTop: 12 }]}
              disabled={!selectedDistrict}
              onPress={handleFinish}
            >
              <Text style={s.primaryBtnText}>Başla 🚀</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tarife Önizleme */}
        {selectedCity && step >= 2 && (
          <View style={s.tariffPreview}>
            <Text style={s.tariffTitle}>📋 {selectedCity} Tarifesi (2026)</Text>
            <Text style={s.tariffRow}>💧 Su: Kademeli (0-10 m³'ten başlar)</Text>
            <Text style={s.tariffRow}>🔥 Gaz: Sabit birim fiyat</Text>
            <Text style={s.tariffRow}>🧾 KDV + CTV dahil hesaplanır</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  scroll:        { padding: 24, paddingTop: 60, paddingBottom: 60 },
  logoArea:      { alignItems: 'center', marginBottom: 32 },
  logo:          { fontSize: 52 },
  appName:       { fontSize: 36, fontWeight: '900', color: C.text, marginTop: 8 },
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
  districtList:  { maxHeight: 220, marginBottom: 4 },
  districtBtn:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.divider },
  districtBtnActive: {},
  districtLabel: { color: C.text, fontSize: FONT.md },
  checkmark:     { color: C.water, fontWeight: '900' },
  primaryBtn:    { backgroundColor: C.water, borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center' },
  btnDisabled:   { opacity: 0.35 },
  primaryBtnText:{ color: C.bg, fontWeight: '900', fontSize: FONT.base },
  tariffPreview: { backgroundColor: C.card, borderRadius: RADIUS.md, padding: 16, borderWidth: 1, borderColor: C.cardBorder },
  tariffTitle:   { color: C.water, fontWeight: '700', fontSize: FONT.sm, marginBottom: 8 },
  tariffRow:     { color: C.textDim, fontSize: FONT.sm, marginBottom: 4 },
});
