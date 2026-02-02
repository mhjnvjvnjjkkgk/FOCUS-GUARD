import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

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
  }, []);

  return (
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
