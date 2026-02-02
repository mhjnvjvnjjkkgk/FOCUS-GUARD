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
import { router, useLocalSearchParams } from 'expo-router';
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
    const params = useLocalSearchParams<{ id: string }>();
    const isEditing = !!params.id;

    // Store actions
    const { addAlarm, updateAlarm, alarms } = useAlarmStore();
    const alarmToEdit = alarms.find(a => a.id === params.id);

    // Form state - Initialize with defaults or alarm data
    const [label, setLabel] = useState('');

    // Time state
    const [hour, setHour] = useState(7);
    const [minute, setMinute] = useState(30);
    const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

    // Repeat days
    const [repeatDays, setRepeatDays] = useState<number[]>([1, 2, 3, 4, 5]);

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

    // Populate form if editing
    React.useEffect(() => {
        if (alarmToEdit) {
            setLabel(alarmToEdit.label);
            setHour(alarmToEdit.time.hour);
            setMinute(alarmToEdit.time.minute);
            setPeriod(alarmToEdit.time.hour >= 12 ? 'PM' : 'AM');
            setRepeatDays(alarmToEdit.repeatDays);

            // Sound
            setRingtone(alarmToEdit.ringtoneId || 'classic');
            setVolume(alarmToEdit.volume ?? 80);
            setVibrate(alarmToEdit.vibrate);
            setGradualVolume(alarmToEdit.gradualVolume);

            // Snooze
            setSnoozeEnabled(alarmToEdit.snoozeEnabled);
            setSnoozeDuration(alarmToEdit.snoozeDuration);
            setSnoozeLimit(alarmToEdit.snoozeLimit);

            // Dismiss
            setChallengeType(alarmToEdit.dismissTask.type);
            setDifficulty(alarmToEdit.dismissTask.mathDifficulty || 'medium');
            setProblemCount(alarmToEdit.dismissTask.mathCount || 3);
        }
    }, [alarmToEdit]);

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

    // Create/Update alarm
    const handleSave = () => {
        if (!label.trim()) {
            Alert.alert('Missing Label', 'Please enter a label for this alarm');
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const selectedRingtone = RINGTONE_OPTIONS.find(o => o.value === ringtone) || RINGTONE_OPTIONS[0];

        const alarmData = {
            time: { hour, minute },
            label: label.trim(),
            repeatDays,
            enabled: true,

            // Sound
            ringtoneId: ringtone,
            ringtoneName: selectedRingtone.label,
            volume,
            vibrate,
            gradualVolume,

            // Snooze
            snoozeEnabled,
            snoozeDuration,
            snoozeLimit,
            snoozesUsed: 0,

            // Dismiss
            dismissTask: {
                type: challengeType as any,
                mathDifficulty: difficulty as any,
                mathCount: problemCount,
                shakeIntensity: 'medium',
                shakeDuration: 15,
                walkSteps: 20,
            } as any,
        };

        if (isEditing && params.id) {
            updateAlarm(params.id, alarmData);
        } else {
            addAlarm(alarmData);
        }

        router.back();
    };

    // Selection Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalOptions, setModalOptions] = useState<{ label: string; value: any; icon?: string }[]>([]);
    const [onSelectOption, setOnSelectOption] = useState<(value: any) => void>(() => { });

    // Options Lists
    const SNOOZE_OPTIONS = [5, 10, 15, 20, 30].map(m => ({ label: `${m} min`, value: m, icon: '⏳' }));

    const DIFFICULTY_OPTIONS = [
        { label: 'Easy', value: 'easy', icon: '🟢' },
        { label: 'Medium', value: 'medium', icon: '🟡' },
        { label: 'Hard', value: 'hard', icon: '🔴' },
    ];

    const CHALLENGE_OPTIONS = [
        { label: 'None', value: 'none', icon: '🚫' },
        { label: 'Math', value: 'math', icon: '🧮' },
        { label: 'Shake', value: 'shake', icon: '📳' },
        { label: 'Typing', value: 'typing', icon: '⌨️' },
        { label: 'Walking', value: 'walk', icon: '🚶' },
        { label: 'Breathing', value: 'breathing', icon: '🧘' },
        { label: 'Memory', value: 'memory', icon: '🧠' },
        { label: 'Squat', value: 'squat', icon: '🏋️' },
        { label: 'Step', value: 'step', icon: '👣' },
    ];

    const RINGTONE_OPTIONS = [
        { label: 'Classic Alarm', value: 'classic', icon: '🔔' },
        { label: 'Digital Beep', value: 'digital', icon: '📟' },
        { label: 'Gentle Rise', value: 'gentle', icon: '🌅' },
        { label: 'Energize', value: 'energy', icon: '⚡' },
    ];

    // Helper to open modal
    const openSelection = (title: string, options: any[], onSelect: (val: any) => void) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setModalTitle(title);
        setModalOptions(options);
        setOnSelectOption(() => (val: any) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onSelect(val);
            setModalVisible(false);
        });
        setModalVisible(true);
    };

    return (
        <View style={styles.container}>
            {/* Selection Modal */}
            {modalVisible && (
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{modalTitle}</Text>
                            <Pressable onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalClose}>✕</Text>
                            </Pressable>
                        </View>
                        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                            {modalOptions.map((opt, index) => (
                                <Pressable
                                    key={index}
                                    style={styles.modalItem}
                                    onPress={() => onSelectOption(opt.value)}
                                >
                                    <Text style={styles.modalItemIcon}>{opt.icon}</Text>
                                    <Text style={styles.modalItemText}>{opt.label}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable onPress={() => router.back()} style={styles.closeBtn}>
                        <Text style={styles.closeText}>✕</Text>
                    </Pressable>
                    <Text style={styles.headerTitle}>{isEditing ? 'EDIT ALARM' : 'ADD ALARM'}</Text>
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

                    <Pressable
                        style={styles.dropdown}
                        onPress={() => openSelection('SELECT RINGTONE', RINGTONE_OPTIONS, setRingtone)}
                    >
                        <Text style={styles.dropdownIcon}>🔔</Text>
                        <Text style={styles.dropdownText}>
                            {RINGTONE_OPTIONS.find(o => o.value === ringtone)?.label || 'Classic Alarm'}
                        </Text>
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
                            <Pressable
                                style={styles.dropdown}
                                onPress={() => openSelection('SNOOZE DURATION', SNOOZE_OPTIONS, setSnoozeDuration)}
                            >
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

                    <Pressable
                        style={styles.dropdown}
                        onPress={() => openSelection('SELECT CHALLENGE', CHALLENGE_OPTIONS, setChallengeType)}
                    >
                        <Text style={styles.dropdownIcon}>
                            {CHALLENGE_OPTIONS.find(o => o.value === challengeType)?.icon || '🧮'}
                        </Text>
                        <Text style={styles.dropdownText}>
                            {CHALLENGE_OPTIONS.find(o => o.value === challengeType)?.label || 'Math'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="black" />
                    </Pressable>

                    {challengeType !== 'none' && (
                        <>
                            <Text style={styles.subsectionLabel}>TASK SETTINGS</Text>

                            <Pressable
                                style={styles.dropdown}
                                onPress={() => openSelection('DIFFICULTY', DIFFICULTY_OPTIONS, setDifficulty)}
                            >
                                <Text style={styles.dropdownText}>
                                    Difficulty: {DIFFICULTY_OPTIONS.find(o => o.value === difficulty)?.label || 'Medium'}
                                </Text>
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
                                    <Text style={styles.stepperValueText}>Count: {problemCount}</Text>
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
                        </>
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Create/Update Button */}
            <Pressable onPress={handleSave} style={styles.createBtn}>
                <Text style={styles.createBtnText}>{isEditing ? 'UPDATE ALARM' : 'CREATE ALARM'}</Text>
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
    // Modal Styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '80%',
        maxHeight: '70%',
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 8, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: NEO.border,
        borderColor: NEO.colors.black,
        backgroundColor: NEO.colors.cyan,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: NEO.colors.black,
        letterSpacing: 1,
    },
    modalClose: {
        fontSize: 24,
        fontWeight: '900',
        color: NEO.colors.black,
    },
    modalList: {
        padding: 8,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 2,
        borderColor: '#EEEEEE',
    },
    modalItemIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    modalItemText: {
        fontSize: 16,
        fontWeight: '700',
        color: NEO.colors.black,
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
