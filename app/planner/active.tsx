import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Pressable,
    TextInput,
    Alert,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
    FadeIn,
    FadeInUp,
    runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Colors, Spacing, BorderRadius, Shadows, FeatureColors } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlannerStore, CompletionRating } from '@/store/plannerStore';
import { usePointsStore, POINTS_CONFIG } from '@/store/pointsStore';

const { width, height } = Dimensions.get('window');

// Vertical Timer Component
interface VerticalTimerProps {
    totalSeconds: number;
    elapsedSeconds: number;
    color: string;
    isPaused: boolean;
}

function VerticalTimer({ totalSeconds, elapsedSeconds, color, isPaused }: VerticalTimerProps) {
    const progress = elapsedSeconds / totalSeconds;
    const fillHeight = useSharedValue(progress);

    // Pulsing when paused
    const pulseOpacity = useSharedValue(1);

    useEffect(() => {
        fillHeight.value = withTiming(progress, { duration: 500, easing: Easing.linear });
    }, [progress]);

    useEffect(() => {
        if (isPaused) {
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.5, { duration: 800 }),
                    withTiming(1, { duration: 800 })
                ),
                -1,
                true
            );
        } else {
            pulseOpacity.value = withTiming(1, { duration: 200 });
        }
    }, [isPaused]);

    const fillStyle = useAnimatedStyle(() => ({
        height: `${fillHeight.value * 100}%`,
    }));

    const containerStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    // Format remaining time
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return (
        <Animated.View style={[styles.verticalTimerContainer, containerStyle]}>
            {/* Timer Background */}
            <View style={styles.timerBg}>
                {/* Fill from bottom */}
                <Animated.View
                    style={[
                        styles.timerFill,
                        { backgroundColor: color },
                        fillStyle,
                    ]}
                />

                {/* Glass effect */}
                <View style={styles.timerGlass} />

                {/* Time Display */}
                <View style={styles.timeDisplay}>
                    <Text style={styles.timeText}>{timeString}</Text>
                    <Text style={styles.timeLabel}>remaining</Text>
                </View>
            </View>

            {/* Progress percentage */}
            <Text style={styles.progressPercent}>
                {Math.round(progress * 100)}%
            </Text>
        </Animated.View>
    );
}

// Completion Rating Modal
interface CompletionModalProps {
    visible: boolean;
    sessionNumber: number;
    totalSessions: number;
    breakDuration: number;
    onRate: (rating: CompletionRating) => void;
    onSkipBreak: () => void;
}

function CompletionModal({
    visible,
    sessionNumber,
    totalSessions,
    breakDuration,
    onRate,
    onSkipBreak
}: CompletionModalProps) {
    const [selectedRating, setSelectedRating] = useState<CompletionRating | null>(null);

    if (!visible) return null;

    const handleSubmit = () => {
        if (selectedRating) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onRate(selectedRating);
        }
    };

    const isLastSession = sessionNumber === totalSessions;

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.modalOverlay}
        >
            <Animated.View
                entering={FadeInUp.delay(100).springify()}
                style={styles.modalContent}
            >
                <Text style={styles.modalIcon}>🎉</Text>
                <Text style={styles.modalTitle}>Session Complete!</Text>
                <Text style={styles.modalSubtitle}>
                    Session {sessionNumber} of {totalSessions} finished
                </Text>

                <Text style={styles.ratingQuestion}>
                    How much did you complete?
                </Text>

                <View style={styles.ratingButtons}>
                    {([25, 50, 75, 100] as CompletionRating[]).map((rating) => (
                        <Pressable
                            key={rating}
                            style={[
                                styles.ratingButton,
                                selectedRating === rating && styles.ratingButtonSelected,
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelectedRating(rating);
                            }}
                        >
                            <Text style={[
                                styles.ratingText,
                                selectedRating === rating && styles.ratingTextSelected,
                            ]}>
                                {rating}%
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {selectedRating && (
                    <Animated.View entering={FadeIn.duration(200)}>
                        <View style={styles.pointsPreview}>
                            <Text style={styles.pointsPreviewText}>
                                +{POINTS_CONFIG.session[`completion${selectedRating}`]} points
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {!isLastSession && (
                    <View style={styles.breakInfo}>
                        <Ionicons name="cafe-outline" size={18} color={Colors.text.secondary} />
                        <Text style={styles.breakText}>
                            {breakDuration} minute break, then Session {sessionNumber + 1}
                        </Text>
                    </View>
                )}

                <Pressable
                    style={[
                        styles.continueButton,
                        !selectedRating && styles.continueButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={!selectedRating}
                >
                    <Text style={styles.continueButtonText}>
                        {isLastSession ? 'Complete Task' : `Start Break (${breakDuration}:00)`}
                    </Text>
                </Pressable>

                {!isLastSession && (
                    <Pressable style={styles.skipBreakButton} onPress={onSkipBreak}>
                        <Text style={styles.skipBreakText}>Skip break & continue →</Text>
                    </Pressable>
                )}
            </Animated.View>
        </Animated.View>
    );
}

// Skip Task Modal with Typing Challenge
interface SkipModalProps {
    visible: boolean;
    phrase: string;
    onComplete: () => void;
    onCancel: () => void;
}

function SkipModal({ visible, phrase, onComplete, onCancel }: SkipModalProps) {
    const [typed, setTyped] = useState('');
    const isMatch = typed.toLowerCase().trim() === phrase.toLowerCase().trim();

    if (!visible) return null;

    const handleSubmit = () => {
        if (isMatch) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onComplete();
        }
    };

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.modalOverlay}
        >
            <Animated.View
                entering={FadeInUp.delay(100).springify()}
                style={styles.skipModalContent}
            >
                <Text style={styles.skipModalIcon}>⚠️</Text>
                <Text style={styles.skipModalTitle}>Skip This Task?</Text>
                <Text style={styles.skipModalSubtitle}>
                    Type the phrase below to confirm
                </Text>

                <View style={styles.phraseBox}>
                    <Text style={styles.phraseText}>"{phrase}"</Text>
                </View>

                <TextInput
                    style={[styles.skipInput, isMatch && styles.skipInputMatch]}
                    placeholder="Type the phrase..."
                    placeholderTextColor={Colors.gray[400]}
                    value={typed}
                    onChangeText={setTyped}
                    autoFocus
                />

                <View style={styles.penaltyInfo}>
                    <Ionicons name="warning" size={16} color={Colors.accent.red} />
                    <Text style={styles.penaltyText}>-50 points for skipping</Text>
                </View>

                <View style={styles.skipActions}>
                    <Pressable style={styles.cancelButton} onPress={onCancel}>
                        <Text style={styles.cancelButtonText}>Go Back</Text>
                    </Pressable>

                    <Pressable
                        style={[
                            styles.confirmSkipButton,
                            !isMatch && styles.confirmSkipButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={!isMatch}
                    >
                        <Text style={styles.confirmSkipText}>Skip Task</Text>
                    </Pressable>
                </View>
            </Animated.View>
        </Animated.View>
    );
}

// Main Active Session Screen
export default function ActiveSessionScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const params = useLocalSearchParams<{ taskId: string; date: string }>();

    const { taskId, date } = params;

    // Store hooks
    const task = usePlannerStore(state => state.getTask(taskId || '', date || ''));
    const startSession = usePlannerStore(state => state.startSession);
    const completeSession = usePlannerStore(state => state.completeSession);
    const skipTask = usePlannerStore(state => state.skipTask);
    const completeTask = usePlannerStore(state => state.completeTask);
    const startBreak = usePlannerStore(state => state.startBreak);
    const endBreak = usePlannerStore(state => state.endBreak);
    const isOnBreak = usePlannerStore(state => state.isOnBreak);
    const breakEndsAt = usePlannerStore(state => state.breakEndsAt);

    const recordSessionCompleted = usePointsStore(state => state.recordSessionCompleted);
    const recordTaskStarted = usePointsStore(state => state.recordTaskStarted);
    const recordTaskCompleted = usePointsStore(state => state.recordTaskCompleted);

    // Local state
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [showSkipModal, setShowSkipModal] = useState(false);
    const [breakSecondsLeft, setBreakSecondsLeft] = useState(0);

    // Get current session
    const currentSessionIndex = task?.currentSessionIndex || 0;
    const currentSession = task?.sessions[currentSessionIndex];
    const totalSeconds = (task?.focusConfig.sessionDuration || 25) * 60;

    // Start session on mount
    useEffect(() => {
        if (task && taskId && date && currentSession?.status === 'pending') {
            startSession(taskId, date, currentSessionIndex);

            // Record task started (check if on time)
            const now = new Date();
            const taskStartMinutes = task.startTime.hour * 60 + task.startTime.minute;
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const onTime = currentMinutes <= taskStartMinutes + 5;
            recordTaskStarted(date, onTime);
        }
    }, []);

    // Timer effect
    useEffect(() => {
        if (isPaused || isOnBreak || showCompletionModal) return;

        const timer = setInterval(() => {
            setElapsedSeconds(prev => {
                const next = prev + 1;
                if (next >= totalSeconds) {
                    // Session complete
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setShowCompletionModal(true);
                    return prev;
                }
                return next;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isPaused, isOnBreak, showCompletionModal, totalSeconds]);

    // Break timer effect
    useEffect(() => {
        if (!isOnBreak || !breakEndsAt) return;

        const timer = setInterval(() => {
            const now = Date.now();
            const end = new Date(breakEndsAt).getTime();
            const remaining = Math.max(0, Math.floor((end - now) / 1000));
            setBreakSecondsLeft(remaining);

            if (remaining <= 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                endBreak();
                // Start next session
                if (task && taskId && date) {
                    const nextIndex = currentSessionIndex + 1;
                    if (nextIndex < task.sessions.length) {
                        startSession(taskId, date, nextIndex);
                        setElapsedSeconds(0);
                    }
                }
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isOnBreak, breakEndsAt]);

    const handlePause = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsPaused(p => !p);
    };

    const handleEndSession = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setShowCompletionModal(true);
    };

    const handleRateSession = (rating: CompletionRating) => {
        if (!task || !taskId || !date) return;

        setShowCompletionModal(false);

        // Record in stores
        const focusMinutes = Math.floor(elapsedSeconds / 60);
        completeSession(taskId, date, currentSessionIndex, rating);
        recordSessionCompleted(date, rating, focusMinutes, false);

        // Check if this was the last session
        const isLastSession = currentSessionIndex === task.sessions.length - 1;

        if (isLastSession) {
            // Task complete!
            completeTask(taskId, date);
            recordTaskCompleted(date);
            router.back();
        } else {
            // Start break
            startBreak(task.focusConfig.breakDuration);
        }
    };

    const handleSkipBreak = () => {
        if (!task || !taskId || !date) return;

        setShowCompletionModal(false);
        endBreak();

        // Start next session immediately
        const nextIndex = currentSessionIndex + 1;
        if (nextIndex < task.sessions.length) {
            startSession(taskId, date, nextIndex);
            setElapsedSeconds(0);
        }
    };

    const handleShowSkipModal = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setIsPaused(true);
        setShowSkipModal(true);
    };

    const handleConfirmSkip = () => {
        if (!taskId || !date) return;

        setShowSkipModal(false);
        skipTask(taskId, date);
        router.back();
    };

    if (!task) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Task not found</Text>
            </View>
        );
    }

    const formatBreakTime = () => {
        const mins = Math.floor(breakSecondsLeft / 60);
        const secs = breakSecondsLeft % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <Animated.View
                entering={FadeInUp.delay(100).springify()}
                style={styles.header}
            >
                <Pressable style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color={Colors.text.inverse} />
                </Pressable>

                <View style={styles.sessionInfo}>
                    <Text style={styles.sessionLabel}>
                        Session {currentSessionIndex + 1} of {task.sessions.length}
                    </Text>
                </View>
            </Animated.View>

            {/* Task Info */}
            <Animated.View
                entering={FadeInUp.delay(200).springify()}
                style={styles.taskInfo}
            >
                <Text style={styles.taskEmoji}>{task.emoji}</Text>
                <Text style={styles.taskName}>{task.name}</Text>
                {task.description && (
                    <Text style={styles.taskDescription}>{task.description}</Text>
                )}
            </Animated.View>

            {/* Timer or Break */}
            {isOnBreak ? (
                <Animated.View
                    entering={FadeIn.duration(300)}
                    style={styles.breakContainer}
                >
                    <Text style={styles.breakIcon}>☕</Text>
                    <Text style={styles.breakTitle}>Break Time</Text>
                    <Text style={styles.breakTimer}>{formatBreakTime()}</Text>
                    <Text style={styles.breakSubtext}>
                        Session {currentSessionIndex + 2} starts after break
                    </Text>

                    <Pressable
                        style={styles.skipBreakMainButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            handleSkipBreak();
                        }}
                    >
                        <Text style={styles.skipBreakMainText}>Skip Break</Text>
                    </Pressable>
                </Animated.View>
            ) : (
                <Animated.View
                    entering={FadeIn.delay(300).duration(500)}
                    style={styles.timerArea}
                >
                    <VerticalTimer
                        totalSeconds={totalSeconds}
                        elapsedSeconds={elapsedSeconds}
                        color={task.color}
                        isPaused={isPaused}
                    />
                </Animated.View>
            )}

            {/* Blocked Apps Indicator */}
            {task.blockingConfig.enabled && !isOnBreak && (
                <Animated.View
                    entering={FadeInUp.delay(400).springify()}
                    style={styles.blockingIndicator}
                >
                    <Ionicons name="shield-checkmark" size={16} color={FeatureColors.blocker.primary} />
                    <Text style={styles.blockingText}>
                        {task.blockingConfig.blockedApps.length} apps blocked
                    </Text>
                </Animated.View>
            )}

            {/* Controls */}
            {!isOnBreak && (
                <Animated.View
                    entering={FadeInUp.delay(500).springify()}
                    style={styles.controls}
                >
                    <Pressable
                        style={[styles.controlButton, styles.pauseButton]}
                        onPress={handlePause}
                    >
                        <Ionicons
                            name={isPaused ? 'play' : 'pause'}
                            size={28}
                            color={Colors.text.inverse}
                        />
                        <Text style={styles.controlText}>
                            {isPaused ? 'Resume' : 'Pause'}
                        </Text>
                    </Pressable>

                    <Pressable
                        style={[styles.controlButton, styles.endButton]}
                        onPress={handleEndSession}
                    >
                        <Ionicons name="stop" size={28} color={Colors.text.inverse} />
                        <Text style={styles.controlText}>End</Text>
                    </Pressable>
                </Animated.View>
            )}

            {/* Skip Task Button */}
            {!isOnBreak && (
                <Pressable style={styles.skipButton} onPress={handleShowSkipModal}>
                    <Text style={styles.skipButtonText}>❌ I can't do this</Text>
                </Pressable>
            )}

            {/* Completion Modal */}
            <CompletionModal
                visible={showCompletionModal}
                sessionNumber={currentSessionIndex + 1}
                totalSessions={task.sessions.length}
                breakDuration={task.focusConfig.breakDuration}
                onRate={handleRateSession}
                onSkipBreak={handleSkipBreak}
            />

            {/* Skip Modal */}
            <SkipModal
                visible={showSkipModal}
                phrase={task.skipTaskConfig.typingPhrase}
                onComplete={handleConfirmSkip}
                onCancel={() => {
                    setShowSkipModal(false);
                    setIsPaused(false);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    containerDark: {
        backgroundColor: '#0f0f1a',
    },
    errorText: {
        color: Colors.text.inverse,
        fontSize: 16,
        textAlign: 'center',
        marginTop: 100,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: Spacing[4],
        paddingBottom: Spacing[4],
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sessionInfo: {
        flex: 1,
        alignItems: 'center',
    },
    sessionLabel: {
        fontSize: 14,
        color: Colors.gray[400],
        fontWeight: '500',
    },

    // Task Info
    taskInfo: {
        alignItems: 'center',
        paddingHorizontal: Spacing[6],
        marginBottom: Spacing[6],
    },
    taskEmoji: {
        fontSize: 48,
        marginBottom: Spacing[2],
    },
    taskName: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text.inverse,
        textAlign: 'center',
    },
    taskDescription: {
        fontSize: 14,
        color: Colors.gray[400],
        textAlign: 'center',
        marginTop: Spacing[1],
    },

    // Timer Area
    timerArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Vertical Timer
    verticalTimerContainer: {
        alignItems: 'center',
    },
    timerBg: {
        width: 120,
        height: 280,
        backgroundColor: Colors.gray[800],
        borderRadius: 60,
        overflow: 'hidden',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderRadius: 60,
    },
    timerGlass: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    timeDisplay: {
        alignItems: 'center',
        zIndex: 10,
    },
    timeText: {
        fontSize: 36,
        fontWeight: '700',
        color: Colors.text.inverse,
    },
    timeLabel: {
        fontSize: 12,
        color: Colors.gray[400],
        marginTop: 4,
    },
    progressPercent: {
        marginTop: Spacing[4],
        fontSize: 16,
        fontWeight: '600',
        color: Colors.gray[400],
    },

    // Break
    breakContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    breakIcon: {
        fontSize: 64,
        marginBottom: Spacing[4],
    },
    breakTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text.inverse,
        marginBottom: Spacing[2],
    },
    breakTimer: {
        fontSize: 56,
        fontWeight: '700',
        color: Colors.accent.green,
    },
    breakSubtext: {
        fontSize: 14,
        color: Colors.gray[400],
        marginTop: Spacing[4],
    },
    skipBreakMainButton: {
        marginTop: Spacing[6],
        paddingHorizontal: Spacing[6],
        paddingVertical: Spacing[3],
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: BorderRadius.xl,
    },
    skipBreakMainText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.inverse,
    },

    // Blocking Indicator
    blockingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing[2],
        marginBottom: Spacing[6],
    },
    blockingText: {
        fontSize: 14,
        color: FeatureColors.blocker.primary,
    },

    // Controls
    controls: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: Spacing[6],
        marginBottom: Spacing[6],
    },
    controlButton: {
        alignItems: 'center',
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
    },
    pauseButton: {
        backgroundColor: Colors.gray[700],
    },
    endButton: {
        backgroundColor: Colors.accent.red,
    },
    controlText: {
        fontSize: 12,
        color: Colors.text.inverse,
        marginTop: 4,
    },

    // Skip Button
    skipButton: {
        alignItems: 'center',
        paddingVertical: Spacing[4],
        marginBottom: 40,
    },
    skipButtonText: {
        fontSize: 14,
        color: Colors.gray[500],
    },

    // Modal Overlay
    modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing[4],
    },

    // Completion Modal
    modalContent: {
        width: '100%',
        backgroundColor: Colors.gray[800],
        borderRadius: BorderRadius['2xl'],
        padding: Spacing[6],
        alignItems: 'center',
    },
    modalIcon: {
        fontSize: 56,
        marginBottom: Spacing[3],
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text.inverse,
        marginBottom: Spacing[1],
    },
    modalSubtitle: {
        fontSize: 14,
        color: Colors.gray[400],
        marginBottom: Spacing[6],
    },
    ratingQuestion: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text.inverse,
        marginBottom: Spacing[4],
    },
    ratingButtons: {
        flexDirection: 'row',
        gap: Spacing[3],
        marginBottom: Spacing[4],
    },
    ratingButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.gray[700],
        alignItems: 'center',
        justifyContent: 'center',
    },
    ratingButtonSelected: {
        backgroundColor: FeatureColors.focus.primary,
    },
    ratingText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.gray[400],
    },
    ratingTextSelected: {
        color: Colors.text.inverse,
    },
    pointsPreview: {
        backgroundColor: Colors.accent.green + '20',
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[2],
        borderRadius: BorderRadius.full,
        marginBottom: Spacing[4],
    },
    pointsPreviewText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.accent.green,
    },
    breakInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[2],
        marginBottom: Spacing[6],
    },
    breakText: {
        fontSize: 14,
        color: Colors.gray[400],
    },
    continueButton: {
        width: '100%',
        backgroundColor: FeatureColors.focus.primary,
        paddingVertical: Spacing[4],
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
    },
    continueButtonDisabled: {
        opacity: 0.5,
    },
    continueButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.inverse,
    },
    skipBreakButton: {
        marginTop: Spacing[3],
        paddingVertical: Spacing[2],
    },
    skipBreakText: {
        fontSize: 14,
        color: Colors.gray[400],
    },

    // Skip Modal
    skipModalContent: {
        width: '100%',
        backgroundColor: Colors.gray[800],
        borderRadius: BorderRadius['2xl'],
        padding: Spacing[6],
        alignItems: 'center',
    },
    skipModalIcon: {
        fontSize: 48,
        marginBottom: Spacing[3],
    },
    skipModalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.text.inverse,
        marginBottom: Spacing[1],
    },
    skipModalSubtitle: {
        fontSize: 14,
        color: Colors.gray[400],
        marginBottom: Spacing[4],
    },
    phraseBox: {
        backgroundColor: Colors.gray[700],
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[3],
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing[4],
        width: '100%',
    },
    phraseText: {
        fontSize: 14,
        color: Colors.text.inverse,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    skipInput: {
        width: '100%',
        backgroundColor: Colors.gray[700],
        borderRadius: BorderRadius.lg,
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[3],
        fontSize: 14,
        color: Colors.text.inverse,
        borderWidth: 2,
        borderColor: 'transparent',
        marginBottom: Spacing[3],
    },
    skipInputMatch: {
        borderColor: Colors.accent.green,
    },
    penaltyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[2],
        marginBottom: Spacing[6],
    },
    penaltyText: {
        fontSize: 14,
        color: Colors.accent.red,
        fontWeight: '500',
    },
    skipActions: {
        flexDirection: 'row',
        gap: Spacing[3],
        width: '100%',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: Colors.gray[700],
        paddingVertical: Spacing[3],
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.inverse,
    },
    confirmSkipButton: {
        flex: 1,
        backgroundColor: Colors.accent.red,
        paddingVertical: Spacing[3],
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
    },
    confirmSkipButtonDisabled: {
        opacity: 0.5,
    },
    confirmSkipText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.inverse,
    },
});
