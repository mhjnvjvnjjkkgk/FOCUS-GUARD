import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Switch,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';

import { Colors, Spacing, BorderRadius, Shadows, Animations, FeatureColors } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAlarmStore } from '@/store';
import { TimePicker } from '@/components/ui/WheelPicker';

// Dismiss task types
const DISMISS_TASKS = [
    { id: 'none', name: 'Quick Dismiss', icon: '⚡', description: 'Just tap to dismiss' },
    { id: 'math', name: 'Math Problems', icon: '🧮', description: 'Solve math to wake up' },
    { id: 'shake', name: 'Shake Phone', icon: '📳', description: 'Shake vigorously' },
    { id: 'typing', name: 'Typing', icon: '⌨️', description: 'Type a phrase' },
    { id: 'walk', name: 'Walk Steps', icon: '🚶', description: 'Walk to dismiss' },
    { id: 'breathing', name: 'Breathing', icon: '🧘', description: 'Breathing exercise' },
];

// Days of week
const DAYS = [
    { id: 0, short: 'S', full: 'Sun' },
    { id: 1, short: 'M', full: 'Mon' },
    { id: 2, short: 'T', full: 'Tue' },
    { id: 3, short: 'W', full: 'Wed' },
    { id: 4, short: 'T', full: 'Thu' },
    { id: 5, short: 'F', full: 'Fri' },
    { id: 6, short: 'S', full: 'Sat' },
];

// Ringtones
const RINGTONES = [
    { id: 'gentle', name: 'Gentle Sunrise', icon: '🌅' },
    { id: 'digital', name: 'Digital Beep', icon: '📢' },
    { id: 'radar', name: 'Radar Ping', icon: '📡' },
    { id: 'phoenix', name: 'Phoenix Rise', icon: '🔥' },
    { id: 'zen', name: 'Zen Garden', icon: '🧘' },
];

export default function CreateAlarmScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const addAlarm = useAlarmStore((state) => state.addAlarm);

    // Form state
    const [hour, setHour] = useState(7);
    const [minute, setMinute] = useState(0);
    const [label, setLabel] = useState('');
    const [repeatDays, setRepeatDays] = useState<number[]>([1, 2, 3, 4, 5]);
    const [selectedRingtone, setSelectedRingtone] = useState(RINGTONES[0]);
    const [snoozeEnabled, setSnoozeEnabled] = useState(true);
    const [snoozeDuration, setSnoozeDuration] = useState(5);
    const [selectedTask, setSelectedTask] = useState(DISMISS_TASKS[1]);
    const [vibrate, setVibrate] = useState(true);
    const [gradualVolume, setGradualVolume] = useState(true);

    // Task configuration
    const [mathDifficulty, setMathDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme'>('medium');
    const [mathCount, setMathCount] = useState(3);

    const toggleDay = (dayId: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRepeatDays(prev =>
            prev.includes(dayId)
                ? prev.filter(d => d !== dayId)
                : [...prev, dayId].sort()
        );
    };

    const handleSave = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Create the alarm object and save to store
        addAlarm({
            time: { hour, minute },
            label: label || 'Alarm',
            repeatDays,
            enabled: true,
            ringtoneId: selectedRingtone.id,
            ringtoneName: selectedRingtone.name,
            volume: 80,
            vibrate,
            gradualVolume,
            snoozeEnabled,
            snoozeDuration,
            snoozeLimit: 3,
            snoozesUsed: 0,
            dismissTask: {
                type: selectedTask.id as any,
                mathDifficulty: selectedTask.id === 'math' ? mathDifficulty : undefined,
                mathCount: selectedTask.id === 'math' ? mathCount : undefined,
            },
        });

        router.back();
    };

    // Format time for display
    const formatTime = () => {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'New Alarm',
                    headerStyle: { backgroundColor: isDark ? Colors.gray[900] : Colors.background.primary },
                    headerTintColor: isDark ? Colors.text.inverse : Colors.text.primary,
                    headerRight: () => (
                        <Pressable onPress={handleSave} style={styles.saveButton}>
                            <Text style={styles.saveButtonText}>Save</Text>
                        </Pressable>
                    ),
                }}
            />

            <ScrollView
                style={[styles.container, isDark && styles.containerDark]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Time Picker */}
                <Animated.View
                    entering={FadeInUp.delay(100).springify()}
                    style={[styles.section, isDark && styles.sectionDark]}
                >
                    <Text style={[styles.sectionLabel, isDark && styles.textSecondaryDark]}>Time</Text>
                    <TimePicker
                        hours={hour}
                        minutes={minute}
                        onHoursChange={setHour}
                        onMinutesChange={setMinute}
                        use24Hour={false}
                    />
                </Animated.View>

                {/* Label Input */}
                <Animated.View
                    entering={FadeInDown.delay(150).springify()}
                    style={[styles.section, isDark && styles.sectionDark]}
                >
                    <Text style={[styles.sectionLabel, isDark && styles.textSecondaryDark]}>Label</Text>
                    <TextInput
                        style={[styles.textInput, isDark && styles.textInputDark]}
                        placeholder="Alarm name (optional)"
                        placeholderTextColor={Colors.gray[400]}
                        value={label}
                        onChangeText={setLabel}
                    />
                </Animated.View>

                {/* Repeat Days */}
                <Animated.View
                    entering={FadeInDown.delay(200).springify()}
                    style={[styles.section, isDark && styles.sectionDark]}
                >
                    <Text style={[styles.sectionLabel, isDark && styles.textSecondaryDark]}>Repeat</Text>
                    <View style={styles.daysRow}>
                        {DAYS.map(day => (
                            <Pressable
                                key={day.id}
                                style={[
                                    styles.dayButton,
                                    repeatDays.includes(day.id) && styles.dayButtonActive,
                                ]}
                                onPress={() => toggleDay(day.id)}
                            >
                                <Text style={[
                                    styles.dayButtonText,
                                    repeatDays.includes(day.id) && styles.dayButtonTextActive,
                                ]}>
                                    {day.short}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                    <Text style={styles.repeatSummary}>
                        {repeatDays.length === 7 ? 'Every day' :
                            repeatDays.length === 0 ? 'One time only' :
                                repeatDays.map(d => DAYS[d].full).join(', ')}
                    </Text>
                </Animated.View>

                {/* Sound */}
                <Animated.View
                    entering={FadeInDown.delay(250).springify()}
                    style={[styles.section, isDark && styles.sectionDark]}
                >
                    <Text style={[styles.sectionLabel, isDark && styles.textSecondaryDark]}>Sound</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.ringtonesRow}
                    >
                        {RINGTONES.map(ringtone => (
                            <Pressable
                                key={ringtone.id}
                                style={[
                                    styles.ringtoneChip,
                                    selectedRingtone.id === ringtone.id && styles.ringtoneChipActive,
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedRingtone(ringtone);
                                }}
                            >
                                <Text style={styles.ringtoneIcon}>{ringtone.icon}</Text>
                                <Text style={[
                                    styles.ringtoneName,
                                    selectedRingtone.id === ringtone.id && styles.ringtoneNameActive,
                                ]}>
                                    {ringtone.name}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    <View style={styles.optionRow}>
                        <View style={styles.optionInfo}>
                            <Ionicons name="phone-portrait" size={20} color={Colors.gray[600]} />
                            <Text style={[styles.optionLabel, isDark && styles.textDark]}>Vibrate</Text>
                        </View>
                        <Switch
                            value={vibrate}
                            onValueChange={setVibrate}
                            trackColor={{ false: Colors.gray[300], true: FeatureColors.alarm.primary + '60' }}
                            thumbColor={vibrate ? FeatureColors.alarm.primary : Colors.gray[100]}
                        />
                    </View>

                    <View style={styles.optionRow}>
                        <View style={styles.optionInfo}>
                            <Ionicons name="volume-low" size={20} color={Colors.gray[600]} />
                            <Text style={[styles.optionLabel, isDark && styles.textDark]}>Gradual Volume</Text>
                        </View>
                        <Switch
                            value={gradualVolume}
                            onValueChange={setGradualVolume}
                            trackColor={{ false: Colors.gray[300], true: FeatureColors.alarm.primary + '60' }}
                            thumbColor={gradualVolume ? FeatureColors.alarm.primary : Colors.gray[100]}
                        />
                    </View>
                </Animated.View>

                {/* Snooze */}
                <Animated.View
                    entering={FadeInDown.delay(300).springify()}
                    style={[styles.section, isDark && styles.sectionDark]}
                >
                    <View style={styles.optionRow}>
                        <View style={styles.optionInfo}>
                            <Ionicons name="alarm" size={20} color={Colors.gray[600]} />
                            <Text style={[styles.optionLabel, isDark && styles.textDark]}>Snooze</Text>
                        </View>
                        <Switch
                            value={snoozeEnabled}
                            onValueChange={setSnoozeEnabled}
                            trackColor={{ false: Colors.gray[300], true: FeatureColors.alarm.primary + '60' }}
                            thumbColor={snoozeEnabled ? FeatureColors.alarm.primary : Colors.gray[100]}
                        />
                    </View>

                    {snoozeEnabled && (
                        <View style={styles.snoozeOptions}>
                            <Text style={styles.snoozeLabel}>Duration:</Text>
                            {[1, 5, 10, 15, 20].map(mins => (
                                <Pressable
                                    key={mins}
                                    style={[
                                        styles.snoozeChip,
                                        snoozeDuration === mins && styles.snoozeChipActive,
                                    ]}
                                    onPress={() => setSnoozeDuration(mins)}
                                >
                                    <Text style={[
                                        styles.snoozeChipText,
                                        snoozeDuration === mins && styles.snoozeChipTextActive,
                                    ]}>
                                        {mins}m
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </Animated.View>

                {/* Dismiss Task */}
                <Animated.View
                    entering={FadeInDown.delay(350).springify()}
                    style={[styles.section, isDark && styles.sectionDark]}
                >
                    <Text style={[styles.sectionLabel, isDark && styles.textSecondaryDark]}>Dismiss Task</Text>
                    <View style={styles.tasksGrid}>
                        {DISMISS_TASKS.map(task => (
                            <Pressable
                                key={task.id}
                                style={[
                                    styles.taskCard,
                                    selectedTask.id === task.id && styles.taskCardActive,
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    setSelectedTask(task);
                                }}
                            >
                                <Text style={styles.taskIcon}>{task.icon}</Text>
                                <Text style={[styles.taskName, selectedTask.id === task.id && styles.taskNameActive]}>
                                    {task.name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </Animated.View>

                {/* Math Config */}
                {selectedTask.id === 'math' && (
                    <Animated.View
                        entering={FadeInDown.springify()}
                        style={[styles.section, isDark && styles.sectionDark]}
                    >
                        <Text style={[styles.sectionLabel, isDark && styles.textSecondaryDark]}>Math Settings</Text>

                        <Text style={styles.configLabel}>Difficulty:</Text>
                        <View style={styles.configRow}>
                            {(['easy', 'medium', 'hard', 'extreme'] as const).map(diff => (
                                <Pressable
                                    key={diff}
                                    style={[styles.configChip, mathDifficulty === diff && styles.configChipActive]}
                                    onPress={() => setMathDifficulty(diff)}
                                >
                                    <Text style={[styles.configChipText, mathDifficulty === diff && styles.configChipTextActive]}>
                                        {diff.charAt(0).toUpperCase() + diff.slice(1)}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={styles.configLabel}>Problems:</Text>
                        <View style={styles.configRow}>
                            {[1, 3, 5, 10].map(count => (
                                <Pressable
                                    key={count}
                                    style={[styles.configChip, mathCount === count && styles.configChipActive]}
                                    onPress={() => setMathCount(count)}
                                >
                                    <Text style={[styles.configChipText, mathCount === count && styles.configChipTextActive]}>
                                        {count}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </Animated.View>
                )}

                {/* Save Button */}
                <Animated.View entering={FadeInDown.delay(400).springify()}>
                    <Pressable style={styles.saveButtonLarge} onPress={handleSave}>
                        <Ionicons name="checkmark-circle" size={24} color={Colors.text.inverse} />
                        <Text style={styles.saveButtonLargeText}>Save Alarm</Text>
                    </Pressable>
                </Animated.View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.secondary,
    },
    containerDark: {
        backgroundColor: Colors.gray[900],
    },
    scrollContent: {
        padding: Spacing[4],
    },
    saveButton: {
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing[1],
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: FeatureColors.alarm.primary,
    },

    // Sections - Premium
    section: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius['2xl'],
        padding: Spacing[5],
        marginBottom: Spacing[4],
        ...Shadows.lg,
    },
    sectionDark: {
        backgroundColor: '#1a1a2e',
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text.secondary,
        marginBottom: Spacing[3],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Text Input
    textInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        borderColor: Colors.gray[300],
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[4],
        fontSize: 18,
        fontWeight: '500',
        color: '#1a1a2e',
    },
    textInputDark: {
        backgroundColor: '#2a2a3e',
        borderColor: Colors.gray[500],
        color: '#FFFFFF',
    },

    // Days
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing[2],
    },
    dayButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.gray[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayButtonActive: {
        backgroundColor: FeatureColors.alarm.primary,
    },
    dayButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.secondary,
    },
    dayButtonTextActive: {
        color: Colors.text.inverse,
    },
    repeatSummary: {
        fontSize: 13,
        color: Colors.text.secondary,
        textAlign: 'center',
    },

    // Ringtones
    ringtonesRow: {
        gap: Spacing[2],
        marginBottom: Spacing[3],
    },
    ringtoneChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing[2],
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray[100],
        gap: Spacing[2],
    },
    ringtoneChipActive: {
        backgroundColor: FeatureColors.alarm.primary,
    },
    ringtoneIcon: {
        fontSize: 16,
    },
    ringtoneName: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.text.secondary,
    },
    ringtoneNameActive: {
        color: Colors.text.inverse,
    },

    // Options
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing[2],
    },
    optionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[2],
    },
    optionLabel: {
        fontSize: 15,
        color: Colors.text.primary,
    },
    textDark: {
        color: Colors.text.inverse,
    },
    textSecondaryDark: {
        color: Colors.gray[400],
    },

    // Snooze
    snoozeOptions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[2],
        marginTop: Spacing[2],
    },
    snoozeLabel: {
        fontSize: 13,
        color: Colors.text.secondary,
    },
    snoozeChip: {
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing[1],
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray[100],
    },
    snoozeChipActive: {
        backgroundColor: FeatureColors.alarm.primary,
    },
    snoozeChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.text.secondary,
    },
    snoozeChipTextActive: {
        color: Colors.text.inverse,
    },

    // Tasks
    tasksGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing[2],
    },
    taskCard: {
        width: '31%',
        backgroundColor: Colors.gray[100],
        borderRadius: BorderRadius.lg,
        padding: Spacing[3],
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    taskCardActive: {
        borderColor: FeatureColors.alarm.primary,
        backgroundColor: FeatureColors.alarm.light,
    },
    taskIcon: {
        fontSize: 24,
        marginBottom: Spacing[1],
    },
    taskName: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.text.primary,
        textAlign: 'center',
    },
    taskNameActive: {
        color: FeatureColors.alarm.primary,
    },

    // Config
    configLabel: {
        fontSize: 13,
        color: Colors.text.secondary,
        marginBottom: Spacing[2],
        marginTop: Spacing[2],
    },
    configRow: {
        flexDirection: 'row',
        gap: Spacing[2],
    },
    configChip: {
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing[2],
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.gray[100],
    },
    configChipActive: {
        backgroundColor: FeatureColors.alarm.primary,
    },
    configChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.text.secondary,
    },
    configChipTextActive: {
        color: Colors.text.inverse,
    },

    // Save Button Large
    saveButtonLarge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: FeatureColors.alarm.primary,
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing[4],
        gap: Spacing[2],
        ...Shadows.lg,
    },
    saveButtonLargeText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text.inverse,
    },
});
