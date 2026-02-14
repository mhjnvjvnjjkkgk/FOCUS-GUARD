/**
 * DailyChallengesCard — Three rotating challenges per day (Fortnite-style)
 * 
 * Psychology hooks:
 * - Endowed progress effect (shows partial progress → "might as well finish")
 * - Completion all 3 bonus (all-or-nothing → completionist drive)
 * - Timer shows when challenges refresh (appointment mechanic)
 * - Progress bars fill with animation (satisfying micro-feedback)
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRewardsStore, DailyChallenge } from '@/store/rewardsStore';

function ChallengeRow({ challenge, index }: { challenge: DailyChallenge; index: number }) {
    const progress = challenge.target > 0 ? Math.min(challenge.current / challenge.target, 1) : 0;

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 100).springify()}
            style={[styles.challengeRow, challenge.completed && styles.challengeRowDone]}
        >
            <Text style={styles.challengeEmoji}>{challenge.emoji}</Text>
            <View style={styles.challengeContent}>
                <View style={styles.challengeTop}>
                    <Text style={[styles.challengeTitle, challenge.completed && styles.titleDone]}>
                        {challenge.title}
                    </Text>
                    <Text style={[styles.challengeXP, challenge.completed && styles.xpDone]}>
                        +{challenge.xpReward} XP
                    </Text>
                </View>
                <Text style={styles.challengeDesc}>{challenge.description}</Text>

                {/* Progress Bar */}
                <View style={styles.progressBarBg}>
                    <View style={[
                        styles.progressBarFill,
                        { width: `${progress * 100}%` },
                        challenge.completed && styles.progressBarDone,
                    ]} />
                </View>
                <Text style={styles.progressText}>
                    {challenge.completed ? '✅ COMPLETE' : `${challenge.current}/${challenge.target}`}
                </Text>
            </View>
        </Animated.View>
    );
}

export default function DailyChallengesCard() {
    const { dailyChallenges, refreshChallenges, allChallengesBonus } = useRewardsStore();
    const [timeUntilRefresh, setTimeUntilRefresh] = useState('');

    useEffect(() => {
        refreshChallenges();
    }, []);

    // Countdown to midnight (appointment mechanic!)
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            const diff = midnight.getTime() - now.getTime();
            const hrs = Math.floor(diff / 3600000);
            const mins = Math.floor((diff % 3600000) / 60000);
            setTimeUntilRefresh(`${hrs}h ${mins}m`);
        }, 60000);

        // Immediate
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        const diff = midnight.getTime() - now.getTime();
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        setTimeUntilRefresh(`${hrs}h ${mins}m`);

        return () => clearInterval(interval);
    }, []);

    const completedCount = dailyChallenges.filter(c => c.completed).length;
    const allDone = completedCount === 3;

    return (
        <Animated.View entering={FadeIn} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>📋 DAILY CHALLENGES</Text>
                    <Text style={styles.timerText}>Resets in {timeUntilRefresh}</Text>
                </View>
                <View style={styles.completionPill}>
                    <Text style={styles.completionText}>{completedCount}/3</Text>
                </View>
            </View>

            {/* Challenges */}
            {dailyChallenges.map((c, i) => (
                <ChallengeRow key={c.id} challenge={c} index={i} />
            ))}

            {/* All 3 Bonus Banner */}
            <View style={[styles.bonusBanner, allDone && styles.bonusBannerDone]}>
                <Text style={[styles.bonusText, allDone && styles.bonusTextDone]}>
                    {allDone ? `🏆 ALL COMPLETE! +${allChallengesBonus} XP BONUS` : `Complete all 3 for +${allChallengesBonus} XP bonus!`}
                </Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 3, borderColor: '#000', backgroundColor: '#FFF',
        shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
        marginBottom: 16,
    },

    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 12, paddingVertical: 10,
        borderBottomWidth: 2, borderBottomColor: '#000',
    },
    headerLeft: {},
    headerTitle: { fontSize: 11, fontWeight: '900', color: '#000', letterSpacing: 1 },
    timerText: {
        fontSize: 9, fontWeight: '700', color: '#999', marginTop: 2,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    completionPill: {
        backgroundColor: '#FFD600', borderWidth: 2, borderColor: '#000',
        paddingHorizontal: 10, paddingVertical: 4,
    },
    completionText: { fontSize: 12, fontWeight: '900', color: '#000' },

    challengeRow: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingHorizontal: 12, paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#EEE',
    },
    challengeRowDone: { backgroundColor: '#F0FFF0' },
    challengeEmoji: { fontSize: 24 },
    challengeContent: { flex: 1 },
    challengeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    challengeTitle: { fontSize: 12, fontWeight: '900', color: '#000' },
    titleDone: { color: '#4CAF50', textDecorationLine: 'line-through' },
    challengeXP: {
        fontSize: 11, fontWeight: '900', color: '#4CAF50',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    xpDone: { color: '#999' },
    challengeDesc: { fontSize: 10, color: '#666', fontWeight: '600', marginTop: 2 },

    progressBarBg: {
        height: 6, backgroundColor: '#EEE', borderRadius: 3, marginTop: 6, overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%', backgroundColor: '#FFD600', borderRadius: 3,
    },
    progressBarDone: { backgroundColor: '#4CAF50' },
    progressText: {
        fontSize: 9, fontWeight: '700', color: '#999', marginTop: 3,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },

    bonusBanner: {
        paddingVertical: 8, alignItems: 'center',
        backgroundColor: '#FFFDE0', borderTopWidth: 2, borderTopColor: '#000',
    },
    bonusBannerDone: { backgroundColor: '#E8F5E9' },
    bonusText: { fontSize: 10, fontWeight: '900', color: '#B8860B', letterSpacing: 0.5 },
    bonusTextDone: { color: '#4CAF50' },
});
