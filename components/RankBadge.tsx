/**
 * RankBadge — Small pill component showing current rank
 * Usage: <RankBadge /> or <RankBadge size="large" />
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePointsStore } from '@/store/pointsStore';
import { getStreakBadge } from '@/data/ranks';

interface RankBadgeProps {
    size?: 'small' | 'medium' | 'large';
    showStreak?: boolean;
}

export default function RankBadge({ size = 'medium', showStreak = false }: RankBadgeProps) {
    const currentRank = usePointsStore(s => s.getCurrentRank());
    const currentStreak = usePointsStore(s => s.currentStreak);
    const streakBadge = getStreakBadge(currentStreak);

    const fontSize = size === 'small' ? 10 : size === 'large' ? 16 : 12;
    const paddingH = size === 'small' ? 6 : size === 'large' ? 16 : 10;
    const paddingV = size === 'small' ? 2 : size === 'large' ? 8 : 4;

    return (
        <View style={styles.wrapper}>
            <View style={[
                styles.badge,
                {
                    backgroundColor: currentRank.color + '20',
                    borderColor: currentRank.color,
                    paddingHorizontal: paddingH,
                    paddingVertical: paddingV,
                }
            ]}>
                <Text style={[styles.badgeText, { fontSize, color: currentRank.color }]}>
                    {currentRank.badge} {currentRank.title} • Lv.{currentRank.level}
                </Text>
            </View>
            {showStreak && streakBadge && (
                <View style={[styles.streakPill, { backgroundColor: streakBadge.color + '20', borderColor: streakBadge.color }]}>
                    <Text style={[styles.streakText, { color: streakBadge.color, fontSize: fontSize - 2 }]}>
                        {streakBadge.icon} {currentStreak}d
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    badge: {
        borderWidth: 2,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    badgeText: {
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    streakPill: {
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    streakText: {
        fontWeight: '700',
    },
});
