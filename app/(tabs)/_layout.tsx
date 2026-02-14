import { Tabs, usePathname, router, useSegments } from 'expo-router';
import React, { useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, Dimensions, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { requestNotificationPermissions } from '@/services/AlarmService';

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

  useEffect(() => {
    requestNotificationPermissions();
    if (Platform.OS === 'android') {
      if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }
  }, []);

  // ============================================
  // SMOOTH SWIPE NAVIGATION (like home screen)
  // ============================================
  const segments = useSegments();
  const TAB_ORDER = ['index', 'reminders', 'focus', 'blocker', 'stats', 'planner'];
  const TAB_ROUTES: Record<string, string> = {
    'index': '/',
    'reminders': '/reminders',
    'focus': '/focus',
    'blocker': '/blocker',
    'stats': '/stats',
    'planner': '/planner',
  };

  const swipeCooldown = useRef(false);
  const translateX = useSharedValue(0);

  const currentTabName = segments.length > 0 ? segments[segments.length - 1] : 'index';
  const currentTabIndex = TAB_ORDER.indexOf(currentTabName) >= 0 ? TAB_ORDER.indexOf(currentTabName) : 0;

  const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // 25% of screen = commit swipe

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      'worklet';
      // Clamp: don't allow swiping past first/last tab
      let clampedX = event.translationX;
      if (currentTabIndex === 0 && clampedX > 0) clampedX = clampedX * 0.3; // Rubber-band
      if (currentTabIndex === TAB_ORDER.length - 1 && clampedX < 0) clampedX = clampedX * 0.3;
      translateX.value = clampedX;
    })
    .onEnd((event) => {
      'worklet';
      const { translationX: tx, velocityX } = event;
      const shouldSwipe = Math.abs(tx) > SWIPE_THRESHOLD || Math.abs(velocityX) > 800;

      if (shouldSwipe && tx < 0 && currentTabIndex < TAB_ORDER.length - 1) {
        // Swipe left → animate off-screen then navigate
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200, easing: Easing.out(Easing.cubic) }, () => {
          runOnJS(navigateToTab)(currentTabIndex + 1);
        });
      } else if (shouldSwipe && tx > 0 && currentTabIndex > 0) {
        // Swipe right → animate off-screen then navigate
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 200, easing: Easing.out(Easing.cubic) }, () => {
          runOnJS(navigateToTab)(currentTabIndex - 1);
        });
      } else {
        // Bounce back
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    })
    .runOnJS(false);

  const navigateToTab = useCallback((index: number) => {
    if (swipeCooldown.current) return;
    swipeCooldown.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const targetTab = TAB_ORDER[index];
    router.navigate(TAB_ROUTES[targetTab] as any);
    // Reset translateX after navigation
    setTimeout(() => {
      translateX.value = 0;
      swipeCooldown.current = false;
    }, 100);
  }, [currentTabIndex]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={{ flex: 1 }}>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[{ flex: 1 }, animatedContentStyle]}>
          <Tabs
            tabBar={props => <CustomTabBar {...props} />}
            screenOptions={{
              headerShown: false,
            }}
          >
            <Tabs.Screen name="index" options={{ title: 'Alarms' }} />
            <Tabs.Screen name="reminders" options={{ title: 'Reminders' }} />
            <Tabs.Screen name="focus" options={{ title: 'Focus' }} />
            <Tabs.Screen name="blocker" options={{ title: 'Blocker' }} />
            <Tabs.Screen name="stats" options={{ title: 'Stats' }} />
            <Tabs.Screen name="planner" options={{ title: 'Planner' }} />
          </Tabs>
        </Animated.View>
      </GestureDetector>
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
