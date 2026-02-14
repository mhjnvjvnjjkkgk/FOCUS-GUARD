import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAlarmStore } from '@/store/alarmStore';
import { useAuthStore } from '@/store/authStore';
import { usePointsStore } from '@/store/pointsStore';
import { usePlannerStore } from '@/store/plannerStore';
import { useSettingsStore } from '@/store/settingsStore';
import AlarmService from '@/services/AlarmService';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const alarms = useAlarmStore((state) => state.alarms);
  const { user, isLoading, initializeListener } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initializeListener();
    return unsubscribe;
  }, []);

  // Auth Guard
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const inLogin = segments[0] === 'login';

    if (!user && inAuthGroup) {
      router.replace('/login');
    } else if (user && inLogin) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  // Centralized Firestore Sync — all stores sync when user logs in
  useEffect(() => {
    if (user) {
      console.log('🔄 Starting Firestore sync for all stores...');
      usePointsStore.getState().syncWithFirestore();
      useAlarmStore.getState().syncWithFirestore();
      usePlannerStore.getState().syncWithFirestore();
      useSettingsStore.getState().syncWithFirestore();

      return () => {
        console.log('🛑 Stopping Firestore sync...');
        usePointsStore.getState().stopSync();
        useAlarmStore.getState().stopSync();
        usePlannerStore.getState().stopSync();
        useSettingsStore.getState().stopSync();
      };
    }
  }, [user]);

  // Initialize alarm notifications on app start
  useEffect(() => {
    const initializeAlarms = async () => {
      // Request notification permissions
      const granted = await AlarmService.requestNotificationPermissions();

      if (granted) {
        // Schedule all enabled alarms
        await AlarmService.scheduleAllAlarms(alarms);
      }
    };

    initializeAlarms();

    // Set up notification listeners
    const responseCleanup = AlarmService.setupNotificationListener();
    const foregroundCleanup = AlarmService.setupForegroundNotificationListener();

    return () => {
      responseCleanup();
      foregroundCleanup();
    };
  }, []);

  // Hide navigation bar on Android for fullscreen mode
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
      NavigationBar.setBehaviorAsync('overlay-swipe');
    }
  }, []);

  // Re-schedule alarms when alarm list changes
  useEffect(() => {
    AlarmService.scheduleAllAlarms(alarms);
  }, [alarms]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF9F6' }}>
        <ActivityIndicator size="large" color="#000000" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="alarm/ringing" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        </Stack>
        <StatusBar hidden={true} />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
