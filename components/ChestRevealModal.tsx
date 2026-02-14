/**
 * ChestRevealModal — Loot box opening animation after battle wins
 * 
 * Psychology hooks:
 * - Anticipation delay (chest shakes before opening → dopamine builds)
 * - Variable ratio rewards (never same amount → slot machine effect)
 * - Rare drop celebration (streak freeze drop → "OMG!" moment)
 * - "Open another?" prompt when more chests waiting
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withSpring, withSequence,
    withTiming, withDelay, withRepeat, FadeIn, FadeInUp,
    Easing, runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChestRarity, CHEST_CONFIGS } from '@/store/rewardsStore';

const { width: SW } = Dimensions.get('window');

interface Props {
    rarity: ChestRarity;
    xp: number;
    bonusXp: number;
    gotStreakFreeze: boolean;
    onClose: () => void;
}

const RARITY_COLORS: Record<ChestRarity, string> = {
    wooden: '#8B6914', silver: '#C0C0C0', gold: '#FFD600',
    magical: '#9C27B0', legendary: '#FF6B35',
};

const RARITY_LABELS: Record<ChestRarity, string> = {
    wooden: 'WOODEN CHEST', silver: 'SILVER CHEST', gold: 'GOLD CHEST',
    magical: '✨ MAGICAL CHEST', legendary: '👑 LEGENDARY CHEST',
};

export default function ChestRevealModal({ rarity, xp, bonusXp, gotStreakFreeze, onClose }: Props) {
    const [phase, setPhase] = useState<'shake' | 'reveal'>('shake');

    const chestShake = useSharedValue(0);
    const chestScale = useSharedValue(1);
    const revealScale = useSharedValue(0);
    const glowOpacity = useSharedValue(0);

    const color = RARITY_COLORS[rarity];
    const config = CHEST_CONFIGS[rarity];

    useEffect(() => {
        // Phase 1: Chest shakes with anticipation (1.5 seconds)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        chestShake.value = withRepeat(
            withSequence(
                withTiming(-8, { duration: 60 }),
                withTiming(8, { duration: 60 }),
                withTiming(-5, { duration: 50 }),
                withTiming(5, { duration: 50 }),
                withTiming(0, { duration: 40 }),
            ), 6, false
        );

        chestScale.value = withSequence(
            withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.3, { duration: 500, easing: Easing.out(Easing.ease) }),
            withTiming(0, { duration: 200 }), // Chest disappears
        );

        // Phase 2: Reveal burst (after 1.5s)
        setTimeout(() => {
            setPhase('reveal');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            revealScale.value = withSequence(
                withTiming(0, { duration: 0 }),
                withSpring(1.2, { damping: 5, stiffness: 200 }),
                withSpring(1, { damping: 10 })
            );

            glowOpacity.value = withSequence(
                withTiming(1, { duration: 200 }),
                withTiming(0.3, { duration: 800 }),
            );
        }, 1500);
    }, []);

    const chestAnim = useAnimatedStyle(() => ({
        transform: [
            { translateX: chestShake.value },
            { scale: chestScale.value },
        ],
    }));

    const revealAnim = useAnimatedStyle(() => ({
        transform: [{ scale: revealScale.value }],
    }));

    const glowAnim = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    const totalXP = xp + bonusXp;

    return (
        <Animated.View entering={FadeIn.duration(200)} style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.95)' }]}>
            {/* Glow */}
            <Animated.View style={[styles.glow, glowAnim, { backgroundColor: color }]} />

            {phase === 'shake' ? (
                /* Phase 1: Shaking Chest */
                <Animated.View style={[styles.chestContainer, chestAnim]}>
                    <Text style={styles.chestEmoji}>{config.emoji}</Text>
                    <Text style={[styles.chestLabel, { color }]}>{RARITY_LABELS[rarity]}</Text>
                    <Text style={styles.tapHint}>Opening...</Text>
                </Animated.View>
            ) : (
                /* Phase 2: Reward Reveal */
                <Animated.View style={[styles.revealContainer, revealAnim]}>
                    <Text style={styles.revealEmoji}>
                        {rarity === 'legendary' ? '👑' : rarity === 'magical' ? '✨' : rarity === 'gold' ? '💰' : '📦'}
                    </Text>

                    {/* XP Reward */}
                    <View style={[styles.rewardBox, { borderColor: color }]}>
                        <Text style={[styles.rewardXP, { color }]}>+{totalXP} XP</Text>
                        {bonusXp > 0 && (
                            <Text style={styles.bonusText}>
                                ({xp} base + {bonusXp} bonus!)
                            </Text>
                        )}
                    </View>

                    {/* Streak Freeze Drop — RARE! */}
                    {gotStreakFreeze && (
                        <Animated.View entering={FadeInUp.delay(300).springify()} style={styles.rareDropBanner}>
                            <Text style={styles.rareDropEmoji}>🧊</Text>
                            <View>
                                <Text style={styles.rareDropTitle}>STREAK FREEZE!</Text>
                                <Text style={styles.rareDropSub}>Protects your streak for 1 day</Text>
                            </View>
                        </Animated.View>
                    )}

                    {/* Close Button */}
                    <Pressable
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
                        style={[styles.collectBtn, { backgroundColor: color }]}
                    >
                        <Text style={styles.collectBtnText}>COLLECT</Text>
                    </Pressable>
                </Animated.View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center', alignItems: 'center',
        zIndex: 10002,
    },
    glow: {
        position: 'absolute', width: SW, height: SW, borderRadius: SW / 2,
        opacity: 0.2,
    },

    chestContainer: { alignItems: 'center' },
    chestEmoji: { fontSize: 80, marginBottom: 16 },
    chestLabel: { fontSize: 16, fontWeight: '900', letterSpacing: 3 },
    tapHint: { fontSize: 12, color: '#666', marginTop: 12, fontWeight: '700' },

    revealContainer: { alignItems: 'center', width: '100%', paddingHorizontal: 32 },
    revealEmoji: { fontSize: 64, marginBottom: 20 },

    rewardBox: {
        borderWidth: 3, paddingVertical: 20, paddingHorizontal: 40,
        backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center',
        marginBottom: 20, width: '100%',
    },
    rewardXP: {
        fontSize: 36, fontWeight: '900', letterSpacing: 2,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    bonusText: { fontSize: 12, color: '#888', fontWeight: '700', marginTop: 4 },

    rareDropBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#1A3A4A', borderWidth: 2, borderColor: '#4A9EFF',
        padding: 14, marginBottom: 20, width: '100%',
    },
    rareDropEmoji: { fontSize: 28 },
    rareDropTitle: { fontSize: 14, fontWeight: '900', color: '#4A9EFF', letterSpacing: 2 },
    rareDropSub: { fontSize: 10, color: '#888', fontWeight: '700' },

    collectBtn: {
        borderWidth: 3, borderColor: '#000', paddingVertical: 14, paddingHorizontal: 48,
        shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
    },
    collectBtnText: { fontSize: 18, fontWeight: '900', color: '#FFF', letterSpacing: 3 },
});
