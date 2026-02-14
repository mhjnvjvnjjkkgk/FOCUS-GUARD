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
import Svg, { Defs, LinearGradient, Stop, Pattern, Rect, Line as SvgLine } from 'react-native-svg';

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

import { Accelerometer } from 'expo-sensors';

// Shake Detection Component
interface ShakeTaskProps {
    intensity: string;
    duration: number;
    onComplete: () => void;
}

function ShakeTask({ intensity, duration, onComplete }: ShakeTaskProps) {
    const [shakeCount, setShakeCount] = useState(0);
    const targetShakes = intensity === 'light' ? 15 : intensity === 'medium' ? 30 : 50;
    const progress = Math.min(shakeCount / targetShakes, 1);

    // Shake Config
    const SHAKE_THRESHOLD = intensity === 'light' ? 1.2 : intensity === 'medium' ? 1.5 : 2.0;
    const MIN_TIME_BETWEEN_SHAKES = 500; // ms to prevent double counting
    const [lastShakeTime, setLastShakeTime] = useState(0);

    useEffect(() => {
        let lastX = 0, lastY = 0, lastZ = 0;
        let lastUpdate = 0;

        Accelerometer.setUpdateInterval(100);

        const subscription = Accelerometer.addListener(data => {
            const { x, y, z } = data;
            const currTime = Date.now();

            // Simple shake detection logic
            const totalForce = Math.abs(x + y + z);
            const lastForce = Math.abs(lastX + lastY + lastZ);
            const delta = Math.abs(totalForce - lastForce);

            if (delta > SHAKE_THRESHOLD) {
                if (currTime - lastUpdate > MIN_TIME_BETWEEN_SHAKES) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShakeCount(prev => {
                        const newCount = prev + 1;
                        if (newCount >= targetShakes) {
                            runOnJS(onComplete)();
                        }
                        return newCount;
                    });
                    lastUpdate = currTime;
                }
            }

            lastX = x;
            lastY = y;
            lastZ = z;
        });

        return () => subscription.remove();
    }, [intensity, targetShakes, onComplete]);

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

            <Text style={styles.timerText}>Keep shaking to dismiss!</Text>
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

// Grid Background Component
const GridBackground = () => (
    <View style={styles.gridContainer}>
        <Svg height="100%" width="100%">
            <Defs>
                <Pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <Rect width="40" height="40" fill="#fdfbf7" />
                    <SvgLine x1="0" y1="0" x2="0" y2="40" stroke="#e0e0e0" strokeWidth="1" />
                    <SvgLine x1="0" y1="0" x2="40" y2="0" stroke="#e0e0e0" strokeWidth="1" />
                </Pattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#grid)" />
        </Svg>
    </View>
);

// Paper Tape Decoration
const PaperTape = ({ color = '#3498db', style }: { color?: string, style?: any }) => (
    <View style={[styles.tape, { backgroundColor: color }, style]}>
        <View style={styles.tapeRip} />
    </View>
);

// Memory Task Component
interface MemoryTaskProps {
    pairs: number; // Number of tiles to memorize
    onComplete: () => void;
}

function MemoryTask({ pairs, onComplete }: MemoryTaskProps) {
    const gridSize = 3;
    const totalTiles = gridSize * gridSize;
    const [pattern, setPattern] = useState<number[]>([]);
    const [userPattern, setUserPattern] = useState<number[]>([]);
    const [gameState, setGameState] = useState<'showing' | 'playing' | 'success' | 'fail'>('showing');
    const [round, setRound] = useState(1);
    const targetRounds = 3; // Must complete 3 rounds to verify wakefulness

    // Generate random pattern
    const generatePattern = useCallback(() => {
        const newPattern: number[] = [];
        while (newPattern.length < pairs) {
            const tile = Math.floor(Math.random() * totalTiles);
            if (!newPattern.includes(tile)) {
                newPattern.push(tile);
            }
        }
        setPattern(newPattern);
        setGameState('showing');
        setUserPattern([]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        // Hide after 2 seconds
        setTimeout(() => {
            setGameState('playing');
        }, 2000);
    }, [pairs, totalTiles]);

    useEffect(() => {
        generatePattern();
    }, [round]);

    const handleTilePress = (index: number) => {
        if (gameState !== 'playing') return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Check if correct tile
        if (!pattern.includes(index)) {
            // Wrong tile
            setGameState('fail');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setTimeout(() => {
                // Restart current round
                generatePattern();
            }, 1000);
            return;
        }

        // Already selected?
        if (userPattern.includes(index)) return;

        const newUserPattern = [...userPattern, index];
        setUserPattern(newUserPattern);

        // Check if pattern complete
        if (newUserPattern.length === pattern.length) {
            // Success
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (round >= targetRounds) {
                setGameState('success');
                setTimeout(onComplete, 500);
            } else {
                setRound(r => r + 1);
            }
        }
    };

    return (
        <View style={styles.taskContainer}>
            <Text style={styles.taskTitle}>🧠 Memory Match</Text>
            <Text style={styles.taskSubtitle}>
                Round {round} of {targetRounds} • Memorize the pattern
            </Text>

            <View style={{
                width: 300,
                height: 300,
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 10
            }}>
                {Array.from({ length: totalTiles }).map((_, index) => {
                    const isActive = gameState === 'showing' && pattern.includes(index);
                    const isSelected = userPattern.includes(index);
                    const isWrong = gameState === 'fail' && !pattern.includes(index) && userPattern.includes(index); // Visual feedback not perfectly implemented for wrong tile specific, but 'fail' state handles reset.

                    return (
                        <Pressable
                            key={index}
                            style={{
                                width: '30%',
                                height: '30%',
                                backgroundColor: isActive || isSelected ? Colors.accent.purple :
                                    gameState === 'fail' ? Colors.accent.red : Colors.gray[700],
                                borderRadius: 12,
                                opacity: (gameState === 'showing' && !isActive) ? 0.3 : 1
                            }}
                            onPress={() => handleTilePress(index)}
                        />
                    );
                })}
            </View>

            <Text style={[styles.timerText, { marginTop: 20 }]}>
                {gameState === 'showing' ? 'Memorize...' : gameState === 'playing' ? 'Repeat the pattern!' : gameState === 'fail' ? 'Wrong! Try again' : 'Good!'}
            </Text>
        </View>
    );
}

// Walk/Step Task Component (Pedometer-based)
import { Pedometer } from 'expo-sensors';

interface WalkTaskProps {
    targetSteps: number;
    onComplete: () => void;
}

function WalkTask({ targetSteps, onComplete }: WalkTaskProps) {
    const [steps, setSteps] = useState(0);
    const [isPedometerAvailable, setIsPedometerAvailable] = useState(false);
    const progress = Math.min(steps / targetSteps, 1);

    useEffect(() => {
        let subscription: any = null;

        const subscribe = async () => {
            const available = await Pedometer.isAvailableAsync();
            setIsPedometerAvailable(available);

            if (available) {
                subscription = Pedometer.watchStepCount(result => {
                    setSteps(result.steps);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

                    if (result.steps >= targetSteps) {
                        onComplete();
                    }
                });
            }
        };

        subscribe();
        return () => {
            if (subscription) subscription.remove();
        };
    }, [targetSteps, onComplete]);

    // Fallback tap for simulators/devices without pedometer
    const handleManualStep = () => {
        if (isPedometerAvailable) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSteps(prev => {
            const newSteps = prev + 1;
            if (newSteps >= targetSteps) onComplete();
            return newSteps;
        });
    };

    return (
        <View style={styles.taskContainer}>
            <Text style={styles.taskTitle}>👣 Walk to Dismiss</Text>
            <Text style={styles.taskSubtitle}>Take {targetSteps} steps to wake up</Text>

            <View style={styles.progressCircle}>
                <View style={[styles.progressFill, { height: `${progress * 100}%`, backgroundColor: '#4ECDC4' }]} />
                <Text style={styles.progressText}>{steps}/{targetSteps}</Text>
            </View>

            <Text style={styles.timerText}>
                {isPedometerAvailable ? 'Start walking!' : 'Pedometer unavailable — tap below'}
            </Text>

            {!isPedometerAvailable && (
                <Pressable style={styles.shakeButton} onPress={handleManualStep}>
                    <Text style={styles.shakeButtonText}>TAP TO STEP</Text>
                </Pressable>
            )}
        </View>
    );
}

// Squat Task Component (Accelerometer Y-axis detection)
interface SquatTaskProps {
    count: number;
    difficulty: string;
    onComplete: () => void;
}

function SquatTask({ count, difficulty, onComplete }: SquatTaskProps) {
    const [squatCount, setSquatCount] = useState(0);
    const [phase, setPhase] = useState<'standing' | 'down'>('standing');
    const progress = Math.min(squatCount / count, 1);

    // Thresholds based on difficulty
    const DOWN_THRESHOLD = difficulty === 'hard' ? -0.3 : difficulty === 'medium' ? -0.2 : -0.1;
    const UP_THRESHOLD = difficulty === 'hard' ? 0.3 : difficulty === 'medium' ? 0.2 : 0.1;

    useEffect(() => {
        Accelerometer.setUpdateInterval(100);

        const subscription = Accelerometer.addListener(data => {
            const { y } = data;

            if (phase === 'standing' && y < DOWN_THRESHOLD) {
                setPhase('down');
            } else if (phase === 'down' && y > UP_THRESHOLD) {
                setPhase('standing');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setSquatCount(prev => {
                    const newCount = prev + 1;
                    if (newCount >= count) onComplete();
                    return newCount;
                });
            }
        });

        return () => subscription.remove();
    }, [phase, count, difficulty, onComplete]);

    return (
        <View style={styles.taskContainer}>
            <Text style={styles.taskTitle}>🏋️ Squat to Dismiss</Text>
            <Text style={styles.taskSubtitle}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} • {count} squats required
            </Text>

            <View style={styles.progressCircle}>
                <View style={[styles.progressFill, { height: `${progress * 100}%`, backgroundColor: '#FF6B6B' }]} />
                <Text style={styles.progressText}>{squatCount}/{count}</Text>
            </View>

            <Text style={styles.timerText}>
                {phase === 'standing' ? '⬇️ Squat down!' : '⬆️ Stand back up!'}
            </Text>
            <Text style={{ color: '#888', fontSize: 12, marginTop: 8 }}>
                Hold phone against your chest
            </Text>
        </View>
    );
}

export default function AlarmRingingScreen() {
    const params = useLocalSearchParams<{ id: string }>();
    const alarm = useAlarmStore(state => state.getAlarm(params.id || ''));
    const pointsStore = usePointsStore();
    const today = new Date().toISOString().split('T')[0];

    const [showTask, setShowTask] = useState(false);
    const [snoozesUsed, setSnoozesUsed] = useState(0);

    // ... animations ...
    const pulseScale = useSharedValue(1);
    const glowOpacity = useSharedValue(0.5);

    useEffect(() => {
        pulseScale.value = withRepeat(
            withSequence(
                withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1000 }),
                withTiming(0.4, { duration: 1000 })
            ),
            -1,
            true
        );
        const vibrationPattern = [0, 500, 200, 500];
        Vibration.vibrate(vibrationPattern, true);
        return () => { Vibration.cancel(); };
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));
    const glowStyle = useAnimatedStyle(() => ({
        textShadowRadius: interpolate(glowOpacity.value, [0.4, 1], [10, 30]),
        opacity: interpolate(glowOpacity.value, [0.4, 1], [0.8, 1])
    }));

    function interpolate(value: number, input: number[], output: number[]) {
        'worklet';
        const range = input[1] - input[0];
        const outRange = output[1] - output[0];
        const ratio = (value - input[0]) / range;
        return output[0] + ratio * outRange;
    }

    const handleSnooze = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Vibration.cancel();
        setSnoozesUsed(s => s + 1);
        pointsStore.recordAlarmTriggered(today, true);
        router.back();
    };

    const handleDismiss = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        if (alarm?.dismissTask?.type && alarm.dismissTask.type !== 'none') {
            setShowTask(true);
            Vibration.cancel();
        } else {
            completeDismiss();
        }
    };

    // Calculate Difficulty Bonus
    const getDifficultyMultiplier = () => {
        if (!alarm?.dismissTask) return 1;
        const task = alarm.dismissTask;

        switch (task.type) {
            case 'math':
                if (task.mathDifficulty === 'extreme') return 5;
                if (task.mathDifficulty === 'hard') return 3;
                if (task.mathDifficulty === 'medium') return 2;
                return 1;
            case 'shake':
                if (task.shakeIntensity === 'vigorous') return 3;
                if (task.shakeIntensity === 'medium') return 2;
                return 1;
            case 'memory':
                const pairs = task.memoryPairs || 3;
                if (pairs >= 6) return 5;
                if (pairs >= 5) return 3;
                if (pairs >= 4) return 2;
                return 1;
            case 'walk':
            case 'step':
                const stepTarget = task.walkSteps || task.stepTarget || 20;
                if (stepTarget >= 50) return 3;
                if (stepTarget >= 30) return 2;
                return 1;
            case 'squat':
                if (task.squatDifficulty === 'hard') return 3;
                if (task.squatDifficulty === 'medium') return 2;
                return 1;
            case 'breathing': return 1; // Relaxation, not difficulty-based
            case 'typing': return 1;
            default: return 1;
        }
    };

    const completeDismiss = () => {
        Vibration.cancel();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        if (snoozesUsed === 0) {
            const multiplier = getDifficultyMultiplier();
            pointsStore.recordAlarmTriggered(today, false, multiplier);
        } else {
            pointsStore.recordWakeUpWithSnooze(today);
        }
        router.back();
    };

    // ... Format Data ...
    const now = new Date();
    const currentTime = `${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, '0')}`;
    const period = now.getHours() >= 12 ? 'PM' : 'AM';
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

    // Task Rendering
    const renderTask = () => {
        if (!alarm?.dismissTask) return null;
        const taskType = alarm.dismissTask.type;
        switch (taskType) {
            case 'math': return <MathTask difficulty={alarm.dismissTask.mathDifficulty || 'medium'} count={alarm.dismissTask.mathCount || 3} onComplete={completeDismiss} />;
            case 'shake': return <ShakeTask intensity={alarm.dismissTask.shakeIntensity || 'medium'} duration={alarm.dismissTask.shakeDuration || 15} onComplete={completeDismiss} />;
            case 'breathing': return <BreathingTask cycles={alarm.dismissTask.breathingCycles || 3} inhale={alarm.dismissTask.breathingInhale || 4} hold={alarm.dismissTask.breathingHold || 4} exhale={alarm.dismissTask.breathingExhale || 4} onComplete={completeDismiss} />;
            case 'typing': return <TypingTask text={alarm.dismissTask.typingText || 'I am awake'} onComplete={completeDismiss} />;
            case 'memory': return <MemoryTask pairs={alarm.dismissTask.memoryPairs || 4} onComplete={completeDismiss} />;
            case 'walk': return <WalkTask targetSteps={alarm.dismissTask.walkSteps || 20} onComplete={completeDismiss} />;
            case 'step': return <WalkTask targetSteps={alarm.dismissTask.stepTarget || 30} onComplete={completeDismiss} />;
            case 'squat': return <SquatTask count={alarm.dismissTask.squatCount || 10} difficulty={alarm.dismissTask.squatDifficulty || 'medium'} onComplete={completeDismiss} />;
            default: return <Pressable onPress={completeDismiss}><Text style={{ color: '#FFF' }}>Unknown Task - Tap to Dismiss</Text></Pressable>;
        }
    };

    if (showTask) {
        return (
            <View style={[styles.container, { backgroundColor: '#111' }]}>
                <Stack.Screen options={{ headerShown: false }} />
                {renderTask()}
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <GridBackground />

            {/* Decorations */}
            <PaperTape color="#E74C3C" style={{ position: 'absolute', top: -20, left: 40, transform: [{ rotate: '-15deg' }], width: 60, height: 80 }} />
            <PaperTape color="#3498DB" style={{ position: 'absolute', top: -10, right: 20, transform: [{ rotate: '10deg' }], width: 70, height: 90 }} />

            <PaperTape color="#E74C3C" style={{ position: 'absolute', bottom: 100, left: -20, transform: [{ rotate: '5deg' }], width: 60, height: 80 }} />
            <PaperTape color="#3498DB" style={{ position: 'absolute', bottom: 150, right: -10, transform: [{ rotate: '-8deg' }], width: 50, height: 100 }} />


            {/* Content */}
            <View style={styles.content}>

                {/* Date Label */}
                <View style={styles.dateTag}>
                    <Text style={styles.dateText}>{dateStr} 🔔</Text>
                </View>

                {/* Time Display */}
                <Animated.View style={[styles.timeWrapper, pulseStyle]}>
                    <Animated.Text style={[styles.timeText, glowStyle]}>
                        {currentTime} <Text style={{ fontSize: 50 }}>{period}</Text>
                    </Animated.Text>
                </Animated.View>

                {/* Wake Up Label */}
                <View style={styles.wakeUpTag}>
                    <Text style={styles.wakeUpText}>WAKE UP! ({alarm?.label.toUpperCase() || 'ALARM'})</Text>
                </View>

                {/* Spacer */}
                <View style={{ flex: 1 }} />

                {/* DISMISS BUTTON */}
                <Pressable onPress={handleDismiss} style={({ pressed }) => [
                    styles.dismissBtn,
                    pressed && { transform: [{ translateY: 4 }, { translateX: 4 }], shadowOpacity: 0 }
                ]}>
                    <Text style={styles.dismissBtnText}>DISMISS</Text>
                </Pressable>

                {/* SNOOZE BUTTON */}
                {alarm?.snoozeEnabled && (
                    <Pressable onPress={handleSnooze} style={({ pressed }) => [
                        styles.snoozeBtn,
                        pressed && { transform: [{ translateY: 4 }, { translateX: 4 }], shadowOpacity: 0 }
                    ]}>
                        <Text style={styles.snoozeBtnText}>SNOOZE</Text>
                    </Pressable>
                )}

                <View style={{ height: 60 }} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    // NEW STYLES
    container: {
        flex: 1,
        backgroundColor: '#FDFBF7', // Off-white paper
        overflow: 'hidden',
    },
    gridContainer: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.6,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 80,
    },
    dateTag: {
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 2,
        borderColor: '#000',
        transform: [{ rotate: '-2deg' }],
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        marginBottom: 80,
    },
    dateText: {
        fontFamily: 'monospace',
        fontWeight: 'bold',
        fontSize: 18,
        color: '#000',
    },
    timeWrapper: {
        marginBottom: 40,
    },
    timeText: {
        fontSize: 100,
        fontWeight: '900',
        color: '#000',
        textShadowColor: '#FF4500',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 20,
        letterSpacing: -2,
    },
    wakeUpTag: {
        backgroundColor: '#ECE5CD', // Masking tape color
        paddingHorizontal: 24,
        paddingVertical: 12,
        transform: [{ rotate: '1.5deg' }],
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 1,
    },
    wakeUpText: {
        fontFamily: 'monospace',
        fontWeight: 'bold',
        fontSize: 20,
        color: '#000',
        letterSpacing: 1,
    },
    dismissBtn: {
        width: width * 0.85,
        height: 80,
        backgroundColor: '#333',
        borderWidth: 3,
        borderColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 8, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 0,
        borderRadius: 4,
    },
    dismissBtnText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 2,
    },
    snoozeBtn: {
        width: width * 0.5,
        height: 50,
        backgroundColor: '#FF4500',
        borderWidth: 3,
        borderColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    snoozeBtnText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#000',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    tape: {
        borderWidth: 2,
        borderColor: '#000',
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 0,
    },
    tapeRip: {
        // Aesthetic placeholder for ripped edge
    },

    // OLD TASK STYLES (Preserved)
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
