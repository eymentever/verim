import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { C, FONT, RADIUS } from '../src/theme';
import { useUtilityStore } from '../src/store/useUtilityStore';

const { width: SW } = Dimensions.get('window');

const FEATURES = [
  {
    emoji: '🧾',
    title: 'Fatura Sürprizi Yok',
    desc:  'Sayacı okuyunca belediyenin hesabını görürsün. Fatura gelmeden tutarı bil.',
    color: C.water,
  },
  {
    emoji: '🚨',
    title: 'Kaçak & Anomali Uyarısı',
    desc:  'Su veya gaz tüketimin anormal artarsa uyarı gelir. Faturan şişmeden önce haberdar ol.',
    color: C.danger,
  },
  {
    emoji: '💸',
    title: 'Fatura Doğrulama',
    desc:  'Belediyenin gönderdiği tutarla Verim\'in hesabını karşılaştır. Fazla kesildiyse itiraz adımlarını gör.',
    color: C.brand,
  },
  {
    emoji: '📄',
    title: 'Sayaç Devir Tutanağı',
    desc:  'Kiracı değişiminde endeks belgele. Tarih damgalı resmi tutanak oluştur.',
    color: C.gas,
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const { profile } = useUtilityStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // Eğer setup zaten tamamlandıysa direkt ana sayfaya
  if (profile.setupComplete) {
    router.replace('/');
    return null;
  }

  return (
    <Animated.View style={[s.root, { opacity: fadeAnim }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={s.hero}>
          <Text style={s.logo}>⚡</Text>
          <Text style={s.appName}>Verim</Text>
          <Text style={s.tagline}>Faturanı Kontrol Et. Kaçağı Anında Öğren.</Text>
          <Text style={s.sub}>
            Türkiye'nin {'>'}19 şehrinde resmi belediye tarifesiyle hesaplama
          </Text>
        </View>

        {/* Özellikler */}
        <View style={s.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={[s.featureRow, { borderLeftColor: f.color }]}>
              <Text style={s.featureEmoji}>{f.emoji}</Text>
              <View style={s.featureText}>
                <Text style={[s.featureTitle, { color: f.color }]}>{f.title}</Text>
                <Text style={s.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Güven notu */}
        <View style={s.trustBox}>
          <Text style={s.trustText}>
            🔒 Tüm veriler yalnızca cihazınızda şifreli saklanır.{'\n'}
            Sunucuya gönderilmez, reklam yok, abonelik zorunlu değil.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity style={s.ctaBtn} onPress={() => router.push('/setup')} activeOpacity={0.85}>
          <Text style={s.ctaBtnText}>Şimdi Başla →</Text>
        </TouchableOpacity>

        <Text style={s.footer}>Kurulum 2 dakika sürer</Text>

      </ScrollView>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: C.bg },
  scroll:       { padding: 28, paddingTop: 72, paddingBottom: 48 },

  hero:         { alignItems: 'center', marginBottom: 36 },
  logo:         { fontSize: 56, marginBottom: 10 },
  appName:      { fontSize: 42, fontWeight: '900', color: C.text, letterSpacing: -1 },
  tagline:      { fontSize: FONT.lg, fontWeight: '700', color: C.brand, textAlign: 'center', marginTop: 8, lineHeight: 26 },
  sub:          { fontSize: FONT.sm, color: C.textDim, textAlign: 'center', marginTop: 8, lineHeight: 20 },

  features:     { gap: 12, marginBottom: 24 },
  featureRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: C.cardBorder, borderLeftWidth: 3 },
  featureEmoji: { fontSize: 24, marginTop: 1 },
  featureText:  { flex: 1 },
  featureTitle: { fontSize: FONT.md, fontWeight: '800', marginBottom: 4 },
  featureDesc:  { color: C.textDim, fontSize: FONT.sm, lineHeight: 18 },

  trustBox:     { backgroundColor: `${C.brand}08`, borderRadius: RADIUS.md, padding: 14, borderWidth: 1, borderColor: `${C.brand}20`, marginBottom: 24 },
  trustText:    { color: C.textDim, fontSize: FONT.xs, lineHeight: 18, textAlign: 'center' },

  ctaBtn:       { backgroundColor: C.brand, borderRadius: RADIUS.xl, paddingVertical: 18, alignItems: 'center' },
  ctaBtnText:   { color: C.bg, fontSize: FONT.lg, fontWeight: '900' },
  footer:       { color: C.textMuted, fontSize: FONT.xs, textAlign: 'center', marginTop: 12 },
});
