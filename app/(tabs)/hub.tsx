/**
 * Hub Tab — Quick access to Stats, Planner, and Shop
 * Acts as a "More" tab consolidating secondary features into navigable cards
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Image } from 'expo-image';

import { usePointsStore } from '@/store/pointsStore';
import { useShopStore } from '@/store/shopStore';
import { usePersonalizationStore } from '@/store/personalizationStore';
import { usePremiumStore } from '@/store/premiumStore';
import { useBattleStore } from '@/store/battleStore';
import { useAuthStore } from '@/store/authStore';
import RankBadge from '@/components/RankBadge';

const { width } = Dimensions.get('window');

const NEO = {
    border: 3,
    shadow: 5,
    colors: { black: '#000', white: '#FFF', bg: '#FFFDF0' },
    fonts: { heavy: '900' as const, mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string },
};

interface HubCardProps {
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    stat?: string;
    statLabel?: string;
    onPress: () => void;
    delay: number;
}

function HubCard({ title, subtitle, icon, color, stat, statLabel, onPress, delay }: HubCardProps) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()}>
            <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
                style={[styles.card, { borderColor: color }]}
            >
                <View style={styles.cardTop}>
                    <Text style={styles.cardIcon}>{icon}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                </View>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSubtitle}>{subtitle}</Text>
                {stat && (
                    <View style={[styles.cardStatPill, { backgroundColor: color + '20', borderColor: color }]}>
                        <Text style={[styles.cardStatText, { color }]}>{stat}</Text>
                        {statLabel && <Text style={[styles.cardStatLabel, { color: color + 'AA' }]}>{statLabel}</Text>}
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
}

export default function HubScreen() {
    const pointsStore = usePointsStore();
    const shopStore = useShopStore();
    const personalization = usePersonalizationStore();
    const premium = usePremiumStore();
    const battleStore = useBattleStore();
    const balance = shopStore.getSpendableBalance();
    const stats = battleStore.getStats();

    const formatMinutes = (mins: number) => {
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        return `${h}h`;
    };

    // Personalized content
    const greeting = personalization.getGreeting(
        '', 0, stats.streak, stats.wins + stats.losses + stats.ties,
        pointsStore.totalFocusMinutes, ''
    );
    const insight = personalization.getWeeklyInsight();
    const quote = personalization.getMotivationalQuote();

    return (
        <View style={styles.container}>
            {/* Header */}
            <Animated.View entering={FadeInUp.springify()} style={styles.header}>
                <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/account' as any); }}
                    style={styles.avatarBtn}
                >
                    {useAuthStore.getState().user?.photoURL ? (
                        <Image source={{ uri: useAuthStore.getState().user!.photoURL! }} style={{ width: 32, height: 32, borderRadius: 0 }} />
                    ) : (
                        <Ionicons name="person-circle" size={32} color="#000" />
                    )}
                </Pressable>
                <Text style={styles.headerTitle}>HUB</Text>
                <View style={{ width: 40 }} />
            </Animated.View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Personalized Greeting */}
                <Animated.View entering={FadeInDown.delay(30).springify()} style={styles.greetingCard}>
                    <Text style={styles.greetingEmoji}>{greeting.emoji}</Text>
                    <Text style={styles.greetingText}>{greeting.greeting}</Text>
                    <Text style={styles.greetingSubtext}>{greeting.subtitle}</Text>
                </Animated.View>

                {/* Weekly Insight (Spotify Wrapped-style) */}
                <Animated.View entering={FadeInDown.delay(60).springify()} style={[
                    styles.insightCard,
                    { borderColor: insight.trend === 'up' ? '#4CAF50' : insight.trend === 'down' ? '#FF4444' : '#4A9EFF' }
                ]}>
                    <Text style={styles.insightEmoji}>{insight.emoji}</Text>
                    <Text style={styles.insightHeadline}>{insight.headline}</Text>
                    <Text style={styles.insightDetail}>{insight.detail}</Text>
                </Animated.View>

                {/* Quick Rank Badge */}
                <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.rankRow}>
                    <RankBadge size="medium" showStreak />
                    <Text style={styles.xpText}>
                        {pointsStore.totalPointsEarned.toLocaleString()} XP
                    </Text>
                </Animated.View>

                {/* Cards Grid */}
                <HubCard
                    title="📊 STATISTICS"
                    subtitle="Charts, trends, session history"
                    icon="📊"
                    color="#4A9EFF"
                    stat={formatMinutes(pointsStore.totalFocusMinutes)}
                    statLabel="FOCUS TIME"
                    onPress={() => router.push('/(tabs)/stats')}
                    delay={100}
                />

                <HubCard
                    title="📅 PLANNER"
                    subtitle="Daily schedule, tasks, sessions"
                    icon="📅"
                    color="#FF6B35"
                    stat={`${pointsStore.totalTasksCompleted}`}
                    statLabel="TASKS DONE"
                    onPress={() => router.push('/(tabs)/planner')}
                    delay={150}
                />

                <HubCard
                    title="🛒 SHOP"
                    subtitle="Themes, sounds, power-ups"
                    icon="🛒"
                    color="#FFB300"
                    stat={`🪙 ${balance.toLocaleString()}`}
                    statLabel="BALANCE"
                    onPress={() => router.push('/shop' as any)}
                    delay={200}
                />

                <HubCard
                    title="🚫 BLOCKER"
                    subtitle="App blocking & usage limits"
                    icon="🚫"
                    color="#FF4444"
                    onPress={() => router.push('/(tabs)/blocker')}
                    delay={250}
                />

                <HubCard
                    title="🔔 REMINDERS"
                    subtitle="Motivational & scheduled reminders"
                    icon="🔔"
                    color="#B366FF"
                    onPress={() => router.push('/(tabs)/reminders')}
                    delay={300}
                />

                {/* Premium Card — Upgrade touchpoint */}
                {premium.isFree() && (
                    <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.premiumCard}>
                        <Text style={styles.premiumCardEmoji}>⭐</Text>
                        <Text style={styles.premiumCardTitle}>UNLOCK PRO</Text>
                        <Text style={styles.premiumCardSub}>2x XP • 6 Chests • Premium Themes</Text>
                        <Pressable
                            onPress={() => router.push('/shop' as any)}
                            style={styles.premiumCardBtn}
                        >
                            <Text style={styles.premiumCardBtnText}>VIEW PLANS</Text>
                        </Pressable>
                    </Animated.View>
                )}

                {/* Daily Quote */}
                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.quoteCard}>
                    <Text style={styles.quoteText}>“{quote}”</Text>
                </Animated.View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

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
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#000', letterSpacing: 3 },

    scrollContent: { padding: 16, paddingBottom: 40 },

    rankRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, paddingHorizontal: 4,
    },
    xpText: {
        fontSize: 16, fontWeight: '900', color: '#000',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },

    card: {
        borderWidth: NEO.border, borderColor: '#000', padding: 18, marginBottom: 12,
        backgroundColor: NEO.colors.white,
        shadowColor: '#000', shadowOffset: { width: NEO.shadow, height: NEO.shadow }, shadowOpacity: 1, shadowRadius: 0,
    },
    cardTop: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
    },
    cardIcon: { fontSize: 28 },
    cardTitle: { fontSize: 16, fontWeight: '900', color: '#000', letterSpacing: 2, marginBottom: 4 },
    cardSubtitle: { fontSize: 12, fontWeight: '600', color: '#888' },
    cardStatPill: {
        marginTop: 10, paddingHorizontal: 10, paddingVertical: 6,
        borderWidth: 2, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    },
    cardStatText: {
        fontSize: 14, fontWeight: '900',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    cardStatLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },

    // Personalized Greeting
    greetingCard: {
        borderWidth: NEO.border, borderColor: '#000', padding: 16, marginBottom: 12,
        backgroundColor: '#FFF8E1',
        shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
    },
    greetingEmoji: { fontSize: 28, marginBottom: 4 },
    greetingText: { fontSize: 18, fontWeight: '900', color: '#000', letterSpacing: 0.5 },
    greetingSubtext: { fontSize: 12, fontWeight: '600', color: '#666', marginTop: 4 },

    // Weekly Insight
    insightCard: {
        borderWidth: NEO.border, padding: 14, marginBottom: 12,
        backgroundColor: '#FFF',
        shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
    },
    insightEmoji: { fontSize: 24, marginBottom: 4 },
    insightHeadline: { fontSize: 15, fontWeight: '900', color: '#000' },
    insightDetail: { fontSize: 11, fontWeight: '600', color: '#888', marginTop: 2 },

    // Premium Card
    premiumCard: {
        borderWidth: NEO.border, borderColor: '#FFD600', padding: 18, marginBottom: 12,
        backgroundColor: 'rgba(255,214,0,0.08)', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
    },
    premiumCardEmoji: { fontSize: 32, marginBottom: 6 },
    premiumCardTitle: { fontSize: 16, fontWeight: '900', color: '#000', letterSpacing: 3 },
    premiumCardSub: { fontSize: 11, fontWeight: '700', color: '#888', marginTop: 4 },
    premiumCardBtn: {
        marginTop: 12, paddingVertical: 10, paddingHorizontal: 24,
        borderWidth: 2, borderColor: '#FFD600', backgroundColor: '#FFD600',
    },
    premiumCardBtnText: { fontSize: 12, fontWeight: '900', color: '#000', letterSpacing: 2 },

    // Daily Quote
    quoteCard: {
        borderWidth: 2, borderColor: '#DDD', padding: 16, marginBottom: 12,
        backgroundColor: '#FAFAFA',
    },
    quoteText: { fontSize: 12, fontWeight: '600', color: '#666', fontStyle: 'italic', lineHeight: 18 },
});
