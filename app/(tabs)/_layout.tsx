import { Tabs, usePathname, router, useSegments } from 'expo-router';
import React, { useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, Dimensions, UIManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, Easing } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { requestNotificationPermissions } from '@/services/AlarmService';
import FloatingFriendsButton from '@/components/FloatingFriendsButton';

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
  // 5 VISIBLE TABS: index (Schedule), focus, battle, social, hub
  // Hidden tabs (reminders, blocker, stats, planner) are accessible via Hub or programmatic nav

  const VISIBLE_TABS = ['index', 'focus', 'battle', 'social', 'hub'];

  const focusedRoute = state.routes[state.index];
  const focusedDescriptor = descriptors[focusedRoute.key];
  const focusedOptions = focusedDescriptor.options;

  // @ts-ignore
  if (focusedOptions.tabBarStyle?.display === 'none') {
    return null;
  }

  // Build visual order from state routes
  const visibleRouteIndices = VISIBLE_TABS.map(name =>
    state.routes.findIndex((r: any) => r.name === name)
  ).filter((i: number) => i >= 0);

  return (
    <View style={styles.tabBarContainer}>
      {visibleRouteIndices.map((routeIndex: number) => {
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
        let activeBg = '#000000';

        if (route.name === 'index') {
          iconName = isFocused ? 'calendar' : 'calendar-outline';
          label = 'SCHEDULE';
        } else if (route.name === 'focus') {
          iconName = isFocused ? 'radio-button-on' : 'radio-button-off';
          label = 'FOCUS';
        } else if (route.name === 'battle') {
          iconName = isFocused ? 'flash' : 'flash-outline';
          label = 'BATTLE';
          activeBg = '#FF4444';
        } else if (route.name === 'social') {
          iconName = isFocused ? 'people' : 'people-outline';
          label = 'SOCIAL';
          activeBg = '#4A9EFF';
        } else if (route.name === 'hub') {
          iconName = isFocused ? 'grid' : 'grid-outline';
          label = 'HUB';
          activeBg = '#FF6B35';
        }

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
  const TAB_ORDER = ['index', 'focus', 'battle', 'social', 'hub'];
  const TAB_ROUTES: Record<string, string> = {
    'index': '/',
    'focus': '/focus',
    'battle': '/battle',
    'social': '/social',
    'hub': '/hub',
  };

  const swipeCooldown = useRef(false);
  const translateX = useSharedValue(0);

  const currentTabName = segments.length > 0 ? segments[segments.length - 1] : 'index';
  const currentTabIndex = TAB_ORDER.indexOf(currentTabName) >= 0 ? TAB_ORDER.indexOf(currentTabName) : 0;

  const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // 25% of screen = commit swipe

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
    }, 150);
  }, []);

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-20, 20])
    .onUpdate((event) => {
      // Follow finger — clamp at edges with rubber-band
      let clampedX = event.translationX;
      if (currentTabIndex === 0 && clampedX > 0) clampedX = clampedX * 0.3;
      if (currentTabIndex === TAB_ORDER.length - 1 && clampedX < 0) clampedX = clampedX * 0.3;
      translateX.value = clampedX;
    })
    .onEnd((event) => {
      const { translationX: tx, velocityX } = event;
      const shouldSwipe = Math.abs(tx) > SWIPE_THRESHOLD || Math.abs(velocityX) > 800;

      if (shouldSwipe && tx < 0 && currentTabIndex < TAB_ORDER.length - 1) {
        // Swipe left → slide off then navigate
        translateX.value = withTiming(-SCREEN_WIDTH, { duration: 180, easing: Easing.out(Easing.cubic) });
        setTimeout(() => navigateToTab(currentTabIndex + 1), 180);
      } else if (shouldSwipe && tx > 0 && currentTabIndex > 0) {
        // Swipe right → slide off then navigate
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 180, easing: Easing.out(Easing.cubic) });
        setTimeout(() => navigateToTab(currentTabIndex - 1), 180);
      } else {
        // Bounce back
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    })
    .runOnJS(true);

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
            <Tabs.Screen name="index" options={{ title: 'Schedule' }} />
            <Tabs.Screen name="focus" options={{ title: 'Focus' }} />
            <Tabs.Screen name="battle" options={{ title: 'Battle' }} />
            <Tabs.Screen name="social" options={{ title: 'Social' }} />
            <Tabs.Screen name="hub" options={{ title: 'Hub' }} />
            {/* Hidden tabs — accessible via Hub cards or programmatic nav */}
            <Tabs.Screen name="reminders" options={{ title: 'Reminders', href: null }} />
            <Tabs.Screen name="blocker" options={{ title: 'Blocker', href: null }} />
            <Tabs.Screen name="stats" options={{ title: 'Stats', href: null }} />
            <Tabs.Screen name="planner" options={{ title: 'Planner', href: null }} />
          </Tabs>
        </Animated.View>
      </GestureDetector>
      <FloatingFriendsButton />
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
    flex: 1, // Equal width for 5 items
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
