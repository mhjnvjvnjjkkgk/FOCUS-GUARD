import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Image,
    Pressable,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
    FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Accelerometer } from 'expo-sensors';

import { Colors, Spacing, BorderRadius, Shadows, FeatureColors } from '@/constants/Theme';
import { useBlockerStore } from '@/store/blockerStore';

const { width, height } = Dimensions.get('window');

// Unlock Task: Wait
interface WaitTaskProps {
    seconds: number;
    onComplete: () => void;
}

function WaitTask({ seconds, onComplete }: WaitTaskProps) {
    const [remaining, setRemaining] = useState(seconds);
    const progress = 1 - (remaining / seconds);

    useEffect(() => {
        const timer = setInterval(() => {
            setRemaining(r => {
                if (r <= 1) {
                    clearInterval(timer);
                    onComplete();
                    return 0;
                }
                return r - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [seconds, onComplete]);

    return (
        <View style={styles.taskContainer}>
            <Text style={styles.taskTitle}>⏱️ Wait to Unlock</Text>
            <Text style={styles.taskSubtitle}>Take a moment to reflect</Text>

            <View style={styles.waitCircle}>
                <View style={[styles.waitProgress, { height: `${progress * 100}%` }]} />
                <Text style={styles.waitTime}>{remaining}</Text>
                <Text style={styles.waitLabel}>seconds</Text>
            </View>
        </View>
    );
}

// Unlock Task: Typing
interface TypingTaskProps {
    text: string;
    onComplete: () => void;
}

function TypingTask({ text, onComplete }: TypingTaskProps) {
    const [typed, setTyped] = useState('');
    const [showKeyboard, setShowKeyboard] = useState(false);

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
            <Text style={styles.taskTitle}>⌨️ Type to Unlock</Text>
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

// Unlock Task: Math
interface MathTaskProps {
    difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
    count: number;
    onComplete: () => void;
}

function MathTask({ difficulty, count, onComplete }: MathTaskProps) {
    const [solved, setSolved] = useState(0);
    const [problem, setProblem] = useState(generateProblem());
    const [answer, setAnswer] = useState('');

    function generateProblem() {
        let n1 = 0, n2 = 0, op = '+';
        const max = difficulty === 'easy' ? 10 : difficulty === 'medium' ? 50 : 100;
        n1 = Math.floor(Math.random() * max) + 1;
        n2 = Math.floor(Math.random() * max) + 1;
        op = Math.random() > 0.5 ? '+' : '-';
        if (op === '-' && n1 < n2) [n1, n2] = [n2, n1];
        return { n1, n2, op, ans: op === '+' ? n1 + n2 : n1 - n2 };
    }

    const handleNumber = (num: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newAns = answer + num;
        setAnswer(newAns);

        if (parseInt(newAns) === problem.ans) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (solved + 1 >= count) {
                onComplete();
            } else {
                setSolved(s => s + 1);
                setProblem(generateProblem());
                setAnswer('');
            }
        } else if (newAns.length >= problem.ans.toString().length) {
            // Wrong answer logic (auto clear or shake)
            if (parseInt(newAns) !== problem.ans) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setTimeout(() => setAnswer(''), 300);
            }
        }
    };

    return (
        <View style={styles.taskContainer}>
            <Text style={styles.taskTitle}>🧮 Solve to Unlock</Text>
            <Text style={styles.taskSubtitle}>{count - solved} problems remaining</Text>

            <View style={styles.phraseBox}>
                <Text style={styles.phraseText}>{problem.n1} {problem.op} {problem.n2} = ?</Text>
            </View>

            <View style={[styles.inputDisplay, answer && { borderColor: FeatureColors.blocker.primary }]}>
                <Text style={styles.inputText}>{answer || '?'}</Text>
            </View>

            <View style={styles.keyboard}>
                <View style={[styles.keyboardRow, { flexWrap: 'wrap', width: 220, alignSelf: 'center' }]}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => (
                        <Pressable
                            key={n}
                            style={[styles.keyboardKey, { width: 60, height: 60, margin: 4, borderRadius: 30 }]}
                            onPress={() => handleNumber(n.toString())}
                        >
                            <Text style={[styles.keyText, { fontSize: 24 }]}>{n}</Text>
                        </Pressable>
                    ))}
                    <Pressable
                        style={[styles.keyboardKey, { width: 60, height: 60, margin: 4, borderRadius: 30, backgroundColor: Colors.accent.red + '20' }]}
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setAnswer(a => a.slice(0, -1)); }}
                    >
                        <Ionicons name="backspace" size={24} color={Colors.accent.red} />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

// Unlock Task: Shake
interface ShakeTaskProps {
    intensity: 'light' | 'medium' | 'vigorous';
    duration: number;
    onComplete: () => void;
}

function ShakeTask({ intensity, duration, onComplete }: ShakeTaskProps) {
    const [shakes, setShakes] = useState(0);
    const targetShakes = duration * 2; // Approx 2 shakes per sec
    const progress = Math.min(shakes / targetShakes, 1);

    useEffect(() => {
        let lastX = 0, lastY = 0, lastZ = 0;
        let lastUpdate = 0;
        const threshold = intensity === 'light' ? 1.2 : intensity === 'medium' ? 1.5 : 2.5;

        Accelerometer.setUpdateInterval(100);
        const sub = Accelerometer.addListener((data: { x: number; y: number; z: number }) => {
            const { x, y, z } = data;
            const currTime = Date.now();
            if ((currTime - lastUpdate) > 100) {
                const diffTime = currTime - lastUpdate;
                lastUpdate = currTime;

                const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000;

                // Simple shake detection logic (simplified for blocked screen, real one in ringing.tsx is better)
                const delta = Math.sqrt(
                    Math.pow(x - lastX, 2) +
                    Math.pow(y - lastY, 2) +
                    Math.pow(z - lastZ, 2)
                );

                if (delta > threshold) {
                    setShakes(s => {
                        const next = s + 1;
                        if (next >= targetShakes) {
                            sub.remove();
                            onComplete();
                        }
                        return next;
                    });
                }

                lastX = x;
                lastY = y;
                lastZ = z;
            }
        });

        return () => sub.remove();
    }, [intensity, duration, onComplete, targetShakes]);

    return (
        <View style={styles.taskContainer}>
            <Text style={styles.taskTitle}>📳 Shake to Unlock</Text>
            <Text style={styles.taskSubtitle}>Shake your phone!</Text>

            <View style={styles.waitCircle}>
                <View style={[styles.waitProgress, { height: `${progress * 100}%` }]} />
                <Text style={styles.waitTime}>{Math.round(progress * 100)}%</Text>
            </View>
        </View>
    );
}

// Unlock Task: Breathing
interface BreathingTaskProps {
    cycles: number;
    onComplete: () => void;
}

function BreathingTask({ cycles, onComplete }: BreathingTaskProps) {
    const [currentCycle, setCurrentCycle] = useState(1);
    const [phase, setPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
    const [countdown, setCountdown] = useState(4);

    const inhale = 4, hold = 4, exhale = 4;

    const scale = useSharedValue(1);

    useEffect(() => {
        if (phase === 'inhale') {
            scale.value = withTiming(1.5, { duration: inhale * 1000, easing: Easing.inOut(Easing.ease) });
        } else if (phase === 'exhale') {
            scale.value = withTiming(1, { duration: exhale * 1000, easing: Easing.inOut(Easing.ease) });
        }

        const timer = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    if (phase === 'inhale') {
                        setPhase('hold');
                        return hold;
                    } else if (phase === 'hold') {
                        setPhase('exhale');
                        return exhale;
                    } else {
                        if (currentCycle >= cycles) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    }, [phase, currentCycle, cycles, onComplete]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const phaseColors = {
        inhale: '#14b8a6',
        hold: '#8b5cf6',
        exhale: '#10b981',
    };

    return (
        <View style={styles.taskContainer}>
            <Text style={styles.taskTitle}>🧘 Breathing Exercise</Text>
            <Text style={styles.taskSubtitle}>Cycle {currentCycle} of {cycles}</Text>

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


// Main Blocking Screen
export default function BlockingScreen() {
    const params = useLocalSearchParams<{ packageName: string }>();
    const app = useBlockerStore(state => state.getAppByPackage(params.packageName || ''));

    const [showTask, setShowTask] = useState(false);

    // Pulsing animation for icon
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const handleUnlock = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        if (app?.unlockTask.type && app.unlockTask.type !== 'none') {
            setShowTask(true);
        } else {
            completeUnlock();
        }
    };

    const completeUnlock = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
    };

    const handleGoBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.back();
    };

    // Render unlock task
    const renderUnlockTask = () => {
        if (!app?.unlockTask) return null;

        switch (app.unlockTask.type) {
            case 'wait':
                return (
                    <WaitTask
                        seconds={app.unlockTask.waitSeconds || 30}
                        onComplete={completeUnlock}
                    />
                );
            case 'typing':
                return (
                    <TypingTask
                        text={app.unlockTask.typingText || 'I will be productive'}
                        onComplete={completeUnlock}
                    />
                );
            case 'math':
                return (
                    <MathTask
                        difficulty={app.unlockTask.mathDifficulty || 'medium'}
                        count={app.unlockTask.mathCount || 3}
                        onComplete={completeUnlock}
                    />
                );
            case 'shake':
                return (
                    <ShakeTask
                        intensity={app.unlockTask.shakeIntensity || 'medium'}
                        duration={app.unlockTask.shakeDuration || 15}
                        onComplete={completeUnlock}
                    />
                );
            case 'breathing':
                return (
                    <BreathingTask
                        cycles={app.unlockTask.breathingCycles || 3}
                        onComplete={completeUnlock}
                    />
                );
            default:
                return null;
        }
    };

    if (showTask) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                {renderUnlockTask()}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Background pattern */}
            <View style={styles.patternOverlay} />

            {/* Content */}
            <Animated.View
                entering={FadeIn.duration(500)}
                style={styles.content}
            >
                {/* Shield Icon */}
                <Animated.View style={[styles.shieldContainer, pulseStyle]}>
                    <View style={styles.shieldIcon}>
                        <Ionicons name="shield" size={80} color={FeatureColors.blocker.primary} />
                    </View>
                </Animated.View>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Text style={styles.blockedIcon}>{app?.appIcon || '📱'}</Text>
                    <Text style={styles.blockedTitle}>{app?.appName || 'App'} is Blocked</Text>
                </View>

                {/* Custom Message */}
                <View style={styles.messageCard}>
                    <Text style={styles.messageText}>
                        {app?.blockMessage || 'You\'ve reached your daily limit for this app. Take a break and do something productive!'}
                    </Text>
                </View>

                {/* Custom Image */}
                {app?.blockImageUri && (
                    <Image
                        source={{ uri: app.blockImageUri }}
                        style={styles.customImage}
                        resizeMode="cover"
                    />
                )}

                {/* Usage Info */}
                <View style={styles.usageInfo}>
                    <Text style={styles.usageText}>
                        Today: {app?.todayUsageMinutes || 0} min / {app?.dailyLimitMinutes || 0} min limit
                    </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <Pressable style={styles.goBackButton} onPress={handleGoBack}>
                        <Ionicons name="arrow-back" size={24} color={Colors.text.inverse} />
                        <Text style={styles.goBackText}>Go Back</Text>
                    </Pressable>

                    {app?.unlockTask.type !== 'none' && (
                        <Pressable style={styles.unlockButton} onPress={handleUnlock}>
                            <Ionicons name="lock-open" size={20} color={FeatureColors.blocker.primary} />
                            <Text style={styles.unlockText}>Unlock</Text>
                        </Pressable>
                    )}
                </View>

                {/* Unlock Task Badge */}
                {app?.unlockTask.type !== 'none' && (
                    <View style={styles.taskBadge}>
                        <Text style={styles.taskBadgeText}>
                            {app?.unlockTask.type === 'wait' && `⏱️ Wait ${app.unlockTask.waitSeconds}s`}
                            {app?.unlockTask.type === 'typing' && '⌨️ Type phrase'}
                            {app?.unlockTask.type === 'shake' && '📳 Shake phone'}
                            {app?.unlockTask.type === 'math' && '🧮 Solve problems'}
                        </Text>
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    patternOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing[6],
    },

    // Shield
    shieldContainer: {
        marginBottom: Spacing[6],
    },
    shieldIcon: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: FeatureColors.blocker.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // App Info
    appInfo: {
        alignItems: 'center',
        marginBottom: Spacing[6],
    },
    blockedIcon: {
        fontSize: 48,
        marginBottom: Spacing[3],
    },
    blockedTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text.inverse,
        textAlign: 'center',
    },

    // Message
    messageCard: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: BorderRadius.xl,
        padding: Spacing[4],
        marginBottom: Spacing[4],
        maxWidth: width * 0.85,
    },
    messageText: {
        fontSize: 16,
        color: Colors.gray[300],
        textAlign: 'center',
        lineHeight: 24,
    },

    // Custom Image
    customImage: {
        width: width * 0.7,
        height: 120,
        borderRadius: BorderRadius.xl,
        marginBottom: Spacing[4],
    },

    // Usage Info
    usageInfo: {
        marginBottom: Spacing[6],
    },
    usageText: {
        fontSize: 14,
        color: Colors.gray[400],
    },

    // Actions
    actions: {
        flexDirection: 'row',
        gap: Spacing[4],
        marginBottom: Spacing[4],
    },
    goBackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gray[700],
        paddingHorizontal: Spacing[6],
        paddingVertical: Spacing[4],
        borderRadius: BorderRadius.xl,
        gap: Spacing[2],
    },
    goBackText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.inverse,
    },
    unlockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: Spacing[6],
        paddingVertical: Spacing[4],
        borderRadius: BorderRadius.xl,
        gap: Spacing[2],
        borderWidth: 1,
        borderColor: FeatureColors.blocker.primary + '60',
    },
    unlockText: {
        fontSize: 16,
        fontWeight: '600',
        color: FeatureColors.blocker.primary,
    },

    // Task Badge
    taskBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[2],
        borderRadius: BorderRadius.full,
    },
    taskBadgeText: {
        fontSize: 13,
        color: Colors.gray[400],
    },

    // Tasks
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

    // Wait Task
    waitCircle: {
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: Colors.gray[800],
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    waitProgress: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: FeatureColors.blocker.primary,
    },
    waitTime: {
        fontSize: 56,
        fontWeight: '700',
        color: Colors.text.inverse,
    },
    waitLabel: {
        fontSize: 14,
        color: Colors.gray[400],
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
        borderColor: FeatureColors.blocker.primary,
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

    // Breathing Task
    breathCircle: {
        width: 180,
        height: 180,
        borderRadius: 90,
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
});
