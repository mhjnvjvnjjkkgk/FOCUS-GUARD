/**
 * ActiveBattleView — Dual timer display during an active battle
 * Shows player vs opponent timers, focus labels, category info, and forfeit button
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Dimensions, Platform } from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming,
    FadeIn, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useBattleStore } from '@/store/battleStore';
import BattleResultModal from '@/components/BattleResultModal';

const { width: SW } = Dimensions.get('window');

interface Props {
    onBattleEnd: () => void;
}

export default function ActiveBattleView({ onBattleEnd }: Props) {
    const battleStore = useBattleStore();
    const { currentBattle, updateMyFocusTime, endBattle, forfeitBattle, clearBattle } = battleStore;
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef(Date.now());
    const [showResult, setShowResult] = useState(false);

    // Pulsing dot
    const dotOpacity = useSharedValue(1);

    useEffect(() => {
        dotOpacity.value = withRepeat(
            withSequence(
                withTiming(0.3, { duration: 500 }),
                withTiming(1, { duration: 500 })
            ), -1, true
        );
    }, []);

    // Timer
    useEffect(() => {
        startTimeRef.current = Date.now();
        timerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            updateMyFocusTime(elapsed);
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const handleEndFocus = () => {
        Alert.alert(
            '🏁 End Focus',
            'Stop focusing and see how you compare?',
            [
                { text: 'Keep Going', style: 'cancel' },
                {
                    text: 'End Battle', style: 'default',
                    onPress: () => {
                        if (timerRef.current) clearInterval(timerRef.current);
                        const mySeconds = currentBattle?.myFocusSeconds || 0;
                        endBattle(mySeconds);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setShowResult(true);
                    },
                },
            ]
        );
    };

    const handleForfeit = () => {
        Alert.alert(
            '🏳️ Forfeit Battle',
            'You will lose this battle and forfeit your XP stake.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Forfeit', style: 'destructive',
                    onPress: () => {
                        if (timerRef.current) clearInterval(timerRef.current);
                        forfeitBattle();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        setShowResult(true);
                    },
                },
            ]
        );
    };

    const handleResultClose = () => {
        setShowResult(false);
        clearBattle();
        onBattleEnd();
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const dotStyle = useAnimatedStyle(() => ({
        opacity: dotOpacity.value,
    }));

    if (!currentBattle) return null;

    return (
        <Animated.View entering={FadeIn.duration(500)} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Animated.View style={[styles.liveIndicator, dotStyle]}>
                    <View style={styles.liveDot} />
                </Animated.View>
                <Text style={styles.headerTitle}>⚔️ BATTLE IN PROGRESS</Text>
                <Text style={styles.headerInfo}>
                    {currentBattle.categoryConfig.emoji} {currentBattle.categoryConfig.label} • 🪙 {currentBattle.stake} XP
                </Text>
            </View>

            {/* Player Timer */}
            <View style={[styles.timerCard, styles.playerTimerCard]}>
                <Text style={styles.timerLabel}>YOUR FOCUS TIME</Text>
                <Text style={styles.timerValue}>{formatTime(currentBattle.myFocusSeconds)}</Text>
                {currentBattle.myFocusLabel ? (
                    <Text style={styles.focusLabel}>📖 {currentBattle.myFocusLabel}</Text>
                ) : null}
            </View>

            {/* VS Divider */}
            <View style={styles.vsDivider}>
                <View style={styles.vsLine} />
                <Text style={styles.vsText}>VS</Text>
                <View style={styles.vsLine} />
            </View>

            {/* Opponent Timer */}
            <View style={[styles.timerCard, styles.opponentTimerCard]}>
                <Text style={styles.timerLabel}>
                    {currentBattle.opponent.avatar} {currentBattle.opponent.name}
                </Text>
                <Text style={[styles.timerValue, { color: '#FF4444' }]}>
                    {formatTime(currentBattle.opponentFocusSeconds)}
                </Text>
                <Text style={styles.focusLabel}>📖 {currentBattle.opponent.focusLabel}</Text>
            </View>

            {/* Duration range */}
            <Text style={styles.rangeText}>
                Category: {currentBattle.categoryConfig.minMinutes}–{currentBattle.categoryConfig.maxMinutes} min
            </Text>

            {/* Action Buttons */}
            <View style={styles.buttonsRow}>
                <Pressable
                    onPress={handleEndFocus}
                    style={({ pressed }) => [styles.endBtn, pressed && styles.btnPressed]}
                >
                    <Text style={styles.endBtnText}>🏁 END FOCUS</Text>
                </Pressable>
            </View>

            <Pressable
                onPress={handleForfeit}
                style={styles.forfeitBtn}
            >
                <Text style={styles.forfeitBtnText}>🏳️ FORFEIT</Text>
            </Pressable>

            {/* Battle Result Modal */}
            {showResult && currentBattle && (
                <BattleResultModal
                    battle={currentBattle}
                    onClose={handleResultClose}
                    onPlayAgain={() => {
                        setShowResult(false);
                        clearBattle();
                        onBattleEnd();
                    }}
                />
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FFFDF0',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 70 : 50,
        zIndex: 5000,
    },
    header: { alignItems: 'center', marginBottom: 30 },
    liveIndicator: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 8,
    },
    liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF4444' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#000', letterSpacing: 2 },
    headerInfo: { fontSize: 12, fontWeight: '700', color: '#888', marginTop: 4, letterSpacing: 1 },

    // Timer Cards
    timerCard: {
        borderWidth: 3, borderColor: '#000', padding: 24, alignItems: 'center',
        backgroundColor: '#FFF',
        shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0,
    },
    playerTimerCard: { borderColor: '#4CAF50', backgroundColor: '#F1F8E9' },
    opponentTimerCard: { borderColor: '#FF4444', backgroundColor: '#FFF5F5' },
    timerLabel: { fontSize: 12, fontWeight: '900', color: '#000', letterSpacing: 2, marginBottom: 8 },
    timerValue: {
        fontSize: 52, fontWeight: '900', color: '#4CAF50', letterSpacing: 4,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    focusLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginTop: 8 },

    // VS
    vsDivider: {
        flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12,
    },
    vsLine: { flex: 1, height: 2, backgroundColor: '#DDD' },
    vsText: { fontSize: 18, fontWeight: '900', color: '#999', letterSpacing: 3 },

    rangeText: { fontSize: 11, fontWeight: '700', color: '#999', textAlign: 'center', marginTop: 8, letterSpacing: 1 },

    // Buttons
    buttonsRow: { marginTop: 30 },
    endBtn: {
        borderWidth: 3, borderColor: '#000', backgroundColor: '#4CAF50',
        paddingVertical: 16, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0,
    },
    btnPressed: {
        shadowOffset: { width: 2, height: 2 },
        transform: [{ translateX: 3 }, { translateY: 3 }],
    },
    endBtnText: { fontSize: 18, fontWeight: '900', color: '#FFF', letterSpacing: 2 },
    forfeitBtn: {
        marginTop: 12, borderWidth: 2, borderColor: '#FF4444',
        paddingVertical: 10, alignItems: 'center', backgroundColor: '#FFF',
    },
    forfeitBtnText: { fontSize: 14, fontWeight: '900', color: '#FF4444', letterSpacing: 1 },
});
