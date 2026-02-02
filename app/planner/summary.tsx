import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Share,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Colors, Spacing, BorderRadius, Shadows, FeatureColors } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePlannerStore } from '@/store/plannerStore';
import { usePointsStore, DailyPoints } from '@/store/pointsStore';

// Helper
const getTodayString = () => new Date().toISOString().split('T')[0];

// Stat Card Component
interface StatCardProps {
    icon: string;
    label: string;
    value: string;
    color: string;
    subvalue?: string;
    index: number;
}

function StatCard({ icon, label, value, color, subvalue, index }: StatCardProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <Animated.View
            entering={FadeInDown.delay(150 + index * 50).springify()}
            style={[styles.statCard, isDark && styles.statCardDark]}
        >
            <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
                <Text style={styles.statIcon}>{icon}</Text>
            </View>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            {subvalue && <Text style={styles.statSubvalue}>{subvalue}</Text>}
        </Animated.View>
    );
}

// Points Breakdown Component
interface PointsBreakdownProps {
    dailyPoints: DailyPoints | undefined;
}

function PointsBreakdown({ dailyPoints }: PointsBreakdownProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    if (!dailyPoints) return null;

    const earnedItems = [
        { label: 'Alarms', value: dailyPoints.earned.alarms, icon: '⏰' },
        { label: 'Tasks Started', value: dailyPoints.earned.tasksStarted, icon: '🎯' },
        { label: 'Sessions', value: dailyPoints.earned.sessionsCompleted, icon: '✅' },
        { label: 'Completion Bonus', value: dailyPoints.earned.completionBonus, icon: '🏆' },
        { label: 'No Distraction', value: dailyPoints.earned.noDistractionBonus, icon: '🛡️' },
    ].filter(item => item.value > 0);

    const deductedItems = [
        { label: 'Snoozes', value: dailyPoints.deducted.snoozes, icon: '😴' },
        { label: 'Missed Tasks', value: dailyPoints.deducted.missedTasks, icon: '❌' },
        { label: 'Skipped Sessions', value: dailyPoints.deducted.skippedSessions, icon: '⏭️' },
        { label: 'Banned Apps', value: dailyPoints.deducted.bannedAppUsage, icon: '📱' },
    ].filter(item => item.value > 0);

    return (
        <Animated.View
            entering={FadeInDown.delay(350).springify()}
            style={[styles.breakdownCard, isDark && styles.breakdownCardDark]}
        >
            <Text style={[styles.breakdownTitle, isDark && styles.textDark]}>
                Points Breakdown
            </Text>

            {/* Earned */}
            {earnedItems.length > 0 && (
                <>
                    <Text style={styles.breakdownSubtitle}>Earned</Text>
                    {earnedItems.map((item, idx) => (
                        <View key={item.label} style={styles.breakdownRow}>
                            <Text style={styles.breakdownIcon}>{item.icon}</Text>
                            <Text style={[styles.breakdownLabel, isDark && styles.textSecondaryDark]}>
                                {item.label}
                            </Text>
                            <Text style={[styles.breakdownValue, { color: Colors.accent.green }]}>
                                +{item.value}
                            </Text>
                        </View>
                    ))}
                </>
            )}

            {/* Deducted */}
            {deductedItems.length > 0 && (
                <>
                    <Text style={[styles.breakdownSubtitle, { marginTop: Spacing[3] }]}>Deducted</Text>
                    {deductedItems.map((item, idx) => (
                        <View key={item.label} style={styles.breakdownRow}>
                            <Text style={styles.breakdownIcon}>{item.icon}</Text>
                            <Text style={[styles.breakdownLabel, isDark && styles.textSecondaryDark]}>
                                {item.label}
                            </Text>
                            <Text style={[styles.breakdownValue, { color: Colors.accent.red }]}>
                                -{item.value}
                            </Text>
                        </View>
                    ))}
                </>
            )}

            {/* Total */}
            <View style={styles.breakdownDivider} />
            <View style={styles.breakdownRow}>
                <Text style={styles.breakdownIcon}>📊</Text>
                <Text style={[styles.breakdownLabel, styles.totalLabel, isDark && styles.textDark]}>
                    Net Total
                </Text>
                <Text style={[
                    styles.breakdownValue,
                    styles.totalValue,
                    { color: dailyPoints.netPoints >= 0 ? Colors.accent.green : Colors.accent.red }
                ]}>
                    {dailyPoints.netPoints >= 0 ? '+' : ''}{dailyPoints.netPoints}
                </Text>
            </View>
        </Animated.View>
    );
}

// Task Completion List
function TasksList({ date }: { date: string }) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const plan = usePlannerStore(state => state.getPlanForDate(date));
    const tasks = plan?.tasks || [];

    if (tasks.length === 0) return null;

    return (
        <Animated.View
            entering={FadeInDown.delay(450).springify()}
            style={[styles.tasksCard, isDark && styles.tasksCardDark]}
        >
            <Text style={[styles.tasksTitle, isDark && styles.textDark]}>
                Tasks Overview
            </Text>

            {tasks.map((task, idx) => (
                <View key={task.id} style={styles.taskRow}>
                    <View style={[styles.taskStatus, { backgroundColor: getStatusColor(task.status) }]} />
                    <Text style={styles.taskEmoji}>{task.emoji}</Text>
                    <View style={styles.taskInfo}>
                        <Text style={[styles.taskName, isDark && styles.textDark]}>{task.name}</Text>
                        <Text style={styles.taskMeta}>
                            {task.sessions.filter(s => s.status === 'completed').length}/{task.sessions.length} sessions • {task.metrics.totalFocusTime}m focus
                        </Text>
                    </View>
                    <View style={[styles.taskCompletion, { backgroundColor: getStatusColor(task.status) + '20' }]}>
                        <Text style={[styles.taskCompletionText, { color: getStatusColor(task.status) }]}>
                            {task.metrics.completionPercentage}%
                        </Text>
                    </View>
                </View>
            ))}
        </Animated.View>
    );
}

// Helper function
function getStatusColor(status: string) {
    switch (status) {
        case 'completed': return Colors.accent.green;
        case 'in_progress': return FeatureColors.focus.primary;
        case 'skipped': return Colors.accent.red;
        case 'partial': return Colors.accent.amber;
        default: return Colors.gray[400];
    }
}

// Main Summary Screen
export default function DailySummaryScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const params = useLocalSearchParams<{ date?: string }>();

    const date = params.date || getTodayString();

    // Data
    const dailyPoints = usePointsStore(state => state.getPointsForDate(date));
    const plan = usePlannerStore(state => state.getPlanForDate(date));
    const currentStreak = usePointsStore(state => state.currentStreak);
    const dailyGoal = usePointsStore(state => state.dailyGoal);

    // Calculations
    const tasks = plan?.tasks || [];
    const tasksPlanned = tasks.length;
    const tasksStarted = tasks.filter(t => t.metrics.startedAt).length;
    const tasksCompleted = tasks.filter(t => t.status === 'completed').length;
    const totalFocusMinutes = tasks.reduce((sum, t) => sum + t.metrics.totalFocusTime, 0);
    const avgCompletion = tasks.length > 0
        ? Math.round(tasks.reduce((sum, t) => sum + t.metrics.completionPercentage, 0) / tasks.length)
        : 0;

    const netPoints = dailyPoints?.netPoints || 0;
    const goalProgress = Math.min((netPoints / dailyGoal) * 100, 100);
    const goalReached = netPoints >= dailyGoal;

    // Format date for display
    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const today = getTodayString();
        if (dateStr === today) return 'Today';
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: `${formatDate(date)} Summary`,
                    headerStyle: { backgroundColor: isDark ? Colors.gray[900] : Colors.background.primary },
                    headerTintColor: isDark ? Colors.text.inverse : Colors.text.primary,
                }}
            />

            <ScrollView
                style={[styles.container, isDark && styles.containerDark]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Points Hero */}
                <Animated.View
                    entering={FadeInUp.delay(100).springify()}
                    style={[styles.heroCard, isDark && styles.heroCardDark]}
                >
                    {goalReached && (
                        <View style={styles.goalBadge}>
                            <Text style={styles.goalBadgeText}>🎉 Goal Reached!</Text>
                        </View>
                    )}

                    <Text style={styles.heroLabel}>Total Points</Text>
                    <Text style={[
                        styles.heroPoints,
                        { color: netPoints >= 0 ? Colors.accent.green : Colors.accent.red }
                    ]}>
                        {netPoints >= 0 ? '+' : ''}{netPoints}
                    </Text>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${goalProgress}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{Math.round(goalProgress)}% of {dailyGoal} goal</Text>
                    </View>

                    {currentStreak > 0 && (
                        <View style={styles.streakRow}>
                            <Text style={styles.streakIcon}>🔥</Text>
                            <Text style={styles.streakText}>{currentStreak} day streak</Text>
                        </View>
                    )}
                </Animated.View>

                {/* Quick Stats */}
                <View style={styles.statsGrid}>
                    <StatCard
                        icon="📋"
                        label="Tasks"
                        value={`${tasksCompleted}/${tasksPlanned}`}
                        subvalue="completed"
                        color={FeatureColors.focus.primary}
                        index={0}
                    />
                    <StatCard
                        icon="⏱️"
                        label="Focus Time"
                        value={`${totalFocusMinutes}m`}
                        color={Colors.accent.green}
                        index={1}
                    />
                    <StatCard
                        icon="📊"
                        label="Avg Completion"
                        value={`${avgCompletion}%`}
                        color={Colors.accent.amber}
                        index={2}
                    />
                    <StatCard
                        icon="🎯"
                        label="Started"
                        value={`${tasksStarted}/${tasksPlanned}`}
                        color={FeatureColors.reminder.primary}
                        index={3}
                    />
                </View>

                {/* Alarm Stats */}
                {dailyPoints && (dailyPoints.alarmsTriggered > 0) && (
                    <Animated.View
                        entering={FadeInDown.delay(300).springify()}
                        style={[styles.alarmCard, isDark && styles.alarmCardDark]}
                    >
                        <View style={styles.alarmHeader}>
                            <Ionicons name="alarm" size={20} color={FeatureColors.alarm.primary} />
                            <Text style={[styles.alarmTitle, isDark && styles.textDark]}>Alarm Performance</Text>
                        </View>

                        <View style={styles.alarmStats}>
                            <View style={styles.alarmStat}>
                                <Text style={styles.alarmValue}>{dailyPoints.alarmsTriggered}</Text>
                                <Text style={styles.alarmLabel}>Triggered</Text>
                            </View>
                            <View style={styles.alarmStat}>
                                <Text style={[styles.alarmValue, { color: Colors.accent.green }]}>
                                    {dailyPoints.alarmsOnTime}
                                </Text>
                                <Text style={styles.alarmLabel}>On Time</Text>
                            </View>
                            <View style={styles.alarmStat}>
                                <Text style={[styles.alarmValue, { color: Colors.accent.red }]}>
                                    {dailyPoints.alarmsSnoozed}
                                </Text>
                                <Text style={styles.alarmLabel}>Snoozed</Text>
                            </View>
                        </View>
                    </Animated.View>
                )}

                {/* Points Breakdown */}
                <PointsBreakdown dailyPoints={dailyPoints} />

                {/* Tasks List */}
                <TasksList date={date} />

                {/* Share Results */}
                <Animated.View entering={FadeInUp.delay(550).springify()}>
                    <Pressable
                        style={styles.shareButton}
                        onPress={async () => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            try {
                                const message = `🎯 Daily Focus Summary for ${formatDate(date)}\n\n` +
                                    `✨ Tasks Completed: ${tasksCompleted}/${tasksPlanned}\n` +
                                    `🔥 Focus Streak: ${currentStreak} days\n` +
                                    `💎 Points Earned: ${netPoints}\n` +
                                    `⏱️ Total Focus: ${totalFocusMinutes} mins\n\n` +
                                    `Built with #FocusGuard 🛡️`;

                                await Share.share({
                                    message,
                                    title: `FocusGuard Summary - ${formatDate(date)}`,
                                });
                            } catch (e) {
                                console.error(e);
                            }
                        }}
                    >
                        <Ionicons name="share-outline" size={20} color={FeatureColors.focus.primary} />
                        <Text style={styles.shareButtonText}>Share Results</Text>
                    </Pressable>
                </Animated.View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.secondary,
    },
    containerDark: {
        backgroundColor: Colors.gray[900],
    },
    scrollContent: {
        padding: Spacing[4],
    },

    // Hero Card
    heroCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius['2xl'],
        padding: Spacing[6],
        alignItems: 'center',
        marginBottom: Spacing[4],
        ...Shadows.md,
    },
    heroCardDark: {
        backgroundColor: Colors.gray[800],
    },
    goalBadge: {
        backgroundColor: Colors.accent.green + '20',
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[1],
        borderRadius: BorderRadius.full,
        marginBottom: Spacing[3],
    },
    goalBadgeText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.accent.green,
    },
    heroLabel: {
        fontSize: 14,
        color: Colors.text.secondary,
        marginBottom: Spacing[1],
    },
    heroPoints: {
        fontSize: 56,
        fontWeight: '700',
        marginBottom: Spacing[4],
    },
    progressContainer: {
        width: '100%',
        marginBottom: Spacing[3],
    },
    progressBar: {
        height: 8,
        backgroundColor: Colors.gray[200],
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: Spacing[1],
    },
    progressFill: {
        height: '100%',
        backgroundColor: FeatureColors.stats.primary,
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: Colors.text.secondary,
        textAlign: 'center',
    },
    streakRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[2],
        marginTop: Spacing[2],
    },
    streakIcon: {
        fontSize: 18,
    },
    streakText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.accent.orange,
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing[3],
        marginBottom: Spacing[4],
    },
    statCard: {
        width: '47%',
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing[4],
        alignItems: 'center',
        ...Shadows.sm,
    },
    statCardDark: {
        backgroundColor: Colors.gray[800],
    },
    statIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing[2],
    },
    statIcon: {
        fontSize: 22,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.text.secondary,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    statSubvalue: {
        fontSize: 11,
        color: Colors.text.tertiary,
    },

    // Alarm Card
    alarmCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing[4],
        marginBottom: Spacing[4],
        ...Shadows.sm,
    },
    alarmCardDark: {
        backgroundColor: Colors.gray[800],
    },
    alarmHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[2],
        marginBottom: Spacing[3],
    },
    alarmTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.primary,
    },
    alarmStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    alarmStat: {
        alignItems: 'center',
    },
    alarmValue: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    alarmLabel: {
        fontSize: 11,
        color: Colors.text.secondary,
    },

    // Breakdown Card
    breakdownCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing[4],
        marginBottom: Spacing[4],
        ...Shadows.sm,
    },
    breakdownCardDark: {
        backgroundColor: Colors.gray[800],
    },
    breakdownTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: Spacing[3],
    },
    breakdownSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.text.tertiary,
        marginBottom: Spacing[2],
    },
    breakdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing[2],
    },
    breakdownIcon: {
        fontSize: 16,
        marginRight: Spacing[2],
    },
    breakdownLabel: {
        flex: 1,
        fontSize: 14,
        color: Colors.text.secondary,
    },
    breakdownValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    breakdownDivider: {
        height: 1,
        backgroundColor: Colors.gray[200],
        marginVertical: Spacing[2],
    },
    totalLabel: {
        fontWeight: '600',
    },
    totalValue: {
        fontSize: 18,
    },

    // Tasks Card
    tasksCard: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing[4],
        marginBottom: Spacing[4],
        ...Shadows.sm,
    },
    tasksCardDark: {
        backgroundColor: Colors.gray[800],
    },
    tasksTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: Spacing[3],
    },
    taskRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing[2],
        gap: Spacing[2],
    },
    taskStatus: {
        width: 4,
        height: 36,
        borderRadius: 2,
    },
    taskEmoji: {
        fontSize: 20,
    },
    taskInfo: {
        flex: 1,
    },
    taskName: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.text.primary,
    },
    taskMeta: {
        fontSize: 11,
        color: Colors.text.secondary,
    },
    taskCompletion: {
        paddingHorizontal: Spacing[2],
        paddingVertical: 4,
        borderRadius: BorderRadius.md,
    },
    taskCompletionText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Share Button
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing[2],
        backgroundColor: FeatureColors.focus.light,
        paddingVertical: Spacing[4],
        borderRadius: BorderRadius.xl,
    },
    shareButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: FeatureColors.focus.primary,
    },

    // Text Theme
    textDark: {
        color: Colors.text.inverse,
    },
    textSecondaryDark: {
        color: Colors.gray[400],
    },
});
