import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Dimensions, Share, Alert,
} from 'react-native';
import Svg, {
  Rect, Text as SvgText, Line, G, Circle,
  Defs, LinearGradient, Stop,
} from 'react-native-svg';
import { useRouter } from 'expo-router';
import { C, FONT, RADIUS } from '../src/theme';
import { useUtilityStore } from '../src/store/useUtilityStore';
import { calculateBenchmark } from '../src/services/socialBenchmark';
import { Thermometer, Droplet, Wind, Wrench, Home, Leaf, ChevronDown, ChevronUp } from 'lucide-react-native';

const { width: SW } = Dimensions.get('window');
const CHART_W = SW - 48;
const CHART_H = 160;

const MONTHS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

// ── Enerji Tavsiyeleri ────────────────────────────────────────────────────────

const TIPS = [
  { type: 'temp', text: 'Kombiyi 1°C kısmak ayda ~₺80 tasarruf sağlar.',              saving: 80 },
  { type: 'shower', text: 'Duş süresini 2 dk kısaltmak aylık ~1.5 m³ su tasarrufu.',     saving: 45 },
  { type: 'window', text: 'Pencere contası yenilemek ısı kaybını %15 azaltır.',           saving: 60 },
  { type: 'boiler', text: 'Yıllık kombi bakımı verimini %18, ömrünü 5 yıl artırır.',     saving: 55 },
  { type: 'leak', text: 'Damlayan musluk günde ~18 litre su israfı yaratır.',           saving: 25 },
  { type: 'insulation', text: 'Çatı yalıtımı ısıtma maliyetini %20–30 düşürür.',             saving: 120 },
];

const TIP_ICONS = {
  temp: { Icon: Thermometer, color: C.gas, bg: C.gasDim },
  shower: { Icon: Droplet, color: C.water, bg: C.waterDim },
  window: { Icon: Wind, color: C.gas, bg: C.gasDim },
  boiler: { Icon: Wrench, color: C.gas, bg: C.gasDim },
  leak: { Icon: Droplet, color: C.water, bg: C.waterDim },
  insulation: { Icon: Home, color: C.brand, bg: C.brandDim },
} as const;

// ── Eco Score Hesapla ─────────────────────────────────────────────────────────

function calcEcoScore(savingsPct: number, logCount: number): number {
  let score = 50;
  if      (savingsPct >= 20) score += 40;
  else if (savingsPct >= 10) score += 25;
  else if (savingsPct >= 0)  score += 10;
  else                       score -= Math.min(30, Math.abs(savingsPct));
  if      (logCount >= 10)   score += 10;
  else if (logCount >= 4)    score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

// ── Yarım Daire Eco Gauge ─────────────────────────────────────────────────────

function EcoGauge({ score }: { score: number }) {
  const size  = 150, r = 54, cx = 75, cy = 85;
  const arc   = Math.PI * r;
  const fill  = arc * (score / 100);
  const color = score >= 75 ? C.brand : score >= 45 ? C.gas : C.danger;

  return (
    <View style={eg.wrap}>
      <Svg width={size} height={100}>
        <Defs>
          <LinearGradient id="ecoG" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <Stop offset="100%" stopColor={color} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={10}
          strokeDasharray={`${arc} ${arc * 2}`} strokeDashoffset={-arc}
          rotation="180" origin={`${cx},${cy}`} />
        {/* Fill */}
        <Circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#ecoG)" strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${fill} ${arc * 2}`} strokeDashoffset={-arc}
          rotation="180" origin={`${cx},${cy}`} />
        <SvgText x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize={30} fontWeight="bold">
          {score}
        </SvgText>
        <SvgText x={cx} y={cy + 14} textAnchor="middle" fill={C.textDim} fontSize={10}>
          / 100
        </SvgText>
      </Svg>
      <Text style={[eg.label, { color }]}>
        {score >= 75 ? 'Çevre Dostu' : score >= 45 ? 'Ortalama Tüketim' : 'Geliştirilebilir'}
      </Text>
    </View>
  );
}
const eg = StyleSheet.create({
  wrap:  { alignItems: 'center' },
  label: { fontSize: FONT.sm, fontWeight: '700', marginTop: 6 },
});

// ─────────────────────────────────────────────────────────────────────────────

type FilterType = 'water' | 'gas' | 'all';

export default function AnalyticsScreen() {
  const router  = useRouter();
  const store   = useUtilityStore();
  const [filter, setFilter]       = useState<FilterType>('all');
  const [expandedTip, setExpanded] = useState<number | null>(null);

  const { profile, properties, activePropertyId } = store;
  const city = properties.find(p => p.id === activePropertyId)?.city ?? profile.city ?? 'İstanbul';

  const activeLogs = useMemo(
    () => activePropertyId ? store.logs.filter(l => l.propertyId === activePropertyId) : store.logs,
    [store.logs, activePropertyId],
  );

  // Son 6 aylık bar verisi
  const monthly = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d   = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m   = activeLogs.filter(l => {
        const ld = new Date(l.date);
        return `${ld.getFullYear()}-${ld.getMonth()}` === key;
      });
      return {
        label: MONTHS[d.getMonth()],
        water: m.filter(l => l.type === 'water').reduce((s, l) => s + l.cost, 0),
        gas:   m.filter(l => l.type === 'gas').reduce((s, l) => s + l.cost, 0),
        total: m.reduce((s, l) => s + l.cost, 0),
        waterM3: m.filter(l => l.type === 'water').reduce((s, l) => s + l.consumption, 0),
        gasM3:   m.filter(l => l.type === 'gas').reduce((s, l) => s + l.consumption, 0),
      };
    });
  }, [activeLogs]);

  const maxVal = useMemo(() => {
    const vals = monthly.map(d =>
      filter === 'all' ? d.total : filter === 'water' ? d.water : d.gas
    );
    return Math.max(...vals, 1);
  }, [monthly, filter]);

  const benchmark = useMemo(() => calculateBenchmark(city, activeLogs), [city, activeLogs]);
  const ecoScore  = useMemo(() => calcEcoScore(benchmark?.savingsPercent ?? 0, activeLogs.length), [benchmark, activeLogs]);

  const totalCost  = activeLogs.reduce((s, l) => s + l.cost, 0);
  const totalWater = activeLogs.filter(l => l.type === 'water').reduce((s, l) => s + l.consumption, 0);
  const totalGas   = activeLogs.filter(l => l.type === 'gas').reduce((s, l) => s + l.consumption, 0);
  const avgCost    = activeLogs.length ? totalCost / activeLogs.length : 0;

  const barColor   = filter === 'water' ? C.water : filter === 'gas' ? C.gas : C.pro;
  const BAR_W      = (CHART_W - 32) / 6 - 8;

  const handleShare = async () => {
    const msg =
      `🌿 Verim Eco Puanım: ${ecoScore}/100\n` +
      `${benchmark?.badge ?? ''}\n${benchmark?.message ?? ''}\n\n` +
      `Su: ${totalWater.toFixed(1)} m³ · Gaz: ${totalGas.toFixed(1)} m³\n\n` +
      `verim.app'i indir ve faturandan tasarruf et!`;
    try {
      await Share.share({ message: msg, title: 'Verim Eco Rozetim' });
    } catch {
      Alert.alert('Paylaşım başarısız.');
    }
  };

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Başlık ─────────────────────────────────── */}
        <View style={s.header}>
          <Text style={s.title}>Analiz & Bütçe</Text>
          <Text style={s.sub}>{city}</Text>
        </View>

        {/* ── Eco Score ──────────────────────────────── */}
        <View style={s.ecoCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionLabel}>Eko Tasarruf Puanı</Text>
            <Text style={s.ecoDesc}>
              {ecoScore >= 75
                ? 'Harika! Enerji kullanımında örnek bir profil.'
                : ecoScore >= 45
                ? 'İyi gidiyorsun. Küçük adımlarla daha fazlasını yapabilirsin.'
                : 'Aşağıdaki tavsiyelere göz at.'}
            </Text>
            <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
              <Text style={s.shareBtnText}>🌿 Rozeti Paylaş</Text>
            </TouchableOpacity>
          </View>
          <EcoGauge score={ecoScore} />
        </View>

        {/* ── Filtre ─────────────────────────────────── */}
        <View style={s.filterRow}>
          {(['all', 'water', 'gas'] as FilterType[]).map(f => {
            const fc = f === 'water' ? C.water : f === 'gas' ? C.gas : C.pro;
            return (
              <TouchableOpacity
                key={f}
                style={[s.filterBtn, filter === f && { borderColor: fc, backgroundColor: `${fc}15` }]}
                onPress={() => setFilter(f)}
              >
                <Text style={[s.filterLabel, filter === f && { color: fc }]}>
                  {f === 'all' ? 'Tümü' : f === 'water' ? '💧 Su' : '🔥 Gaz'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Bar Chart ──────────────────────────────── */}
        <View style={s.chartCard}>
          <Text style={s.sectionLabel}>Son 6 Ay Harcama (₺)</Text>
          <Svg width={CHART_W} height={CHART_H + 28}>
            <Defs>
              <LinearGradient id="barG" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={barColor} stopOpacity="1" />
                <Stop offset="100%" stopColor={barColor} stopOpacity="0.25" />
              </LinearGradient>
            </Defs>
            {[0.25, 0.5, 0.75].map(r => (
              <Line key={r} x1={0} y1={CHART_H * (1 - r)} x2={CHART_W} y2={CHART_H * (1 - r)}
                stroke={C.border} strokeWidth={1} />
            ))}
            <G>
              {monthly.map((d, i) => {
                const val  = filter === 'all' ? d.total : filter === 'water' ? d.water : d.gas;
                const barH = Math.max((val / maxVal) * CHART_H, 2);
                const x    = i * (CHART_W / 6) + 4;
                return (
                  <G key={i}>
                    <Rect x={x} y={CHART_H - barH} width={BAR_W} height={barH}
                      rx={5} fill="url(#barG)" opacity={val === 0 ? 0.12 : 1} />
                    <SvgText x={x + BAR_W / 2} y={CHART_H + 18}
                      textAnchor="middle" fill={C.textDim} fontSize={9}>
                      {d.label}
                    </SvgText>
                    {val > 0 && (
                      <SvgText x={x + BAR_W / 2} y={CHART_H - barH - 5}
                        textAnchor="middle" fill={barColor} fontSize={8} fontWeight="bold">
                        {val.toFixed(0)}
                      </SvgText>
                    )}
                  </G>
                );
              })}
            </G>
          </Svg>
        </View>

        {/* ── Özet Kartlar ───────────────────────────── */}
        <View style={s.statsRow}>
          <StatCard label="Toplam Harcama" value={`₺${totalCost.toFixed(0)}`}  color={C.pro} />
          <StatCard label="Su Tüketimi"    value={`${totalWater.toFixed(1)} m³`} color={C.water} />
          <StatCard label="Gaz Tüketimi"   value={`${totalGas.toFixed(1)} m³`}  color={C.gas} />
        </View>

        {/* ── Aylık Döküm (Son 3 Ay) ─────────────────── */}
        <View style={s.monthlyCard}>
          <Text style={s.sectionLabel}>Aylık Döküm</Text>
          {monthly.slice(-3).reverse().map((m, i) => (
            <View key={i} style={s.monthRow}>
              <Text style={s.monthLabel}>{m.label}</Text>
              <View style={s.monthVals}>
                <Text style={[s.monthVal, { color: C.water }]}>Su: ₺{m.water.toFixed(0)}</Text>
                <Text style={s.monthSep}>·</Text>
                <Text style={[s.monthVal, { color: C.gas }]}>Gaz: ₺{m.gas.toFixed(0)}</Text>
                <Text style={s.monthSep}>·</Text>
                <Text style={[s.monthVal, { color: C.text, fontWeight: '700' }]}>₺{m.total.toFixed(0)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Enerji Tavsiyeleri ─────────────────────── */}
        <View style={s.tipsCard}>
          <Text style={s.sectionLabel}>Tasarruf Tavsiyeleri</Text>
          {TIPS.map((tip, i) => {
            const iconConfig = TIP_ICONS[tip.type as keyof typeof TIP_ICONS];
            const TipIcon = iconConfig.Icon;
            return (
              <TouchableOpacity
                key={i}
                style={[s.tipRow, expandedTip === i && { backgroundColor: `${C.brand}08` }]}
                onPress={() => setExpanded(expandedTip === i ? null : i)}
                activeOpacity={0.8}
              >
                <View style={[s.tipIconBadge, { backgroundColor: iconConfig.bg }]}>
                  <TipIcon size={16} color={iconConfig.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.tipText}>{tip.text}</Text>
                  {expandedTip === i && (
                    <Text style={s.tipSaving}>Aylık ~₺{tip.saving} tasarruf potansiyeli</Text>
                  )}
                </View>
                {expandedTip === i ? (
                  <ChevronUp size={16} color={C.textDim} />
                ) : (
                  <ChevronDown size={16} color={C.textDim} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Green Badge ────────────────────────────── */}
        <View style={s.badgeCard}>
          <View style={s.badgeRow}>
            <View style={[s.badgeIconBadge, { backgroundColor: 'rgba(0, 255, 157, 0.1)' }]}>
              <Leaf size={24} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.badgeTitle}>Yeşil Rozet — Eco {ecoScore}/100</Text>
              <Text style={s.badgeSub}>{benchmark?.badge ?? 'Veri toplanıyor...'}</Text>
            </View>
            <TouchableOpacity style={s.badgeBtn} onPress={handleShare}>
              <Text style={s.badgeBtnText}>Paylaş</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.badgeMsg}>{benchmark?.message ?? 'Daha fazla kayıt ekledikçe puanın gelişir.'}</Text>
        </View>

        {/* ── Marketplace CTA ────────────────────────── */}
        <TouchableOpacity style={s.cta} onPress={() => router.push('/marketplace')} activeOpacity={0.85}>
          <Text style={s.ctaText}>🌿 Kişisel Tasarruf Ürünlerine Bak →</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={sc.wrap}>
      <Text style={[sc.value, { color }]}>{value}</Text>
      <Text style={sc.label}>{label}</Text>
    </View>
  );
}
const sc = StyleSheet.create({
  wrap:  { flex: 1, backgroundColor: C.card, borderRadius: RADIUS.md, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.cardBorder },
  value: { fontSize: FONT.md, fontWeight: '900' },
  label: { color: C.textDim, fontSize: FONT.xs, marginTop: 3, textAlign: 'center' },
});

// ── Stiller ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: C.bg },
  scroll:      { padding: 24, paddingBottom: 110 },
  header:      { marginBottom: 20, paddingTop: 48 },
  title:       { color: C.text, fontSize: FONT['2xl'], fontWeight: '900' },
  sub:         { color: C.textDim, fontSize: FONT.sm, marginTop: 2 },
  sectionLabel:{ color: C.textDim, fontSize: FONT.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  // Eco
  ecoCard:     { backgroundColor: C.card, borderRadius: RADIUS.xl, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: C.cardBorder, flexDirection: 'row', alignItems: 'center', gap: 12 },
  ecoDesc:     { color: C.textDim, fontSize: FONT.sm, lineHeight: 18, marginBottom: 14 },
  shareBtn:    { backgroundColor: C.brandDim, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: `${C.brand}40` },
  shareBtnText:{ color: C.brand, fontSize: FONT.sm, fontWeight: '700' },

  // Filter
  filterRow:   { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterBtn:   { flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: C.card, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  filterLabel: { color: C.textDim, fontSize: FONT.sm, fontWeight: '600' },

  // Chart
  chartCard:   { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.cardBorder },

  // Stats
  statsRow:    { flexDirection: 'row', gap: 8, marginBottom: 14 },

  // Monthly breakdown
  monthlyCard: { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.cardBorder },
  monthRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.divider },
  monthLabel:  { color: C.textDim, fontSize: FONT.sm, width: 36 },
  monthVals:   { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' },
  monthVal:    { fontSize: FONT.sm },
  monthSep:    { color: C.textMuted, fontSize: FONT.xs },

  // Tips
  tipsCard:    { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.cardBorder },
  tipRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.divider, gap: 12, borderRadius: RADIUS.sm },
  tipIconBadge:{ width: 32, height: 32, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  tipText:     { color: C.text, fontSize: FONT.sm, lineHeight: 18, flex: 1 },
  tipSaving:   { color: C.brand, fontSize: FONT.xs, marginTop: 4, fontWeight: '700' },
  
  // Badge
  badgeCard:   { backgroundColor: C.brandDim, borderRadius: RADIUS.lg, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: `${C.brand}30` },
  badgeIconBadge: { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  badgeRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  badgeEmoji:  { fontSize: 32 },
  badgeTitle:  { color: C.brand, fontWeight: '800', fontSize: FONT.md },
  badgeSub:    { color: C.textDim, fontSize: FONT.sm, marginTop: 2 },
  badgeBtn:    { backgroundColor: C.brand, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 8 },
  badgeBtnText:{ color: C.bg, fontWeight: '900', fontSize: FONT.sm },
  badgeMsg:    { color: C.text, fontSize: FONT.sm, lineHeight: 18 },

  // CTA
  cta:         { backgroundColor: C.brandDim, borderRadius: RADIUS.lg, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: `${C.brand}40` },
  ctaText:     { color: C.brand, fontWeight: '800', fontSize: FONT.md },
});
