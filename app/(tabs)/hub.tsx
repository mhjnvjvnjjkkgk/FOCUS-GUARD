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
    const balance = shopStore.getSpendableBalance();

    const formatMinutes = (mins: number) => {
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        return `${h}h`;
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <Animated.View entering={FadeInUp.springify()} style={styles.header}>
                <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/account' as any); }}
                    style={styles.avatarBtn}
                >
                    <Image source={require('@/assets/images/fg-avatar.png')} style={{ width: 32, height: 32 }} />
                </Pressable>
                <Text style={styles.headerTitle}>HUB</Text>
                <View style={{ width: 40 }} />
            </Animated.View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
});
