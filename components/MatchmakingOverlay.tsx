/**
 * MatchmakingOverlay — Full-screen 8 Ball Pool-style matchmaking animation
 * 
 * Phase 1: SEARCHING — spinning ring + player avatar slides in (2-4s)
 * Phase 2: FOUND — opponent SLAMS in from right + VS punches in (1.5s)
 * Phase 3: COUNTDOWN — "3... 2... 1... FOCUS!" with spring drops (3.5s)
 * Phase 4: GO — flash + dissolve → battle starts
 */
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming, withSpring,
    withDelay, withSequence, withRepeat, Easing,
    runOnJS, interpolateColor, interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useBattleStore, ActiveBattle } from '@/store/battleStore';
import { Rank } from '@/data/ranks';

const { width: SW, height: SH } = Dimensions.get('window');

interface Props {
    battle: ActiveBattle;
    playerRank: Rank;
    onComplete: () => void;
}

export default function MatchmakingOverlay({ battle, playerRank, onComplete }: Props) {
    const { onMatchmakingComplete, onCountdownComplete } = useBattleStore();

    // Animation phase
    const [phase, setPhase] = useState<'searching' | 'found' | 'countdown' | 'go'>('searching');
    const [countNum, setCountNum] = useState(3);

    // Shared values
    const overlayOpacity = useSharedValue(0);
    const spinAngle = useSharedValue(0);
    const ringScale = useSharedValue(1);
    const playerX = useSharedValue(-SW);
    const opponentX = useSharedValue(SW);
    const vsScale = useSharedValue(0);
    const vsOpacity = useSharedValue(0);
    const countScale = useSharedValue(3);
    const countOpacity = useSharedValue(0);
    const flashOpacity = useSharedValue(0);
    const searchTextOpacity = useSharedValue(1);
    const searchDotCount = useSharedValue(0);

    // Pulsing placeholder
    const placeholderOpacity = useSharedValue(0.3);

    // Phase flow
    useEffect(() => {
        startSearching();
    }, []);

    const startSearching = useCallback(() => {
        // Fade in overlay
        overlayOpacity.value = withTiming(1, { duration: 300 });

        // Start spinner
        spinAngle.value = withRepeat(
            withTiming(360, { duration: 1200, easing: Easing.linear }), -1
        );

        // Ring pulse
        ringScale.value = withRepeat(
            withSequence(
                withTiming(1.15, { duration: 600 }),
                withTiming(1, { duration: 600 })
            ), -1, true
        );

        // Player slides in from left
        playerX.value = withSpring(0, { damping: 15, stiffness: 120 });

        // Pulsing placeholder on right
        placeholderOpacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 500 }),
                withTiming(0.3, { duration: 500 })
            ), -1, true
        );

        // Haptic pulse during search
        const hapticInterval = setInterval(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 600);

        // After 2.5s → found opponent
        setTimeout(() => {
            clearInterval(hapticInterval);
            runOnJS(setPhase)('found');
            startFound();
        }, 2500);
    }, []);

    const startFound = useCallback(() => {
        // Stop spinner
        spinAngle.value = withTiming(spinAngle.value, { duration: 0 });

        // Hide search text
        searchTextOpacity.value = withTiming(0, { duration: 200 });

        // SLAM opponent in from right
        opponentX.value = withSpring(0, { damping: 8, stiffness: 200 });

        // Ring disappear
        ringScale.value = withTiming(0, { duration: 300 });

        // Heavy haptic on slam
        setTimeout(() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 200);

        // VS text punches in
        setTimeout(() => {
            vsOpacity.value = withTiming(1, { duration: 100 });
            vsScale.value = withSequence(
                withTiming(0, { duration: 0 }),
                withSpring(1.4, { damping: 6, stiffness: 200 }),
                withSpring(1, { damping: 10, stiffness: 150 })
            );
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }, 400);

        // Flash effect
        flashOpacity.value = withSequence(
            withDelay(300, withTiming(0.6, { duration: 100 })),
            withTiming(0, { duration: 300 })
        );

        // Trigger matchmaking complete in store
        onMatchmakingComplete();

        // After 2s → countdown
        setTimeout(() => {
            runOnJS(setPhase)('countdown');
            startCountdown();
        }, 2000);
    }, []);

    const startCountdown = useCallback(() => {
        // Hide VS
        vsOpacity.value = withTiming(0.3, { duration: 300 });
        vsScale.value = withTiming(0.5, { duration: 300 });

        const showNumber = (num: number, delay: number) => {
            setTimeout(() => {
                runOnJS(setCountNum)(num);
                countOpacity.value = withSequence(
                    withTiming(1, { duration: 50 }),
                    withDelay(600, withTiming(0, { duration: 200 }))
                );
                countScale.value = withSequence(
                    withTiming(3, { duration: 0 }),
                    withSpring(1, { damping: 8, stiffness: 150 })
                );
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }, delay);
        };

        showNumber(3, 0);
        showNumber(2, 900);
        showNumber(1, 1800);

        // "FOCUS!" at the end
        setTimeout(() => {
            runOnJS(setCountNum)(0); // 0 = FOCUS!
            countOpacity.value = withTiming(1, { duration: 50 });
            countScale.value = withSequence(
                withTiming(3, { duration: 0 }),
                withSpring(1, { damping: 6, stiffness: 200 })
            );
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Final flash + dissolve
            flashOpacity.value = withSequence(
                withTiming(0.8, { duration: 100 }),
                withTiming(0, { duration: 200 })
            );

            onCountdownComplete();

            setTimeout(() => {
                overlayOpacity.value = withTiming(0, { duration: 400 });
                setTimeout(() => {
                    runOnJS(onComplete)();
                }, 400);
            }, 800);
        }, 2700);
    }, []);

    // ============================================
    // ANIMATED STYLES
    // ============================================
    const overlayStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
    }));

    const spinnerStyle = useAnimatedStyle(() => ({
        transform: [
            { rotate: `${spinAngle.value}deg` },
            { scale: ringScale.value },
        ],
    }));

    const playerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: playerX.value }],
    }));

    const opponentStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: opponentX.value }],
    }));

    const vsStyle = useAnimatedStyle(() => ({
        opacity: vsOpacity.value,
        transform: [{ scale: vsScale.value }],
    }));

    const countStyle = useAnimatedStyle(() => ({
        opacity: countOpacity.value,
        transform: [{ scale: countScale.value }],
    }));

    const flashStyle = useAnimatedStyle(() => ({
        opacity: flashOpacity.value,
    }));

    const searchStyle = useAnimatedStyle(() => ({
        opacity: searchTextOpacity.value,
    }));

    const placeholderStyle = useAnimatedStyle(() => ({
        opacity: placeholderOpacity.value,
    }));

    return (
        <Animated.View style={[styles.overlay, overlayStyle]}>
            {/* Flash effect */}
            <Animated.View style={[styles.flash, flashStyle]} />

            {/* Search spinner (Phase 1) */}
            {(phase === 'searching') && (
                <Animated.View style={[styles.spinnerContainer, spinnerStyle]}>
                    <View style={styles.spinnerRing}>
                        <View style={styles.spinnerDot} />
                    </View>
                </Animated.View>
            )}

            {/* Player avatars row */}
            <View style={styles.vsContainer}>
                {/* Player (left) */}
                <Animated.View style={[styles.playerCard, playerStyle]}>
                    <Text style={styles.playerAvatar}>{playerRank.badge}</Text>
                    <Text style={styles.playerName}>YOU</Text>
                    <Text style={styles.playerRank}>{playerRank.title}</Text>
                    {battle.myFocusLabel ? (
                        <Text style={styles.playerLabel}>📖 {battle.myFocusLabel}</Text>
                    ) : null}
                </Animated.View>

                {/* VS */}
                <Animated.View style={[styles.vsTextContainer, vsStyle]}>
                    <Text style={styles.vsText}>VS</Text>
                </Animated.View>

                {/* Opponent (right) — placeholder or real */}
                {phase === 'searching' ? (
                    <Animated.View style={[styles.playerCard, styles.placeholderCard, placeholderStyle]}>
                        <Text style={styles.playerAvatar}>❓</Text>
                        <Text style={styles.playerName}>???</Text>
                    </Animated.View>
                ) : (
                    <Animated.View style={[styles.playerCard, styles.opponentCard, opponentStyle]}>
                        <Text style={styles.playerAvatar}>{battle.opponent.avatar}</Text>
                        <Text style={styles.playerName}>{battle.opponent.name}</Text>
                        <Text style={styles.playerRank}>Rank {battle.opponent.rankLevel}</Text>
                        <Text style={styles.playerLabel}>📖 {battle.opponent.focusLabel}</Text>
                    </Animated.View>
                )}
            </View>

            {/* Search text */}
            {phase === 'searching' && (
                <Animated.View style={[styles.searchTextContainer, searchStyle]}>
                    <Text style={styles.searchText}>SEARCHING FOR OPPONENT...</Text>
                </Animated.View>
            )}

            {/* Category + Stake info */}
            <View style={styles.infoRow}>
                <Text style={styles.infoText}>
                    {battle.categoryConfig.emoji} {battle.categoryConfig.label} • 🪙 {battle.stake} XP
                </Text>
            </View>

            {/* Countdown numbers */}
            {(phase === 'countdown' || phase === 'go') && (
                <Animated.View style={[styles.countContainer, countStyle]}>
                    <Text style={styles.countText}>
                        {countNum === 0 ? 'FOCUS!' : countNum}
                    </Text>
                </Animated.View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        justifyContent: 'center', alignItems: 'center', zIndex: 9999,
    },
    flash: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FFD600', zIndex: 10000,
    },

    // Spinner
    spinnerContainer: {
        position: 'absolute', top: SH * 0.2,
        width: 100, height: 100,
        justifyContent: 'center', alignItems: 'center',
    },
    spinnerRing: {
        width: 80, height: 80, borderRadius: 40,
        borderWidth: 4, borderColor: 'rgba(255,255,255,0.15)',
        borderTopColor: '#FFD600', borderRightColor: '#FFD600',
        justifyContent: 'flex-start', alignItems: 'center',
    },
    spinnerDot: {
        width: 10, height: 10, borderRadius: 5,
        backgroundColor: '#FFD600', marginTop: -5,
    },

    // VS Container
    vsContainer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        width: '100%', paddingHorizontal: 20, gap: 0,
    },
    playerCard: {
        width: SW * 0.35, alignItems: 'center', padding: 16,
        borderWidth: 3, borderColor: '#FFD600', backgroundColor: 'rgba(255,214,0,0.08)',
    },
    opponentCard: {
        borderColor: '#FF4444', backgroundColor: 'rgba(255,68,68,0.08)',
    },
    placeholderCard: {
        borderColor: '#555', borderStyle: 'dashed',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    playerAvatar: { fontSize: 40, marginBottom: 8 },
    playerName: { fontSize: 14, fontWeight: '900', color: '#FFF', letterSpacing: 1, textAlign: 'center' },
    playerRank: { fontSize: 10, fontWeight: '700', color: '#AAA', marginTop: 2 },
    playerLabel: { fontSize: 9, fontWeight: '600', color: '#888', marginTop: 6, textAlign: 'center' },

    // VS Text
    vsTextContainer: {
        width: 60, height: 60, justifyContent: 'center', alignItems: 'center',
        marginHorizontal: -10, zIndex: 10,
    },
    vsText: {
        fontSize: 32, fontWeight: '900', color: '#FFD600',
        textShadowColor: '#000', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0,
    },

    // Search text
    searchTextContainer: { position: 'absolute', top: SH * 0.15 },
    searchText: {
        fontSize: 14, fontWeight: '900', color: '#FFD600', letterSpacing: 3,
        textAlign: 'center',
    },

    // Info row
    infoRow: { position: 'absolute', bottom: SH * 0.15, alignItems: 'center' },
    infoText: { fontSize: 14, fontWeight: '800', color: '#999', letterSpacing: 1 },

    // Countdown
    countContainer: {
        position: 'absolute', justifyContent: 'center', alignItems: 'center',
    },
    countText: {
        fontSize: 80, fontWeight: '900', color: '#FFD600',
        textShadowColor: '#000', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0,
    },
});
