import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
    Vibration,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    withSpring,
    Easing,
    runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Colors, Spacing, BorderRadius, Shadows, FeatureColors } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAlarmStore } from '@/store/alarmStore';

const { width, height } = Dimensions.get('window');

// Math Problem Generator
function generateMathProblem(difficulty: string): { question: string; answer: number } {
    const getRandomInt = (min: number, max: number) =>
        Math.floor(Math.random() * (max - min + 1)) + min;

    switch (difficulty) {
        case 'easy': {
            const a = getRandomInt(1, 20);
            const b = getRandomInt(1, 20);
            const ops = ['+', '-'];
            const op = ops[getRandomInt(0, 1)];
            if (op === '+') return { question: `${a} + ${b}`, answer: a + b };
            return { question: `${Math.max(a, b)} - ${Math.min(a, b)}`, answer: Math.abs(a - b) };
        }
        case 'medium': {
            const a = getRandomInt(10, 50);
            const b = getRandomInt(2, 12);
            const ops = ['+', '-', '×'];
            const op = ops[getRandomInt(0, 2)];
            if (op === '+') return { question: `${a} + ${b}`, answer: a + b };
            if (op === '-') return { question: `${a} - ${b}`, answer: a - b };
            return { question: `${a} × ${b}`, answer: a * b };
        }
        case 'hard': {
            const a = getRandomInt(10, 99);
            const b = getRandomInt(10, 99);
            const c = getRandomInt(2, 9);
            const ops = ['×', '+', '-'];
            const op = ops[getRandomInt(0, 2)];
            if (op === '×') return { question: `${a} × ${c}`, answer: a * c };
            if (op === '+') return { question: `${a} + ${b}`, answer: a + b };
            return { question: `${a} - ${b}`, answer: a - b };
        }
        case 'extreme': {
            const a = getRandomInt(50, 999);
            const b = getRandomInt(50, 999);
            return { question: `${a} + ${b}`, answer: a + b };
        }
        default:
            return { question: '5 + 5', answer: 10 };
    }
}

// Shake Detection Component
interface ShakeTaskProps {
    intensity: string;
    duration: number;
    onComplete: () => void;
}

function ShakeTask({ intensity, duration, onComplete }: ShakeTaskProps) {
    const [shakeCount, setShakeCount] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(duration);
    const targetShakes = intensity === 'light' ? 20 : intensity === 'medium' ? 40 : 60;
    const progress = Math.min(shakeCount / targetShakes, 1);

    // Simulated shake detection (in real app, use expo-sensors)
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeRemaining(t => {
                if (t <= 1) {
                    clearInterval(timer);
                    if (shakeCount >= targetShakes) {
                        onComplete();
                    }
                    return 0;
                }
                return t - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [shakeCount, targetShakes, onComplete]);

    // Simulate shake with button press (real app uses accelerometer)
    const handleShake = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setShakeCount(c => {
            const newCount = c + 1;
            if (newCount >= targetShakes) {
                onComplete();
            }
            return newCount;
        });
    };

    return (
        <View style={styles.taskContainer}>
            <Text style={styles.taskTitle}>📳 Shake Your Phone!</Text>
            <Text style={styles.taskSubtitle}>
                {intensity.charAt(0).toUpperCase() + intensity.slice(1)} intensity
            </Text>

            <View style={styles.progressCircle}>
                <View style={[styles.progressFill, { height: `${progress * 100}%` }]} />
                <Text style={styles.progressText}>{shakeCount}/{targetShakes}</Text>
            </View>

            <Text style={styles.timerText}>{timeRemaining}s remaining</Text>

            {/* Simulated shake button for demo */}
            <Pressable style={styles.shakeButton} onPress={handleShake}>
                <Text style={styles.shakeButtonText}>TAP TO SHAKE (Demo)</Text>
            </Pressable>
        </View>
    );
}

// Math Task Component
interface MathTaskProps {
    difficulty: string;
    count: number;
    onComplete: () => void;
}

function MathTask({ difficulty, count, onComplete }: MathTaskProps) {
    const [currentProblem, setCurrentProblem] = useState(() => generateMathProblem(difficulty));
    const [userAnswer, setUserAnswer] = useState('');
    const [solvedCount, setSolvedCount] = useState(0);
    const [isWrong, setIsWrong] = useState(false);

    const handleDigit = (digit: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (digit === 'clear') {
            setUserAnswer('');
            setIsWrong(false);
        } else if (digit === 'back') {
            setUserAnswer(a => a.slice(0, -1));
            setIsWrong(false);
        } else if (digit === '-' && userAnswer === '') {
            setUserAnswer('-');
        } else {
            setUserAnswer(a => a + digit);
        }
    };

    const handleSubmit = () => {
        const answer = parseInt(userAnswer, 10);
        if (answer === currentProblem.answer) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const newCount = solvedCount + 1;
            setSolvedCount(newCount);

            if (newCount >= count) {
                onComplete();
            } else {
                setCurrentProblem(generateMathProblem(difficulty));
                setUserAnswer('');
            }
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setIsWrong(true);
            setUserAnswer('');
        }
    };

    return (
        <View style={styles.taskContainer}>
            <Text style={styles.taskTitle}>🧮 Solve Math Problems</Text>
            <Text style={styles.taskSubtitle}>
                Problem {solvedCount + 1} of {count}
            </Text>

            <View style={[styles.problemCard, isWrong && styles.problemCardWrong]}>
                <Text style={styles.problemText}>{currentProblem.question} = ?</Text>
            </View>

            <View style={[styles.answerDisplay, isWrong && styles.answerDisplayWrong]}>
                <Text style={styles.answerText}>{userAnswer || '?'}</Text>
            </View>

            {/* Number Pad */}
            <View style={styles.numberPad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', 'back'].map((key) => (
                    <Pressable
                        key={key}
                        style={styles.numKey}
                        onPress={() => handleDigit(key)}
                    >
                        <Text style={styles.numKeyText}>
                            {key === 'back' ? '⌫' : key}
                        </Text>
                    </Pressable>
                ))}
            </View>

            <Pressable
                style={[styles.submitButton, !userAnswer && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!userAnswer}
            >
                <Text style={styles.submitButtonText}>Submit</Text>
            </Pressable>
        </View>
    );
}

// Breathing Task Component
interface BreathingTaskProps {
    cycles: number;
    inhale: number;
    hold: number;
    exhale: number;
    onComplete: () => void;
}

function BreathingTask({ cycles, inhale, hold, exhale, onComplete }: BreathingTaskProps) {
    const [currentCycle, setCurrentCycle] = useState(1);
    const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
    const [countdown, setCountdown] = useState(inhale);

    const scale = useSharedValue(1);

    useEffect(() => {
        const phaseDuration = phase === 'inhale' ? inhale : phase === 'hold' ? hold : exhale;

        if (phase === 'inhale') {
            scale.value = withTiming(1.5, { duration: inhale * 1000, easing: Easing.inOut(Easing.ease) });
        } else if (phase === 'exhale') {
            scale.value = withTiming(1, { duration: exhale * 1000, easing: Easing.inOut(Easing.ease) });
        }

        const timer = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    // Move to next phase
                    if (phase === 'inhale') {
                        setPhase('hold');
                        return hold;
                    } else if (phase === 'hold') {
                        setPhase('exhale');
                        return exhale;
                    } else {
                        // Exhale complete, next cycle or complete
                        if (currentCycle >= cycles) {
                            onComplete();
                            return 0;
                        } else {
                            setCurrentCycle(c => c + 1);
                            setPhase('inhale');
                            return inhale;
                        }
                    }
                }
                return c - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [phase, currentCycle, cycles, inhale, hold, exhale, onComplete]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const phaseColors = {
        inhale: Colors.accent.cyan,
        hold: Colors.accent.purple,
        exhale: Colors.accent.green,
    };

    return (
        <View style={styles.taskContainer}>
            <Text style={styles.taskTitle}>🧘 Breathing Exercise</Text>
            <Text style={styles.taskSubtitle}>
                Cycle {currentCycle} of {cycles}
            </Text>

            <Animated.View
                style={[
                    styles.breathCircle,
                    { backgroundColor: phaseColors[phase] + '40' },
                    animatedStyle,
                ]}
            >
                <Text style={[styles.phaseText, { color: phaseColors[phase] }]}>
                    {phase.toUpperCase()}
                </Text>
                <Text style={styles.countdownText}>{countdown}</Text>
            </Animated.View>

            <Text style={styles.phaseInstruction}>
                {phase === 'inhale' && 'Breathe in slowly...'}
                {phase === 'hold' && 'Hold your breath...'}
                {phase === 'exhale' && 'Breathe out slowly...'}
            </Text>
        </View>
    );
}

// Typing Task Component
interface TypingTaskProps {
    text: string;
    onComplete: () => void;
}

function TypingTask({ text, onComplete }: TypingTaskProps) {
    const [typed, setTyped] = useState('');
    const isCorrect = typed.toLowerCase() === text.toLowerCase();

    useEffect(() => {
        if (isCorrect) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onComplete();
        }
    }, [isCorrect, onComplete]);

    const handleKeyPress = (key: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (key === 'BACK') {
            setTyped(t => t.slice(0, -1));
        } else if (key === 'SPACE') {
            setTyped(t => t + ' ');
        } else {
            setTyped(t => t + key);
        }
    };

    const keys = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('');

    return (
        <View style={styles.taskContainer}>
            <Text style={styles.taskTitle}>⌨️ Type to Dismiss</Text>
            <Text style={styles.taskSubtitle}>Type the phrase below</Text>

            <View style={styles.phraseBox}>
                <Text style={styles.phraseText}>"{text}"</Text>
            </View>

            <View style={[styles.inputDisplay, typed && styles.inputDisplayActive]}>
                <Text style={styles.inputText}>{typed || 'Start typing...'}</Text>
            </View>

            <View style={styles.keyboard}>
                <View style={styles.keyboardRow}>
                    {keys.slice(0, 10).map(key => (
                        <Pressable key={key} style={styles.keyboardKey} onPress={() => handleKeyPress(key)}>
                            <Text style={styles.keyText}>{key}</Text>
                        </Pressable>
                    ))}
                </View>
                <View style={styles.keyboardRow}>
                    {keys.slice(10, 19).map(key => (
                        <Pressable key={key} style={styles.keyboardKey} onPress={() => handleKeyPress(key)}>
                            <Text style={styles.keyText}>{key}</Text>
                        </Pressable>
                    ))}
                </View>
                <View style={styles.keyboardRow}>
                    {keys.slice(19).map(key => (
                        <Pressable key={key} style={styles.keyboardKey} onPress={() => handleKeyPress(key)}>
                            <Text style={styles.keyText}>{key}</Text>
                        </Pressable>
                    ))}
                    <Pressable style={styles.keyboardKey} onPress={() => handleKeyPress('BACK')}>
                        <Ionicons name="backspace" size={18} color={Colors.text.inverse} />
                    </Pressable>
                </View>
                <View style={styles.keyboardRow}>
                    <Pressable style={styles.spaceBar} onPress={() => handleKeyPress('SPACE')}>
                        <Text style={styles.keyText}>SPACE</Text>
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

import { usePointsStore } from '@/store/pointsStore';

// Main Alarm Ringing Screen
export default function AlarmRingingScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const params = useLocalSearchParams<{ id: string }>();

    const alarm = useAlarmStore(state => state.getAlarm(params.id || ''));
    const pointsStore = usePointsStore();
    const today = new Date().toISOString().split('T')[0];

    const [showTask, setShowTask] = useState(false);
    const [snoozesUsed, setSnoozesUsed] = useState(0);

    // Animations
    const pulseScale = useSharedValue(1);
    const bellRotation = useSharedValue(0);

    useEffect(() => {
        // Pulse animation
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.15, { duration: 500 }),
                withTiming(1, { duration: 500 })
            ),
            -1,
            true
        );

        // Bell shake animation
        bellRotation.value = withRepeat(
            withSequence(
                withTiming(-15, { duration: 100 }),
                withTiming(15, { duration: 100 }),
                withTiming(-10, { duration: 100 }),
                withTiming(10, { duration: 100 }),
                withTiming(0, { duration: 100 })
            ),
            -1
        );

        // Vibration pattern
        const vibrationPattern = [0, 500, 200, 500];
        Vibration.vibrate(vibrationPattern, true);

        return () => {
            Vibration.cancel();
        };
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const bellStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${bellRotation.value}deg` }],
    }));

    const handleSnooze = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Vibration.cancel();
        setSnoozesUsed(s => s + 1);

        // Record snooze (deduct points)
        pointsStore.recordAlarmTriggered(today, true);

        // Navigate back and schedule snooze
        router.back();
    };

    const handleDismiss = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Check if task is required
        if (alarm?.dismissTask.type && alarm.dismissTask.type !== 'none') {
            setShowTask(true);
            Vibration.cancel();
        } else {
            completeDismiss();
        }
    };

    const completeDismiss = () => {
        Vibration.cancel();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Record successful wake
        if (snoozesUsed === 0) {
            pointsStore.recordAlarmTriggered(today, false);
        } else {
            pointsStore.recordWakeUpWithSnooze(today);
        }

        router.back();
    };

    // Format current time
    const now = new Date();
    const currentTime = `${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, '0')}`;
    const period = now.getHours() >= 12 ? 'PM' : 'AM';

    // Render task based on type
    const renderTask = () => {
        if (!alarm?.dismissTask) return null;

        switch (alarm.dismissTask.type) {
            case 'math':
                return (
                    <MathTask
                        difficulty={alarm.dismissTask.mathDifficulty || 'medium'}
                        count={alarm.dismissTask.mathCount || 3}
                        onComplete={completeDismiss}
                    />
                );
            case 'shake':
                return (
                    <ShakeTask
                        intensity={alarm.dismissTask.shakeIntensity || 'medium'}
                        duration={alarm.dismissTask.shakeDuration || 15}
                        onComplete={completeDismiss}
                    />
                );
            case 'breathing':
                return (
                    <BreathingTask
                        cycles={alarm.dismissTask.breathingCycles || 3}
                        inhale={alarm.dismissTask.breathingInhale || 4}
                        hold={alarm.dismissTask.breathingHold || 4}
                        exhale={alarm.dismissTask.breathingExhale || 4}
                        onComplete={completeDismiss}
                    />
                );
            case 'typing':
                return (
                    <TypingTask
                        text={alarm.dismissTask.typingText || 'I am awake and ready'}
                        onComplete={completeDismiss}
                    />
                );
            default:
                return null;
        }
    };

    if (showTask) {
        return (
            <View style={[styles.container, styles.taskScreen]}>
                <Stack.Screen options={{ headerShown: false }} />
                {renderTask()}
            </View>
        );
    }

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Background Pulse */}
            <Animated.View style={[styles.pulseBackground, pulseStyle]} />

            {/* Time Display */}
            <View style={styles.timeContainer}>
                <Animated.View style={bellStyle}>
                    <Text style={styles.bellIcon}>🔔</Text>
                </Animated.View>
                <Text style={styles.timeText}>{currentTime}</Text>
                <Text style={styles.periodText}>{period}</Text>
            </View>

            {/* Alarm Info */}
            <View style={styles.infoContainer}>
                <Text style={styles.alarmLabel}>{alarm?.label || 'Alarm'}</Text>
                {alarm?.dismissTask.type !== 'none' && (
                    <View style={styles.taskBadge}>
                        <Text style={styles.taskBadgeText}>
                            {alarm?.dismissTask.type === 'math' && '🧮 Math Problem'}
                            {alarm?.dismissTask.type === 'shake' && '📳 Shake Phone'}
                            {alarm?.dismissTask.type === 'breathing' && '🧘 Breathing'}
                            {alarm?.dismissTask.type === 'walk' && '🚶 Walking'}
                            {alarm?.dismissTask.type === 'typing' && '⌨️ Typing'}
                        </Text>
                    </View>
                )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
                {/* Snooze Button */}
                {alarm?.snoozeEnabled && snoozesUsed < (alarm.snoozeLimit || 3) && (
                    <Pressable style={styles.snoozeButton} onPress={handleSnooze}>
                        <Ionicons name="time-outline" size={28} color={Colors.text.inverse} />
                        <Text style={styles.snoozeText}>
                            Snooze {alarm.snoozeDuration}m
                        </Text>
                    </Pressable>
                )}

                {/* Dismiss Button */}
                <Pressable style={styles.dismissButton} onPress={handleDismiss}>
                    <View style={styles.dismissInner}>
                        <Ionicons name="checkmark" size={36} color={FeatureColors.alarm.primary} />
                    </View>
                    <Text style={styles.dismissText}>Dismiss</Text>
                </Pressable>
            </View>

            {/* Snooze Count */}
            {alarm?.snoozeEnabled && snoozesUsed > 0 && (
                <Text style={styles.snoozeCount}>
                    Snoozed {snoozesUsed} / {alarm.snoozeLimit || 3} times
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
        alignItems: 'center',
        justifyContent: 'center',
    },
    containerDark: {
        backgroundColor: '#0f0f1a',
    },
    taskScreen: {
        backgroundColor: Colors.gray[900],
    },

    // Pulse Background
    pulseBackground: {
        position: 'absolute',
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        backgroundColor: FeatureColors.alarm.primary + '20',
    },

    // Time
    timeContainer: {
        alignItems: 'center',
        marginBottom: Spacing[8],
    },
    bellIcon: {
        fontSize: 48,
        marginBottom: Spacing[4],
    },
    timeText: {
        fontSize: 80,
        fontWeight: '200',
        color: Colors.text.inverse,
        letterSpacing: -4,
    },
    periodText: {
        fontSize: 24,
        fontWeight: '300',
        color: Colors.gray[400],
        marginTop: -8,
    },

    // Info
    infoContainer: {
        alignItems: 'center',
        marginBottom: Spacing[12],
    },
    alarmLabel: {
        fontSize: 24,
        fontWeight: '500',
        color: Colors.text.inverse,
        marginBottom: Spacing[3],
    },
    taskBadge: {
        backgroundColor: FeatureColors.alarm.primary + '30',
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[2],
        borderRadius: BorderRadius.full,
    },
    taskBadgeText: {
        fontSize: 14,
        fontWeight: '500',
        color: FeatureColors.alarm.primary,
    },

    // Actions
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[6],
    },
    snoozeButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.gray[700],
    },
    snoozeText: {
        fontSize: 11,
        color: Colors.text.inverse,
        marginTop: 4,
    },
    dismissButton: {
        alignItems: 'center',
    },
    dismissInner: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.text.inverse,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.lg,
    },
    dismissText: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text.inverse,
        marginTop: Spacing[2],
    },
    snoozeCount: {
        position: 'absolute',
        bottom: 50,
        fontSize: 13,
        color: Colors.gray[500],
    },

    // Task Container
    taskContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing[4],
    },
    taskTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.text.inverse,
        marginBottom: Spacing[2],
        textAlign: 'center',
    },
    taskSubtitle: {
        fontSize: 16,
        color: Colors.gray[400],
        marginBottom: Spacing[8],
    },

    // Shake Task
    progressCircle: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: Colors.gray[800],
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: Spacing[4],
    },
    progressFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: FeatureColors.alarm.primary,
    },
    progressText: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text.inverse,
    },
    timerText: {
        fontSize: 18,
        color: Colors.gray[400],
        marginBottom: Spacing[6],
    },
    shakeButton: {
        paddingHorizontal: Spacing[6],
        paddingVertical: Spacing[4],
        backgroundColor: Colors.gray[700],
        borderRadius: BorderRadius.xl,
    },
    shakeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.inverse,
    },

    // Math Task
    problemCard: {
        backgroundColor: Colors.gray[800],
        paddingHorizontal: Spacing[8],
        paddingVertical: Spacing[6],
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing[4],
        borderWidth: 2,
        borderColor: 'transparent',
    },
    problemCardWrong: {
        borderColor: Colors.accent.red,
    },
    problemText: {
        fontSize: 36,
        fontWeight: '700',
        color: Colors.text.inverse,
        textAlign: 'center',
    },
    answerDisplay: {
        backgroundColor: Colors.gray[800],
        paddingHorizontal: Spacing[8],
        paddingVertical: Spacing[4],
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing[6],
        minWidth: 150,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: FeatureColors.alarm.primary,
    },
    answerDisplayWrong: {
        borderColor: Colors.accent.red,
    },
    answerText: {
        fontSize: 32,
        fontWeight: '700',
        color: Colors.text.inverse,
    },
    numberPad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 240,
        gap: Spacing[2],
        marginBottom: Spacing[4],
    },
    numKey: {
        width: 72,
        height: 56,
        backgroundColor: Colors.gray[700],
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    numKeyText: {
        fontSize: 24,
        fontWeight: '600',
        color: Colors.text.inverse,
    },
    submitButton: {
        backgroundColor: FeatureColors.alarm.primary,
        paddingHorizontal: Spacing[8],
        paddingVertical: Spacing[4],
        borderRadius: BorderRadius.xl,
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitButtonText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text.inverse,
    },

    // Breathing Task
    breathCircle: {
        width: 200,
        height: 200,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing[6],
    },
    phaseText: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: Spacing[1],
    },
    countdownText: {
        fontSize: 48,
        fontWeight: '700',
        color: Colors.text.inverse,
    },
    phaseInstruction: {
        fontSize: 18,
        color: Colors.gray[400],
        fontStyle: 'italic',
    },

    // Typing Task
    phraseBox: {
        backgroundColor: Colors.gray[800],
        paddingHorizontal: Spacing[6],
        paddingVertical: Spacing[4],
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing[4],
    },
    phraseText: {
        fontSize: 18,
        color: Colors.text.inverse,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    inputDisplay: {
        backgroundColor: Colors.gray[800],
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[3],
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing[6],
        minWidth: 200,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    inputDisplayActive: {
        borderColor: FeatureColors.alarm.primary,
    },
    inputText: {
        fontSize: 16,
        color: Colors.gray[400],
    },
    keyboard: {
        width: '100%',
        gap: Spacing[2],
    },
    keyboardRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 4,
    },
    keyboardKey: {
        width: 32,
        height: 40,
        backgroundColor: Colors.gray[700],
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    keyText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.inverse,
    },
    spaceBar: {
        width: 150,
        height: 40,
        backgroundColor: Colors.gray[700],
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
