/**
 * DailyRewardsModal — Shown on app open, like Clash Royale daily chest
 * Escalating 7-day rewards that RESET if you miss a day (loss aversion)
 * 
 * Psychology hooks:
 * - Escalating rewards create anticipation (Day 7 = 20x of Day 1)
 * - Reset on miss triggers loss aversion (strongest motivator)
 * - Progress bar shows what you'll lose
 * - "Come back tomorrow for DAY X!" creates appointment mechanic
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withSpring, withSequence,
    withTiming, withDelay, FadeIn, FadeInUp, FadeInDown,
    withRepeat, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRewardsStore, DAILY_REWARDS } from '@/store/rewardsStore';
import { usePointsStore } from '@/store/pointsStore';

const { width: SW } = Dimensions.get('window');

interface Props {
    visible: boolean;
    onClose: () => void;
}

export default function DailyRewardsModal({ visible, onClose }: Props) {
    const { claimDailyReward, dailyLoginDay, dailyRewardClaimed, loginStreak } = useRewardsStore();
    const pointsStore = usePointsStore();

    const titleScale = useSharedValue(0);
    const rewardScale = useSharedValue(0);
    const glowOpacity = useSharedValue(0);

    useEffect(() => {
        if (visible) {
            titleScale.value = withSequence(
                withTiming(0, { duration: 0 }),
                withSpring(1.15, { damping: 6, stiffness: 200 }),
                withSpring(1, { damping: 10 })
            );
            rewardScale.value = withDelay(400, withSpring(1, { damping: 8 }));
            glowOpacity.value = withDelay(300, withRepeat(
                withSequence(
                    withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
                ), -1, true
            ));
        }
    }, [visible]);

    const titleAnim = useAnimatedStyle(() => ({
        transform: [{ scale: titleScale.value }],
    }));

    const rewardAnim = useAnimatedStyle(() => ({
        transform: [{ scale: rewardScale.value }],
    }));

    const glowAnim = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
    }));

    const handleClaim = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const result = claimDailyReward();
        if (result) {
            // Add XP to pointsStore
            const today = new Date().toISOString().split('T')[0];
            pointsStore.addPoints(today, 'specialBonuses', result.xp);
        }
        // Slight delay for animation feel
        setTimeout(onClose, 800);
    };

    if (!visible) return null;

    const currentReward = DAILY_REWARDS[Math.min(dailyLoginDay, DAILY_REWARDS.length - 1)];
    const nextDay = dailyLoginDay >= 7 ? 1 : dailyLoginDay + 1;
    const nextReward = DAILY_REWARDS[nextDay - 1];

    return (
        <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
            {/* Glow Background */}
            <Animated.View style={[styles.glow, glowAnim]} />

            {/* Title */}
            <Animated.View style={[styles.titleBox, titleAnim]}>
                <Text style={styles.titleEmoji}>🎁</Text>
                <Text style={styles.titleText}>DAILY REWARD</Text>
                <Text style={styles.titleEmoji}>🎁</Text>
            </Animated.View>

            {/* Day Progress */}
            <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.daysRow}>
                {DAILY_REWARDS.map((r, i) => {
                    const dayNum = i + 1;
                    const isPast = dayNum < dailyLoginDay + 1;
                    const isCurrent = dayNum === dailyLoginDay + 1;
                    const isFuture = dayNum > dailyLoginDay + 1;

                    return (
                        <View key={dayNum} style={[
                            styles.dayPill,
                            isPast && styles.dayPillPast,
                            isCurrent && styles.dayPillCurrent,
                            isFuture && styles.dayPillFuture,
                        ]}>
                            <Text style={[styles.dayLabel, isCurrent && styles.dayLabelCurrent]}>
                                D{dayNum}
                            </Text>
                            <Text style={[styles.dayXP, isCurrent && styles.dayXPCurrent]}>
                                {r.xp}
                            </Text>
                            {isPast && <Text style={styles.dayCheck}>✓</Text>}
                        </View>
                    );
                })}
            </Animated.View>

            {/* Main Reward Card */}
            <Animated.View style={[styles.rewardCard, rewardAnim]}>
                <Text style={styles.rewardDay}>
                    DAY {Math.min(dailyLoginDay + 1, 7)}
                </Text>
                <Text style={styles.rewardEmoji}>
                    {currentReward?.rarity === 'legendary' ? '👑' :
                        currentReward?.rarity === 'rare' ? '💎' :
                            currentReward?.rarity === 'uncommon' ? '✨' : '🎁'}
                </Text>
                <Text style={styles.rewardXP}>
                    +{currentReward?.xp || 10} XP
                </Text>
                <Text style={styles.rewardLabel}>
                    {currentReward?.label || 'Welcome Back!'}
                </Text>
            </Animated.View>

            {/* Claim Button */}
            {!dailyRewardClaimed ? (
                <Animated.View entering={FadeInUp.delay(600).springify()}>
                    <Pressable
                        onPress={handleClaim}
                        style={({ pressed }) => [
                            styles.claimBtn,
                            pressed && styles.claimBtnPressed,
                        ]}
                    >
                        <Text style={styles.claimBtnText}>CLAIM REWARD!</Text>
                    </Pressable>
                </Animated.View>
            ) : (
                <Animated.View entering={FadeInUp.delay(600).springify()}>
                    <Pressable onPress={onClose} style={styles.claimedBtn}>
                        <Text style={styles.claimedBtnText}>✅ CLAIMED! Come back tomorrow</Text>
                    </Pressable>
                </Animated.View>
            )}

            {/* Tomorrow Tease (anticipation mechanic) */}
            <Animated.View entering={FadeInUp.delay(800)} style={styles.tomorrowTease}>
                <Text style={styles.tomorrowText}>
                    Tomorrow: DAY {nextDay} — 🎁 +{nextReward.xp} XP
                </Text>
                {loginStreak >= 5 && (
                    <Text style={styles.warningText}>
                        ⚠️ Don't break your {loginStreak}-day streak!
                    </Text>
                )}
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.92)',
        justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 20, zIndex: 10001,
    },
    glow: {
        position: 'absolute', width: SW * 1.5, height: SW * 1.5, borderRadius: SW,
        backgroundColor: '#FFD600', opacity: 0.15,
    },

    titleBox: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30 },
    titleEmoji: { fontSize: 36 },
    titleText: { fontSize: 28, fontWeight: '900', color: '#FFD600', letterSpacing: 4 },

    daysRow: {
        flexDirection: 'row', gap: 4, marginBottom: 30, flexWrap: 'wrap', justifyContent: 'center',
    },
    dayPill: {
        width: 40, height: 55, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: '#333', backgroundColor: '#1A1A1A',
    },
    dayPillPast: { backgroundColor: '#1A3A1A', borderColor: '#4CAF50' },
    dayPillCurrent: { backgroundColor: '#FFD600', borderColor: '#000', borderWidth: 3, transform: [{ scale: 1.15 }] },
    dayPillFuture: { backgroundColor: '#111', borderColor: '#222' },
    dayLabel: { fontSize: 9, fontWeight: '900', color: '#666' },
    dayLabelCurrent: { color: '#000' },
    dayXP: {
        fontSize: 11, fontWeight: '900', color: '#888',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    dayXPCurrent: { color: '#000' },
    dayCheck: { fontSize: 10, color: '#4CAF50', fontWeight: '900' },

    rewardCard: {
        backgroundColor: '#FFD600', borderWidth: 4, borderColor: '#000',
        paddingVertical: 30, paddingHorizontal: 40, alignItems: 'center',
        shadowColor: '#FFD600', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20,
        marginBottom: 24,
    },
    rewardDay: { fontSize: 12, fontWeight: '900', color: '#000', letterSpacing: 3, marginBottom: 8 },
    rewardEmoji: { fontSize: 48, marginBottom: 8 },
    rewardXP: {
        fontSize: 36, fontWeight: '900', color: '#000', letterSpacing: 2,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    rewardLabel: { fontSize: 13, fontWeight: '800', color: '#333', marginTop: 4 },

    claimBtn: {
        backgroundColor: '#4CAF50', borderWidth: 3, borderColor: '#000',
        paddingVertical: 16, paddingHorizontal: 48,
        shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0,
    },
    claimBtnPressed: {
        shadowOffset: { width: 2, height: 2 }, transform: [{ translateX: 3 }, { translateY: 3 }],
    },
    claimBtnText: { fontSize: 18, fontWeight: '900', color: '#FFF', letterSpacing: 2 },

    claimedBtn: { paddingVertical: 14, paddingHorizontal: 32, borderWidth: 2, borderColor: '#444' },
    claimedBtnText: { fontSize: 14, fontWeight: '800', color: '#888', letterSpacing: 1 },

    tomorrowTease: { marginTop: 24, alignItems: 'center' },
    tomorrowText: { fontSize: 12, fontWeight: '700', color: '#888' },
    warningText: { fontSize: 11, fontWeight: '900', color: '#FF4444', marginTop: 6 },
});
