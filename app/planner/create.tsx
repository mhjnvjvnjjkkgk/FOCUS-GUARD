import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    ScrollView,
    Alert,
    Platform,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';

import { usePlannerStore } from '@/store/plannerStore';
import { useReminderStore } from '@/store/reminderStore';

// ============================================
// DESIGN SYSTEM: CONTROL PANEL (CP)
// ============================================
const CP = {
    colors: {
        white: '#FFFFFF',
        black: '#000000',
        cyan: '#00FFFF',
        textGray: '#666666',
    },
    border: 4,
    shadowOffset: { width: 4, height: 4 },
    fonts: {
        heavy: '900' as '900',
        bold: '700' as '700',
    },
};

// ============================================
// HELPER COMPONENTS
// ============================================

// 1. Header
const CPHeader = () => (
    <View style={styles.headerContainer}>
        <Pressable
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
            }}
            style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressedState
            ]}
        >
            <Ionicons name="chevron-back" size={32} color="black" />
        </Pressable>
        <View style={styles.titleBanner}>
            <Text style={styles.titleText}>ADD TASK</Text>
        </View>
    </View>
);

// 2. Input Field
const CPInput = ({ label, value, onChange, placeholder }: any) => (
    <View style={styles.sectionContainer}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputBox}>
            <TextInput
                style={styles.inputText}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor="#999"
                returnKeyType="done"
            />
        </View>
    </View>
);

// 3. Time Matrix (Custom Layout)
const CPTimeMatrix = ({
    startH, startM, endH, endM,
    setStartH, setStartM, setEndH, setEndM
}: any) => {

    const display12H = (hour24: number) => {
        if (hour24 === 0) return 12;
        if (hour24 > 12) return hour24 - 12;
        return hour24;
    };

    // Derived periods
    const startPeriod = startH >= 12 ? 'PM' : 'AM';
    const endPeriod = endH >= 12 ? 'PM' : 'AM';

    // Toggle Period Logic (Stationary Hour)
    // If 11 AM -> Toggle -> 11 PM (+12)
    // If 12 PM -> Toggle -> 12 AM (-12)
    const togglePeriod = (currentH: number, setH: any) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentH >= 12) {
            setH(currentH - 12);
        } else {
            setH(currentH + 12);
        }
    };

    // Helper for Adjuster
    const to24H = (hour12: number, period: 'AM' | 'PM') => {
        if (period === 'AM') {
            return hour12 === 12 ? 0 : hour12;
        } else {
            return hour12 === 12 ? 12 : hour12 + 12;
        }
    };

    const Adjuster = ({ val, setVal, max, label, is12Hour = false, period }: any) => {
        const displayVal = is12Hour ? display12H(val) : val;
        const displayMax = is12Hour ? 12 : max;

        const handleIncrement = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (is12Hour) {
                // Cycle 1-12 within SAME period
                const nextDisplay = displayVal + 1 > 12 ? 1 : displayVal + 1;
                setVal(to24H(nextDisplay, period));
            } else {
                setVal(val + 1 > max ? 0 : val + 1);
            }
        };

        const handleDecrement = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (is12Hour) {
                // Cycle 1-12 within SAME period
                const nextDisplay = displayVal - 1 < 1 ? 12 : displayVal - 1;
                setVal(to24H(nextDisplay, period));
            } else {
                setVal(val - 1 < 0 ? max : val - 1);
            }
        };

        return (
            <View style={styles.adjusterCol}>
                {/* UP */}
                <Pressable
                    onPress={handleIncrement}
                    style={({ pressed }) => [styles.arrowBtn, pressed && { backgroundColor: 'black' }]}
                >
                    {({ pressed }) => <Ionicons name="caret-up" size={16} color={pressed ? 'white' : 'black'} />}
                </Pressable>

                {/* VALUE */}
                <View style={styles.valueBox}>
                    <Text style={styles.valueText}>{displayVal.toString().padStart(2, '0')}</Text>
                </View>

                {/* DOWN */}
                <Pressable
                    onPress={handleDecrement}
                    style={({ pressed }) => [styles.arrowBtn, pressed && { backgroundColor: 'black' }]}
                >
                    {({ pressed }) => <Ionicons name="caret-down" size={16} color={pressed ? 'white' : 'black'} />}
                </Pressable>
            </View>
        );
    };

    const PeriodBtn = ({ period, onPress }: any) => (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [styles.periodBtn, pressed && { backgroundColor: 'black' }]}
        >
            <Text style={styles.periodText}>{period}</Text>
        </Pressable>
    );

    return (
        <View style={styles.sectionContainer}>
            <Text style={styles.label}>TIME</Text>

            {/* READOUT BOXES */}
            <View style={styles.readoutRow}>
                <View style={styles.readoutBox}>
                    <Text style={styles.readoutText}>
                        START: {display12H(startH).toString().padStart(2, '0')}:{startM.toString().padStart(2, '0')} {startPeriod}
                    </Text>
                </View>
                <View style={styles.readoutBox}>
                    <Text style={styles.readoutText}>
                        END: {display12H(endH).toString().padStart(2, '0')}:{endM.toString().padStart(2, '0')} {endPeriod}
                    </Text>
                </View>
            </View>

            {/* MATRIX */}
            <View style={styles.matrixRow}>
                {/* START GROUP */}
                <View style={styles.groupCol}>
                    <Text style={styles.groupLabel}>START</Text>
                    <View style={styles.pickerRow}>
                        <Adjuster val={startH} setVal={setStartH} max={23} label="HR" is12Hour period={startPeriod} />
                        <Text style={styles.colon}>:</Text>
                        <Adjuster val={startM} setVal={setStartM} max={59} label="MIN" />
                    </View>
                    <PeriodBtn period={startPeriod} onPress={() => togglePeriod(startH, setStartH)} />
                </View>

                {/* END GROUP */}
                <View style={styles.groupCol}>
                    <Text style={styles.groupLabel}>END</Text>
                    <View style={styles.pickerRow}>
                        <Adjuster val={endH} setVal={setEndH} max={23} label="HR" is12Hour period={endPeriod} />
                        <Text style={styles.colon}>:</Text>
                        <Adjuster val={endM} setVal={setEndM} max={59} label="MIN" />
                    </View>
                    <PeriodBtn period={endPeriod} onPress={() => togglePeriod(endH, setEndH)} />
                </View>
            </View>
        </View>
    );
};

// 4. Stepper
const CPStepper = ({ label, value, setValue, suffix = '', min = 1, step = 1 }: any) => (
    <View style={styles.sectionContainer}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.stepperContainer}>
            <Pressable
                style={({ pressed }) => [styles.stepBtn, pressed && { backgroundColor: 'black' }]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setValue(Math.max(min, value - step));
                }}
            >
                {({ pressed }) => <Ionicons name="remove" size={24} color={pressed ? 'white' : 'black'} />}
            </Pressable>

            <View style={styles.stepValueBox}>
                <Text style={styles.stepValueText}>{value} {suffix}</Text>
            </View>

            <Pressable
                style={({ pressed }) => [styles.stepBtn, pressed && { backgroundColor: 'black' }]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setValue(value + step);
                }}
            >
                {({ pressed }) => <Ionicons name="add" size={24} color={pressed ? 'white' : 'black'} />}
            </Pressable>
        </View>
    </View>
);

// 5. Break Selector
const CPBreakSelector = ({ value, onChange }: any) => (
    <View style={styles.sectionContainer}>
        <Text style={styles.label}>BREAK</Text>
        <Pressable
            style={({ pressed }) => [styles.breakBar, pressed && styles.pressedState]}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(value === 5 ? 10 : value === 10 ? 15 : 5);
            }}
        >
            <Text style={styles.breakLabel}>BREAK DURATION</Text>
            <View style={styles.breakValueRow}>
                <Text style={styles.breakValue}>{value} MIN</Text>
                <Ionicons name="caret-down" size={16} color="black" style={{ marginLeft: 8 }} />
            </View>
        </Pressable>
    </View>
);

// ============================================
// MAIN SCREEN
// ============================================

export default function CreateTaskScreen() {
    const { date } = useLocalSearchParams<{ date: string }>();
    const { createTask } = usePlannerStore();
    const { addReminder } = useReminderStore();

    const [name, setName] = useState('');
    const [startH, setStartH] = useState(9);
    const [startM, setStartM] = useState(0);
    const [endH, setEndH] = useState(10);
    const [endM, setEndM] = useState(0);

    const [breakDuration, setBreakDuration] = useState(5);
    const [sessions, setSessions] = useState(1);
    const [sessionDuration, setSessionDuration] = useState(25);

    const handleCreate = () => {
        if (!name.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Missing Name', 'Please enter a task name.');
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        createTask({
            name: name.trim(),
            emoji: '📝',
            color: '#00FFFF',
            date: date || new Date().toISOString().split('T')[0],
            startTime: { hour: startH, minute: startM },
            endTime: { hour: endH, minute: endM },
            focusConfig: {
                enabled: true,
                sessionCount: sessions,
                sessionDuration: sessionDuration,
                breakDuration: breakDuration,
            },
            blockingConfig: {
                enabled: true,
                blockedApps: [],
                blockAllSocial: true,
                blockAllEntertainment: true
            },
            skipTaskConfig: {
                enabled: true,
                typingPhrase: 'I will reschedule this task'
            },
            alarmEnabled: true,
            reminderMinutesBefore: 10,
        });

        // Auto-create reminder
        const reminderDate = new Date(`${date || new Date().toISOString().split('T')[0]}T${startH.toString().padStart(2, '0')}:${startM.toString().padStart(2, '0')}:00`);
        reminderDate.setMinutes(reminderDate.getMinutes() - 10);

        addReminder({
            title: name.trim(),
            message: `Your task "${name.trim()}" starts in 10 minutes`,
            subtitle: 'Time to prepare!',
            icon: '⏰',
            color: '#00FFFF',
            schedule: {
                type: 'once',
                date: date || new Date().toISOString().split('T')[0],
                time: {
                    hour: reminderDate.getHours(),
                    minute: reminderDate.getMinutes()
                },
            },
            category: 'productivity',
            isFavorite: false,
            enabled: true,
        });

        router.back();
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag">
                <CPHeader />

                <CPInput
                    label="NAME"
                    value={name}
                    onChange={setName}
                    placeholder=""
                />

                <CPTimeMatrix
                    startH={startH} startM={startM}
                    endH={endH} endM={endM}
                    setStartH={setStartH} setStartM={setStartM}
                    setEndH={setEndH} setEndM={setEndM}
                />

                <CPBreakSelector value={breakDuration} onChange={setBreakDuration} />

                <CPStepper
                    label="NO. OF SESSIONS"
                    value={sessions}
                    setValue={setSessions}
                />

                <CPStepper
                    label="DURATION OF SESSIONS"
                    value={sessionDuration}
                    setValue={setSessionDuration}
                    suffix="MIN"
                    step={5}
                />
            </ScrollView>

            <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.footer}>
                <Pressable
                    onPress={handleCreate}
                    style={({ pressed }) => [
                        styles.createButton,
                        pressed && styles.pressedState
                    ]}
                >
                    <Text style={styles.createButtonText}>CREATE TASK</Text>
                </Pressable>
            </Animated.View>
        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CP.colors.white,
        paddingTop: 60,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 120,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: CP.fonts.heavy,
        color: CP.colors.black,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    pressedState: {
        transform: [{ translateY: 4 }, { translateX: 4 }],
        shadowOpacity: 0,
    },

    // HEADER
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    backButton: {
        width: 48,
        height: 48,
        borderWidth: CP.border,
        borderColor: CP.colors.black,
        backgroundColor: CP.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        shadowColor: CP.colors.black,
        shadowOffset: CP.shadowOffset,
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    titleBanner: {
        flex: 1,
        height: 48,
        borderWidth: CP.border,
        borderColor: CP.colors.black,
        backgroundColor: CP.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: CP.colors.black,
        shadowOffset: CP.shadowOffset,
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    titleText: {
        fontSize: 24,
        fontWeight: CP.fonts.heavy,
        color: CP.colors.black,
        textTransform: 'uppercase',
    },

    // INPUT
    inputBox: {
        width: '100%',
        height: 56,
        borderWidth: CP.border,
        borderColor: CP.colors.black,
        backgroundColor: CP.colors.white,
        shadowColor: CP.colors.black,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    inputText: {
        fontSize: 20,
        fontWeight: CP.fonts.bold,
        color: CP.colors.black,
    },

    // TIME MATRIX
    readoutRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    readoutBox: {
        flex: 1,
        height: 40, // Slimmer readout
        borderWidth: CP.border,
        borderColor: CP.colors.black,
        backgroundColor: CP.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: CP.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    readoutText: {
        fontSize: 14,
        fontWeight: CP.fonts.heavy,
        color: CP.colors.black,
    },
    matrixRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
    },
    groupCol: {
        alignItems: 'center',
    },
    groupLabel: {
        fontSize: 16,
        fontWeight: CP.fonts.heavy,
        color: CP.colors.black,
        marginBottom: 8,
    },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    colon: {
        fontSize: 24,
        fontWeight: CP.fonts.heavy,
        marginHorizontal: 4,
    },
    adjusterCol: {
        alignItems: 'center',
        width: 50,
    },
    arrowBtn: {
        width: 50,
        height: 32,
        borderWidth: 3,
        borderColor: CP.colors.black,
        backgroundColor: CP.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    valueBox: {
        width: 50,
        height: 50,
        borderWidth: 4,
        borderColor: CP.colors.black,
        backgroundColor: CP.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    valueText: {
        fontSize: 24,
        fontWeight: CP.fonts.heavy,
        color: CP.colors.black,
    },
    periodBtn: {
        width: 80,
        height: 32,
        borderWidth: 3,
        borderColor: CP.colors.black,
        backgroundColor: CP.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    periodText: {
        fontSize: 14,
        fontWeight: CP.fonts.heavy,
        color: CP.colors.black,
    },

    // STEPPER
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    stepBtn: {
        width: 48,
        height: 48,
        borderWidth: CP.border,
        borderColor: CP.colors.black,
        backgroundColor: CP.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: CP.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    stepValueBox: {
        flex: 1,
        height: 48,
        borderWidth: CP.border,
        borderColor: CP.colors.black,
        backgroundColor: CP.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: CP.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    stepValueText: {
        fontSize: 20,
        fontWeight: CP.fonts.heavy,
        color: CP.colors.black,
    },

    // BREAK
    breakBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        paddingHorizontal: 16,
        borderWidth: CP.border,
        borderColor: CP.colors.black,
        backgroundColor: CP.colors.white,
        shadowColor: CP.colors.black,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    breakLabel: {
        fontSize: 16,
        fontWeight: CP.fonts.heavy,
        color: CP.colors.black,
    },
    breakValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    breakValue: {
        fontSize: 16,
        fontWeight: CP.fonts.bold,
        color: CP.colors.black,
    },

    // FOOTER
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
    },
    createButton: {
        backgroundColor: CP.colors.cyan,
        height: 64,
        borderWidth: CP.border,
        borderColor: CP.colors.black,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: CP.colors.black,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    createButtonText: {
        fontSize: 24,
        fontWeight: CP.fonts.heavy,
        color: CP.colors.black,
        letterSpacing: 1,
    },
});
