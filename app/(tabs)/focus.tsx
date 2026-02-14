import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
    ScrollView,
    Modal,
    TextInput,
    Alert,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    Layout,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import Svg, { Circle } from 'react-native-svg';
import { useNavigation, useLocalSearchParams, router } from 'expo-router';

import { usePointsStore, POINTS_CONFIG } from '@/store/pointsStore';
import { usePlannerStore } from '@/store/plannerStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { Image } from 'expo-image';

// NEO CONSTANTS
const NEO_BLACK = '#000000';
const NEO_WHITE = '#FFFFFF';
const NEO_ORANGE = '#FF5500';
const NEO_RED = '#D50000'; // Deep Red
const NEO_BLUE = '#0000FF';
const NEO_YELLOW = '#FFD700';
const NEO_GREEN = '#228B22'; // Forest Green
const NEO_CHOCOLATE = '#D2691E';
const NEO_TEAL = '#008B8B';

const { width } = Dimensions.get('window');
const TIMER_SIZE = width * 0.75;
const ACTIVE_TIMER_SIZE = width * 0.85;

const PRESETS = [
    { id: 'pomodoro', name: 'Pomodoro', icon: '🍅', duration: 25, color: NEO_RED },
    { id: 'deep', name: 'Deep Work', icon: '🎯', duration: 90, color: NEO_BLUE },
    { id: 'study', name: 'Study', icon: '📚', duration: 50, color: NEO_YELLOW },
    { id: 'quick', name: 'Quick', icon: '⚡', duration: 15, color: NEO_ORANGE },
];

const AMBIENT_SOUNDS = [
    { id: 'none', name: 'None', icon: '🔇', url: null },
    { id: 'rain', name: 'Rain', icon: '🌧️', url: 'https://cdn.pixabay.com/audio/2022/05/13/audio_257112dc52.mp3' },
    { id: 'forest', name: 'Forest', icon: '🌲', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_4c7d15c8c0.mp3' },
];

// ============================================
// COMPONENTS
// ============================================

const ProgressRing = ({ progress, color, size, strokeWidth = 12 }: any) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - progress);

    return (
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
            <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={NEO_BLACK}
                strokeWidth={strokeWidth}
                fill="transparent"
                opacity={0.1}
            />
            <Circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
        </Svg>
    );
};

const NeoButton = ({ onPress, style, children, color = NEO_WHITE }: any) => (
    <Pressable
        onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
        }}
        style={({ pressed }) => [
            styles.neoButton,
            { backgroundColor: color },
            pressed && { transform: [{ translateY: 4 }, { translateX: 4 }], shadowOpacity: 0 },
            style
        ]}
    >
        {children}
    </Pressable>
);

// GIVE UP MODAL WITH TYPING CHALLENGE
interface GiveUpModalProps {
    visible: boolean;
    onCancel: () => void;
    onConfirm: (rating: 0 | 25 | 50 | 75 | 100) => void;
}

const GiveUpModal = ({ visible, onCancel, onConfirm }: GiveUpModalProps) => {
    const [typedText, setTypedText] = useState('');
    const [selectedRating, setSelectedRating] = useState<0 | 25 | 50 | 75 | 100 | null>(null);
    const requiredPhrase = "I need to stop";
    const isTypingComplete = typedText.toLowerCase().trim() === requiredPhrase.toLowerCase();
    const canConfirm = isTypingComplete && selectedRating !== null;

    // Reset when modal opens
    useEffect(() => {
        if (visible) {
            setTypedText('');
            setSelectedRating(null);
        }
    }, [visible]);

    const handleConfirm = () => {
        if (canConfirm && selectedRating !== null) {
            onConfirm(selectedRating);
        }
    };

    const ratings: Array<0 | 25 | 50 | 75 | 100> = [0, 25, 50, 75, 100];

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <Animated.View entering={FadeInUp.springify()} style={styles.modalContent}>
                    {/* WARNING STRIPE */}
                    <View style={styles.warningStripe}>
                        <Text style={styles.warningStripeText}>⚠️ STOP SESSION ⚠️</Text>
                    </View>

                    <Text style={styles.modalTitle}>TYPE TO CONFIRM</Text>
                    <Text style={styles.modalText}>Type the phrase below exactly:</Text>

                    <View style={styles.phraseBox}>
                        <Text style={styles.phraseText}>"{requiredPhrase}"</Text>
                    </View>

                    <TextInput
                        style={[
                            styles.typingInput,
                            isTypingComplete && { borderColor: NEO_GREEN, borderWidth: 4 }
                        ]}
                        value={typedText}
                        onChangeText={setTypedText}
                        placeholder="Type here..."
                        placeholderTextColor="#999"
                        autoFocus
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    {isTypingComplete && (
                        <>
                            <View style={styles.completionSection}>
                                <Text style={styles.completionTitle}>
                                    📊 HOW MUCH DID YOU COMPLETE?
                                </Text>
                                <View style={styles.ratingGrid}>
                                    {ratings.map((rating) => (
                                        <Pressable
                                            key={rating}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setSelectedRating(rating);
                                            }}
                                            style={[
                                                styles.ratingBtn,
                                                selectedRating === rating && styles.ratingBtnSelected
                                            ]}
                                        >
                                            <Text style={[
                                                styles.ratingBtnText,
                                                selectedRating === rating && styles.ratingBtnTextSelected
                                            ]}>
                                                {rating}%
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                                {selectedRating !== null && (
                                    <View style={[
                                        styles.pointsPreview,
                                        { backgroundColor: selectedRating === 0 ? NEO_RED : NEO_GREEN }
                                    ]}>
                                        <Text style={styles.pointsPreviewText}>
                                            {selectedRating === 0 ? '-30 PTS' : `+${selectedRating === 100 ? 50 :
                                                selectedRating === 75 ? 35 :
                                                    selectedRating === 50 ? 20 : 10
                                                } PTS`}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </>
                    )}

                    <View style={styles.modalActions}>
                        <NeoButton style={styles.modalBtnCancel} onPress={onCancel}>
                            <Text style={styles.modalBtnText}>RESUME</Text>
                        </NeoButton>
                        <NeoButton
                            style={[
                                styles.modalBtnConfirm,
                                !canConfirm && styles.modalBtnDisabled
                            ]}
                            onPress={handleConfirm}
                            color={canConfirm ? NEO_RED : '#CCC'}
                        >
                            <Text style={[
                                styles.modalBtnText,
                                { color: canConfirm ? NEO_WHITE : '#666' }
                            ]}>
                                STOP
                            </Text>
                        </NeoButton>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

// ============================================
// MAIN SCREEN
// ============================================

export default function FocusModeScreen() {
    const navigation = useNavigation();
    const params = useLocalSearchParams<{ taskId?: string, date?: string, duration?: string }>();

    // Stores
    const { getTask, startSession, completeSession, recordTaskSession } = usePlannerStore();
    const { addPoints, deductPoints, recordSessionStarted, recordSessionCompleted } = usePointsStore();

    // Setup from Params
    const activeTask = (params.taskId && params.date) ? getTask(params.taskId, params.date) : null;

    // State
    const [duration, setDuration] = useState(activeTask ? activeTask.focusConfig.sessionDuration : 25);
    const [sessionCount, setSessionCount] = useState(activeTask ? activeTask.focusConfig.sessionCount : 4);
    const [breakDuration, setBreakDuration] = useState(activeTask ? activeTask.focusConfig.breakDuration : 5);
    const [timeRemaining, setTimeRemaining] = useState(duration * 60);
    const [isActive, setIsActive] = useState(false);
    const [selectedSound, setSelectedSound] = useState(AMBIENT_SOUNDS[0]);
    const [elapsedTime, setElapsedTime] = useState(0); // Track total elapsed
    const [completedSessions, setCompletedSessions] = useState(0); // Track completed sessions
    const [showGiveUp, setShowGiveUp] = useState(false);

    // If loaded from Planner with a task, auto-start logic could be added here if desired, 
    // but user image shows typical Idle start. We'll stick to manual start for safety unless requested.
    // However, if we navigated from "Start Focus" in Planner, we might want to auto-config.

    useEffect(() => {
        if (activeTask) {
            setDuration(activeTask.focusConfig.sessionDuration);
            setSessionCount(activeTask.focusConfig.sessionCount);
            setBreakDuration(activeTask.focusConfig.breakDuration);
            setTimeRemaining(activeTask.focusConfig.sessionDuration * 60);
        }
    }, [activeTask]);

    // Navbar Visibility
    useEffect(() => {
        navigation.setOptions({
            tabBarStyle: { display: isActive ? 'none' : 'flex' }
        });
    }, [isActive, navigation]);

    // Timer Logic
    useEffect(() => {
        let interval: any;
        if (isActive && timeRemaining > 0) {
            interval = setInterval(() => {
                setTimeRemaining((prev) => prev - 1);
                setElapsedTime((prev) => prev + 1);
            }, 1000);
        } else if (timeRemaining === 0 && isActive) {
            handleComplete();
        }
        return () => clearInterval(interval);
    }, [isActive, timeRemaining]);

    // Sound Logic
    const soundRef = useRef<Audio.Sound | null>(null);
    useEffect(() => {
        async function manageSound() {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
            if (isActive && selectedSound.url) {
                const { sound } = await Audio.Sound.createAsync(
                    { uri: selectedSound.url },
                    { isLooping: true, volume: 0.5 }
                );
                soundRef.current = sound;
                await sound.playAsync();
            }
        }
        manageSound();
        return () => {
            if (soundRef.current) soundRef.current.unloadAsync();
        };
    }, [isActive, selectedSound]);

    // Handlers
    const handleStart = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsActive(true);
        setElapsedTime(0);
        setTimeRemaining(duration * 60);

        const today = new Date().toISOString().split('T')[0];

        // Record session start in pointsStore
        recordSessionStarted(today);

        // Notify Store if Task
        const pTaskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
        const pDate = Array.isArray(params.date) ? params.date[0] : params.date;

        if (activeTask && pTaskId && pDate) {
            startSession(pTaskId, pDate, activeTask.currentSessionIndex);
        }
    };

    const handleStopAttempt = () => {
        if (elapsedTime < 10) {
            // Misclick safety - Stop immediately, no penalty, no modal
            setIsActive(false);
            setElapsedTime(0);
            setTimeRemaining(duration * 60);
            if (soundRef.current) soundRef.current.stopAsync();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
            // Show typing challenge modal
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setShowGiveUp(true);
        }
    };

    const handleStopConfirm = (completionRating: 0 | 25 | 50 | 75 | 100) => {
        setShowGiveUp(false);
        setIsActive(false);
        const focusMinutes = Math.floor(elapsedTime / 60);
        const today = new Date().toISOString().split('T')[0];
        const taskName = activeTask?.name || 'Focus Session';
        const pTaskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
        const pDate = Array.isArray(params.date) ? params.date[0] : params.date;

        if (soundRef.current) soundRef.current.stopAsync();

        // Calculate points based on completion rating
        let pointsAwarded = 0;
        switch (completionRating) {
            case 100: pointsAwarded = POINTS_CONFIG.session.completion100; break;
            case 75: pointsAwarded = POINTS_CONFIG.session.completion75; break;
            case 50: pointsAwarded = POINTS_CONFIG.session.completion50; break;
            case 25: pointsAwarded = POINTS_CONFIG.session.completion25; break;
            case 0: pointsAwarded = 0; break;
        }

        // Record the partial session completion
        if (completionRating > 0) {
            recordSessionCompleted(today, completionRating, focusMinutes, taskName, duration);
            addPoints(today, 'sessionsCompleted', pointsAwarded);

            // Record in planner task if linked
            if (activeTask && pTaskId && pDate) {
                try {
                    const sessionIndex = activeTask.currentSessionIndex ?? 0;
                    recordTaskSession(pTaskId, pDate, sessionIndex, completionRating, focusMinutes);
                } catch (error) {
                    console.error('Error recording task session:', error);
                }
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Session Stopped", `You earned ${pointsAwarded} points for ${completionRating}% completion.`);
        } else {
            // No points for 0% completion, apply penalty
            recordSessionCompleted(today, 0, focusMinutes, taskName, duration);
            deductPoints(today, 'skippedSessions', 30);

            // Record in planner task if linked
            if (activeTask && pTaskId && pDate) {
                try {
                    const sessionIndex = activeTask.currentSessionIndex ?? 0;
                    recordTaskSession(pTaskId, pDate, sessionIndex, 0, focusMinutes);
                } catch (error) {
                    console.error('Error recording task session:', error);
                }
            }

            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Session Stopped", "No progress made. -30 points penalty.");
        }

        // Reset state
        setElapsedTime(0);
        setTimeRemaining(duration * 60);
    };

    const handleComplete = () => {
        setIsActive(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const pTaskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
        const pDate = Array.isArray(params.date) ? params.date[0] : params.date;
        const today = new Date().toISOString().split('T')[0];
        const taskName = activeTask?.name || 'Focus Session';
        const focusMinutes = Math.floor(elapsedTime / 60);

        // Increment completed sessions
        const newCompletedCount = completedSessions + 1;
        setCompletedSessions(newCompletedCount);

        // Update planner task if linked
        if (activeTask && pTaskId && pDate) {
            try {
                completeSession(pTaskId, pDate, activeTask.currentSessionIndex, 100);
            } catch (error) {
                console.error('Error completing session in planner:', error);
            }
        }

        // Record session with 100% completion
        recordSessionCompleted(today, 100, focusMinutes, taskName, duration);

        // Record in planner task if linked
        if (activeTask && pTaskId && pDate) {
            try {
                recordTaskSession(pTaskId, pDate, activeTask.currentSessionIndex, 100, focusMinutes);
            } catch (error) {
                console.error('Error recording task session:', error);
            }
        }

        // Award points
        addPoints(today, 'sessionsCompleted', 50);

        // Check if all sessions are done
        if (newCompletedCount >= sessionCount) {
            Alert.alert("All Sessions Complete!", `You completed ${sessionCount} sessions! 🎉`);
            // Reset for next time
            setCompletedSessions(0);
            setElapsedTime(0);
        } else {
            const remaining = sessionCount - newCompletedCount;
            Alert.alert("Session Complete!", `${remaining} session${remaining !== 1 ? 's' : ''} remaining.`);
            // Reset timer for next session
            setTimeRemaining(duration * 60);
            setElapsedTime(0);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <Pressable onPress={() => router.push('/account' as any)}>
                <View style={styles.avatarBox}>
                    {useAuthStore.getState().user?.photoURL ? (
                        <Image source={{ uri: useAuthStore.getState().user!.photoURL! }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                        <Text style={styles.avatarText}>FG</Text>
                    )}
                </View>
            </Pressable>
            <View>
                <Text style={styles.appTitle}>FOCUSGUARD</Text>
                <View style={styles.tag}>
                    <Ionicons name="clipboard" size={12} color="white" style={{ marginRight: 4 }} />
                    <Text style={styles.tagText}>{activeTask ? activeTask.name.toUpperCase() : "FOCUS"}</Text>
                </View>
            </View>

            {/* Back button if from Planner */}
            {activeTask && !isActive && (
                <Pressable onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="black" />
                </Pressable>
            )}
        </View>
    );

    // ============================================
    // STATE A: IDLE UI
    // ============================================
    if (!isActive) {
        return (
            <View style={styles.container}>
                {renderHeader()}

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* TIMER CONTROL */}
                    <View style={styles.timerWrapper}>
                        <View style={styles.idleRing}>
                            <Text style={{ fontSize: 40, marginBottom: 10 }}>
                                {activeTask ? activeTask.emoji : PRESETS.find(p => p.duration === duration)?.icon || '⏱️'}
                            </Text>
                        </View>

                        <View style={styles.timeControlRow}>
                            <NeoButton style={styles.adjustBtn} onPress={() => setDuration(Math.max(1, duration - 5))}>
                                <Ionicons name="remove" size={32} color="black" />
                            </NeoButton>

                            <Text style={styles.idleTimeText}>{duration}:00</Text>

                            <NeoButton style={styles.adjustBtn} onPress={() => setDuration(duration + 5)}>
                                <Ionicons name="add" size={32} color="black" />
                            </NeoButton>
                        </View>
                    </View>

                    {/* ACTION BUTTONS */}
                    <View style={styles.actionRow}>
                        <NeoButton style={styles.actionBtn} onPress={() => setDuration(25)}>
                            <Ionicons name="refresh" size={24} color="black" />
                        </NeoButton>

                        <NeoButton style={[styles.actionBtn, styles.playBtn]} onPress={handleStart}>
                            <Ionicons name="play" size={32} color="black" style={{ marginLeft: 4 }} />
                        </NeoButton>

                        <NeoButton style={styles.actionBtn} onPress={() => { }}>
                            <Ionicons name="lock-closed-outline" size={24} color="black" />
                        </NeoButton>
                    </View>

                    {/* SHOW PRESETS ONLY IF NO ACTIVE TASK (OR ALWAYS?) Using presets overrides task settings */}
                    <Text style={styles.sectionHeader}>FOCUS PRESETS</Text>
                    <View style={styles.presetGrid}>
                        {PRESETS.map((p) => (
                            <Pressable
                                key={p.id}
                                style={[
                                    styles.presetCard,
                                    duration === p.duration && { borderColor: p.color, borderWidth: 4 }
                                ]}
                                onPress={() => {
                                    setDuration(p.duration);
                                }}
                            >
                                <Text style={{ fontSize: 24, marginBottom: 4 }}>{p.icon}</Text>
                                <Text style={[styles.presetName, { color: p.color }]}>{p.name}</Text>
                                <Text style={styles.presetDuration}>{p.duration}m</Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* SESSION CONFIGURATION */}
                    <Text style={[styles.sectionHeader, { marginTop: 30 }]}>SESSION SETTINGS</Text>
                    <View style={styles.configRow}>
                        <View style={styles.configItem}>
                            <Text style={styles.configLabel}>SESSIONS</Text>
                            <View style={styles.configControl}>
                                <NeoButton
                                    style={styles.configBtn}
                                    onPress={() => setSessionCount(Math.max(1, sessionCount - 1))}
                                >
                                    <Ionicons name="remove" size={20} color="black" />
                                </NeoButton>
                                <Text style={styles.configValue}>{sessionCount}</Text>
                                <NeoButton
                                    style={styles.configBtn}
                                    onPress={() => setSessionCount(Math.min(10, sessionCount + 1))}
                                >
                                    <Ionicons name="add" size={20} color="black" />
                                </NeoButton>
                            </View>
                        </View>

                        <View style={styles.configItem}>
                            <Text style={styles.configLabel}>BREAK (MIN)</Text>
                            <View style={styles.configControl}>
                                <NeoButton
                                    style={styles.configBtn}
                                    onPress={() => setBreakDuration(Math.max(1, breakDuration - 1))}
                                >
                                    <Ionicons name="remove" size={20} color="black" />
                                </NeoButton>
                                <Text style={styles.configValue}>{breakDuration}</Text>
                                <NeoButton
                                    style={styles.configBtn}
                                    onPress={() => setBreakDuration(Math.min(30, breakDuration + 1))}
                                >
                                    <Ionicons name="add" size={20} color="black" />
                                </NeoButton>
                            </View>
                        </View>
                    </View>

                    <Text style={[styles.sectionHeader, { marginTop: 30 }]}>AMBIENT SOUNDS</Text>
                    <View style={styles.soundRow}>
                        {AMBIENT_SOUNDS.map(s => (
                            <Pressable
                                key={s.id}
                                style={[
                                    styles.soundPill,
                                    selectedSound.id === s.id && { backgroundColor: NEO_BLACK }
                                ]}
                                onPress={() => setSelectedSound(s)}
                            >
                                <Text style={{ fontSize: 16, marginRight: 6 }}>{s.icon}</Text>
                                <Text style={[
                                    styles.soundText,
                                    selectedSound.id === s.id && { color: NEO_WHITE }
                                ]}>{s.name}</Text>
                            </Pressable>
                        ))}
                    </View>
                    <View style={{ height: 100 }} />
                </ScrollView>
            </View>
        );
    }

    // ============================================
    // STATE B: ACTIVE UI
    // ============================================
    const progress = 1 - (timeRemaining / (duration * 60));

    // Calculate stats based on current settings
    // When starting: if sessionCount=4 and completedSessions=0, we want to show 3 remaining (4 total - 1 active)
    const remainingSessions = Math.max(0, sessionCount - completedSessions - 1);
    const totalTimeMinutes = Math.floor(elapsedTime / 60);
    const totalTimeHours = Math.floor(totalTimeMinutes / 60);
    const displayMinutes = totalTimeMinutes % 60;
    const timeDisplay = totalTimeHours > 0 ? `${totalTimeHours}h ${displayMinutes}m` : `${totalTimeMinutes}m`;

    // Points: 50 per completed session + 50 for current session when done
    const estimatedPoints = (completedSessions * 50) + 50;

    return (
        <View style={styles.container}>
            {renderHeader()}

            <View style={[styles.scrollContent, { justifyContent: 'center', flex: 1 }]}>

                {/* ACTIVE TIMER */}
                <View style={styles.activeTimerWrapper}>
                    <ProgressRing
                        progress={progress}
                        size={ACTIVE_TIMER_SIZE}
                        color={NEO_ORANGE}
                        strokeWidth={16}
                    />

                    <View style={styles.activeTimerContent}>
                        <Text style={{ fontSize: 48, marginBottom: 10 }}>{activeTask ? activeTask.emoji : '🍅'}</Text>
                        <Text style={styles.activeTimeText}>{formatTime(timeRemaining)}</Text>

                        {activeTask && (
                            <View style={styles.taskNameTag}>
                                <Text style={styles.taskNameLabel}>FOCUSING ON:</Text>
                                <Text style={styles.taskNameText}>{activeTask.name}</Text>
                            </View>
                        )}

                        <View style={styles.statusTag}>
                            <Text style={styles.statusTagText}>STATUS: WORKING</Text>
                        </View>
                    </View>
                </View>

                {/* INFO BOXES */}
                <View style={styles.infoBox}>
                    <Text style={styles.infoLabel}>REMAINING SESSIONS</Text>
                    <Text style={styles.infoValue}>{remainingSessions.toString().padStart(2, '0')}</Text>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={[styles.statLabel, { color: '#8B0000' }]}>SESSIONS</Text>
                        <Text style={styles.statValue}>{completedSessions.toString().padStart(2, '0')}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statLabel, { color: NEO_TEAL }]}>TIME</Text>
                        <Text style={styles.statValue}>{timeDisplay}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={[styles.statLabel, { color: NEO_GREEN }]}>POINTS</Text>
                        <Text style={styles.statValue}>+{estimatedPoints}</Text>
                    </View>
                </View>

                <Pressable onPress={handleStopAttempt} style={({ pressed }) => [
                    styles.stopBtn,
                    pressed && { transform: [{ translateY: 4 }, { translateX: 4 }], shadowOpacity: 0 }
                ]}>
                    <View style={styles.stopIcon} />
                    <Text style={styles.stopText}>STOP SESSION</Text>
                </Pressable>
            </View>

            <GiveUpModal
                visible={showGiveUp}
                onCancel={() => setShowGiveUp(false)}
                onConfirm={handleStopConfirm}
            />
        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NEO_WHITE,
        paddingTop: 60,
    },
    scrollContent: {
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    // HEADER
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
        width: '100%',
    },
    avatarBox: {
        width: 48,
        height: 48,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '900',
    },
    appTitle: {
        fontSize: 24,
        fontWeight: '900',
    },
    tag: {
        flexDirection: 'row',
        backgroundColor: NEO_BLACK,
        paddingHorizontal: 6,
        paddingVertical: 2,
        alignSelf: 'flex-start',
        marginTop: 4,
        alignItems: 'center',
    },
    tagText: {
        color: NEO_WHITE,
        fontWeight: '800',
        fontSize: 12,
    },
    closeBtn: {
        marginLeft: 'auto',
        padding: 8,
    },

    // IDLE TIMER
    timerWrapper: {
        width: TIMER_SIZE,
        height: TIMER_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        marginTop: 20,
    },
    idleRing: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: TIMER_SIZE / 2,
        borderWidth: 12,
        borderColor: NEO_BLACK,
        alignItems: 'center',
        paddingTop: 40,
    },
    timeControlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '130%',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    idleTimeText: {
        fontSize: 64,
        fontWeight: '900',
        fontFamily: 'monospace',
        letterSpacing: -2,
    },
    adjustBtn: {
        width: 60,
        height: 60,
        backgroundColor: NEO_WHITE,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },

    // ACTIONS
    actionRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 40,
    },
    actionBtn: {
        width: 60,
        height: 60,
        backgroundColor: NEO_WHITE,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        borderRadius: 8,
    },
    playBtn: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },

    // HEADERS
    sectionHeader: {
        fontSize: 16,
        fontWeight: '900',
        alignSelf: 'flex-start',
        marginBottom: 12,
        textTransform: 'uppercase',
    },

    // PRESETS
    presetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        width: '100%',
    },
    presetCard: {
        width: '22%',
        aspectRatio: 1,
        backgroundColor: NEO_BLACK,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#333',
    },
    presetName: {
        fontSize: 10,
        fontWeight: '800',
        marginTop: 4,
    },
    presetDuration: {
        fontSize: 10,
        color: '#FFF',
        fontWeight: 'bold',
    },

    // SOUNDS
    soundRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        gap: 8,
    },
    soundPill: {
        flex: 1,
        height: 48,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#DDD',
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    soundText: {
        fontWeight: '900',
        fontSize: 14,
    },

    // ACTIVE UI
    activeTimerWrapper: {
        width: ACTIVE_TIMER_SIZE,
        height: ACTIVE_TIMER_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    activeTimerContent: {
        alignItems: 'center',
    },
    activeTimeText: {
        fontSize: 72,
        fontWeight: '900',
        fontFamily: 'monospace',
    },
    statusTag: {
        backgroundColor: NEO_BLACK,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginTop: 10,
        transform: [{ rotate: '-2deg' }],
    },
    statusTagText: {
        color: NEO_WHITE,
        fontWeight: '900',
        fontSize: 14,
    },
    taskNameTag: {
        backgroundColor: NEO_TEAL,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginTop: 12,
        borderWidth: 3,
        borderColor: NEO_BLACK,
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    taskNameLabel: {
        color: NEO_WHITE,
        fontWeight: '900',
        fontSize: 10,
        letterSpacing: 1,
        marginBottom: 2,
    },
    taskNameText: {
        color: NEO_WHITE,
        fontWeight: '900',
        fontSize: 16,
        textAlign: 'center',
    },

    // INFO BOXES
    infoBox: {
        width: '100%',
        backgroundColor: NEO_WHITE,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        padding: 12,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    infoLabel: {
        fontSize: 14,
        fontWeight: '900',
        color: NEO_CHOCOLATE,
        marginBottom: 4,
        letterSpacing: 1,
    },
    infoValue: {
        fontSize: 24,
        fontWeight: '900',
    },

    statsGrid: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
        marginBottom: 24,
    },
    statBox: {
        flex: 1,
        backgroundColor: NEO_WHITE,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        padding: 12,
        alignItems: 'center',
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '900',
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '900',
    },

    // STOP BTN
    stopBtn: {
        width: '100%',
        height: 60,
        backgroundColor: NEO_RED,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    stopIcon: {
        width: 16,
        height: 16,
        backgroundColor: NEO_WHITE,
        marginRight: 10,
    },
    stopText: {
        color: NEO_WHITE,
        fontWeight: '900',
        fontSize: 20,
        letterSpacing: 1,
    },

    // BUTTON
    neoButton: {
    },

    // MODAL
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        backgroundColor: NEO_WHITE,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        padding: 24,
        alignItems: 'center',
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 10, height: 10 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    warningStripe: {
        width: '110%',
        backgroundColor: NEO_RED,
        paddingVertical: 12,
        marginTop: -24,
        marginBottom: 20,
        borderWidth: 4,
        borderColor: NEO_BLACK,
    },
    warningStripeText: {
        fontSize: 16,
        fontWeight: '900',
        color: NEO_WHITE,
        textAlign: 'center',
        letterSpacing: 2,
    },
    modalTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: NEO_BLACK,
        marginBottom: 8,
    },
    modalText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalTag: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        marginBottom: 30,
    },
    modalTagText: {
        color: NEO_WHITE,
        fontWeight: '900',
        fontSize: 16,
    },
    modalActions: {
        flexDirection: 'row',
        width: '100%',
        gap: 16,
    },
    modalBtnCancel: {
        flex: 1,
        height: 56,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        backgroundColor: NEO_WHITE,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    modalBtnConfirm: {
        flex: 1,
        height: 56,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        backgroundColor: NEO_BLACK,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    modalBtnText: {
        fontSize: 18,
        fontWeight: '900',
    },

    // SESSION CONFIG
    configRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
        marginBottom: 20,
    },
    configItem: {
        flex: 1,
        backgroundColor: NEO_WHITE,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        padding: 12,
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    configLabel: {
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center',
    },
    configControl: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    configBtn: {
        width: 36,
        height: 36,
        backgroundColor: NEO_WHITE,
        borderWidth: 3,
        borderColor: NEO_BLACK,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    configValue: {
        fontSize: 24,
        fontWeight: '900',
        fontFamily: 'monospace',
    },

    // MODAL ENHANCEMENTS
    phraseBox: {
        backgroundColor: NEO_YELLOW,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        padding: 12,
        marginVertical: 16,
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    phraseText: {
        fontSize: 16,
        fontWeight: '900',
        textAlign: 'center',
        fontFamily: 'monospace',
    },
    typingInput: {
        width: '100%',
        borderWidth: 4,
        borderColor: NEO_BLACK,
        backgroundColor: NEO_WHITE,
        padding: 12,
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'monospace',
        textAlign: 'center',
    },
    ratingGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
        marginBottom: 20,
        justifyContent: 'center',
    },
    ratingBtn: {
        width: 60,
        height: 60,
        backgroundColor: NEO_WHITE,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    ratingBtnSelected: {
        backgroundColor: NEO_BLACK,
    },
    ratingBtnText: {
        fontSize: 16,
        fontWeight: '900',
        color: NEO_BLACK,
    },
    ratingBtnTextSelected: {
        color: NEO_WHITE,
    },
    completionSection: {
        width: '100%',
        marginTop: 16,
        padding: 16,
        backgroundColor: '#F5F5F5',
        borderWidth: 4,
        borderColor: NEO_BLACK,
    },
    completionTitle: {
        fontSize: 12,
        fontWeight: '900',
        marginBottom: 12,
        textAlign: 'center',
    },
    pointsPreview: {
        marginTop: 12,
        padding: 8,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        alignItems: 'center',
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    pointsPreviewText: {
        fontSize: 18,
        fontWeight: '900',
        color: NEO_BLACK,
    },
    modalBtnDisabled: {
        opacity: 0.5,
    },
});
