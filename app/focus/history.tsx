import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack } from 'expo-router';

import { Colors, Spacing, BorderRadius, Shadows, FeatureColors } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFocusStore, CompletedSession } from '@/store/focusStore';

// Period filter
type Period = 'today' | 'week' | 'month' | 'all';

// Session Card Component  
interface SessionCardProps {
    session: CompletedSession;
    index: number;
}

function SessionCard({ session, index }: SessionCardProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const isCompleted = session.status === 'completed';
    const statusColor = isCompleted ? Colors.accent.green : Colors.accent.red;

    // Format date
    const date = new Date(session.startedAt);
    const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    // Format duration
    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 50).springify()}
            style={[styles.sessionCard, isDark && styles.sessionCardDark]}
        >
            {/* Status Indicator */}
            <View style={[styles.statusBar, { backgroundColor: statusColor }]} />

            <View style={styles.sessionContent}>
                {/* Header */}
                <View style={styles.sessionHeader}>
                    <View style={styles.sessionInfo}>
                        <Text style={[styles.sessionName, isDark && styles.textDark]}>
                            {session.name}
                        </Text>
                        <Text style={styles.sessionDate}>{dateStr}</Text>
                    </View>

                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: statusColor + '20' }
                    ]}>
                        <Ionicons
                            name={isCompleted ? 'checkmark-circle' : 'close-circle'}
                            size={14}
                            color={statusColor}
                        />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                            {isCompleted ? 'Completed' : 'Cancelled'}
                        </Text>
                    </View>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Ionicons name="time-outline" size={14} color={Colors.text.secondary} />
                        <Text style={styles.statText}>
                            {formatDuration(session.actualDuration)} / {formatDuration(session.scheduledDuration)}
                        </Text>
                    </View>

                    {session.pauseCount > 0 && (
                        <View style={styles.statItem}>
                            <Ionicons name="pause-outline" size={14} color={Colors.text.secondary} />
                            <Text style={styles.statText}>{session.pauseCount} pauses</Text>
                        </View>
                    )}

                    {session.breaksTaken > 0 && (
                        <View style={styles.statItem}>
                            <Ionicons name="cafe-outline" size={14} color={Colors.text.secondary} />
                            <Text style={styles.statText}>{session.breaksTaken} breaks</Text>
                        </View>
                    )}
                </View>

                {/* Quality Score */}
                <View style={styles.qualityRow}>
                    <Text style={styles.qualityLabel}>Quality Score</Text>
                    <View style={styles.qualityBar}>
                        <View
                            style={[
                                styles.qualityFill,
                                {
                                    width: `${session.qualityScore}%`,
                                    backgroundColor: session.qualityScore >= 80
                                        ? Colors.accent.green
                                        : session.qualityScore >= 50
                                            ? Colors.accent.amber
                                            : Colors.accent.red
                                }
                            ]}
                        />
                    </View>
                    <Text style={styles.qualityValue}>{session.qualityScore}%</Text>
                </View>
            </View>
        </Animated.View>
    );
}

// Empty State Component
function EmptyHistory() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={[styles.emptyTitle, isDark && styles.textDark]}>
                No Focus Sessions Yet
            </Text>
            <Text style={styles.emptySubtitle}>
                Complete your first focus session to see it here
            </Text>
        </View>
    );
}

// Main History Screen
export default function FocusHistoryScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const sessionHistory = useFocusStore(state => state.sessionHistory);
    const [period, setPeriod] = useState<Period>('week');

    // Filter sessions by period
    const filteredSessions = sessionHistory.filter(session => {
        const sessionDate = new Date(session.completedAt);
        const now = new Date();

        switch (period) {
            case 'today':
                return sessionDate.toDateString() === now.toDateString();
            case 'week':
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return sessionDate >= weekAgo;
            case 'month':
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return sessionDate >= monthAgo;
            default:
                return true;
        }
    });

    // Calculate totals
    const totalMinutes = filteredSessions.reduce((sum, s) => sum + s.actualDuration, 0);
    const completedCount = filteredSessions.filter(s => s.status === 'completed').length;
    const avgQuality = filteredSessions.length > 0
        ? Math.round(filteredSessions.reduce((sum, s) => sum + s.qualityScore, 0) / filteredSessions.length)
        : 0;

    const formatTotalTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Focus History',
                    headerStyle: { backgroundColor: isDark ? Colors.gray[900] : Colors.background.primary },
                    headerTintColor: isDark ? Colors.text.inverse : Colors.text.primary,
                }}
            />

            <View style={[styles.container, isDark && styles.containerDark]}>
                {/* Period Filter */}
                <Animated.View
                    entering={FadeInUp.delay(100).springify()}
                    style={styles.filterContainer}
                >
                    {(['today', 'week', 'month', 'all'] as Period[]).map((p) => (
                        <Pressable
                            key={p}
                            style={[
                                styles.filterButton,
                                period === p && styles.filterButtonActive,
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setPeriod(p);
                            }}
                        >
                            <Text style={[
                                styles.filterText,
                                period === p && styles.filterTextActive,
                            ]}>
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </Text>
                        </Pressable>
                    ))}
                </Animated.View>

                {/* Summary Stats */}
                <Animated.View
                    entering={FadeInUp.delay(150).springify()}
                    style={[styles.summaryCard, isDark && styles.summaryCardDark]}
                >
                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: FeatureColors.focus.primary }]}>
                            {formatTotalTime(totalMinutes)}
                        </Text>
                        <Text style={styles.summaryLabel}>Total Focus</Text>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: Colors.accent.green }]}>
                            {completedCount}
                        </Text>
                        <Text style={styles.summaryLabel}>Completed</Text>
                    </View>

                    <View style={styles.summaryDivider} />

                    <View style={styles.summaryItem}>
                        <Text style={[styles.summaryValue, { color: Colors.accent.amber }]}>
                            {avgQuality}%
                        </Text>
                        <Text style={styles.summaryLabel}>Avg. Quality</Text>
                    </View>
                </Animated.View>

                {/* Sessions List */}
                <FlatList
                    data={filteredSessions}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item, index }) => (
                        <SessionCard session={item} index={index} />
                    )}
                    ListEmptyComponent={EmptyHistory}
                />
            </View>
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

    // Filter
    filterContainer: {
        flexDirection: 'row',
        padding: Spacing[4],
        paddingBottom: Spacing[2],
        gap: Spacing[2],
    },
    filterButton: {
        flex: 1,
        paddingVertical: Spacing[2],
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.gray[100],
    },
    filterButtonActive: {
        backgroundColor: FeatureColors.focus.primary,
    },
    filterText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.text.secondary,
    },
    filterTextActive: {
        color: Colors.text.inverse,
        fontWeight: '600',
    },

    // Summary
    summaryCard: {
        flexDirection: 'row',
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing[4],
        marginHorizontal: Spacing[4],
        marginBottom: Spacing[4],
        ...Shadows.md,
    },
    summaryCardDark: {
        backgroundColor: Colors.gray[800],
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 11,
        color: Colors.text.secondary,
    },
    summaryDivider: {
        width: 1,
        backgroundColor: Colors.gray[200],
        marginHorizontal: Spacing[2],
    },

    // List
    listContent: {
        paddingHorizontal: Spacing[4],
        paddingBottom: 100,
    },

    // Session Card
    sessionCard: {
        flexDirection: 'row',
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        marginBottom: Spacing[3],
        ...Shadows.sm,
    },
    sessionCardDark: {
        backgroundColor: Colors.gray[800],
    },
    statusBar: {
        width: 4,
    },
    sessionContent: {
        flex: 1,
        padding: Spacing[4],
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing[3],
    },
    sessionInfo: {
        flex: 1,
    },
    sessionName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: 2,
    },
    sessionDate: {
        fontSize: 12,
        color: Colors.text.secondary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing[2],
        paddingVertical: 4,
        borderRadius: BorderRadius.md,
        gap: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },

    // Stats Row
    statsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing[4],
        marginBottom: Spacing[3],
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
        color: Colors.text.secondary,
    },

    // Quality
    qualityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[2],
    },
    qualityLabel: {
        fontSize: 11,
        color: Colors.text.tertiary,
    },
    qualityBar: {
        flex: 1,
        height: 4,
        backgroundColor: Colors.gray[200],
        borderRadius: 2,
        overflow: 'hidden',
    },
    qualityFill: {
        height: '100%',
        borderRadius: 2,
    },
    qualityValue: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.text.secondary,
        minWidth: 30,
        textAlign: 'right',
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing[12],
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: Spacing[4],
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: Spacing[2],
    },
    emptySubtitle: {
        fontSize: 14,
        color: Colors.text.secondary,
        textAlign: 'center',
    },

    // Text Theme
    textDark: {
        color: Colors.text.inverse,
    },
});
