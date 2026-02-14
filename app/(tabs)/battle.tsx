/**
 * Battle Hub — Clash Royale-style central battle screen
 * Category cards, big PLAY button, focus label, win/loss stats
 */
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView, TextInput,
    Dimensions, Platform, Alert, StatusBar,
} from 'react-native';
import Animated, {
    FadeInDown, FadeInUp, FadeIn,
    useSharedValue, useAnimatedStyle, withRepeat, withTiming,
    withSpring, withSequence, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Image } from 'expo-image';

import { useBattleStore } from '@/store/battleStore';
import { usePointsStore } from '@/store/pointsStore';
import { BATTLE_CATEGORIES, BattleCategory } from '@/data/bots';
import { RANKS } from '@/data/ranks';
import MatchmakingOverlay from '@/components/MatchmakingOverlay';
import ActiveBattleView from '@/components/ActiveBattleView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NEO = {
    border: 3,
    shadow: 5,
    colors: {
        black: '#000', white: '#FFF', bg: '#FFFDF0',
        yellow: '#FFD600', red: '#FF4444', blue: '#4A9EFF',
        green: '#4CAF50',
    },
};

// ============================================
// CATEGORY CARD
// ============================================
function CategoryCard({
    category, isSelected, onPress, delay,
}: {
    category: typeof BATTLE_CATEGORIES[0];
    isSelected: boolean;
    onPress: () => void;
    delay: number;
}) {
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        if (isSelected) {
            pulseScale.value = withRepeat(
                withSequence(
                    withTiming(1.03, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
                ), -1, true
            );
        } else {
            pulseScale.value = withSpring(1);
        }
    }, [isSelected]);

    const animatedScale = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()} style={animatedScale}>
            <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
                style={[
                    styles.categoryCard,
                    { borderColor: category.color },
                    isSelected && {
                        backgroundColor: category.color + '15',
                        shadowColor: category.color,
                        shadowOpacity: 0.6,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 0 },
                    },
                ]}
            >
                <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                <Text style={[styles.categoryLabel, { color: category.color }]}>{category.label}</Text>
                <Text style={styles.categoryDuration}>
                    {category.minMinutes}–{category.maxMinutes}m
                </Text>
                <View style={[styles.categoryStakePill, { backgroundColor: category.color + '20', borderColor: category.color }]}>
                    <Text style={[styles.categoryStakeText, { color: category.color }]}>
                        ✨ {category.description.split('.')[0]}
                    </Text>
                </View>
                {isSelected && (
                    <View style={[styles.selectedCheck, { backgroundColor: category.color }]}>
                        <Ionicons name="checkmark" size={14} color="#FFF" />
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}

// ============================================
// MAIN BATTLE HUB
// ============================================
export default function BattleScreen() {
    const battleStore = useBattleStore();
    const pointsStore = usePointsStore();
    const {
        selectedCategory, status: battleStatus,
        currentBattle, selectCategory, startMatchmaking,
    } = battleStore;

    const [focusLabel, setFocusLabel] = useState('');
    const [showMatchmaking, setShowMatchmaking] = useState(false);
    const [showActiveBattle, setShowActiveBattle] = useState(false);

    const stats = battleStore.getStats();
    const currentRank = RANKS.find(r => r.level === pointsStore.currentLevel) || RANKS[0];

    // Handle FIND OPPONENT
    const handlePlay = async () => {
        if (!selectedCategory) {
            Alert.alert('Select Category', 'Choose a battle category first');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await startMatchmaking(focusLabel, currentRank.level);
        setShowMatchmaking(true);
    };

    // Format time
    const formatSeconds = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <Animated.View entering={FadeInUp.springify()} style={styles.header}>
                <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/account' as any); }}
                    style={styles.avatarBtn}
                >
                    <Image source={require('@/assets/images/fg-avatar.png')} style={{ width: 32, height: 32 }} />
                </Pressable>
                <Text style={styles.headerTitle}>⚔️ BATTLE ARENA</Text>
                <View style={{ width: 40 }} />
            </Animated.View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Rank + XP Row */}
                <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.rankRow}>
                    <View style={styles.rankPill}>
                        <Text style={styles.rankBadge}>{currentRank.badge}</Text>
                        <View>
                            <Text style={styles.rankTitle}>{currentRank.title}</Text>
                            <Text style={styles.xpText}>{pointsStore.totalPointsEarned.toLocaleString()} XP</Text>
                        </View>
                    </View>
                    <View style={styles.statsRow}>
                        <View style={[styles.statBox, { borderColor: NEO.colors.green }]}>
                            <Text style={[styles.statNum, { color: NEO.colors.green }]}>{stats.wins}</Text>
                            <Text style={styles.statLabel}>W</Text>
                        </View>
                        <View style={[styles.statBox, { borderColor: NEO.colors.red }]}>
                            <Text style={[styles.statNum, { color: NEO.colors.red }]}>{stats.losses}</Text>
                            <Text style={styles.statLabel}>L</Text>
                        </View>
                        <View style={[styles.statBox, { borderColor: NEO.colors.blue }]}>
                            <Text style={[styles.statNum, { color: NEO.colors.blue }]}>{stats.winRate}%</Text>
                            <Text style={styles.statLabel}>WR</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Category Cards Grid */}
                <Text style={styles.sectionTitle}>SELECT CATEGORY</Text>
                <View style={styles.categoryGrid}>
                    {BATTLE_CATEGORIES.map((cat, idx) => (
                        <CategoryCard
                            key={cat.id}
                            category={cat}
                            isSelected={selectedCategory === cat.id}
                            onPress={() => selectCategory(cat.id)}
                            delay={100 + idx * 50}
                        />
                    ))}
                </View>

                {/* Focus Label */}
                <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.labelSection}>
                    <Text style={styles.sectionTitle}>WHAT ARE YOU FOCUSING ON?</Text>
                    <TextInput
                        style={styles.labelInput}
                        value={focusLabel}
                        onChangeText={setFocusLabel}
                        placeholder="e.g. Math homework, Coding project..."
                        placeholderTextColor="#bbb"
                        maxLength={50}
                    />
                </Animated.View>

                {/* BIG PLAY BUTTON */}
                <Animated.View entering={FadeInDown.delay(400).springify()}>
                    <Pressable
                        onPress={handlePlay}
                        style={({ pressed }) => [
                            styles.playButton,
                            pressed && styles.playButtonPressed,
                            !selectedCategory && styles.playButtonDisabled,
                        ]}
                        disabled={!selectedCategory}
                    >
                        <Ionicons name="flash" size={28} color="#000" />
                        <Text style={styles.playButtonText}>FIND OPPONENT</Text>
                    </Pressable>
                </Animated.View>

                {/* Win Streak */}
                {stats.streak > 0 && (
                    <Animated.View entering={FadeIn} style={styles.streakBanner}>
                        <Text style={styles.streakText}>🔥 {stats.streak} WIN STREAK</Text>
                    </Animated.View>
                )}

                {/* Recent Battles */}
                {battleStore.battleHistory.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(500).springify()}>
                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>RECENT BATTLES</Text>
                        {battleStore.battleHistory.slice(0, 5).map((entry) => (
                            <View key={entry.id} style={[
                                styles.historyCard,
                                {
                                    borderLeftColor: entry.result === 'win' ? NEO.colors.green
                                        : entry.result === 'loss' ? NEO.colors.red : NEO.colors.blue,
                                    borderLeftWidth: 5,
                                },
                            ]}>
                                <View style={styles.historyTop}>
                                    <Text style={styles.historyResult}>
                                        {entry.result === 'win' ? '🏆 WIN' : entry.result === 'loss' ? '💀 LOSS' : '🤝 TIE'}
                                    </Text>
                                    <Text style={[
                                        styles.historyXP,
                                        { color: NEO.colors.green },
                                    ]}>
                                        +{entry.xpEarned} XP
                                    </Text>
                                </View>
                                <Text style={styles.historyVs}>
                                    {entry.opponentAvatar} vs {entry.opponentName}
                                </Text>
                                <Text style={styles.historyTime}>
                                    You: {formatSeconds(entry.myTimeSeconds)} • Them: {formatSeconds(entry.opponentTimeSeconds)}
                                </Text>
                            </View>
                        ))}
                    </Animated.View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Matchmaking Overlay */}
            {showMatchmaking && currentBattle && (
                <MatchmakingOverlay
                    battle={currentBattle}
                    playerRank={currentRank}
                    onComplete={() => {
                        setShowMatchmaking(false);
                        setShowActiveBattle(true);
                    }}
                />
            )}

            {/* Active Battle View */}
            {showActiveBattle && currentBattle?.status === 'active' && (
                <ActiveBattleView
                    onBattleEnd={() => {
                        setShowActiveBattle(false);
                    }}
                />
            )}
        </View>
    );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: NEO.colors.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: 12,
        borderBottomWidth: NEO.border, borderBottomColor: NEO.colors.black, backgroundColor: NEO.colors.white,
    },
    avatarBtn: {
        width: 40, height: 40, borderWidth: 3, borderColor: '#000',
        justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5',
    },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#000', letterSpacing: 2 },

    scrollContent: { padding: 16, paddingBottom: 40 },

    // Rank Row
    rankRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16,
    },
    rankPill: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderWidth: 3, borderColor: '#000', paddingHorizontal: 12, paddingVertical: 8,
        backgroundColor: '#FFF',
    },
    rankBadge: { fontSize: 28 },
    rankTitle: { fontSize: 12, fontWeight: '900', color: '#000', letterSpacing: 1 },
    xpText: {
        fontSize: 11, fontWeight: '700', color: '#888',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    statsRow: { flexDirection: 'row', gap: 6 },
    statBox: {
        borderWidth: 2, paddingHorizontal: 8, paddingVertical: 4,
        alignItems: 'center', backgroundColor: '#FFF',
    },
    statNum: {
        fontSize: 14, fontWeight: '900',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    statLabel: { fontSize: 8, fontWeight: '800', color: '#999', letterSpacing: 0.5 },

    // Section Title
    sectionTitle: {
        fontSize: 11, fontWeight: '900', color: '#000', letterSpacing: 2,
        marginBottom: 10, marginTop: 4,
    },

    // Category Grid
    categoryGrid: {
        flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16,
    },
    categoryCard: {
        width: (SCREEN_WIDTH - 42) / 2, // 2 columns with gap
        borderWidth: NEO.border, padding: 14, backgroundColor: '#FFF',
        shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
    },
    categoryEmoji: { fontSize: 28, marginBottom: 6 },
    categoryLabel: { fontSize: 14, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
    categoryDuration: {
        fontSize: 13, fontWeight: '800', color: '#555',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    categoryStakePill: {
        marginTop: 8, paddingHorizontal: 8, paddingVertical: 4,
        borderWidth: 2, alignSelf: 'flex-start',
    },
    categoryStakeText: { fontSize: 11, fontWeight: '900' },
    selectedCheck: {
        position: 'absolute', top: 8, right: 8,
        width: 22, height: 22, borderRadius: 11,
        justifyContent: 'center', alignItems: 'center',
    },

    // Stake
    stakeSection: { marginBottom: 16 },
    stakeRow: { flexDirection: 'row', gap: 8 },
    stakePill: {
        flex: 1, borderWidth: 3, borderColor: '#000', paddingVertical: 10,
        alignItems: 'center', backgroundColor: '#FFF',
    },
    stakePillActive: { backgroundColor: '#FFD600' },
    stakePillText: { fontSize: 14, fontWeight: '900', color: '#000' },
    stakePillTextActive: { color: '#000' },

    // Focus Label
    labelSection: { marginBottom: 20 },
    labelInput: {
        borderWidth: 3, borderColor: '#000', padding: 14, fontSize: 14, fontWeight: '700',
        backgroundColor: '#FFF',
    },

    // Play Button
    playButton: {
        borderWidth: NEO.border, borderColor: '#000', backgroundColor: '#FFD600',
        paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0,
    },
    playButtonPressed: {
        shadowOffset: { width: 2, height: 2 },
        transform: [{ translateX: 4 }, { translateY: 4 }],
    },
    playButtonDisabled: { backgroundColor: '#E0E0E0', opacity: 0.6 },
    playButtonText: { fontSize: 20, fontWeight: '900', color: '#000', letterSpacing: 3 },

    // Streak Banner
    streakBanner: {
        marginTop: 14, paddingVertical: 8, alignItems: 'center',
        borderWidth: 2, borderColor: '#FF6B35', backgroundColor: '#FFF3E0',
    },
    streakText: { fontSize: 14, fontWeight: '900', color: '#FF6B35', letterSpacing: 1 },

    // History
    historyCard: {
        borderWidth: 2, borderColor: '#000', padding: 12, marginBottom: 8,
        backgroundColor: '#FFF',
    },
    historyTop: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
    },
    historyResult: { fontSize: 14, fontWeight: '900' },
    historyXP: {
        fontSize: 14, fontWeight: '900',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    historyVs: { fontSize: 12, fontWeight: '700', color: '#555', marginBottom: 2 },
    historyTime: {
        fontSize: 10, fontWeight: '700', color: '#999',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
});
