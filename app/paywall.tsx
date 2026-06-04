import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { C, FONT, RADIUS } from '../src/theme';
import { useSubscriptionStore, PLANS, SubscriptionTier, BillingCycle } from '../src/store/useSubscriptionStore';
import { useRevenueCat } from '../src/hooks/useRevenueCat';

const TIER_META: Record<SubscriptionTier, { color: string; dim: string; badge: string }> = {
  free:       { color: C.textDim,  dim: C.card,        badge: '' },
  pro:        { color: C.pro,      dim: C.proDim,      badge: '⭐ En Popüler' },
  landlord:   { color: C.brand,    dim: C.brandDim,    badge: '🏢 B2B' },
  enterprise: { color: C.gold,     dim: C.goldDim,     badge: '🏛️ Kurumsal' },
};

function PlanCard({
  tier, cycle, currentTier, onSelect,
}: { tier: SubscriptionTier; cycle: BillingCycle; currentTier: SubscriptionTier; onSelect: (t: SubscriptionTier) => void }) {
  const plan    = PLANS[tier];
  const meta    = TIER_META[tier];
  const isActive = tier === currentTier;
  const price    = cycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const perMonth = cycle === 'yearly' && plan.yearlyPrice > 0
    ? (plan.yearlyPrice / 12).toFixed(0) : null;
  const savingPct = plan.monthlyPrice > 0
    ? Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100) : 0;

  return (
    <View style={[s.planCard, { borderColor: isActive ? meta.color : C.border }]}>
      {meta.badge ? (
        <View style={[s.badge, { backgroundColor: meta.dim }]}>
          <Text style={[s.badgeText, { color: meta.color }]}>{meta.badge}</Text>
        </View>
      ) : null}

      <Text style={[s.planName, { color: meta.color }]}>{plan.name}</Text>

      <View style={s.priceRow}>
        {price === 0 ? (
          <Text style={s.priceText}>Ücretsiz</Text>
        ) : tier === 'enterprise' ? (
          <Text style={s.priceText}>Teklif Al</Text>
        ) : (
          <>
            <Text style={s.priceText}>₺{price.toFixed(2)}</Text>
            <Text style={s.pricePer}>/{cycle === 'yearly' ? 'yıl' : 'ay'}</Text>
            {perMonth && <Text style={s.priceMonth}> · ₺{perMonth}/ay</Text>}
          </>
        )}
        {cycle === 'yearly' && savingPct > 0 && tier !== 'enterprise' && (
          <View style={[s.savingBadge, { backgroundColor: `${C.brand}20` }]}>
            <Text style={[s.savingText, { color: C.brand }]}>%{savingPct} İndirim</Text>
          </View>
        )}
      </View>

      {plan.features.map((f, i) => (
        <View key={i} style={s.featureRow}>
          <Text style={[s.featureCheck, { color: meta.color }]}>✓</Text>
          <Text style={s.featureText}>{f}</Text>
        </View>
      ))}

      {isActive ? (
        <View style={[s.selectBtn, { backgroundColor: meta.dim, borderWidth: 1, borderColor: meta.color }]}>
          <Text style={[s.selectBtnText, { color: meta.color }]}>✓ Mevcut Plan</Text>
        </View>
      ) : (
        <TouchableOpacity style={[s.selectBtn, { backgroundColor: meta.color }]} onPress={() => onSelect(tier)}>
          <Text style={[s.selectBtnText, { color: tier === 'enterprise' ? C.bg : C.bg }]}>
            {tier === 'enterprise' ? 'İletişime Geç' : 'Seç'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function PaywallScreen() {
  const router = useRouter();
  const { tier, upgradeTo } = useSubscriptionStore();
  const { purchase, restore, offerings, purchasing } = useRevenueCat();
  const [cycle, setCycle] = useState<BillingCycle>('yearly');

  const handleSelect = (selectedTier: SubscriptionTier) => {
    if (selectedTier === tier) return;

    if (selectedTier === 'enterprise') {
      Alert.alert('Kurumsal Plan', 'sales@verim.app adresine yazın veya web sitemizi ziyaret edin.', [{ text: 'Tamam' }]);
      return;
    }
    if (selectedTier === 'free') {
      Alert.alert('Plana Dön', 'Ücretsiz plana dönmek istediğinizden emin misiniz?', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet', onPress: () => { upgradeTo('free', 'monthly'); router.back(); } },
      ]);
      return;
    }

    const pkg = offerings.find(o => o.tier === selectedTier && o.period === cycle);
    if (pkg) {
      purchase(pkg).then(result => {
        if (result.success) {
          Alert.alert('🎉 Aktive Edildi!', `${PLANS[selectedTier].name} planınız başladı.`, [
            { text: 'Harika!', onPress: () => router.back() },
          ]);
        } else {
          Alert.alert('Hata', result.error ?? 'Satın alma başarısız.');
        }
      }).catch(() => {
        Alert.alert('Hata', 'Satın alma sırasında bir sorun oluştu.');
      });
    } else {
      // Fallback: doğrudan upgrade
      Alert.alert(
        `${PLANS[selectedTier].name}`,
        `₺${cycle === 'yearly' ? PLANS[selectedTier].yearlyPrice : PLANS[selectedTier].monthlyPrice} (Demo)`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Satın Al', onPress: () => { upgradeTo(selectedTier, cycle); router.back(); } },
        ]
      );
    }
  };

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={s.title}>Plan Seç</Text>
          <View style={{ width: 60 }} />
        </View>

        <Text style={s.subtitle}>Tüketimini yönet, faturandan tasarruf et</Text>

        {/* Fatura Periyodu */}
        <View style={s.toggle}>
          {(['monthly', 'yearly'] as BillingCycle[]).map(c => (
            <TouchableOpacity
              key={c}
              style={[s.toggleBtn, cycle === c && { backgroundColor: C.water }]}
              onPress={() => setCycle(c)}
            >
              <Text style={[s.toggleText, cycle === c && { color: C.bg }]}>
                {c === 'monthly' ? 'Aylık' : 'Yıllık'}
              </Text>
              {c === 'yearly' && <Text style={[s.toggleSave, cycle === c && { color: C.bg }]}>%25 indirim</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {(['free', 'pro', 'landlord', 'enterprise'] as SubscriptionTier[]).map(t => (
          <PlanCard key={t} tier={t} cycle={cycle} currentTier={tier} onSelect={handleSelect} />
        ))}

        {/* Satın almaları geri yükle */}
        <TouchableOpacity style={s.restoreBtn} onPress={async () => {
          try {
            const result = await restore();
            if (result.success && result.tier) {
              Alert.alert('✅ Geri Yüklendi', `${result.tier} planınız aktive edildi.`, [{ text: 'Harika!', onPress: () => router.back() }]);
            } else {
              Alert.alert('Bilgi', 'Aktif abonelik bulunamadı.');
            }
          } catch {
            Alert.alert('Hata', 'Geri yükleme sırasında bir sorun oluştu.');
          }
        }}>
          <Text style={s.restoreText}>Satın almaları geri yükle</Text>
        </TouchableOpacity>

        <Text style={s.legal}>
          Abonelikler otomatik yenilenir. İstediğiniz zaman iptal edebilirsiniz. Fiyatlara KDV dahildir.
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  scroll:      { padding: 20, paddingBottom: 48 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingTop: 48 },
  backBtn:     { width: 60 },
  backText:    { color: C.water, fontSize: FONT.md, fontWeight: '600' },
  title:       { color: C.text, fontSize: FONT.lg, fontWeight: '800' },
  subtitle:    { color: C.textDim, fontSize: FONT.sm, textAlign: 'center', marginBottom: 24 },
  toggle:      { flexDirection: 'row', backgroundColor: C.card, borderRadius: RADIUS.md, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  toggleBtn:   { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.sm },
  toggleText:  { color: C.textDim, fontWeight: '700', fontSize: FONT.md },
  toggleSave:  { color: C.gold, fontSize: FONT.xs, marginTop: 1 },
  planCard:    { backgroundColor: C.card, borderRadius: RADIUS.xl, padding: 20, marginBottom: 14, borderWidth: 1 },
  badge:       { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, marginBottom: 10 },
  badgeText:   { fontSize: FONT.xs, fontWeight: '700' },
  planName:    { fontSize: FONT.xl, fontWeight: '900', marginBottom: 10 },
  priceRow:    { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16, flexWrap: 'wrap', gap: 4 },
  priceText:   { fontSize: FONT['2xl'], fontWeight: '900', color: C.text },
  pricePer:    { fontSize: FONT.sm, color: C.textDim },
  priceMonth:  { fontSize: FONT.xs, color: C.textDim },
  savingBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 8, paddingVertical: 3 },
  savingText:  { fontSize: FONT.xs, fontWeight: '700' },
  featureRow:  { flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'flex-start' },
  featureCheck:{ fontWeight: '900', fontSize: FONT.md, width: 16 },
  featureText: { color: C.text, fontSize: FONT.sm, flex: 1 },
  selectBtn:   { borderRadius: RADIUS.md, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  selectBtnText:{ fontWeight: '800', fontSize: FONT.md },
  restoreBtn:  { alignItems: 'center', marginTop: 16, marginBottom: 8 },
  restoreText: { color: C.textDim, fontSize: FONT.sm, textDecorationLine: 'underline' },
  legal:       { color: C.textMuted, fontSize: FONT.xs, textAlign: 'center', lineHeight: 16 },
});
