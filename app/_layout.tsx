import React, { useEffect } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { C } from '../src/theme';
import { useUtilityStore } from '../src/store/useUtilityStore';
import { initRevenueCat } from '../src/services/revenueCatService';
import {
  setupNotificationChannels,
  addNotificationResponseListener,
} from '../src/services/notificationService';
import { Home, Camera, BarChart3, Settings } from 'lucide-react-native';

// Splash screen'i otomatik kapanmaktan koru; biz kontrol edeceğiz
SplashScreen.preventAutoHideAsync().catch(() => {});

function TabIcon({ IconComponent, label, focused }: { IconComponent: any; label: string; focused: boolean }) {
  const color = focused ? C.brand : C.textMuted;
  return (
    <View style={ti.wrap}>
      <IconComponent size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
      <Text style={[ti.label, focused && ti.labelActive]}>{label}</Text>
    </View>
  );
}

const ti = StyleSheet.create({
  wrap:        { alignItems: 'center', justifyContent: 'center', height: '100%', paddingVertical: 10 },
  label:       { fontSize: 9, fontWeight: '800', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  labelActive: { color: C.brand },
});

export default function RootLayout() {
  const { profile } = useUtilityStore();
  const router = useRouter();
  const pathname = usePathname();

  // RevenueCat + Bildirim kanalları başlat, splash'ı kapat
  useEffect(() => {
    initRevenueCat().catch(() => {});
    setupNotificationChannels().catch(() => {});
    SplashScreen.hideAsync().catch(() => {});

    // Bildirimlere tıklama dinleyicisi
    const sub = addNotificationResponseListener((data) => {
      if (data?.type === 'ANOMALY_SPIKE' || data?.type === 'LEAK_SUSPICION') {
        router.push('/analytics');
      }
    });
    return () => sub.remove();
  }, []);

  // Setup tamamlanmadıysa welcome → setup akışına yönlendir.
  useEffect(() => {
    if (!profile.setupComplete && pathname !== '/setup' && pathname !== '/welcome') {
      router.replace('/welcome' as any);
    }
  }, [profile.setupComplete, pathname]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 28 : 20,
          left: 20,
          right: 20,
          backgroundColor: 'rgba(13, 20, 36, 0.94)', // Translucent card background
          borderRadius: 24,
          height: 68,
          paddingBottom: 0,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.08)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.45,
          shadowRadius: 18,
          elevation: 12,
        },
        tabBarShowLabel: false,
      }}
    >

      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon IconComponent={Home} label="Ana Sayfa" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon IconComponent={Camera} label="Tara" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon IconComponent={BarChart3} label="Analiz" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon IconComponent={Settings} label="Ayarlar" focused={focused} />
          ),
        }}
      />
      {/* Hidden screens — modal olarak açılır */}
      <Tabs.Screen name="welcome"     options={{ href: null }} />
      <Tabs.Screen name="setup"       options={{ href: null }} />
      <Tabs.Screen name="paywall"     options={{ href: null }} />
      <Tabs.Screen name="marketplace" options={{ href: null }} />
    </Tabs>
  );
}
