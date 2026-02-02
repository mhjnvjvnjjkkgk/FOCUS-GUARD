import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAlarmStore } from '@/store/alarmStore';
import AlarmService from '@/services/AlarmService';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const alarms = useAlarmStore((state) => state.alarms);

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

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        <Stack.Screen name="alarm/ringing" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      </Stack>
      <StatusBar hidden={true} />
    </ThemeProvider>
  );
}
