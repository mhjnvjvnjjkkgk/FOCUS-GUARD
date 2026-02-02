import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { useAlarmStore, Alarm } from '@/store/alarmStore';

// NEO-BRUTALIST CONSTANTS
const NEO_BLACK = '#000000';
const NEO_WHITE = '#FFFFFF';
const NEO_ORANGE = '#FF5500';
const NEO_GREEN = '#228B22';
const NEO_PURPLE = '#9370DB';
const NEO_YELLOW = '#FFD700';
const NEO_GRAY = '#888888';

// Day abbreviations
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Format time
function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const paddedHour = displayHour.toString().padStart(2, '0');
  const paddedMinute = minute.toString().padStart(2, '0');
  return `${paddedHour}:${paddedMinute} ${period}`;
}

// Calculate time until alarm
function getTimeUntilAlarm(alarm: Alarm): string {
  if (!alarm.enabled) return 'Disabled';

  const now = new Date();
  const alarmTime = new Date();
  alarmTime.setHours(alarm.time.hour, alarm.time.minute, 0, 0);

  if (alarmTime <= now) {
    alarmTime.setDate(alarmTime.getDate() + 1);
  }

  // Handle repeat days
  if (alarm.repeatDays.length > 0) {
    while (!alarm.repeatDays.includes(alarmTime.getDay())) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }
  }

  const diff = alarmTime.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `In ${hours}h ${minutes.toString().padStart(2, '0')}m`;
  }
  return `In ${minutes}m`;
}

// Get task badge text
function getTaskBadgeText(type: string): string {
  switch (type) {
    case 'math': return 'MATH TASK';
    case 'shake': return 'SHAKE TASK';
    case 'typing': return 'TYPING TASK';
    case 'walk': return 'WALK TASK';
    case 'breathing': return 'BREATHING TASK';
    default: return 'QUICK DISMISS';
  }
}

// ============================================
// NEO ALARM CARD
// ============================================

interface NeoAlarmCardProps {
  alarm: Alarm;
  index: number;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function NeoAlarmCard({ alarm, index, onToggle, onEdit, onDelete }: NeoAlarmCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const handleLongPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Alarm',
      'Are you sure you want to delete this alarm?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      style={[styles.alarmCardWrapper, animatedStyle]}
    >
      <Pressable
        onPress={onEdit}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        style={styles.alarmCard}
      >
        {/* Orange accent strip */}
        <View style={styles.alarmAccent} />

        {/* Main content */}
        <View style={styles.alarmContent}>
          {/* Time display */}
          <Text style={styles.alarmTime}>
            {formatTime(alarm.time.hour, alarm.time.minute)}
          </Text>

          {/* Next alarm text */}
          <Text style={[
            styles.alarmNext,
            !alarm.enabled && { color: NEO_GRAY }
          ]}>
            {getTimeUntilAlarm(alarm)}
          </Text>

          {/* Label if exists */}
          {alarm.label && (
            <Text style={styles.alarmLabel} numberOfLines={1}>
              {alarm.label}
            </Text>
          )}

          {/* Repeat days */}
          <View style={styles.dayBadges}>
            {DAYS.map((day, i) => (
              <View
                key={i}
                style={[
                  styles.dayBadge,
                  alarm.repeatDays.includes(i) && styles.dayBadgeActive,
                ]}
              >
                <Text style={[
                  styles.dayBadgeText,
                  alarm.repeatDays.includes(i) && styles.dayBadgeTextActive,
                ]}>
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {/* Task badge */}
          <View style={styles.taskBadge}>
            <Text style={styles.taskBadgeText}>
              {getTaskBadgeText(alarm.dismissTask.type)}
            </Text>
          </View>
        </View>

        {/* Toggle switch */}
        <View style={styles.toggleContainer}>
          <Switch
            value={alarm.enabled}
            onValueChange={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onToggle();
            }}
            trackColor={{ false: NEO_GRAY, true: NEO_ORANGE }}
            thumbColor={NEO_WHITE}
            ios_backgroundColor={NEO_GRAY}
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============================================
// MAIN ALARMS SCREEN
// ============================================

export default function AlarmsScreen() {
  const alarms = useAlarmStore(state => state.alarms);
  const toggleAlarm = useAlarmStore(state => state.toggleAlarm);
  const deleteAlarm = useAlarmStore(state => state.deleteAlarm);
  const getActiveAlarms = useAlarmStore(state => state.getActiveAlarms);
  const getNextAlarm = useAlarmStore(state => state.getNextAlarm);

  // Stats
  const activeCount = getActiveAlarms().length;
  const totalCount = alarms.length;
  const nextAlarm = getNextAlarm();

  const handleCreateAlarm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/alarm/create');
  };

  const handleEditAlarm = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: '/alarm/create', params: { id } });
  };

  const handleDeleteAlarm = (id: string) => {
    deleteAlarm(id);
  };

  const handleToggleAlarm = (id: string) => {
    toggleAlarm(id);
  };

  const nextAlarmTime = nextAlarm ? getTimeUntilAlarm(nextAlarm) : '--';

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* FOCUSGUARD LOGO */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBox}>
            <Text style={styles.logoFG}>FG</Text>
          </View>
          <View style={styles.logoTextColumn}>
            <Text style={styles.logoText}>FOCUSGUARD</Text>
            <View style={styles.logoTag}>
              <Text style={styles.logoTagText}>⏰ ALARM</Text>
            </View>
          </View>
        </View>

        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ALARM</Text>
          <View style={styles.headerAccent} />
        </View>

        {/* STATS CARD */}
        <View style={styles.statsCard}>
          <View style={[styles.statBox, { backgroundColor: NEO_ORANGE }]}>
            <Text style={styles.statLabel}>ACTIVE</Text>
            <Text style={styles.statValue}>
              {activeCount.toString().padStart(2, '0')}
            </Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: NEO_GREEN }]}>
            <Text style={styles.statLabel}>NEXT</Text>
            <Text style={styles.statValue}>
              {nextAlarmTime === 'Disabled' || nextAlarmTime === '--'
                ? '--'
                : nextAlarmTime.replace('In ', '')}
            </Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: NEO_PURPLE }]}>
            <Text style={styles.statLabel}>TOTAL</Text>
            <Text style={styles.statValue}>
              {totalCount.toString().padStart(2, '0')}
            </Text>
          </View>
        </View>

        {/* INSTRUCTION STRIP */}
        <View style={styles.instructionStrip}>
          <Text style={styles.instructionText}>
            YOUR ALARMS // TAP TO EDIT // LONG PRESS TO DELETE
          </Text>
        </View>

        {/* ALARMS LIST */}
        {alarms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>⏰</Text>
            <Text style={styles.emptyTitle}>NO ALARMS YET</Text>
            <Text style={styles.emptyText}>
              Tap the + button to create your first alarm
            </Text>
          </View>
        ) : (
          alarms.map((alarm, index) => (
            <NeoAlarmCard
              key={alarm.id}
              alarm={alarm}
              index={index}
              onToggle={() => handleToggleAlarm(alarm.id)}
              onEdit={() => handleEditAlarm(alarm.id)}
              onDelete={() => handleDeleteAlarm(alarm.id)}
            />
          ))
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={handleCreateAlarm}
        style={({ pressed }) => [
          styles.fab,
          pressed && {
            transform: [{ scale: 0.95 }, { translateY: 4 }, { translateX: 4 }],
            shadowOpacity: 0,
          }
        ]}
      >
        <Ionicons name="add" size={36} color={NEO_BLACK} />
      </Pressable>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 60,
  },

  // PROFILE ICON
  profileIcon: {
    position: 'absolute',
    top: 8,
    left: 16,
    zIndex: 1000,
  },
  profileIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NEO_WHITE,
    borderWidth: 3,
    borderColor: NEO_BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: NEO_BLACK,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },

  // LOGO
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
    gap: 12,
  },
  logoBox: {
    width: 48,
    height: 48,
    backgroundColor: NEO_WHITE,
    borderWidth: 4,
    borderColor: NEO_BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: NEO_BLACK,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  logoFG: {
    fontSize: 20,
    fontWeight: '900',
    color: NEO_BLACK,
    letterSpacing: -1,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: NEO_BLACK,
    letterSpacing: 2,
  },
  logoTextColumn: {
    flex: 1,
  },
  logoTag: {
    backgroundColor: NEO_WHITE,
    borderWidth: 2,
    borderColor: NEO_BLACK,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  logoTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: NEO_BLACK,
    letterSpacing: 1,
  },

  // HEADER
  header: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: NEO_WHITE,
    borderWidth: 4,
    borderColor: NEO_BLACK,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: NEO_BLACK,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    paddingVertical: 16,
    letterSpacing: 2,
  },
  headerAccent: {
    height: 8,
    backgroundColor: NEO_ORANGE,
  },

  // STATS CARD
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
    backgroundColor: NEO_WHITE,
    borderWidth: 4,
    borderColor: NEO_BLACK,
    borderRadius: 12,
    padding: 12,
    shadowColor: NEO_BLACK,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  statBox: {
    flex: 1,
    borderWidth: 4,
    borderColor: NEO_BLACK,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: NEO_BLACK,
    marginBottom: 4,
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: NEO_BLACK,
  },

  // INSTRUCTION STRIP
  instructionStrip: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: NEO_YELLOW,
    borderWidth: 4,
    borderColor: NEO_BLACK,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: NEO_BLACK,
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  instructionText: {
    fontSize: 11,
    fontWeight: '900',
    color: NEO_BLACK,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // SCROLL VIEW
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  // ALARM CARD
  alarmCardWrapper: {
    marginBottom: 16,
  },
  alarmCard: {
    backgroundColor: NEO_WHITE,
    borderWidth: 4,
    borderColor: NEO_BLACK,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: NEO_BLACK,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  alarmAccent: {
    width: 8,
    backgroundColor: NEO_ORANGE,
  },
  alarmContent: {
    flex: 1,
    padding: 16,
  },
  alarmTime: {
    fontSize: 32,
    fontWeight: '900',
    color: NEO_BLACK,
    letterSpacing: -1,
  },
  alarmNext: {
    fontSize: 16,
    fontWeight: '700',
    color: NEO_ORANGE,
    marginTop: 4,
  },
  alarmLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: NEO_GRAY,
    marginTop: 8,
  },
  dayBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  dayBadge: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: NEO_BLACK,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NEO_WHITE,
  },
  dayBadgeActive: {
    backgroundColor: NEO_ORANGE,
  },
  dayBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: NEO_GRAY,
  },
  dayBadgeTextActive: {
    color: NEO_BLACK,
  },
  taskBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 3,
    borderColor: NEO_BLACK,
    backgroundColor: NEO_WHITE,
  },
  taskBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: NEO_BLACK,
    letterSpacing: 0.5,
  },
  toggleContainer: {
    justifyContent: 'center',
    paddingRight: 16,
  },

  // EMPTY STATE
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: NEO_BLACK,
    marginBottom: 8,
    letterSpacing: 1,
  },
  emptyText: {
    fontSize: 14,
    color: NEO_GRAY,
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: NEO_ORANGE,
    borderWidth: 4,
    borderColor: NEO_BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: NEO_BLACK,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 10,
  },
});
