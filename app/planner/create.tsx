import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    TextInput,
    ScrollView,
    Switch,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';

import { usePlannerStore } from '@/store/plannerStore';

// ============================================
// DESIGN SYSTEM: CONTROL PANEL
// ============================================
const CP = {
    colors: {
        white: '#FFFFFF',
        black: '#000000',
        cyan: '#00FFFF',
        grayPanel: '#EEEEEE',
        textGray: '#666666',
    },
    border: 3,
    shadowOffset: 6,
};

// ============================================
// COMPONENTS
// ============================================

// 1. Header Unit
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
            />
        </View>
    </View>
);

// 3. Time Picker Matrix
const CPTimeMatrix = ({
    startH, startM, endH, endM,
    setStartH, setStartM, setEndH, setEndM
}: any) => {

    const Adjuster = ({ val, setVal, max, label }: any) => (
        <View style={styles.adjusterCol}>
            {/* UP */}
            <Pressable
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setVal(val + 1 > max ? 0 : val + 1);
                }}
                style={({ pressed }) => [styles.arrowBtn, pressed && { backgroundColor: 'black' }]}
            >
                {({ pressed }) => <Ionicons name="caret-up" size={16} color={pressed ? 'white' : 'black'} />}
            </Pressable>

            {/* VALUE */}
            <View style={styles.valueBox}>
                <Text style={styles.valueText}>{val.toString().padStart(2, '0')}</Text>
                <Text style={styles.valueLabel}>{label}</Text>
            </View>

            {/* DOWN */}
            <Pressable
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setVal(val - 1 < 0 ? max : val - 1);
                }}
                style={({ pressed }) => [styles.arrowBtn, pressed && { backgroundColor: 'black' }]}
            >
                {({ pressed }) => <Ionicons name="caret-down" size={16} color={pressed ? 'white' : 'black'} />}
            </Pressable>
        </View>
    );

    return (
        <View style={styles.sectionContainer}>
            <Text style={styles.label}>TIME</Text>

            {/* READOUT LAYER */}
            <View style={styles.readoutRow}>
                <View style={styles.readoutBox}>
                    <Text style={styles.readoutText}>
                        START: {startH.toString().padStart(2, '0')}:{startM.toString().padStart(2, '0')}
                    </Text>
                </View>
                <View style={styles.readoutBox}>
                    <Text style={styles.readoutText}>
                        END: {endH.toString().padStart(2, '0')}:{endM.toString().padStart(2, '0')}
                    </Text>
                </View>
            </View>

            {/* CONTROLPANEL LAYER */}
            <View style={styles.controlPanel}>
                <View style={styles.panelLabelRow}>
                    <Text style={styles.panelLabel}>START</Text>
                    <Text style={styles.panelLabel}>END</Text>
                </View>

                <View style={styles.matrixRow}>
                    {/* START GROUP */}
                    <Adjuster val={startH} setVal={setStartH} max={23} label="HR" />
                    <Text style={styles.colon}>:</Text>
                    <Adjuster val={startM} setVal={setStartM} max={59} label="MIN" />

                    {/* DIVIDER */}
                    <View style={styles.verticalDivider} />

                    {/* END GROUP */}
                    <Adjuster val={endH} setVal={setEndH} max={23} label="HR" />
                    <Text style={styles.colon}>:</Text>
                    <Adjuster val={endM} setVal={setEndM} max={59} label="MIN" />
                </View>
            </View>
        </View>
    );
};

// 4. Stepper Control
const CPStepper = ({ label, value, setValue, suffix = '', min = 1, step = 1 }: any) => (
    <View style={styles.sectionContainer}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.stepperContainer}>
            {/* MINUS */}
            <Pressable
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setValue(Math.max(min, value - step));
                }}
                style={({ pressed }) => [styles.stepBtn, pressed && { backgroundColor: 'black' }]}
            >
                {({ pressed }) => <Ionicons name="remove" size={24} color={pressed ? 'white' : 'black'} />}
            </Pressable>

            {/* VALUE */}
            <View style={styles.stepValueBox}>
                <Text style={styles.stepValueText}>{value} {suffix}</Text>
            </View>

            {/* PLUS */}
            <Pressable
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setValue(value + step);
                }}
                style={({ pressed }) => [styles.stepBtn, styles.borderLeft, pressed && { backgroundColor: 'black' }]}
            >
                {({ pressed }) => <Ionicons name="add" size={24} color={pressed ? 'white' : 'black'} />}
            </Pressable>
        </View>
    </View>
);

// 5. Break Selector (Simplified for visual match)
const CPBreakSelector = ({ value, onChange }: any) => (
    <View style={styles.sectionContainer}>
        <Text style={styles.label}>BREAK</Text>
        <Pressable
            style={styles.breakBar}
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Simple toggle logic for demo, or could open modal
                onChange(value === 5 ? 10 : value === 10 ? 15 : 5);
            }}
        >
            <Text style={styles.breakLabel}>BREAK DURATION</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
    const { createTask } = usePlannerStore(); // Use store logic

    // Form State
    const [name, setName] = useState('');

    // Time State
    const [startH, setStartH] = useState(9);
    const [startM, setStartM] = useState(0);
    const [endH, setEndH] = useState(10);
    const [endM, setEndM] = useState(0);

    // Config State
    const [breakDuration, setBreakDuration] = useState(5);
    const [sessions, setSessions] = useState(1);
    const [sessionDuration, setSessionDuration] = useState(25);

    const handleCreate = () => {
        if (!name.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return; // Add validation error visual if needed
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        createTask({
            name: name.trim(),
            emoji: '📝', // Default
            color: '#00FFFF', // Default Cyan
            date: date || new Date().toISOString().split('T')[0],
            startTime: { hour: startH, minute: startM },
            endTime: { hour: endH, minute: endM },
            // Configs
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

        router.back();
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* HEADER */}
                <CPHeader />

                {/* NAME */}
                <View style={{ marginTop: 20 }}>
                    <CPInput
                        label="NAME"
                        value={name}
                        onChange={setName}
                        placeholder=""
                    />
                </View>

                {/* TIME MATRIX */}
                <CPTimeMatrix
                    startH={startH} startM={startM}
                    endH={endH} endM={endM}
                    setStartH={setStartH} setStartM={setStartM}
                    setEndH={setEndH} setEndM={setEndM}
                />

                {/* BREAK */}
                <CPBreakSelector value={breakDuration} onChange={setBreakDuration} />

                {/* COUNTERS */}
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

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ACTION FOOTER */}
            <Animated.View
                entering={FadeInUp.delay(300).springify()}
                style={styles.footer}
            >
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

    // GLOBAL UTILS
    sectionContainer: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '900',
        color: CP.colors.black,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    pressedState: {
        transform: [{ translateY: 4 }, { translateX: 4 }],
        shadowOpacity: 0,
    },

    // HEADER
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
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
        shadowOffset: { width: 4, height: 4 },
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
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    titleText: {
        fontSize: 20,
        fontWeight: '900',
        color: CP.colors.black,
        letterSpacing: 1,
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
        fontSize: 18,
        fontWeight: '700',
        color: CP.colors.black,
    },

    // TIME MATRIX
    readoutRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    readoutBox: {
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
    readoutText: {
        fontSize: 16,
        fontWeight: '900',
        color: CP.colors.black,
    },

    controlPanel: {
        width: '100%',
        backgroundColor: CP.colors.grayPanel,
        borderWidth: 1, // Thin border as per spec
        borderColor: CP.colors.black,
        padding: 16,
    },
    panelLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 8,
    },
    panelLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: CP.colors.textGray,
        letterSpacing: 1,
    },
    matrixRow: {
        flexDirection: 'row',
        justifyContent: 'center', // Center the groups
        alignItems: 'center',
        gap: 8,
    },
    verticalDivider: {
        width: 1,
        height: '80%',
        backgroundColor: '#CCC',
        marginHorizontal: 8,
    },
    colon: {
        fontSize: 24,
        fontWeight: '900',
        marginTop: -10,
    },

    // ADJUSTER COL
    adjusterCol: {
        alignItems: 'center',
        width: 50,
    },
    arrowBtn: {
        width: 32,
        height: 32,
        borderWidth: 2,
        borderColor: CP.colors.black,
        backgroundColor: CP.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    valueBox: {
        width: 50,
        height: 50,
        borderWidth: 4, // Bold border for active state feel
        borderColor: CP.colors.black,
        backgroundColor: CP.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 6,
    },
    valueText: {
        fontSize: 22,
        fontWeight: '900',
    },
    valueLabel: {
        fontSize: 8,
        fontWeight: '900',
        position: 'absolute',
        bottom: 2,
        right: 2,
        color: CP.colors.textGray,
    },

    // BREAK BAR
    breakBar: {
        width: '100%',
        height: 48,
        borderWidth: CP.border,
        borderColor: CP.colors.black,
        backgroundColor: CP.colors.white,
        shadowColor: CP.colors.black,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    breakLabel: {
        fontSize: 14,
        fontWeight: '900',
        color: CP.colors.black,
    },
    breakValue: {
        fontSize: 14,
        fontWeight: '900',
        color: CP.colors.black,
    },

    // STEPPER
    stepperContainer: {
        flexDirection: 'row',
        width: '100%',
        height: 56,
        borderWidth: CP.border,
        borderColor: CP.colors.black,
        backgroundColor: CP.colors.white,
        shadowColor: CP.colors.black,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    stepBtn: {
        width: 60,
        height: '100%',
        borderRightWidth: CP.border,
        borderColor: CP.colors.black,
        alignItems: 'center',
        justifyContent: 'center',
    },
    borderLeft: {
        borderRightWidth: 0,
        borderLeftWidth: CP.border,
    },
    stepValueBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepValueText: {
        fontSize: 20,
        fontWeight: '900',
        color: CP.colors.black,
    },

    // FOOTER
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
    },
    createButton: {
        width: '100%',
        height: 64,
        backgroundColor: CP.colors.cyan,
        borderWidth: CP.border,
        borderColor: CP.colors.black,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: CP.colors.black,
        shadowOffset: { width: 8, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 0,
        marginBottom: 20,
    },
    createButtonText: {
        fontSize: 24,
        fontWeight: '900',
        color: CP.colors.black,
        letterSpacing: 2,
    },
});
