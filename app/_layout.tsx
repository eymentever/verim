import React, { useEffect } from 'react';
import { Tabs, Redirect } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { C } from '../src/theme';
import { useUtilityStore } from '../src/store/useUtilityStore';
import { initRevenueCat } from '../src/services/revenueCatService';

// Splash screen'i otomatik kapanmaktan koru; biz kontrol edeceğiz
SplashScreen.preventAutoHideAsync().catch(() => {});

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={[ti.wrap, focused && ti.wrapActive]}>
      <Text style={ti.emoji}>{emoji}</Text>
      <Text style={[ti.label, focused && ti.labelActive]}>{label}</Text>
    </View>
  );
}

const ti = StyleSheet.create({
  wrap:        { alignItems: 'center', paddingTop: 6, gap: 2 },
  wrapActive:  {},
  emoji:       { fontSize: 20 },
  label:       { fontSize: 10, fontWeight: '600', color: C.textMuted },
  labelActive: { color: C.brand },
});

export default function RootLayout() {
  const { profile } = useUtilityStore();

  // RevenueCat başlat ve splash'ı kapat
  useEffect(() => {
    initRevenueCat();
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  // Setup tamamlanmadıysa Redirect ile setup'a yönlendir.
  // Redirect, navigator mount olduktan SONRA render edilir — race condition yok.
  const setupRedirect = !profile.setupComplete
    ? <Redirect href="/setup" />
    : null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.card,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 82 : 62,
          paddingBottom: Platform.OS === 'ios' ? 20 : 8,
        },
        tabBarShowLabel: false,
      }}
    >
      {/* Setup redirect — navigator mount sonrası güvenli */}
      {setupRedirect}

      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Ana Sayfa" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📷" label="Tara" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📊" label="Analiz" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚙️" label="Ayarlar" focused={focused} />
          ),
        }}
      />
      {/* Hidden screens — modal olarak açılır */}
      <Tabs.Screen name="setup"       options={{ href: null }} />
      <Tabs.Screen name="paywall"     options={{ href: null }} />
      <Tabs.Screen name="marketplace" options={{ href: null }} />
    </Tabs>
  );
}
