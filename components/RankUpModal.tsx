/**
 * RankUpModal — Full-screen celebration when user levels up
 * Reads pendingRankUp from pointsStore and shows animated modal
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Modal } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
    withSpring,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { usePointsStore } from '@/store/pointsStore';
import { getNextRank } from '@/data/ranks';

const { width, height } = Dimensions.get('window');

export default function RankUpModal() {
    const pendingRankUp = usePointsStore(s => s.pendingRankUp);
    const dismissRankUp = usePointsStore(s => s.dismissRankUp);
    const totalXP = usePointsStore(s => s.totalPointsEarned);

    // Animations
    const badgeScale = useSharedValue(0);
    const titleOpacity = useSharedValue(0);
    const bgOpacity = useSharedValue(0);
    const glowPulse = useSharedValue(0);
    const buttonOpacity = useSharedValue(0);

    useEffect(() => {
        if (pendingRankUp) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Sequence: bg fade → badge pop → title slide → button fade
            bgOpacity.value = withTiming(1, { duration: 300 });
            badgeScale.value = withDelay(300,
                withSequence(
                    withSpring(1.3, { damping: 6, stiffness: 150 }),
                    withSpring(1, { damping: 10 })
                )
            );
            titleOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
            glowPulse.value = withDelay(400, withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }));
            buttonOpacity.value = withDelay(1000, withTiming(1, { duration: 400 }));
        } else {
            badgeScale.value = 0;
            titleOpacity.value = 0;
            bgOpacity.value = 0;
            glowPulse.value = 0;
            buttonOpacity.value = 0;
        }
    }, [pendingRankUp]);

    const bgStyle = useAnimatedStyle(() => ({
        opacity: bgOpacity.value,
    }));

    const badgeStyle = useAnimatedStyle(() => ({
        transform: [{ scale: badgeScale.value }],
    }));

    const titleStyle = useAnimatedStyle(() => ({
        opacity: titleOpacity.value,
        transform: [{ translateY: (1 - titleOpacity.value) * 20 }],
    }));

    const glowStyle = useAnimatedStyle(() => ({
        opacity: glowPulse.value * 0.4,
        transform: [{ scale: 1 + glowPulse.value * 0.5 }],
    }));

    const buttonStyle = useAnimatedStyle(() => ({
        opacity: buttonOpacity.value,
        transform: [{ translateY: (1 - buttonOpacity.value) * 30 }],
    }));

    const handleDismiss = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        dismissRankUp();
    };

    if (!pendingRankUp) return null;

    const nextRankInfo = getNextRank(totalXP);

    return (
        <Modal
            visible={!!pendingRankUp}
            transparent
            animationType="none"
            onRequestClose={handleDismiss}
        >
            <Animated.View style={[styles.overlay, bgStyle]}>
                {/* Glow effect */}
                <Animated.View style={[styles.glow, { backgroundColor: pendingRankUp.color }, glowStyle]} />

                {/* Content */}
                <View style={styles.content}>
                    {/* Level Up Label */}
                    <Animated.View style={titleStyle}>
                        <Text style={styles.levelUpLabel}>🎉 LEVEL UP!</Text>
                    </Animated.View>

                    {/* Badge */}
                    <Animated.View style={[styles.badgeContainer, badgeStyle]}>
                        <View style={[styles.badgeCircle, { borderColor: pendingRankUp.color, shadowColor: pendingRankUp.color }]}>
                            <Text style={styles.badgeEmoji}>{pendingRankUp.badge}</Text>
                        </View>
                    </Animated.View>

                    {/* Title */}
                    <Animated.View style={titleStyle}>
                        <Text style={[styles.rankTitle, { color: pendingRankUp.color }]}>
                            {pendingRankUp.title}
                        </Text>
                        <Text style={styles.levelNumber}>
                            Level {pendingRankUp.level}
                        </Text>
                        {pendingRankUp.description ? (
                            <Text style={styles.rankDescription}>
                                "{pendingRankUp.description}"
                            </Text>
                        ) : null}
                    </Animated.View>

                    {/* XP Info */}
                    <Animated.View style={[styles.xpInfo, titleStyle]}>
                        <Text style={styles.xpText}>
                            Total XP: {totalXP.toLocaleString()}
                        </Text>
                        {nextRankInfo && (
                            <Text style={styles.nextRankText}>
                                Next: {nextRankInfo.rank.badge} {nextRankInfo.rank.title} ({nextRankInfo.xpNeeded.toLocaleString()} XP to go)
                            </Text>
                        )}
                    </Animated.View>

                    {/* Continue Button */}
                    <Animated.View style={buttonStyle}>
                        <Pressable
                            style={[styles.continueBtn, { backgroundColor: pendingRankUp.color }]}
                            onPress={handleDismiss}
                        >
                            <Text style={styles.continueBtnText}>CONTINUE</Text>
                        </Pressable>
                    </Animated.View>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.92)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    glow: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        top: height * 0.25,
    },
    content: {
        alignItems: 'center',
        gap: 20,
    },
    levelUpLabel: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 4,
        textTransform: 'uppercase',
        marginBottom: 10,
    },
    badgeContainer: {
        marginVertical: 20,
    },
    badgeCircle: {
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 4,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 30,
        elevation: 20,
    },
    badgeEmoji: {
        fontSize: 64,
    },
    rankTitle: {
        fontSize: 32,
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: 1,
    },
    levelNumber: {
        fontSize: 18,
        fontWeight: '700',
        color: '#999',
        textAlign: 'center',
        marginTop: 4,
    },
    rankDescription: {
        fontSize: 14,
        fontWeight: '500',
        color: '#777',
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 8,
        paddingHorizontal: 20,
    },
    xpInfo: {
        alignItems: 'center',
        marginTop: 10,
        gap: 4,
    },
    xpText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#CCC',
    },
    nextRankText: {
        fontSize: 13,
        color: '#888',
    },
    continueBtn: {
        paddingHorizontal: 40,
        paddingVertical: 14,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#000',
        marginTop: 30,
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    continueBtnText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#000',
        letterSpacing: 2,
    },
});
