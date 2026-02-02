import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAlarmStore } from '@/store/alarmStore';

// Neobrutalist Design System
const NEO = {
    colors: {
        white: '#FFFFFF',
        black: '#000000',
        cyan: '#00FFFF',
        orange: '#FF5500',
        grey: '#C0C0C0',
        darkGrey: '#666666',
    },
    border: 4,
    shadow: 6,
};

// Days reference
const DAYS = [
    { id: 0, label: 'S' },
    { id: 1, label: 'M' },
    { id: 2, label: 'T' },
    { id: 3, label: 'W' },
    { id: 4, label: 'T' },
    { id: 5, label: 'F' },
    { id: 6, label: 'S' },
];

export default function CreateAlarmScreen() {
    const { addAlarm } = useAlarmStore();

    // Form state
    const [label, setLabel] = useState('');

    // Time state (24-hour internally)
    const [hour, setHour] = useState(7);
    const [minute, setMinute] = useState(30);
    const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

    // Repeat days
    const [repeatDays, setRepeatDays] = useState<number[]>([1, 2, 3, 4, 5]); // Weekdays default

    // Sound & Vibration
    const [ringtone, setRingtone] = useState('classic');
    const [volume, setVolume] = useState(80);
    const [gradualVolume, setGradualVolume] = useState(true);
    const [vibrate, setVibrate] = useState(true);

    // Snooze
    const [snoozeEnabled, setSnoozeEnabled] = useState(true);
    const [snoozeDuration, setSnoozeDuration] = useState(5);
    const [snoozeLimit, setSnoozeLimit] = useState(3);

    // Dismissal challenge
    const [challengeType, setChallengeType] = useState('math');
    const [difficulty, setDifficulty] = useState('medium');
    const [problemCount, setProblemCount] = useState(3);

    // Convert 12h to 24h
    const to24H = (hour12: number, period: 'AM' | 'PM') => {
        if (period === 'AM') {
            return hour12 === 12 ? 0 : hour12;
        } else {
            return hour12 === 12 ? 12 : hour12 + 12;
        }
    };

    // Convert 24h to 12h
    const to12H = (hour24: number) => {
        if (hour24 === 0) return 12;
        if (hour24 > 12) return hour24 - 12;
        return hour24;
    };

    // Get display hour
    const displayHour = to12H(hour);

    // Handle hour increment/decrement
    const adjustHour = (delta: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        let newDisplay = displayHour + delta;
        if (newDisplay > 12) newDisplay = 1;
        if (newDisplay < 1) newDisplay = 12;
        setHour(to24H(newDisplay, period));
    };

    // Handle minute increment/decrement
    const adjustMinute = (delta: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        let newMin = minute + delta;
        if (newMin > 59) newMin = 0;
        if (newMin < 0) newMin = 59;
        setMinute(newMin);
    };

    // Toggle period
    const togglePeriod = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newPeriod = period === 'AM' ? 'PM' : 'AM';
        setPeriod(newPeriod);
        setHour(to24H(displayHour, newPeriod));
    };

    // Toggle day
    const toggleDay = (dayId: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (repeatDays.includes(dayId)) {
            setRepeatDays(repeatDays.filter(d => d !== dayId));
        } else {
            setRepeatDays([...repeatDays, dayId].sort());
        }
    };

    // Create alarm
    const handleCreate = () => {
        if (!label.trim()) {
            Alert.alert('Missing Label', 'Please enter a label for this alarm');
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        addAlarm({
            time: { hour, minute },
            label: label.trim(),
            repeatDays,
            enabled: true,
            sound: ringtone,
            vibrate,
            snoozeEnabled,
            snoozeDuration,
            maxSnoozes: snoozeLimit,
            dismissTasks: challengeType === 'none' ? [] : [{
                id: challengeType,
                type: challengeType as any,
                difficulty: difficulty as any,
                count: problemCount,
            }],
        });

        router.back();
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.closeBtn}>
                        <Text style={styles.closeText}>✕</Text>
                    </Pressable>
                    <Text style={styles.headerTitle}>ADD ALARM</Text>
                </View>

                {/* Name Input */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>NAME</Text>
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputIcon}>📄</Text>
                        <TextInput
                            style={styles.input}
                            value={label}
                            onChangeText={setLabel}
                            placeholder="e.g. Morning Workout"
                            placeholderTextColor={NEO.colors.darkGrey}
                        />
                    </View>
                </View>

                {/* Time Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>TIME</Text>

                    {/* Time Display */}
                    <View style={styles.timeDisplay}>
                        <Text style={styles.timeDisplayText}>
                            {displayHour.toString().padStart(2, '0')}:{minute.toString().padStart(2, '0')} {period}
                        </Text>
                    </View>

                    {/* Time Pickers */}
                    <View style={styles.timePickerRow}>
                        <Text style={styles.timeLabel}>START</Text>
                    </View>
                    <View style={styles.pickerContainer}>
                        {/* Hour Picker */}
                        <View style={styles.picker}>
                            <Pressable onPress={() => adjustHour(1)} style={styles.pickerBtn}>
                                <Ionicons name="caret-up" size={20} color="black" />
                            </Pressable>
                            <View style={styles.pickerValue}>
                                <Text style={styles.pickerValueText}>{displayHour.toString().padStart(2, '0')}</Text>
                            </View>
                            <Pressable onPress={() => adjustHour(-1)} style={styles.pickerBtn}>
                                <Ionicons name="caret-down" size={20} color="black" />
                            </Pressable>
                        </View>

                        <Text style={styles.colon}>:</Text>

                        {/* Minute Picker */}
                        <View style={styles.picker}>
                            <Pressable onPress={() => adjustMinute(1)} style={styles.pickerBtn}>
                                <Ionicons name="caret-up" size={20} color="black" />
                            </Pressable>
                            <View style={styles.pickerValue}>
                                <Text style={styles.pickerValueText}>{minute.toString().padStart(2, '0')}</Text>
                            </View>
                            <Pressable onPress={() => adjustMinute(-1)} style={styles.pickerBtn}>
                                <Ionicons name="caret-down" size={20} color="black" />
                            </Pressable>
                        </View>

                        {/* Period Toggle */}
                        <Pressable onPress={togglePeriod} style={styles.periodToggle}>
                            <Text style={[styles.periodText, period === 'AM' && styles.periodActive]}>AM</Text>
                            <View style={styles.periodDivider} />
                            <Text style={[styles.periodText, period === 'PM' && styles.periodActive]}>PM</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Repeat Days */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>REPEAT</Text>
                    <View style={styles.daysRow}>
                        {DAYS.map(day => {
                            const isActive = repeatDays.includes(day.id);
                            return (
                                <Pressable
                                    key={day.id}
                                    onPress={() => toggleDay(day.id)}
                                    style={[styles.dayBtn, isActive && styles.dayBtnActive]}
                                >
                                    <Text style={[styles.dayBtnText, isActive && styles.dayBtnTextActive]}>
                                        {day.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>

                {/* Sound & Vibration */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>SOUND & VIBRATION</Text>

                    <Pressable style={styles.dropdown}>
                        <Text style={styles.dropdownIcon}>🔔</Text>
                        <Text style={styles.dropdownText}>Classic Alarm</Text>
                        <Ionicons name="chevron-down" size={16} color="black" />
                    </Pressable>

                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Vibrate</Text>
                        <Switch
                            value={vibrate}
                            onValueChange={setVibrate}
                            trackColor={{ false: NEO.colors.grey, true: NEO.colors.orange }}
                            thumbColor={NEO.colors.white}
                        />
                    </View>

                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Gradual Volume</Text>
                        <Switch
                            value={gradualVolume}
                            onValueChange={setGradualVolume}
                            trackColor={{ false: NEO.colors.grey, true: NEO.colors.orange }}
                            thumbColor={NEO.colors.white}
                        />
                    </View>
                </View>

                {/* Snooze Options */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>SNOOZE OPTIONS</Text>

                    <View style={styles.toggleRow}>
                        <Text style={styles.toggleLabel}>Snooze Enabled</Text>
                        <Switch
                            value={snoozeEnabled}
                            onValueChange={setSnoozeEnabled}
                            trackColor={{ false: NEO.colors.grey, true: NEO.colors.orange }}
                            thumbColor={NEO.colors.white}
                        />
                    </View>

                    {snoozeEnabled && (
                        <>
                            <Pressable style={styles.dropdown}>
                                <Text style={styles.dropdownIcon}>⏳</Text>
                                <Text style={styles.dropdownText}>{snoozeDuration} min</Text>
                                <Ionicons name="chevron-down" size={16} color="black" />
                            </Pressable>

                            <View style={styles.stepper}>
                                <Pressable
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSnoozeLimit(Math.max(1, snoozeLimit - 1));
                                    }}
                                    style={styles.stepperBtn}
                                >
                                    <Text style={styles.stepperBtnText}>−</Text>
                                </Pressable>
                                <View style={styles.stepperValue}>
                                    <Text style={styles.stepperValueText}>{snoozeLimit} snoozes max</Text>
                                </View>
                                <Pressable
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setSnoozeLimit(Math.min(10, snoozeLimit + 1));
                                    }}
                                    style={styles.stepperBtn}
                                >
                                    <Text style={styles.stepperBtnText}>+</Text>
                                </Pressable>
                            </View>
                        </>
                    )}
                </View>

                {/* Dismissal Challenge */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>DISMISSAL CHALLENGE</Text>

                    <Pressable style={styles.dropdown}>
                        <Text style={styles.dropdownIcon}>🧮</Text>
                        <Text style={styles.dropdownText}>Math</Text>
                        <Ionicons name="chevron-down" size={16} color="black" />
                    </Pressable>

                    <Text style={styles.subsectionLabel}>MATH TASK SETTINGS</Text>

                    <Pressable style={styles.dropdown}>
                        <Text style={styles.dropdownText}>Difficulty: {difficulty}</Text>
                        <Ionicons name="chevron-down" size={16} color="black" />
                    </Pressable>

                    <View style={styles.stepper}>
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setProblemCount(Math.max(1, problemCount - 1));
                            }}
                            style={styles.stepperBtn}
                        >
                            <Text style={styles.stepperBtnText}>−</Text>
                        </Pressable>
                        <View style={styles.stepperValue}>
                            <Text style={styles.stepperValueText}>Problem Count: {problemCount}</Text>
                        </View>
                        <Pressable
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setProblemCount(Math.min(10, problemCount + 1));
                            }}
                            style={styles.stepperBtn}
                        >
                            <Text style={styles.stepperBtnText}>+</Text>
                        </Pressable>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Create Button */}
            <Pressable onPress={handleCreate} style={styles.createBtn}>
                <Text style={styles.createBtnText}>CREATE ALARM</Text>
                <Text style={styles.createBtnIcon}>⏰</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NEO.colors.white,
    },
    scroll: {
        padding: 16,
        paddingBottom: 100,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        padding: 16,
        marginBottom: 20,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: NEO.shadow, height: NEO.shadow },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        backgroundColor: NEO.colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    closeText: {
        fontSize: 24,
        fontWeight: '900',
        color: NEO.colors.black,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: NEO.colors.black,
        letterSpacing: 2,
    },

    // Section
    section: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '900',
        color: NEO.colors.black,
        marginBottom: 8,
        letterSpacing: 1,
    },
    subsectionLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: NEO.colors.darkGrey,
        marginTop: 12,
        marginBottom: 8,
        letterSpacing: 1,
    },

    // Input
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        height: 56,
        paddingHorizontal: 12,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    inputIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: NEO.colors.black,
    },

    // Time Display
    timeDisplay: {
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        padding: 12,
        marginBottom: 12,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    timeDisplayText: {
        fontSize: 18,
        fontWeight: '900',
        color: NEO.colors.black,
        letterSpacing: 2,
    },
    timeLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: NEO.colors.darkGrey,
        marginBottom: 8,
        letterSpacing: 1,
    },
    timePickerRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8,
    },

    // Picker
    pickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    picker: {
        alignItems: 'center',
    },
    pickerBtn: {
        width: 60,
        height: 40,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        backgroundColor: NEO.colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pickerValue: {
        width: 60,
        height: 60,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        backgroundColor: NEO.colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 4,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    pickerValueText: {
        fontSize: 24,
        fontWeight: '900',
        color: NEO.colors.black,
    },
    colon: {
        fontSize: 32,
        fontWeight: '900',
        color: NEO.colors.black,
        marginHorizontal: 4,
    },

    // Period Toggle
    periodToggle: {
        flexDirection: 'column',
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        backgroundColor: NEO.colors.white,
        marginLeft: 12,
        overflow: 'hidden',
    },
    periodText: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 14,
        fontWeight: '900',
        color: NEO.colors.darkGrey,
    },
    periodActive: {
        backgroundColor: NEO.colors.cyan,
        color: NEO.colors.black,
    },
    periodDivider: {
        height: 2,
        backgroundColor: NEO.colors.black,
    },

    // Days
    daysRow: {
        flexDirection: 'row',
        gap: 8,
    },
    dayBtn: {
        flex: 1,
        height: 48,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        backgroundColor: NEO.colors.grey,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayBtnActive: {
        backgroundColor: NEO.colors.orange,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    dayBtnText: {
        fontSize: 16,
        fontWeight: '900',
        color: NEO.colors.darkGrey,
    },
    dayBtnTextActive: {
        color: NEO.colors.black,
    },

    // Dropdown
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        height: 48,
        paddingHorizontal: 12,
        marginBottom: 12,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    dropdownIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    dropdownText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '700',
        color: NEO.colors.black,
    },

    // Toggle
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderColor: '#EEEEEE',
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: NEO.colors.black,
    },

    // Stepper
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    stepperBtn: {
        width: 48,
        height: 48,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        backgroundColor: NEO.colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperBtnText: {
        fontSize: 24,
        fontWeight: '900',
        color: NEO.colors.black,
    },
    stepperValue: {
        flex: 1,
        height: 48,
        borderTopWidth: NEO.border,
        borderBottomWidth: NEO.border,
        borderColor: NEO.colors.black,
        backgroundColor: NEO.colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperValueText: {
        fontSize: 14,
        fontWeight: '700',
        color: NEO.colors.black,
    },

    // Create Button
    createBtn: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        height: 64,
        backgroundColor: NEO.colors.cyan,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: NEO.colors.black,
        shadowOffset: { width: NEO.shadow, height: NEO.shadow },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    createBtnText: {
        fontSize: 20,
        fontWeight: '900',
        color: NEO.colors.black,
        letterSpacing: 2,
        marginRight: 8,
    },
    createBtnIcon: {
        fontSize: 24,
    },
});
