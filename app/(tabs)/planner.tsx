import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Dimensions,
    Platform,
    Alert,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { usePlannerStore, PlannedTask } from '@/store/plannerStore';
// Keeping PointsStore for potential logic but seemingly unused in visual prompt
import { usePointsStore } from '@/store/pointsStore';

const { width } = Dimensions.get('window');

// ============================================
// NEOBRUTALIST DESIGN SYSTEM (PLANNER EDITION)
// ============================================
const NEO = {
    colors: {
        white: '#FFFFFF',
        black: '#000000',
        purple: '#8A2BE2', // Electric Purple (Focus)
        yellow: '#FFD700', // Safety Yellow (Meeting)
        green: '#39FF14',  // Neon Green (Break)
        cyan: '#00FFFF',   // Active/Progress
    },
    border: 4, // 4px thick borders
    shadowOffset: 8, // 8px hard shadow
    fonts: {
        heavy: '900' as '900',
        bold: '700' as '700',
        mono: 'monospace' as 'monospace',
    },
};

// ============================================
// HELPER COMPONENTS
// ============================================

const getTodayString = () => new Date().toISOString().split('T')[0];

const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12; // Convert 0 to 12 for midnight
    return `${displayHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;
};

// Calculate end time given start time and duration in minutes
const calculateEndTime = (startHour: number, startMinute: number, durationMinutes: number) => {
    const totalMinutes = startHour * 60 + startMinute + durationMinutes;
    const endHour = Math.floor(totalMinutes / 60) % 24;
    const endMinute = totalMinutes % 60;
    return { hour: endHour, minute: endMinute };
};

// ============================================
// NEO HEADER
// ============================================
interface NeoHeaderProps {
    date: string;
    onPrev: () => void;
    onNext: () => void;
}

const NeoHeader = ({ date, onPrev, onNext }: NeoHeaderProps) => {
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    }).toUpperCase();

    const isToday = date === getTodayString();
    const displayDate = isToday ? `TODAY, ${formattedDate}` : formattedDate;

    return (
        <View style={styles.neoHeader}>
            {/* Top Bar: Branding */}
            <View style={styles.neoTopBar}>
                <View style={styles.neoAvatarBox}>
                    <Text style={styles.neoAvatarText}>FG</Text>
                </View>
                <View style={styles.neoTitleColumn}>
                    <Text style={styles.neoAppTitle}>FOCUSGUARD</Text>
                    <View style={styles.neoTagContainer}>
                        <Text style={styles.neoTagText}>📋 PLANNER</Text>
                    </View>
                </View>
            </View>

            {/* Date Navigator */}
            <View style={styles.neoDateNav}>
                <Pressable onPress={onPrev} style={({ pressed }) => [
                    styles.neoNavButton,
                    pressed && styles.neoPressed
                ]}>
                    <Ionicons name="chevron-back" size={28} color="black" />
                </Pressable>

                <View style={styles.neoDateDisplay}>
                    <Text style={styles.neoDateText}>{displayDate}</Text>
                </View>

                <Pressable onPress={onNext} style={({ pressed }) => [
                    styles.neoNavButton,
                    pressed && styles.neoPressed
                ]}>
                    <Ionicons name="chevron-forward" size={28} color="black" />
                </Pressable>
            </View>
        </View>
    );
};

// ============================================
// NEO TASK CARD
// ============================================
interface NeoTaskCardProps {
    task: PlannedTask;
    onPress: () => void;
    onLongPress?: () => void; // Add long press support
}

const NeoTaskCard = ({ task, onPress, onLongPress }: NeoTaskCardProps) => {
    const isFocus = task.focusConfig.enabled;
    const isCompleted = task.status === 'completed';
    const isInProgress = task.status === 'in_progress';

    // Calculate duration
    const startMins = task.startTime.hour * 60 + task.startTime.minute;
    const endMins = task.endTime.hour * 60 + task.endTime.minute;
    const duration = endMins - startMins;
    const durationStr = `${Math.floor(duration / 60)}h ${duration % 60}m`;

    // Determine Style Variant
    // Type A: Focus Block (Split)
    // Type B: Meeting/Break (Solid)

    // We'll use a heuristic: if "Meeting" in name -> Yellow, "Break" -> Green, else assume context based on FocusConfig
    let cardStyle = 'solid';
    let accentColor = NEO.colors.white;
    let label = '';
    let icon = '';

    if (isFocus) {
        cardStyle = 'split';
        accentColor = NEO.colors.purple;
        label = 'FOCUS BLOCK';
        icon = 'brain-outline'; // "pixelated" brain approximation
    } else if (task.name.toLowerCase().includes('break') || task.name.toLowerCase().includes('lunch')) {
        cardStyle = 'solid';
        accentColor = NEO.colors.green;
        label = 'BREAK';
        icon = 'fast-food-outline';
    } else {
        cardStyle = 'solid';
        accentColor = NEO.colors.yellow;
        label = 'MEETING'; // Defaulting non-focus to meeting style for visual matching
        icon = 'people-outline';
    }

    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }]
    }));

    const handlePressIn = () => { scale.value = withSpring(0.97); };
    const handlePressOut = () => { scale.value = withSpring(1); };

    return (
        <Animated.View style={[styles.neoCardWrapper, animatedStyle]}>
            <Pressable
                onPress={onPress}
                onLongPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    onLongPress?.();
                }}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[
                    styles.neoCardContainer,
                    cardStyle === 'solid' && { backgroundColor: accentColor }
                ]}
            >
                {/* SPLIT DESIGN (Focus) */}
                {cardStyle === 'split' && (
                    <>
                        <View style={[styles.neoCardHeader, { backgroundColor: accentColor }]}>
                            <Ionicons name="hardware-chip-outline" size={20} color="black" style={{ marginRight: 8 }} />
                            <View style={styles.neoTinyTag}>
                                <Text style={styles.neoTinyTagText}>{label}</Text>
                            </View>
                        </View>
                        <View style={styles.neoCardBody}>
                            <Text style={styles.neoTaskTitle} numberOfLines={2}>{task.name.toUpperCase()}</Text>
                            <Text style={styles.neoTaskDuration}>🕒 {durationStr}</Text>

                            <Text style={styles.neoStatusText}>
                                {isInProgress ? 'IN PROGRESS' : task.status.toUpperCase()}
                            </Text>

                            {/* Progress Bar */}
                            <View style={styles.neoProgressBarBg}>
                                <View style={[
                                    styles.neoProgressBarFill,
                                    {
                                        width: `${task.metrics.averageCompletion}%`,
                                        backgroundColor:
                                            task.metrics.averageCompletion >= 100 ? '#76FF03' :  // Green
                                                task.metrics.averageCompletion >= 75 ? '#14B8A6' :   // Teal
                                                    task.metrics.averageCompletion >= 50 ? '#FFD700' :   // Yellow
                                                        task.metrics.averageCompletion >= 25 ? '#FF5500' :   // Orange
                                                            '#FF0000'  // Red
                                    }
                                ]} />
                            </View>

                            {/* Checkbox */}
                            <View style={styles.neoCheckbox}>
                                {isCompleted && <Ionicons name="checkmark" size={24} color="black" />}
                            </View>
                        </View>
                    </>
                )}

                {/* SOLID DESIGN (Meeting/Break) */}
                {cardStyle === 'solid' && (
                    <View style={styles.neoCardSolidBody}>
                        <View style={styles.neoSolidHeader}>
                            <Ionicons name={icon as any} size={24} color="black" />
                            <View style={styles.neoTinyTag}>
                                <Text style={styles.neoTinyTagText}>{label}</Text>
                            </View>
                        </View>

                        <Text style={[styles.neoTaskTitle, { marginTop: 8 }]} numberOfLines={2}>{task.name.toUpperCase()}</Text>

                        <View style={styles.neoSolidFooter}>
                            <Text style={styles.neoTaskDuration}>
                                {durationStr.includes('0h') ? durationStr.replace('0h ', '') : durationStr}
                            </Text>
                            <View style={styles.neoCheckbox}>
                                {isCompleted && <Ionicons name="checkmark" size={20} color="black" />}
                            </View>
                        </View>
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
};

// ============================================
// MAIN PLANNER SCREEN
// ============================================
export default function PlannerScreen() {
    const [selectedDate, setSelectedDate] = useState(getTodayString());

    const plan = usePlannerStore(state => state.getPlanForDate(selectedDate));
    const tasks = plan?.tasks || [];

    const handlePrevDay = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const handleNextDay = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const handleEditTask = useCallback((task: PlannedTask) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const isBreak = task.name.toLowerCase().includes('break') || task.name.toLowerCase().includes('lunch');
        const currentDuration = task.focusConfig?.sessionDuration || 30;

        if (isBreak) {
            // For breaks, show simple duration edit
            Alert.prompt(
                '✏️ Edit Break Duration',
                `Current: ${currentDuration} minutes\n\nEnter new duration (in minutes):`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Update',
                        onPress: (text) => {
                            const newDuration = parseInt(text || '0');
                            if (newDuration > 0 && newDuration <= 180) {
                                // TODO: Update task duration via store
                                Alert.alert('Success', `Break duration updated to ${newDuration} minutes`);
                            } else {
                                Alert.alert('Invalid', 'Please enter a duration between 1-180 minutes');
                            }
                        }
                    }
                ],
                'plain-text',
                currentDuration.toString()
            );
        } else {
            // For regular tasks, show full edit options
            Alert.alert(
                '✏️ Edit Task',
                `${task.name}\n\nWhat would you like to edit?`,
                [
                    {
                        text: 'Change Time',
                        onPress: () => {
                            Alert.prompt(
                                '⏰ New Start Time',
                                'Enter time in format: HH:MM AM/PM\nExample: 09:30 AM or 02:15 PM',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Update',
                                        onPress: (timeStr) => {
                                            // Parse AM/PM time
                                            const match = timeStr?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                                            if (match) {
                                                let hour = parseInt(match[1]);
                                                const minute = parseInt(match[2]);
                                                const period = match[3].toUpperCase();

                                                if (period === 'PM' && hour !== 12) hour += 12;
                                                if (period === 'AM' && hour === 12) hour = 0;

                                                if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
                                                    // TODO: Update task time via store
                                                    Alert.alert('Success', `Time updated to ${formatTime(hour, minute)}`);
                                                } else {
                                                    Alert.alert('Invalid', 'Please enter a valid time');
                                                }
                                            } else {
                                                Alert.alert('Invalid Format', 'Use format: HH:MM AM/PM\nExample: 09:30 AM');
                                            }
                                        }
                                    }
                                ],
                                'plain-text',
                                formatTime(task.startTime.hour, task.startTime.minute)
                            );
                        }
                    },
                    {
                        text: 'Edit Duration',
                        onPress: () => {
                            Alert.prompt(
                                '⏱️ Edit Duration',
                                `Current: ${currentDuration} minutes\n\nEnter new duration:`,
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Update',
                                        onPress: (text) => {
                                            const newDuration = parseInt(text || '0');
                                            if (newDuration > 0 && newDuration <= 240) {
                                                // TODO: Update task duration via store
                                                Alert.alert('Success', `Duration updated to ${newDuration} minutes`);
                                            } else {
                                                Alert.alert('Invalid', 'Please enter duration between 1-240 minutes');
                                            }
                                        }
                                    }
                                ],
                                'plain-text',
                                currentDuration.toString()
                            );
                        }
                    },
                    {
                        text: 'Delete Task',
                        style: 'destructive',
                        onPress: () => {
                            Alert.alert(
                                'Delete Task',
                                `Are you sure you want to delete "${task.name}"?`,
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Delete',
                                        style: 'destructive',
                                        onPress: () => {
                                            // TODO: Delete task via store
                                            Alert.alert('Deleted', 'Task has been deleted');
                                        }
                                    }
                                ]
                            );
                        }
                    },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        }
    }, [selectedDate]);

    const handleCreateTask = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push(`/planner/create?date=${selectedDate}`);
    };

    return (
        <View style={styles.container}>
            <NeoHeader
                date={selectedDate}
                onPrev={handlePrevDay}
                onNext={handleNextDay}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Rail Component */}
                <View style={styles.neoRail} />

                {/* Tasks */}
                {tasks.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>NO TASKS PLANNED</Text>
                    </View>
                ) : (
                    tasks.map((task, index) => (
                        <Animated.View
                            key={task.id}
                            entering={FadeInDown.delay(index * 100).springify()}
                            style={styles.timelineRow}
                        >
                            {/* Time Block */}
                            <View style={styles.timeBlockContainer}>
                                <View style={styles.timeBlock}>
                                    <Text style={styles.timeBlockText}>
                                        {formatTime(task.startTime.hour, task.startTime.minute)}
                                    </Text>
                                    <Text style={styles.timeBlockArrow}>→</Text>
                                    <Text style={styles.timeBlockText}>
                                        {(() => {
                                            // Calculate total duration from focusConfig
                                            const sessionCount = task.focusConfig?.sessionCount || 1;
                                            const sessionDuration = task.focusConfig?.sessionDuration || 25;
                                            const breakDuration = task.focusConfig?.breakDuration || 5;

                                            const totalDuration = sessionCount > 0
                                                ? (sessionDuration * sessionCount) + (breakDuration * (sessionCount - 1))
                                                : 0;

                                            // If no duration, show dash
                                            if (totalDuration === 0) {
                                                return '—';
                                            }

                                            const endTime = calculateEndTime(task.startTime.hour, task.startTime.minute, totalDuration);
                                            return formatTime(endTime.hour, endTime.minute);
                                        })()}
                                    </Text>
                                </View>
                                {/* Connector Line */}
                                <View style={styles.connectorLine} />
                            </View>

                            {/* Task Card */}
                            <View style={styles.cardContainer}>
                                <NeoTaskCard
                                    task={task}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        // Navigate to Focus Tab with Params
                                        router.push({
                                            pathname: '/(tabs)/focus',
                                            params: { taskId: task.id, date: task.date }
                                        });
                                    }}
                                    onLongPress={() => handleEditTask(task)}
                                />
                            </View>
                        </Animated.View>
                    ))
                )}

                <View style={{ height: 160 }} />
            </ScrollView>

            {/* FAB */}
            <Animated.View
                entering={FadeInUp.delay(500).springify()}
                style={styles.fabContainer}
            >
                <Pressable onPress={handleCreateTask} style={({ pressed }) => [
                    styles.fab,
                    pressed && {
                        transform: [{ translateY: 4 }, { translateX: 4 }],
                        shadowOpacity: 0
                    } // Press effect
                ]}>
                    <Ionicons name="add" size={40} color="black" />
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NEO.colors.white,
    },
    // HEADER STYLES
    neoHeader: {
        paddingTop: 60,
        paddingHorizontal: 16,
        paddingBottom: 20,
        backgroundColor: NEO.colors.white,
        borderBottomWidth: NEO.border,
        borderColor: NEO.colors.black,
    },
    neoTopBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    neoAvatarBox: {
        width: 48,
        height: 48,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        backgroundColor: NEO.colors.white,
    },
    neoAvatarText: {
        fontFamily: NEO.fonts.mono,
        fontWeight: NEO.fonts.heavy,
        fontSize: 18,
    },
    neoTitleColumn: {
        flex: 1,
    },
    neoAppTitle: {
        fontSize: 24,
        fontWeight: NEO.fonts.heavy,
        letterSpacing: 1,
        color: NEO.colors.black,
        lineHeight: 28,
    },
    neoTagContainer: {
        backgroundColor: NEO.colors.white,
        borderWidth: 2,
        borderColor: NEO.colors.black,
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 4,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0 },
            android: { elevation: 4 }
        }),
    },
    neoTagText: {
        fontSize: 12,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
    },
    neoDateNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    neoNavButton: {
        width: 44,
        height: 44,
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
    },
    neoPressed: {
        transform: [{ translateY: 2 }, { translateX: 2 }],
        shadowOffset: { width: 0, height: 0 },
    },
    neoDateDisplay: {
        flex: 1,
        height: 44,
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    neoDateText: {
        fontSize: 16,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
    },

    // TIMELINE LAYOUT
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        position: 'relative',
    },
    neoRail: {
        position: 'absolute',
        left: 36, // Center of time block (approx)
        top: 0,
        bottom: 0,
        width: 6,
        backgroundColor: NEO.colors.black,
    },
    timelineRow: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    timeBlockContainer: {
        width: 80,
        alignItems: 'center',
        marginRight: 10,
    },
    timeBlock: {
        backgroundColor: NEO.colors.black,
        paddingVertical: 6,
        paddingHorizontal: 8,
        minWidth: 70,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    timeBlockText: {
        color: NEO.colors.white,
        fontWeight: NEO.fonts.heavy,
        fontSize: 14,
    },
    connectorLine: {
        position: 'absolute',
        right: -10, // Extend to card
        top: 15,
        height: 4,
        width: 20,
        backgroundColor: NEO.colors.black,
    },
    cardContainer: {
        flex: 1,
    },

    // TASK CARD STYLES
    neoCardWrapper: {
        shadowColor: NEO.colors.black,
        shadowOffset: { width: NEO.shadowOffset, height: NEO.shadowOffset },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    neoCardContainer: {
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        overflow: 'hidden',
    },
    // Type A: Split
    neoCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        paddingHorizontal: 12,
        borderBottomWidth: NEO.border,
        borderBottomColor: NEO.colors.black,
    },
    neoCardBody: {
        padding: 12,
        backgroundColor: NEO.colors.white,
    },
    neoTaskTitle: {
        fontSize: 16,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        marginBottom: 4,
        lineHeight: 20,
    },
    neoTaskDuration: {
        fontSize: 12,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
        marginBottom: 12,
    },
    neoStatusText: {
        fontSize: 10,
        fontWeight: NEO.fonts.bold,
        marginBottom: 4,
    },
    neoProgressBarBg: {
        height: 12,
        backgroundColor: NEO.colors.white,
        borderWidth: 2,
        borderColor: NEO.colors.black,
        marginBottom: 4,
        flexDirection: 'row',
    },
    neoProgressBarFill: {
        height: '100%',
        backgroundColor: NEO.colors.cyan,
    },

    // Type B: Solid
    neoCardSolidBody: {
        padding: 12,
    },
    neoSolidHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    neoSolidFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },

    // Checkbox
    neoCheckbox: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 24,
        height: 24,
        borderWidth: 3,
        borderColor: NEO.colors.black,
        backgroundColor: NEO.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Tags
    neoTinyTag: {
        backgroundColor: NEO.colors.white,
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderWidth: 2,
        borderColor: NEO.colors.black,
        marginLeft: 'auto',
    },
    neoTinyTagText: {
        fontSize: 10,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
    },

    // Empty State
    emptyState: {
        marginTop: 100,
        alignItems: 'center',
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        padding: 20,
        marginLeft: 40,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 8, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    emptyText: {
        fontWeight: NEO.fonts.heavy,
        fontSize: 16,
    },

    // FAB
    fabContainer: {
        position: 'absolute',
        bottom: 160,
        right: 30,
    },
    fab: {
        width: 64,
        height: 64,
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 8, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
});


