import { Tabs, usePathname, router } from 'expo-router';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, Dimensions, ScrollView, TextInput, Switch, Alert, LayoutAnimation, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { requestNotificationPermissions } from '@/services/AlarmService';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';

// ============================================
// NEOBRUTALIST DESIGN CONSTANTS
// ============================================
const NEO = {
  colors: {
    white: '#FFFFFF',
    black: '#000000',
    activePink: '#FF007F', // Updated for Reminders focus, but general active state can be context dependent
    inactiveWhite: '#FFFFFF',
  },
  border: 3,
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_HEIGHT = 65; // Single row height
const BOTTOM_INSET = Platform.OS === 'ios' ? 20 : 0;

// ============================================
// CUSTOM TAB ICON
// ============================================
function NeoTabIcon({ name, focused, color, label }: any) {
  const scale = useSharedValue(focused ? 1.1 : 1);

  useEffect(() => {
    scale.value = withSpring(focused ? 1.1 : 1, { damping: 10 });
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Logic: 
  // - If focused: Icon is WHITE (because bg is colored)
  // - If not focused: Icon is BLACK
  const iconColor = focused ? '#FFFFFF' : '#000000';
  const textColor = focused ? '#FFFFFF' : '#000000';

  return (
    <Animated.View style={[styles.tabContent, animatedStyle]}>
      <Ionicons
        name={name}
        size={24}
        color={iconColor}
      />
      <Text style={[styles.tabLabel, { color: textColor }]}>{label}</Text>
    </Animated.View>
  );
}

// ============================================
// CUSTOM TAB BAR
// ============================================
function CustomTabBar({ state, descriptors, navigation }: any) {
  // Routes: index (Alarms), reminders, planner, focus, blocker, stats

  // Mapped indices based on route names
  // 0: index (Alarms)
  // 1: reminders
  // 2: planner
  // 3: focus
  // 4: blocker
  // 5: stats

  // TARGET ORDER: 
  // 1. Alarm (index)
  // 2. Reminders
  // 3. Focus
  // 4. Blocker
  // 5. Stats
  // 6. Planner

  // CHECK ACTIVE ROUTE OPTIONS FOR VISIBILITY
  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor.options;

  // @ts-ignore - tabBarStyle might be generic style object
  if (focusedOptions.tabBarStyle?.display === 'none') {
    return null;
  }

  const visualOrder = [0, 1, 3, 4, 5, 2];

  return (
    <View style={styles.tabBarContainer}>
      {visualOrder.map((routeIndex) => {
        const route = state.routes[routeIndex];
        if (!route) return null;

        const { options } = descriptors[route.key];
        const isFocused = state.index === routeIndex;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate(route.name, route.params);
          }
        };

        // Icons and Labels
        let iconName: keyof typeof Ionicons.glyphMap = 'help-outline';
        let label = '';

        if (route.name === 'index') {
          iconName = isFocused ? 'alarm' : 'alarm-outline';
          label = 'ALARM';
        } else if (route.name === 'reminders') {
          iconName = isFocused ? 'notifications' : 'notifications-outline';
          label = 'REMINDERS';
        } else if (route.name === 'planner') {
          iconName = isFocused ? 'calendar' : 'calendar-outline';
          label = 'PLANNER';
        } else if (route.name === 'focus') {
          iconName = isFocused ? 'radio-button-on' : 'radio-button-off';
          label = 'FOCUS';
        } else if (route.name === 'blocker') {
          iconName = isFocused ? 'ban' : 'ban-outline';
          label = 'BLOCK';
        } else if (route.name === 'stats') {
          iconName = isFocused ? 'bar-chart' : 'bar-chart-outline';
          label = 'STATS';
        }

        // Active Background Color - REMINDERS gets magenta (#FF00FF)
        let activeBg = '#000000'; // Default black for most tabs
        if (route.name === 'reminders') activeBg = '#FF00FF'; // Magenta for Reminders

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={[
              styles.tabItem,
              isFocused && { backgroundColor: activeBg }
            ]}
          >
            <NeoTabIcon
              name={iconName}
              focused={isFocused}
              label={label}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

// ============================================
// MAIN LAYOUT
// ============================================
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const settingsStore = useSettingsStore();
  const { user, logout } = useAuthStore();
  const sidebarOpen = settingsStore.sidebarOpen;

  // Temp editing state for sidebar
  const [tempName, setTempName] = useState(settingsStore.displayName);
  const [tempPointsGoal, setTempPointsGoal] = useState(String(settingsStore.dailyPointsGoal));
  const [tempTasksGoal, setTempTasksGoal] = useState(String(settingsStore.dailyTasksGoal));
  const [tempFocusGoal, setTempFocusGoal] = useState(String(settingsStore.dailyFocusGoal));
  const [tempAlarmPhrase, setTempAlarmPhrase] = useState(settingsStore.alarmDismissPhrase);
  const [tempFocusPhrase, setTempFocusPhrase] = useState(settingsStore.focusDismissPhrase);
  const [tempSnoozeLimit, setTempSnoozeLimit] = useState(String(settingsStore.alarmSnoozeLimit));
  const [tempFocusDuration, setTempFocusDuration] = useState(String(settingsStore.defaultFocusDuration));
  const [tempBreakDuration, setTempBreakDuration] = useState(String(settingsStore.defaultBreakDuration));
  const sidebarAnim = useSharedValue(-SCREEN_WIDTH * 0.85);

  // Sync temp values when sidebar opens
  useEffect(() => {
    if (sidebarOpen) {
      setTempName(settingsStore.displayName);
      setTempPointsGoal(String(settingsStore.dailyPointsGoal));
      setTempTasksGoal(String(settingsStore.dailyTasksGoal));
      setTempFocusGoal(String(settingsStore.dailyFocusGoal));
      setTempAlarmPhrase(settingsStore.alarmDismissPhrase);
      setTempFocusPhrase(settingsStore.focusDismissPhrase);
      setTempSnoozeLimit(String(settingsStore.alarmSnoozeLimit));
      setTempFocusDuration(String(settingsStore.defaultFocusDuration));
      setTempBreakDuration(String(settingsStore.defaultBreakDuration));
      sidebarAnim.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      sidebarAnim.value = withTiming(-SCREEN_WIDTH * 0.85, { duration: 250, easing: Easing.in(Easing.cubic) });
    }
  }, [sidebarOpen]);

  const closeSidebar = () => settingsStore.closeSidebar();

  const saveSidebarSettings = () => {
    if (tempName.trim()) settingsStore.setDisplayName(tempName.trim().toUpperCase());
    const pg = parseInt(tempPointsGoal);
    if (!isNaN(pg) && pg > 0) settingsStore.setDailyPointsGoal(pg);
    const tg = parseInt(tempTasksGoal);
    if (!isNaN(tg) && tg > 0) settingsStore.setDailyTasksGoal(tg);
    const fg = parseInt(tempFocusGoal);
    if (!isNaN(fg) && fg > 0) settingsStore.setDailyFocusGoal(fg);
    if (tempAlarmPhrase.trim()) settingsStore.setAlarmDismissPhrase(tempAlarmPhrase.trim().toUpperCase());
    if (tempFocusPhrase.trim()) settingsStore.setFocusDismissPhrase(tempFocusPhrase.trim().toUpperCase());
    const sl = parseInt(tempSnoozeLimit);
    if (!isNaN(sl) && sl >= 0) settingsStore.setAlarmSnoozeLimit(sl);
    const fd = parseInt(tempFocusDuration);
    if (!isNaN(fd) && fd > 0) settingsStore.setDefaultFocusDuration(fd);
    const bd = parseInt(tempBreakDuration);
    if (!isNaN(bd) && bd > 0) settingsStore.setDefaultBreakDuration(bd);
    closeSidebar();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleResetData = () => {
    Alert.alert('⚠️ RESET ALL DATA', 'This will reset all settings to defaults. Are you sure?', [
      { text: 'CANCEL', style: 'cancel' },
      { text: 'RESET', style: 'destructive', onPress: () => { settingsStore.resetAllData(); closeSidebar(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } },
    ]);
  };

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sidebarAnim.value }],
  }));

  useEffect(() => {
    requestNotificationPermissions();
    if (Platform.OS === 'android') {
      if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }
  }, []);

  const SB = {
    colors: { black: '#000000', background: '#FFFDF0', yellow: '#FFE500', green: '#C8F7C5', orange: '#FFB347' },
    border: 3,
    fonts: { heavy: '900' as const, bold: '700' as const, mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
  };

  const inputStyle = { borderWidth: 2, borderColor: SB.colors.black, padding: 10, fontSize: 14, fontWeight: SB.fonts.bold as any, fontFamily: SB.fonts.mono };
  const sectionLabel = (text: string) => (
    <Text style={{ fontSize: 12, fontWeight: SB.fonts.heavy, letterSpacing: 1.5, marginBottom: 8, color: '#666' }}>{text}</Text>
  );
  const fieldLabel = (text: string) => (
    <Text style={{ fontSize: 10, fontWeight: SB.fonts.heavy, marginBottom: 6 }}>{text}</Text>
  );

  const toggleRow = (label: string, value: boolean, onToggle: (v: boolean) => void) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <Text style={{ fontSize: 12, fontWeight: SB.fonts.bold }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={(v) => { onToggle(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        trackColor={{ false: '#ddd', true: '#76FF03' }}
        thumbColor={value ? SB.colors.black : '#999'}
      />
    </View>
  );

  // Swipe tab navigation
  const TAB_ROUTES = ['/', '/reminders', '/planner', '/focus', '/blocker', '/stats'];
  const pathname = usePathname();
  const swipeCooldown = useRef(false);

  const currentTabIndex = TAB_ROUTES.indexOf(pathname) >= 0 ? TAB_ROUTES.indexOf(pathname) : 0;

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .onEnd((event) => {
      if (swipeCooldown.current || sidebarOpen) return;
      const { translationX, velocityX } = event;
      if (Math.abs(translationX) > 20 && Math.abs(velocityX) > 50) {
        if (translationX < 0 && currentTabIndex < TAB_ROUTES.length - 1) {
          // Swipe left → next tab
          swipeCooldown.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          router.navigate(TAB_ROUTES[currentTabIndex + 1] as any);
          setTimeout(() => { swipeCooldown.current = false; }, 400);
        } else if (translationX > 0 && currentTabIndex > 0) {
          // Swipe right → previous tab
          swipeCooldown.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          router.navigate(TAB_ROUTES[currentTabIndex - 1] as any);
          setTimeout(() => { swipeCooldown.current = false; }, 400);
        }
      }
    })
    .runOnJS(true);

  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={swipeGesture}>
        <View style={{ flex: 1 }}>
          <Tabs
            tabBar={props => <CustomTabBar {...props} />}
            screenOptions={{
              headerShown: false,
            }}
          >
            <Tabs.Screen name="index" options={{ title: 'Alarms' }} />
            <Tabs.Screen name="reminders" options={{ title: 'Reminders' }} />
            <Tabs.Screen name="planner" options={{ title: 'Planner' }} />
            <Tabs.Screen name="focus" options={{ title: 'Focus' }} />
            <Tabs.Screen name="blocker" options={{ title: 'Blocker' }} />
            <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
          </Tabs>
        </View>
      </GestureDetector>

      {/* Settings Sidebar Overlay */}
      <Animated.View
        pointerEvents={sidebarOpen ? 'auto' : 'none'}
        style={[{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9998,
          opacity: sidebarOpen ? 1 : 0,
        }]}
      >
        <Pressable style={{ flex: 1 }} onPress={closeSidebar} />
      </Animated.View>

      {/* Settings Sidebar Panel */}
      <Animated.View style={[{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: SCREEN_WIDTH * 0.85,
        backgroundColor: SB.colors.background, borderRightWidth: SB.border,
        borderColor: SB.colors.black, zIndex: 9999, paddingTop: 60, paddingHorizontal: 20,
      }, sidebarStyle]}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Close Button */}
          <Pressable onPress={closeSidebar} style={{ position: 'absolute', top: -10, right: 0, zIndex: 10, padding: 8 }}>
            <Ionicons name="close" size={28} color={SB.colors.black} />
          </Pressable>

          <Text style={{ fontSize: 24, fontWeight: SB.fonts.heavy, letterSpacing: 2, marginBottom: 24 }}>⚙️ SETTINGS</Text>

          {/* ===== PROFILE ===== */}
          {sectionLabel('PROFILE')}
          <View style={{ borderWidth: SB.border, borderColor: SB.colors.black, padding: 12, marginBottom: 16, backgroundColor: '#FFFDE7' }}>
            {fieldLabel('DISPLAY NAME')}
            <TextInput
              style={inputStyle}
              value={tempName}
              onChangeText={setTempName}
              placeholder="YOUR NAME"
              placeholderTextColor="#999"
            />
          </View>

          {/* ===== DAILY GOALS ===== */}
          {sectionLabel('DAILY GOALS')}
          <View style={{ borderWidth: SB.border, borderColor: SB.colors.black, padding: 12, marginBottom: 16, backgroundColor: '#E8F5E9' }}>
            {fieldLabel('POINTS GOAL')}
            <TextInput style={[inputStyle, { marginBottom: 12 }]} value={tempPointsGoal} onChangeText={setTempPointsGoal} keyboardType="numeric" placeholder="500" />
            {fieldLabel('TASKS GOAL')}
            <TextInput style={[inputStyle, { marginBottom: 12 }]} value={tempTasksGoal} onChangeText={setTempTasksGoal} keyboardType="numeric" placeholder="5" />
            {fieldLabel('FOCUS GOAL (MINUTES)')}
            <TextInput style={inputStyle} value={tempFocusGoal} onChangeText={setTempFocusGoal} keyboardType="numeric" placeholder="60" />
          </View>

          {/* ===== DISMISS PHRASES ===== */}
          {sectionLabel('DISMISS PHRASES')}
          <View style={{ borderWidth: SB.border, borderColor: SB.colors.black, padding: 12, marginBottom: 16, backgroundColor: '#FFF3E0' }}>
            {fieldLabel('ALARM PHRASE')}
            <TextInput style={[inputStyle, { marginBottom: 12 }]} value={tempAlarmPhrase} onChangeText={setTempAlarmPhrase} autoCapitalize="characters" placeholder="I AM AWAKE" />
            {fieldLabel('FOCUS STOP PHRASE')}
            <TextInput style={inputStyle} value={tempFocusPhrase} onChangeText={setTempFocusPhrase} autoCapitalize="characters" placeholder="I GIVE UP" />
          </View>

          {/* ===== ALARM SETTINGS ===== */}
          {sectionLabel('ALARM SETTINGS')}
          <View style={{ borderWidth: SB.border, borderColor: SB.colors.black, padding: 12, marginBottom: 16, backgroundColor: '#E3F2FD' }}>
            {fieldLabel('MAX SNOOZES')}
            <TextInput style={[inputStyle, { marginBottom: 12 }]} value={tempSnoozeLimit} onChangeText={setTempSnoozeLimit} keyboardType="numeric" placeholder="3" />
            {toggleRow('🔔 ALARM SOUND', settingsStore.alarmSoundEnabled, settingsStore.setAlarmSoundEnabled)}
            {toggleRow('📳 ALARM VIBRATION', settingsStore.alarmVibrationEnabled, settingsStore.setAlarmVibrationEnabled)}
          </View>

          {/* ===== FOCUS DEFAULTS ===== */}
          {sectionLabel('FOCUS SESSION DEFAULTS')}
          <View style={{ borderWidth: SB.border, borderColor: SB.colors.black, padding: 12, marginBottom: 16, backgroundColor: '#F3E5F5' }}>
            {fieldLabel('FOCUS DURATION (MINUTES)')}
            <TextInput style={[inputStyle, { marginBottom: 12 }]} value={tempFocusDuration} onChangeText={setTempFocusDuration} keyboardType="numeric" placeholder="25" />
            {fieldLabel('BREAK DURATION (MINUTES)')}
            <TextInput style={[inputStyle, { marginBottom: 12 }]} value={tempBreakDuration} onChangeText={setTempBreakDuration} keyboardType="numeric" placeholder="5" />
            {toggleRow('🔒 STRICT MODE', settingsStore.focusStrictMode, settingsStore.setFocusStrictMode)}
            {toggleRow('🔊 FOCUS SOUNDS', settingsStore.focusSoundEnabled, settingsStore.setFocusSoundEnabled)}
          </View>

          {/* ===== NOTIFICATIONS ===== */}
          {sectionLabel('NOTIFICATIONS')}
          <View style={{ borderWidth: SB.border, borderColor: SB.colors.black, padding: 12, marginBottom: 16, backgroundColor: '#FFF9C4' }}>
            {toggleRow('📅 DAILY REMINDER', settingsStore.dailyReminderEnabled, settingsStore.setDailyReminderEnabled)}
            {toggleRow('🔥 STREAK REMINDER', settingsStore.streakReminderEnabled, settingsStore.setStreakReminderEnabled)}
          </View>

          {/* ===== SAVE BUTTON ===== */}
          <Pressable
            onPress={saveSidebarSettings}
            style={({ pressed }) => [{ backgroundColor: SB.colors.black, padding: 16, alignItems: 'center', borderWidth: SB.border, borderColor: SB.colors.black, marginBottom: 16 }, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
          >
            <Text style={{ color: SB.colors.background, fontSize: 16, fontWeight: SB.fonts.heavy, letterSpacing: 2 }}>💾 SAVE SETTINGS</Text>
          </Pressable>

          {/* ===== DATA MANAGEMENT ===== */}
          {sectionLabel('DATA MANAGEMENT')}
          <Pressable
            onPress={handleResetData}
            style={{ backgroundColor: '#FFE0E0', padding: 14, alignItems: 'center', borderWidth: SB.border, borderColor: SB.colors.black, marginBottom: 16 }}
          >
            <Text style={{ fontSize: 13, fontWeight: SB.fonts.heavy, letterSpacing: 1, color: '#CC0000' }}>🗑️ RESET ALL SETTINGS</Text>
          </Pressable>

          {/* ===== LOGOUT ===== */}
          {user && (
            <Pressable
              onPress={() => { logout(); closeSidebar(); }}
              style={{ backgroundColor: '#FF0000', padding: 14, alignItems: 'center', borderWidth: SB.border, borderColor: SB.colors.black, marginBottom: 16 }}
            >
              <Text style={{ color: SB.colors.background, fontSize: 14, fontWeight: SB.fonts.heavy, letterSpacing: 2 }}>🚪 LOGOUT</Text>
            </Pressable>
          )}

          {/* ===== ABOUT ===== */}
          <View style={{ borderTopWidth: 2, borderColor: '#ddd', paddingTop: 16, marginBottom: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: SB.fonts.heavy }}>FOCUSGUARD</Text>
            <Text style={{ fontSize: 10, fontFamily: SB.fonts.mono, color: '#999', marginTop: 4 }}>VERSION 1.0.0</Text>
            <Text style={{ fontSize: 10, fontFamily: SB.fonts.mono, color: '#bbb', marginTop: 2 }}>BUILT WITH ❤️</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: TAB_HEIGHT + BOTTOM_INSET,
    backgroundColor: NEO.colors.white,
    borderTopWidth: NEO.border,
    borderColor: NEO.colors.black,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 20,
    paddingBottom: BOTTOM_INSET,
  },
  tabItem: {
    flex: 1, // Equal width for 6 items
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NEO.colors.white,
    borderRightWidth: 1,
    borderColor: NEO.colors.black,
    height: '100%',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },
});
