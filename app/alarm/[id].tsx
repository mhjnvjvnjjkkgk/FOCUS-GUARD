import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Switch,
    Alert,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Colors, Spacing, BorderRadius, Shadows, FeatureColors } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAlarmStore } from '@/store';
import { TimePicker } from '@/components/ui/WheelPicker';

// Dismiss task types
const DISMISS_TASKS = [
    { id: 'none', name: 'Quick Dismiss', icon: '⚡' },
    { id: 'math', name: 'Math Problems', icon: '🧮' },
    { id: 'shake', name: 'Shake Phone', icon: '📳' },
    { id: 'typing', name: 'Typing', icon: '⌨️' },
    { id: 'walk', name: 'Walk Steps', icon: '🚶' },
    { id: 'breathing', name: 'Breathing', icon: '🧘' },
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

export default function EditAlarmScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { id } = useLocalSearchParams<{ id: string }>();

    const alarm = useAlarmStore((state) => state.getAlarm(id || ''));
    const updateAlarm = useAlarmStore((state) => state.updateAlarm);
    const deleteAlarm = useAlarmStore((state) => state.deleteAlarm);

    // Form state - initialized from existing alarm
    const [hour, setHour] = useState(alarm?.time.hour || 7);
    const [minute, setMinute] = useState(alarm?.time.minute || 0);
    const [label, setLabel] = useState(alarm?.label || '');
    const [repeatDays, setRepeatDays] = useState<number[]>(alarm?.repeatDays || [1, 2, 3, 4, 5]);
    const [selectedRingtone, setSelectedRingtone] = useState(
        RINGTONES.find(r => r.id === alarm?.ringtoneId) || RINGTONES[0]
    );
    const [snoozeEnabled, setSnoozeEnabled] = useState(alarm?.snoozeEnabled ?? true);
    const [snoozeDuration, setSnoozeDuration] = useState(alarm?.snoozeDuration || 5);
    const [selectedTask, setSelectedTask] = useState(
        DISMISS_TASKS.find(t => t.id === alarm?.dismissTask?.type) || DISMISS_TASKS[0]
    );
    const [vibrate, setVibrate] = useState(alarm?.vibrate ?? true);
    const [gradualVolume, setGradualVolume] = useState(alarm?.gradualVolume ?? true);

    // Task Specific State
    const [mathDifficulty, setMathDifficulty] = useState<'easy' | 'medium' | 'hard' | 'extreme'>(
        (alarm?.dismissTask?.mathDifficulty as any) || 'medium'
    );
    const [mathCount, setMathCount] = useState(alarm?.dismissTask?.mathCount || 3);

    const [shakeIntensity, setShakeIntensity] = useState<'light' | 'medium' | 'vigorous'>(
        (alarm?.dismissTask?.shakeIntensity as any) || 'medium'
    );
    const [shakeDuration, setShakeDuration] = useState(alarm?.dismissTask?.shakeDuration || 15);

    const [walkSteps, setWalkSteps] = useState(alarm?.dismissTask?.walkSteps || 20);

    const [breathingCycles, setBreathingCycles] = useState(alarm?.dismissTask?.breathingCycles || 3);

    const [typingText, setTypingText] = useState(alarm?.dismissTask?.typingText || '');

    const toggleDay = (dayId: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRepeatDays(prev =>
            prev.includes(dayId)
                ? prev.filter(d => d !== dayId)
                : [...prev, dayId].sort()
        );
    };

    const handleSave = () => {
        if (!id) return;

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        updateAlarm(id, {
            time: { hour, minute },
            label: label || 'Alarm',
            repeatDays,
            ringtoneId: selectedRingtone.id,
            ringtoneName: selectedRingtone.name,
            vibrate,
            gradualVolume,
            snoozeEnabled,
            snoozeDuration,
            dismissTask: {
                type: selectedTask.id as any,
                mathDifficulty: selectedTask.id === 'math' ? mathDifficulty : undefined,
                mathCount: selectedTask.id === 'math' ? mathCount : undefined,
                shakeIntensity: selectedTask.id === 'shake' ? shakeIntensity : undefined,
                shakeDuration: selectedTask.id === 'shake' ? shakeDuration : undefined,
                walkSteps: selectedTask.id === 'walk' ? walkSteps : undefined,
                breathingCycles: selectedTask.id === 'breathing' ? breathingCycles : undefined,
                typingText: selectedTask.id === 'typing' ? typingText : undefined,
            },
        });

        router.back();
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Alarm',
            'Are you sure you want to delete this alarm?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        if (id) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            deleteAlarm(id);
                            router.back();
                        }
                    }
                },
            ]
        );
    };

    if (!alarm) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>Alarm not found</Text>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Edit Alarm',
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
                        placeholder="Alarm name"
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
                </Animated.View>

                {/* Dismiss Task */}
                <Animated.View
                    entering={FadeInDown.delay(300).springify()}
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

                    {/* Task Configuration Settings */}
                    {selectedTask.id !== 'none' && (
                        <View style={styles.taskConfig}>
                            <View style={[styles.divider, { backgroundColor: isDark ? Colors.gray[700] : Colors.gray[200] }]} />

                            {/* Math Config */}
                            {selectedTask.id === 'math' && (
                                <>
                                    <View style={styles.configItem}>
                                        <Text style={[styles.configLabel, isDark && styles.textDark]}>Difficulty</Text>
                                        <View style={styles.segmentedControl}>
                                            {['easy', 'medium', 'hard'].map((d) => (
                                                <Pressable
                                                    key={d}
                                                    style={[styles.segment, mathDifficulty === d && styles.segmentActive]}
                                                    onPress={() => setMathDifficulty(d as any)}
                                                >
                                                    <Text style={[styles.segmentText, mathDifficulty === d && styles.segmentTextActive]}>
                                                        {d.charAt(0).toUpperCase() + d.slice(1)}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>
                                    <View style={styles.configItem}>
                                        <Text style={[styles.configLabel, isDark && styles.textDark]}>Problems: {mathCount}</Text>
                                        <View style={styles.stepper}>
                                            <Pressable style={styles.stepBtn} onPress={() => setMathCount(c => Math.max(1, c - 1))}>
                                                <Ionicons name="remove" size={16} color={Colors.text.primary} />
                                            </Pressable>
                                            <Pressable style={styles.stepBtn} onPress={() => setMathCount(c => Math.min(10, c + 1))}>
                                                <Ionicons name="add" size={16} color={Colors.text.primary} />
                                            </Pressable>
                                        </View>
                                    </View>
                                </>
                            )}
                            {/* Shake Config */}
                            {selectedTask.id === 'shake' && (
                                <>
                                    <View style={styles.configItem}>
                                        <Text style={[styles.configLabel, isDark && styles.textDark]}>Intensity</Text>
                                        <View style={styles.segmentedControl}>
                                            {['light', 'medium', 'vigorous'].map((i) => (
                                                <Pressable
                                                    key={i}
                                                    style={[styles.segment, shakeIntensity === i && styles.segmentActive]}
                                                    onPress={() => setShakeIntensity(i as any)}
                                                >
                                                    <Text style={[styles.segmentText, shakeIntensity === i && styles.segmentTextActive]}>
                                                        {i.charAt(0).toUpperCase() + i.slice(1)}
                                                    </Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </View>
                                    <View style={styles.configItem}>
                                        <Text style={[styles.configLabel, isDark && styles.textDark]}>Duration: {shakeDuration}s</Text>
                                        <View style={styles.stepper}>
                                            <Pressable style={styles.stepBtn} onPress={() => setShakeDuration(s => Math.max(5, s - 5))}>
                                                <Ionicons name="remove" size={16} color={Colors.text.primary} />
                                            </Pressable>
                                            <Pressable style={styles.stepBtn} onPress={() => setShakeDuration(s => Math.min(60, s + 5))}>
                                                <Ionicons name="add" size={16} color={Colors.text.primary} />
                                            </Pressable>
                                        </View>
                                    </View>
                                </>
                            )}
                            {/* Walk Config */}
                            {selectedTask.id === 'walk' && (
                                <View style={styles.configItem}>
                                    <Text style={[styles.configLabel, isDark && styles.textDark]}>Steps: {walkSteps}</Text>
                                    <View style={styles.stepper}>
                                        <Pressable style={styles.stepBtn} onPress={() => setWalkSteps(s => Math.max(10, s - 10))}>
                                            <Ionicons name="remove" size={16} color={Colors.text.primary} />
                                        </Pressable>
                                        <Pressable style={styles.stepBtn} onPress={() => setWalkSteps(s => Math.min(200, s + 10))}>
                                            <Ionicons name="add" size={16} color={Colors.text.primary} />
                                        </Pressable>
                                    </View>
                                </View>
                            )}
                            {/* Breathing Config */}
                            {selectedTask.id === 'breathing' && (
                                <View style={styles.configItem}>
                                    <Text style={[styles.configLabel, isDark && styles.textDark]}>Cycles: {breathingCycles}</Text>
                                    <View style={styles.stepper}>
                                        <Pressable style={styles.stepBtn} onPress={() => setBreathingCycles(c => Math.max(1, c - 1))}>
                                            <Ionicons name="remove" size={16} color={Colors.text.primary} />
                                        </Pressable>
                                        <Pressable style={styles.stepBtn} onPress={() => setBreathingCycles(c => Math.min(10, c + 1))}>
                                            <Ionicons name="add" size={16} color={Colors.text.primary} />
                                        </Pressable>
                                    </View>
                                </View>
                            )}
                            {/* Typing Config */}
                            {selectedTask.id === 'typing' && (
                                <View style={styles.configItem}>
                                    <Text style={[styles.configLabel, isDark && styles.textDark]}>Phrase</Text>
                                    <TextInput
                                        style={[styles.smallInput, isDark && styles.textInputDark]}
                                        placeholder="Random if empty"
                                        placeholderTextColor={Colors.gray[400]}
                                        value={typingText}
                                        onChangeText={setTypingText}
                                    />
                                </View>
                            )}
                        </View>
                    )}
                </Animated.View>

                {/* Delete Button */}
                <Animated.View entering={FadeInDown.delay(350).springify()}>
                    <Pressable style={styles.deleteButton} onPress={handleDelete}>
                        <Ionicons name="trash-outline" size={20} color={Colors.accent.red} />
                        <Text style={styles.deleteButtonText}>Delete Alarm</Text>
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
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
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
    errorText: {
        fontSize: 18,
        color: Colors.text.secondary,
        marginBottom: Spacing[4],
    },
    backButton: {
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[2],
        backgroundColor: Colors.primary[500],
        borderRadius: BorderRadius.lg,
    },
    backButtonText: {
        color: Colors.text.inverse,
        fontWeight: '600',
    },

    // Sections
    section: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing[4],
        marginBottom: Spacing[3],
        ...Shadows.md,
    },
    sectionDark: {
        backgroundColor: Colors.gray[800],
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

    // Delete Button
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.accent.red + '10',
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing[4],
        gap: Spacing[2],
        borderWidth: 1,
        borderColor: Colors.accent.red + '30',
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.accent.red,
    },

    // Task Config
    taskConfig: {
        marginTop: Spacing[4],
    },
    divider: {
        height: 1,
        marginBottom: Spacing[4],
    },
    configItem: {
        marginBottom: Spacing[4],
    },
    configLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: Spacing[2],
    },
    segmentedControl: {
        flexDirection: 'row',
        backgroundColor: Colors.gray[200],
        padding: 2,
        borderRadius: BorderRadius.lg,
    },
    segment: {
        flex: 1,
        paddingVertical: Spacing[2],
        alignItems: 'center',
        borderRadius: BorderRadius.md - 2,
    },
    segmentActive: {
        backgroundColor: '#FFFFFF',
        ...Shadows.sm,
    },
    segmentText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.text.secondary,
    },
    segmentTextActive: {
        color: Colors.text.primary,
        fontWeight: '600',
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[4],
        backgroundColor: Colors.gray[200],
        alignSelf: 'flex-start',
        padding: Spacing[1],
        borderRadius: BorderRadius.lg,
    },
    stepBtn: {
        padding: Spacing[2],
        backgroundColor: '#FFFFFF',
        borderRadius: BorderRadius.md,
        ...Shadows.sm,
    },
    smallInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: Colors.gray[300],
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing[2],
        fontSize: 14,
        color: '#1a1a2e',
    },
});
