/**
 * ActiveBattleNotch — Floating mini-bar showing active battle status
 * 
 * Like Uber's ride status bar or Spotify's "Now Playing" strip.
 * Persists across all tabs when a battle is active, letting users navigate
 * freely without losing sight of their battle progress.
 * 
 * Psychology: Creates ambient awareness (you're always "in" the battle),
 * and the pulsing timer creates urgency even when browsing other screens.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withRepeat, withSequence,
    withTiming, FadeInDown, FadeOutDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useBattleStore } from '@/store/battleStore';

export default function ActiveBattleNotch() {
    const { currentBattle, status } = useBattleStore();
    const [elapsed, setElapsed] = useState(0);

    // Pulse animation for urgency
    const pulseOpacity = useSharedValue(1);
    useEffect(() => {
        if (status === 'active' && currentBattle) {
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.6, { duration: 800 }),
                    withTiming(1, { duration: 800 })
                ),
                -1, true
            );
        }
    }, [status]);

    // Elapsed timer
    useEffect(() => {
        if (status !== 'active' || !currentBattle) return;
        const interval = setInterval(() => {
            const now = Date.now();
            const startTime = new Date(currentBattle.startTime).getTime();
            setElapsed(Math.floor((now - startTime) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [status, currentBattle]);

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    // Only show during active battle and when NOT on battle tab
    if (status !== 'active' || !currentBattle) return null;

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const targetSeconds = currentBattle.opponentTargetSeconds || 0;
    const progress = targetSeconds > 0 ? Math.min(elapsed / targetSeconds, 1) : 0;

    return (
        <Animated.View
            entering={FadeInDown.springify()}
            exiting={FadeOutDown}
            style={styles.container}
        >
            <Pressable
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/(tabs)/battle' as any);
                }}
                style={styles.notch}
            >
                {/* Live indicator */}
                <Animated.View style={[styles.liveDot, pulseStyle]} />

                {/* Battle info */}
                <View style={styles.info}>
                    <Text style={styles.label} numberOfLines={1}>
                        ⚔️ BATTLE ACTIVE
                    </Text>
                    <Text style={styles.category}>
                        vs {currentBattle.opponent?.name || 'Opponent'}
                    </Text>
                </View>

                {/* Timer */}
                <View style={styles.timerSection}>
                    <Text style={styles.timer}>{formatTime(elapsed)}</Text>
                    {/* Mini progress bar */}
                    <View style={styles.progressBg}>
                        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                </View>

                {/* Tap hint */}
                <Text style={styles.tapHint}>TAP →</Text>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 100 : 80, // Above tab bar
        left: 12, right: 12,
        zIndex: 999,
    },
    notch: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A1A1A',
        borderWidth: 3,
        borderColor: '#FFD600',
        paddingVertical: 10,
        paddingHorizontal: 14,
        gap: 10,
        shadowColor: '#FFD600',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 16,
    },
    liveDot: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: '#FF4444',
    },
    info: { flex: 1 },
    label: { fontSize: 11, fontWeight: '900', color: '#FFD600', letterSpacing: 2 },
    category: { fontSize: 10, fontWeight: '700', color: '#AAA', marginTop: 1 },
    timerSection: { alignItems: 'flex-end' },
    timer: {
        fontSize: 16, fontWeight: '900', color: '#FFF', letterSpacing: 1,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    progressBg: {
        width: 60, height: 3, backgroundColor: '#333', marginTop: 4, borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: { height: '100%', backgroundColor: '#FFD600', borderRadius: 2 },
    tapHint: { fontSize: 9, fontWeight: '900', color: '#666', letterSpacing: 1 },
});
