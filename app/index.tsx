import React, { useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Animated, Dimensions,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { C, FONT, RADIUS, SHADOW } from '../src/theme';
import { Droplet, Flame, Leaf, AlertTriangle } from 'lucide-react-native';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { useUtilityStore } from '../src/store/useUtilityStore';
import { useSubscriptionStore } from '../src/store/useSubscriptionStore';
import { analyzeConsumption } from '../src/services/leakDetectionService';
import { calculateBenchmark } from '../src/services/socialBenchmark';
import { useDualReminder } from '../src/hooks/useReadingReminder';
import { useIntelligenceAlerts } from '../src/hooks/useIntelligenceAlerts';

const { width: SW } = Dimensions.get('window');
const GAUGE_SIZE = (SW - 64) / 2;
const GAUGE_R    = GAUGE_SIZE / 2 - 14;
const CIRC       = 2 * Math.PI * GAUGE_R;

// ── Dairesel Halka Göstergesi ─────────────────────────────────────────────────

interface RingProps {
  ratio:    number;   // 0–1 (bütçeye oranı)
  color:    string;
  dimColor: string;
  label:    string;
  amount:   string;
  IconComponent: any;
  unit:     string;
}

function RingGauge({ ratio, color, dimColor, label, amount, IconComponent, unit }: RingProps) {
  const clamp = Math.max(0, Math.min(1, ratio));
  const fill  = CIRC * (1 - clamp);
  const cx    = GAUGE_SIZE / 2;
  const cy    = GAUGE_SIZE / 2;

  return (
    <View style={[rg.wrap, { width: GAUGE_SIZE, height: GAUGE_SIZE }]}>
      <Svg width={GAUGE_SIZE} height={GAUGE_SIZE} style={rg.svg}>
        <Defs>
          <LinearGradient id={`g_${label}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity="0.5" />
            <Stop offset="100%" stopColor={color} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle cx={cx} cy={cy} r={GAUGE_R}
          stroke={dimColor} strokeWidth={10} fill="none" />
        {/* Fill */}
        <Circle cx={cx} cy={cy} r={GAUGE_R}
          stroke={`url(#g_${label})`} strokeWidth={10} fill="none"
          strokeDasharray={`${CIRC} ${CIRC}`}
          strokeDashoffset={fill}
          strokeLinecap="round"
          rotation="-90" origin={`${cx},${cy}`} />
      </Svg>
      <View style={rg.center}>
        <View style={[rg.iconBadge, { backgroundColor: dimColor }]}>
          <IconComponent size={18} color={color} strokeWidth={2.5} />
        </View>
        <Text style={[rg.label, { color }]}>{label}</Text>
        <Text style={rg.amount}>{amount}</Text>
        <Text style={rg.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const rg = StyleSheet.create({
  wrap:      { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  svg:       { position: 'absolute' },
  center:    { alignItems: 'center', gap: 3 },
  iconBadge: { width: 32, height: 32, borderRadius: RADIUS.full, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  label:     { fontSize: FONT.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  amount:    { fontSize: FONT.xl, fontWeight: '900', color: C.text },
  unit:      { fontSize: FONT.xs, color: C.textDim },
});

// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_BUDGET = 2000; // Kullanıcı bütçe girmemişse gösterilen varsayılan
const TR_MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];

export default function Dashboard() {
  const router  = useRouter();
  const store   = useUtilityStore();
  const subStore = useSubscriptionStore();

  const { profile, properties, activePropertyId } = store;
  const plan   = subStore.effectivePlan();   // expiry kontrolü dahil
  const isPro  = subStore.isActive() && subStore.tier !== 'free';

  const activeProp = properties.find(p => p.id === activePropertyId);
  const city       = activeProp?.city ?? profile.city ?? 'İstanbul';

  // Aktif mülke ait kayıtlar
  const activeLogs = useMemo(
    () => activePropertyId
      ? store.logs.filter(l => l.propertyId === activePropertyId)
      : store.logs,
    [store.logs, activePropertyId],
  );

  // Bu ayki su / gaz istatistikleri
  const stats = useMemo(() => {
    const now = new Date();
    const cm  = now.getMonth();
    const cy  = now.getFullYear();

    const month = activeLogs.filter(l => {
      const d = new Date(l.date);
      return d.getMonth() === cm && d.getFullYear() === cy;
    });

    const waterLogs = month.filter(l => l.type === 'water');
    const gasLogs   = month.filter(l => l.type === 'gas');

    const waterCost = waterLogs.reduce((s, l) => s + l.cost, 0);
    const gasCost   = gasLogs.reduce((s, l) => s + l.cost, 0);
    const total     = waterCost + gasCost;

    const waterM3   = waterLogs.reduce((s, l) => s + l.consumption, 0);
    const gasM3     = gasLogs.reduce((s, l) => s + l.consumption, 0);

    const dom  = now.getDate();
    const dim  = new Date(cy, cm + 1, 0).getDate();
    const proj = dom > 0 ? (total / dom) * dim : 0;

    return { waterCost, gasCost, total, waterM3, gasM3, proj, count: month.length };
  }, [activeLogs]);

  // Anomali analizi
  const anomaly   = useMemo(() => analyzeConsumption(activeLogs), [activeLogs]);
  const benchmark = useMemo(() => calculateBenchmark(city, activeLogs), [city, activeLogs]);

  // Yeni okuma sonrası otomatik zeka analizi + push notification
  useIntelligenceAlerts({ logs: activeLogs, city });

  // Okuma hatırlatıcısı — affectedType'a göre ayrı bayrak
  const reminder  = useDualReminder(
    activeLogs,
    anomaly.level !== 'none' && (anomaly.affectedType === 'water' || anomaly.affectedType === 'both'),
    anomaly.level !== 'none' && (anomaly.affectedType === 'gas'   || anomaly.affectedType === 'both'),
  );

  // Kritik uyarı pulse animasyonu
  const pulseAnim = useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (anomaly.level === 'critical') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 550, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 550, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [anomaly.level]);

  const monthlyBudget = profile.monthlyBudget > 0 ? profile.monthlyBudget : DEFAULT_BUDGET;
  const totalRatio = stats.total / monthlyBudget;
  const barColor   = totalRatio > 1 ? C.danger : totalRatio > 0.8 ? C.warn : C.brand;

  const canScanWater = subStore.canScan('water');
  const canScanGas   = subStore.canScan('gas');

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Başlık ─────────────────────────────────── */}
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>
              {profile.name ? `Merhaba, ${profile.name} 👋` : 'Verim'}
            </Text>
            <Text style={s.sub}>
              {city}{activeProp?.district ? ` · ${activeProp.district}` : ''}
              {activeProp ? ` · ${activeProp.name}` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={[s.planBadge, subStore.tier !== 'free' && { borderColor: C.pro }]}
            onPress={() => router.push('/paywall')}
          >
            <Text style={[s.planBadgeText, subStore.tier !== 'free' && { color: C.pro }]}>
              {subStore.tier === 'free' ? '⭐ Pro\'ya Geç' : `⭐ ${subStore.tier === 'pro' ? 'Pro' : 'Landlord'}`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Bütçe Kartı ────────────────────────────── */}
        <View style={s.budgetCard}>
          <Text style={s.budgetLabel}>{TR_MONTHS[new Date().getMonth()]} Bütçe Tahmini</Text>
          <Text style={s.budgetAmount}>₺{stats.proj.toFixed(0)}</Text>
          <View style={s.barTrack}>
            <Animated.View
              style={[s.barFill, {
                width:           `${Math.min(100, totalRatio * 100)}%` as any,
                backgroundColor: barColor,
              }]}
            />
          </View>
          <View style={s.budgetMeta}>
            <Text style={s.budgetMetaText}>Bu ay: ₺{stats.total.toFixed(2)}</Text>
            <Text style={s.budgetMetaText}>Bütçe: ₺{monthlyBudget}</Text>
          </View>
        </View>

        {/* ── Dairesel Göstergeler ───────────────────── */}
        <View style={s.gaugeRow}>
          <RingGauge
            ratio={monthlyBudget > 0 ? stats.waterCost / (monthlyBudget * 0.5) : 0}
            color={C.water} dimColor={C.waterDim}
            label="Su" IconComponent={Droplet}
            amount={`₺${stats.waterCost.toFixed(0)}`}
            unit={`${stats.waterM3.toFixed(1)} m³`}
          />
          <RingGauge
            ratio={monthlyBudget > 0 ? stats.gasCost / (monthlyBudget * 0.5) : 0}
            color={C.gas} dimColor={C.gasDim}
            label="Gaz" IconComponent={Flame}
            amount={`₺${stats.gasCost.toFixed(0)}`}
            unit={`${stats.gasM3.toFixed(1)} m³`}
          />
        </View>

        {/* ── Anomali / Kaçak Uyarısı ───────────────── */}
        {anomaly.level !== 'none' && (
          <Animated.View style={[
            s.alertCard,
            anomaly.level === 'critical'
              ? { borderColor: C.danger, backgroundColor: C.dangerDim, transform: [{ scale: pulseAnim }] }
              : { borderColor: C.warn,   backgroundColor: C.warnDim },
          ]}>
            <AlertTriangle size={24} color={anomaly.level === 'critical' ? C.danger : C.warn} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={[s.alertTitle, { color: anomaly.level === 'critical' ? C.danger : C.warn }]}>
                {anomaly.title}
              </Text>
              <Text style={s.alertBody}>{anomaly.description}</Text>
              <Text style={s.alertRec}>{anomaly.recommendation}</Text>
              {!plan.leakGuardEnabled && (
                <TouchableOpacity onPress={() => router.push('/paywall')}>
                  <Text style={s.alertUpgrade}>🔒 7/24 AI Kaçak Koruması için Pro →</Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* ── Free: Scan Limiti ──────────────────────── */}
        {plan.maxScansPerMonth > 0 && (  // free veya expired pro
          <View style={s.limitCard}>
            <Text style={s.limitTitle}>Bu Ay Kalan Tarama</Text>
            <View style={s.limitRow}>
              <Text style={s.limitItem}>
                💧 <Text style={{ color: C.water, fontWeight: '800' }}>
                  {Math.max(0, plan.maxScansPerMonth - subStore.monthlyScanCount('water'))}
                </Text> kaldı
              </Text>
              <Text style={s.limitSep}>·</Text>
              <Text style={s.limitItem}>
                🔥 <Text style={{ color: C.gas, fontWeight: '800' }}>
                  {Math.max(0, plan.maxScansPerMonth - subStore.monthlyScanCount('gas'))}
                </Text> kaldı
              </Text>
              <TouchableOpacity onPress={() => router.push('/paywall')} style={s.limitBtn}>
                <Text style={s.limitBtnText}>Sınırsız →</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Native Reklam (Free) ───────────────────── */}
        {plan.adsEnabled && (
          <TouchableOpacity style={s.ad} onPress={() => router.push('/marketplace')} activeOpacity={0.85}>
            <View style={s.adIconBadge}>
              <Leaf size={18} color={C.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.adTitle}>Su Tasarrufu Ürünleri — EcoFlow TR</Text>
              <Text style={s.adSub}>Tüketimini %40 düşür · Reklam</Text>
            </View>
            <Text style={[s.adArrow, { color: C.brand }]}>→</Text>
          </TouchableOpacity>
        )}

        {/* ── Sosyal Benchmark ──────────────────────── */}
        {benchmark && (
          <View style={s.benchCard}>
            <Text style={s.benchBadge}>{benchmark.badge}</Text>
            <Text style={s.benchMsg}>{benchmark.message}</Text>
            <View style={s.benchRow}>
              <Text style={s.benchStat}>Sen: ₺{benchmark.userMonthlyCost.toFixed(0)}</Text>
              <Text style={s.benchDot}>·</Text>
              <Text style={s.benchStat}>{city} ort: ₺{benchmark.cityAvgCost}</Text>
            </View>
          </View>
        )}

        {/* ── Son Kayıtlar ──────────────────────────── */}
        {activeLogs.length > 0 && (
          <View style={s.recentCard}>
            <Text style={s.sectionLabel}>Son Kayıtlar</Text>
            {activeLogs.slice(0, 4).map(log => {
              const LogIcon = log.type === 'water' ? Droplet : Flame;
              const logColor = log.type === 'water' ? C.water : C.gas;
              const logBg = log.type === 'water' ? C.waterDim : C.gasDim;
              return (
                <View key={log.id} style={s.logRow}>
                  <View style={[s.logIconBadge, { backgroundColor: logBg }]}>
                    <LogIcon size={16} color={logColor} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.logDate}>{new Date(log.date).toLocaleDateString('tr-TR')}</Text>
                    <Text style={s.logSub}>
                      Endeks: {log.indexValue} m³ · Tüketim: {log.consumption.toFixed(1)} m³
                    </Text>
                  </View>
                  <Text style={[s.logCost, { color: logColor }]}>
                    ₺{log.cost.toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Okuma Öneri Kartı ─────────────────────── */}
        <TouchableOpacity
          style={[s.reminderCard, { borderColor: reminder.topReminder.color + '50' }]}
          onPress={() => router.push('/scan')}
          activeOpacity={0.85}
        >
          <View style={[s.reminderLeft, { backgroundColor: reminder.topReminder.color + '18' }]}>
            <Text style={s.reminderIcon}>{reminder.topReminder.icon}</Text>
          </View>
          <View style={s.reminderBody}>
            <Text style={[s.reminderTitle, { color: reminder.topReminder.color }]}>
              {reminder.topReminder.title}
            </Text>
            <Text style={s.reminderMsg} numberOfLines={2}>
              {reminder.topReminder.message}
            </Text>
          </View>
          {(reminder.topReminder.urgency === 'due' || reminder.topReminder.urgency === 'overdue') && (
            <View style={[s.reminderBadge, { backgroundColor: reminder.topReminder.color }]}>
              <Text style={s.reminderBadgeText}>Tara →</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Su + Gaz satır özeti */}
        {(reminder.topReminder.urgency !== 'never') && (
          <View style={s.reminderRow}>
            {(['water', 'gas'] as const).map(t => {
              const r = t === 'water' ? reminder.water : reminder.gas;
              return (
                <View key={t} style={[s.reminderMini, { borderColor: r.color + '40' }]}>
                  <Text style={[s.reminderMiniIcon]}>{t === 'water' ? '💧' : '🔥'}</Text>
                  <View>
                    <Text style={[s.reminderMiniTitle, { color: r.color }]}>
                      {t === 'water' ? 'Su' : 'Gaz'}
                    </Text>
                    <Text style={s.reminderMiniSub}>
                      {r.daysSinceLast === null
                        ? 'Henüz okuma yok'
                        : r.daysUntilNext === 0
                          ? 'Bugün oku!'
                          : `${r.daysUntilNext} gün kaldı`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Floating Action Buttons ───────────────── */}
        <View style={s.fabRow}>
          <TouchableOpacity
            style={[s.fab, { borderColor: `${C.water}40` }, SHADOW.water]}
            onPress={() => canScanWater ? router.push('/scan?type=water') : router.push('/paywall')}
            activeOpacity={0.8}
          >
            <ExpoLinearGradient
              colors={['rgba(6, 182, 212, 0.12)', 'rgba(7, 10, 19, 0.2)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.fabGrad}
            >
              <Droplet size={22} color={C.water} strokeWidth={2.5} />
              <Text style={[s.fabLabel, { color: C.water }]}>Su Tara</Text>
            </ExpoLinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.fab, { borderColor: `${C.gas}40` }, SHADOW.gas]}
            onPress={() => canScanGas ? router.push('/scan?type=gas') : router.push('/paywall')}
            activeOpacity={0.8}
          >
            <ExpoLinearGradient
              colors={['rgba(245, 158, 11, 0.12)', 'rgba(7, 10, 19, 0.2)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.fabGrad}
            >
              <Flame size={22} color={C.gas} strokeWidth={2.5} />
              <Text style={[s.fabLabel, { color: C.gas }]}>Gaz Tara</Text>
            </ExpoLinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.fab, { borderColor: `${C.brand}40` }, SHADOW.brand]}
            onPress={() => router.push('/marketplace')}
            activeOpacity={0.8}
          >
            <ExpoLinearGradient
              colors={['rgba(0, 255, 157, 0.12)', 'rgba(7, 10, 19, 0.2)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.fabGrad}
            >
              <Leaf size={22} color={C.brand} strokeWidth={2.5} />
              <Text style={[s.fabLabel, { color: C.brand }]}>Market</Text>
            </ExpoLinearGradient>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: C.bg },
  scroll:         { padding: 20, paddingBottom: 110 },

  // Header
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingTop: 48 },
  greeting:       { fontSize: FONT.xl, fontWeight: '800', color: C.text },
  sub:            { fontSize: FONT.xs, color: C.textDim, marginTop: 3 },
  planBadge:      { borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 6 },
  planBadgeText:  { color: C.textDim, fontSize: FONT.xs, fontWeight: '700' },

  // Budget
  budgetCard:     { backgroundColor: C.card, borderRadius: RADIUS.xl, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: C.cardBorder },
  budgetLabel:    { color: C.textDim, fontSize: FONT.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  budgetAmount:   { fontSize: 46, fontWeight: '900', color: C.text, marginTop: 4, letterSpacing: -1 },
  barTrack:       { height: 4, backgroundColor: C.border, borderRadius: 2, marginTop: 14, marginBottom: 8, overflow: 'hidden' },
  barFill:        { height: '100%', borderRadius: 2 },
  budgetMeta:     { flexDirection: 'row', justifyContent: 'space-between' },
  budgetMetaText: { fontSize: FONT.xs, color: C.textDim },

  // Gauges
  gaugeRow:       { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },

  // Alert
  alertCard:      { flexDirection: 'row', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.lg, padding: 14, marginBottom: 16, gap: 10, alignItems: 'flex-start' },
  alertIcon:      { fontSize: 24, marginTop: 1 },
  alertTitle:     { fontWeight: '800', fontSize: FONT.md, marginBottom: 2 },
  alertBody:      { color: C.textDim, fontSize: FONT.sm, lineHeight: 18 },
  alertRec:       { color: C.textDim, fontSize: FONT.xs, marginTop: 4, fontStyle: 'italic' },
  alertUpgrade:   { color: C.pro, fontSize: FONT.sm, fontWeight: '700', marginTop: 8 },

  // Scan limit
  limitCard:      { backgroundColor: C.card, borderRadius: RADIUS.md, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  limitTitle:     { color: C.textDim, fontSize: FONT.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  limitRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  limitItem:      { color: C.text, fontSize: FONT.sm },
  limitSep:       { color: C.textDim },
  limitBtn:       { marginLeft: 'auto' as any, backgroundColor: C.proDim, borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 5 },
  limitBtnText:   { color: C.pro, fontWeight: '800', fontSize: FONT.xs },

  // Ad
  ad:             { flexDirection: 'row', alignItems: 'center', backgroundColor: C.brandDim, borderWidth: 1, borderColor: `${C.brand}25`, borderRadius: RADIUS.md, padding: 12, marginBottom: 14, gap: 10 },
  adIconBadge:    { width: 36, height: 36, borderRadius: RADIUS.sm, backgroundColor: 'rgba(0,255,157,0.06)', alignItems: 'center', justifyContent: 'center' },
  adTitle:        { color: C.text, fontSize: FONT.sm, fontWeight: '600' },
  adSub:          { color: C.textDim, fontSize: FONT.xs },
  adArrow:        { fontWeight: '800', fontSize: FONT.lg },

  // Benchmark
  benchCard:      { backgroundColor: C.successDim, borderRadius: RADIUS.lg, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: `${C.success}25` },
  benchBadge:     { color: C.success, fontWeight: '800', fontSize: FONT.md, marginBottom: 4 },
  benchMsg:       { color: C.text, fontSize: FONT.sm, lineHeight: 18 },
  benchRow:       { flexDirection: 'row', marginTop: 6, gap: 6 },
  benchDot:       { color: C.textDim, fontSize: FONT.sm },
  benchStat:      { color: C.textDim, fontSize: FONT.sm },

  // Recent
  recentCard:     { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.cardBorder },
  sectionLabel:   { color: C.textDim, fontSize: FONT.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  logRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.divider },
  logIconBadge:   { width: 32, height: 32, borderRadius: RADIUS.sm, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
  logDate:        { color: C.text, fontSize: FONT.sm, fontWeight: '600' },
  logSub:         { color: C.textDim, fontSize: FONT.xs, marginTop: 2 },
  logCost:        { fontWeight: '900', fontSize: FONT.md },

  // FABs
  fabRow:         { flexDirection: 'row', gap: 10 },
  fab:            { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden', borderWidth: 1 },
  fabGrad:        { paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
  fabEmoji:       { fontSize: 24 },
  fabLabel:       { fontSize: FONT.sm, fontWeight: '800' },

// Reminder card
  reminderCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: RADIUS.lg, borderWidth: 1, padding: 14, marginBottom: 10, gap: 12 },
  reminderLeft:       { width: 44, height: 44, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  reminderIcon:       { fontSize: 22 },
  reminderBody:       { flex: 1 },
  reminderTitle:      { fontSize: FONT.sm, fontWeight: '800', marginBottom: 3 },
  reminderMsg:        { color: C.textDim, fontSize: FONT.xs, lineHeight: 16 },
  reminderBadge:      { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md },
  reminderBadgeText:  { color: C.bg, fontSize: FONT.xs, fontWeight: '900' },
  reminderRow:        { flexDirection: 'row', gap: 10, marginBottom: 16 },
  reminderMini:       { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: RADIUS.md, borderWidth: 1, padding: 10 },
  reminderMiniIcon:   { fontSize: 18 },
  reminderMiniTitle:  { fontSize: FONT.xs, fontWeight: '800' },
  reminderMiniSub:    { color: C.textDim, fontSize: FONT.xs, marginTop: 1 },

  // FAB

  // Benchmark
  benchStats:     { flexDirection: 'row', gap: 16 },

  // History
  histCard:       { backgroundColor: C.card, borderRadius: RADIUS.lg, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.cardBorder },
  histTitle:      { color: C.textDim, fontSize: FONT.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  histRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.divider, gap: 10 },
  histDot:        { width: 8, height: 8, borderRadius: 4 },
  histDate:       { color: C.textDim, fontSize: FONT.xs, width: 72 },
  histType:       { color: C.text, fontSize: FONT.sm, flex: 1 },
  histCost:       { color: C.text, fontSize: FONT.sm, fontWeight: '700' },
  histEmpty:      { color: C.textDim, fontSize: FONT.sm, textAlign: 'center', 
paddingVertical: 16 },

  // Ad
  adText:         { color: C.brand, fontSize: FONT.sm, fontWeight: '700', flex: 1 },
});