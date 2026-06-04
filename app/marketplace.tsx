import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { C, FONT, RADIUS } from '../src/theme';
import { ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { useUtilityStore } from '../src/store/useUtilityStore';
import {
  getRecommendations, getAllProducts,
  MarketplaceProduct, ProductCategory,
} from '../src/services/marketplaceService';

const URGENCY_COLOR = {
  high:   C.danger,
  medium: C.gas,
  low:    C.brand,
};

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  thermostat: 'Termostat',
  boiler:     'Kombi',
  aerator:    'Aeratör',
  showerhead: 'Duş',
  insulation: 'Yalıtım',
  solar:      'Güneş E.',
};

function ProductCard({
  product, urgency, reason,
}: { product: MarketplaceProduct; urgency?: 'low' | 'medium' | 'high'; reason?: string }) {
  const urgColor = urgency ? URGENCY_COLOR[urgency] : C.pro;

  const handleBuy = () => {
    Alert.alert(
      product.name,
      `${product.brand} — ₺${product.price.toFixed(0)}\n\nTahmini yıllık tasarruf: ₺${product.savingsPerYear}\n\nPartner sitemize yönlendirileceksiniz.`,
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'İncele →', onPress: () => Linking.openURL(product.affiliateUrl).catch(() => {}) },
      ]
    );
  };

  return (
    <View style={[s.card, urgency === 'high' && { borderColor: C.danger }]}>
      {urgency && (
        <View style={[s.urgBadge, { backgroundColor: `${urgColor}20` }]}>
          <Text style={[s.urgText, { color: urgColor }]}>
            {urgency === 'high' ? '🔴 Acil' : urgency === 'medium' ? '🟡 Önerilen' : '🟢 Tasarruf'}
          </Text>
        </View>
      )}
      <View style={s.cardHeader}>
        <View style={s.productIconBadge}>
          <Text style={s.emoji}>{product.imageEmoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.productName}>{product.name}</Text>
          <Text style={s.productMeta}>{product.brand} · {CATEGORY_LABELS[product.category]}</Text>
        </View>
        <View style={[s.priceBox, { backgroundColor: `${C.pro}20` }]}>
          <Text style={[s.priceText, { color: C.pro }]}>₺{product.price.toFixed(0)}</Text>
        </View>
      </View>
      {reason && <Text style={s.reason}>{reason}</Text>}
      <Text style={s.desc}>{product.description}</Text>
      <View style={s.cardFooter}>
        <View>
          <Text style={s.savingLabel}>Yıllık Tasarruf</Text>
          <Text style={[s.savingVal, { color: C.brand }]}>₺{product.savingsPerYear}</Text>
        </View>
        <TouchableOpacity style={[s.buyBtn, { backgroundColor: C.water }]} onPress={handleBuy}>
          <Text style={[s.buyBtnText, { color: C.bg }]}>İncele →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MarketplaceScreen() {
  const router = useRouter();
  const { logs } = useUtilityStore();
  const [tab, setTab] = useState<'recommended' | 'all'>('recommended');

  const recommendations = useMemo(() => getRecommendations(logs), [logs]);
  const allProducts     = getAllProducts();

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ArrowLeft size={24} color={C.water} />
          </TouchableOpacity>
          <Text style={s.title}>Yeşil Enerji</Text>
          <View style={{ width: 60 }} />
        </View>
        <Text style={s.subtitle}>Tüketimine göre kişisel tasarruf önerileri</Text>

        {/* Tab */}
        <View style={s.tabs}>
          {(['recommended', 'all'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[s.tab, tab === t && { backgroundColor: C.water }]}
              onPress={() => setTab(t)}
            >
              <Text style={[s.tabText, tab === t && { color: C.bg }]}>
                {t === 'recommended'
                  ? `🎯 Sana Özel${recommendations.length > 0 ? ` (${recommendations.length})` : ''}`
                  : '🛒 Tümü'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'recommended' ? (
          recommendations.length > 0
            ? recommendations.map(r => (
                <ProductCard key={r.product.id} product={r.product} urgency={r.urgency} reason={r.reason} />
              ))
            : (
              <View style={s.empty}>
                <CheckCircle2 size={40} color={C.brand} style={{ marginBottom: 12 }} />
                <Text style={s.emptyTitle}>Tüketim Normal Görünüyor</Text>
                <Text style={s.emptyDesc}>Kişisel öneri için en az 4 kayıt gerekli. Tüm ürünlere göz at.</Text>
                <TouchableOpacity onPress={() => setTab('all')} style={[s.emptyBtn, { backgroundColor: C.water }]}>
                  <Text style={[s.emptyBtnText, { color: C.bg }]}>Tüm Ürünler →</Text>
                </TouchableOpacity>
              </View>
            )
        ) : (
          allProducts.map(p => <ProductCard key={p.id} product={p} />)
        )}

        <View style={s.disclaimer}>
          <Text style={s.disclaimerText}>
            * Verim, bu ürünlerden satış başına komisyon alabilir. Öneriler tüketim analizine dayanır.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: C.bg },
  scroll:        { padding: 20, paddingBottom: 110 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, paddingTop: 48 },
  backBtn:       { width: 60 },
  backText:      { color: C.water, fontSize: FONT.md, fontWeight: '600' },
  title:         { color: C.text, fontSize: FONT.lg, fontWeight: '800' },
  subtitle:      { color: C.textDim, fontSize: FONT.sm, textAlign: 'center', marginBottom: 20 },
  tabs:          { flexDirection: 'row', backgroundColor: C.card, borderRadius: RADIUS.md, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  tab:           { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: RADIUS.sm },
  tabText:       { color: C.textDim, fontWeight: '600', fontSize: FONT.sm },
  card:          { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.cardBorder },
  urgBadge:      { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full, marginBottom: 10 },
  urgText:       { fontSize: FONT.xs, fontWeight: '700' },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  productIconBadge: { width: 50, height: 50, borderRadius: RADIUS.md, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  emoji:         { fontSize: 24 },
  productName:   { color: C.text, fontSize: FONT.md, fontWeight: '700' },
  productMeta:   { color: C.textDim, fontSize: FONT.xs, marginTop: 2 },
  priceBox:      { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 6 },
  priceText:     { fontWeight: '800', fontSize: FONT.md },
  reason:        { color: C.danger, fontSize: FONT.xs, marginBottom: 6, fontStyle: 'italic' },
  desc:          { color: C.textDim, fontSize: FONT.sm, lineHeight: 18, marginBottom: 12 },
  cardFooter:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  savingLabel:   { color: C.textMuted, fontSize: FONT.xs },
  savingVal:     { fontSize: FONT.lg, fontWeight: '900' },
  buyBtn:        { borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 10 },
  buyBtnText:    { fontWeight: '800', fontSize: FONT.sm },
  empty:         { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: C.cardBorder },
  emptyIcon:     { fontSize: 40, marginBottom: 12 },
  emptyTitle:    { color: C.text, fontSize: FONT.base, fontWeight: '700', marginBottom: 8 },
  emptyDesc:     { color: C.textDim, fontSize: FONT.sm, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  emptyBtn:      { borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText:  { fontWeight: '800' },
  disclaimer:    { marginTop: 8, padding: 12, backgroundColor: C.card, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.cardBorder },
  disclaimerText:{ color: C.textMuted, fontSize: FONT.xs, lineHeight: 15 },
});
