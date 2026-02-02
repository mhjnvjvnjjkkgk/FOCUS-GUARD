import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    ScrollView,
    Switch,
    Dimensions,
} from 'react-native';
import Animated, {
    FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { useReminderStore, Reminder } from '@/store';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ============================================
// NEOBRUTALIST "MEMORY BANK" THEME
// ============================================
const MEMORY = {
    colors: {
        white: '#FFFFFF',
        black: '#000000',
        pink: '#FF007F', // Brand Color
        green: '#76FF03', // Neon Green
        purple: '#8A2BE2', // Electric Purple
        yellow: '#FFD700', // Safety Yellow
        orange: '#FF5500',
        greyLight: '#F0F0F0',
        greyDark: '#DDDDDD',
    },
    border: 3,
    shadow: 6,
};

const SCREEN_WIDTH = Dimensions.get('window').width;

// ============================================
// COMPONENTS
// ============================================

// 1. Header Unit (Identity Block)
const MemoryHeader = () => (
    <View style={styles.headerContainer}>
        {/* Avatar Frame */}
        <View style={styles.avatarFrame}>
            <Text style={styles.avatarText}>FG</Text>
        </View>

        {/* Title Block */}
        <View style={styles.titleBlock}>
            <Text style={styles.appTitle}>FOCUSGUARD</Text>
            <View style={styles.contextTag}>
                <Ionicons name="chatbubble-ellipses-outline" size={12} color="black" style={{ marginRight: 4 }} />
                <Text style={styles.contextText}>REMINDERS</Text>
            </View>
        </View>
    </View>
);

// 2. Dashboard (Stats Grid)
const MemoryDashboard = ({ active, total, streak }: any) => (
    <View style={styles.dashboardContainer}>
        {/* ACTIVE */}
        <View style={styles.dashCell}>
            <Text style={styles.dashLabel}>ACTIVE</Text>
            <Text style={[styles.dashValue, { color: MEMORY.colors.pink }]}>
                {active.toString().padStart(2, '0')}
            </Text>
        </View>

        <View style={styles.dashDivider} />

        {/* TOTAL */}
        <View style={styles.dashCell}>
            <Text style={styles.dashLabel}>TOTAL</Text>
            <Text style={[styles.dashValue, { color: MEMORY.colors.green }]}>
                {total.toString().padStart(2, '0')}
            </Text>
        </View>

        <View style={styles.dashDivider} />

        {/* STREAK */}
        <View style={styles.dashCell}>
            <Text style={styles.dashLabel}>STREAK</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.dashValue, { color: MEMORY.colors.purple }]}>
                    {streak.toString().padStart(2, '0')}
                </Text>
                <Text style={{ fontSize: 24, marginLeft: 4 }}>🔥</Text>
            </View>
        </View>
    </View>
);

// 3. Hazard Strip
const HazardStrip = () => (
    <View style={styles.hazardContainer}>
        {/* Stripes pattern is hard in pure RN w/o image, simulating with repeated text or rotated views is costly. 
            We'll use a simple background color + text for performance, mimicking the look. 
        */}
        <View style={styles.hazardBackground}>
            {/* Diagonal Lines Simulation (Simplified) */}
            <View style={styles.stripeOverlay} />
            <Text style={styles.hazardText} numberOfLines={1}>
                YOUR REMINDERS // TAP TO EDIT // LONG PRESS TO NUKE
            </Text>
        </View>
    </View>
);

// 4. Data Brick (Reminder Card)
const ReminderBrick = ({ item, onToggle, onDelete }: { item: Reminder, onToggle: (id: string) => void, onDelete: (id: string) => void }) => {

    // Category Styles
    const getCatColor = (cat: string) => {
        switch (cat) {
            case 'motivation': return '#FF5500'; // Orange
            case 'study': return '#8A2BE2'; // Purple
            case 'health': return '#00CC00'; // Green
            default: return MEMORY.colors.black;
        }
    };

    const getIcon = (cat: string) => {
        switch (cat) {
            case 'motivation': return '💪';
            case 'study': return '📚';
            case 'health': return '🧘';
            default: return '📝';
        }
    };

    const catColor = getCatColor(item.category);

    return (
        <Animated.View entering={FadeInUp.springify()}>
            <Pressable
                onLongPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    onDelete(item.id);
                }}
                onPress={() => {
                    // Navigate to edit
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/reminder/${item.id}`);
                }}
                style={styles.brickContainer}
            >
                {/* Sidebar */}
                <View style={[styles.brickSidebar, { backgroundColor: catColor }]} />

                <View style={styles.brickContent}>
                    {/* Header: Icon + Title + Toggle */}
                    <View style={styles.brickHeader}>
                        <View style={{ flexDirection: 'row', flex: 1 }}>
                            {/* Icon Box */}
                            <View style={styles.iconBox}>
                                <Text style={{ fontSize: 20 }}>{getIcon(item.category)}</Text>
                            </View>

                            {/* Title & Schedule */}
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={styles.brickTitle} numberOfLines={1}>{item.title.toUpperCase()}</Text>
                                <Text style={styles.brickSchedule}>
                                    {item.schedule.type === 'daily' ? `DAILY @ ${item.schedule.time?.hour}:${item.schedule.time?.minute.toString().padStart(2, '0')}` : 'SCHEDULED'}
                                </Text>
                            </View>
                        </View>

                        {/* Custom Switch Look */}
                        <Pressable onPress={() => onToggle(item.id)}>
                            <View style={[
                                styles.neoSwitch,
                                item.enabled ? { backgroundColor: MEMORY.colors.green } : { backgroundColor: MEMORY.colors.white }
                            ]}>
                                <Text style={{
                                    fontSize: 10,
                                    fontWeight: '900',
                                    marginHorizontal: 4,
                                    opacity: item.enabled ? 1 : 0
                                }}>ON</Text>
                                <View style={[
                                    styles.switchThumb,
                                    item.enabled ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }
                                ]} />
                                <Text style={{
                                    fontSize: 10,
                                    fontWeight: '900',
                                    marginHorizontal: 4,
                                    opacity: !item.enabled ? 1 : 0
                                }}>OFF</Text>
                            </View>
                        </Pressable>
                    </View>

                    {/* Message Box */}
                    <View style={styles.messageBox}>
                        <Text style={styles.messageText} numberOfLines={2}>
                            {item.message || "No additional details provided."}
                        </Text>
                    </View>

                    {/* Category Tag */}
                    <View style={[styles.brickTag, { backgroundColor: catColor }]}>
                        <Text style={styles.tagText}>{item.category.toUpperCase()}</Text>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
};


// ============================================
// MAIN SCREEN
// ============================================
export default function RemindersScreen() {
    const reminders = useReminderStore((state) => state.reminders);
    const toggleReminder = useReminderStore((state) => state.toggleReminder);
    const deleteReminder = useReminderStore((state) => state.deleteReminder);

    const activeCount = reminders.filter(r => r.enabled).length;

    return (
        <View style={styles.container}>
            <MemoryHeader />

            <MemoryDashboard
                active={activeCount}
                total={reminders.length}
                streak={12} // Mock for now, hook up to real streak later
            />

            <HazardStrip />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {reminders.map((r) => (
                    <ReminderBrick
                        key={r.id}
                        item={r}
                        onToggle={toggleReminder}
                        onDelete={deleteReminder}
                    />
                ))}

                {/* Empty State Helper */}
                {reminders.length === 0 && (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>NO DATA BLOCKS FOUND</Text>
                        <Text style={styles.emptySub}>TAP + TO INITIALIZE</Text>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* FAB */}
            <Pressable
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.push('/reminder/create');
                }}
                style={({ pressed }) => [
                    styles.fab,
                    pressed && { transform: [{ scale: 0.95 }], shadowOpacity: 0, translate: 4 }
                ]}
            >
                <Ionicons name="add" size={40} color="white" />
            </Pressable>
        </View>
    );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: MEMORY.colors.white,
        paddingTop: 60,
    },

    // HEADER
    headerContainer: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarFrame: {
        width: 48,
        height: 48,
        borderWidth: MEMORY.border,
        borderColor: MEMORY.colors.black,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        backgroundColor: MEMORY.colors.greyLight,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '900',
        fontFamily: 'monospace',
    },
    titleBlock: {
        justifyContent: 'center',
    },
    appTitle: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -1,
        lineHeight: 28,
    },
    contextTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: MEMORY.colors.white,
        borderWidth: 2,
        borderColor: MEMORY.colors.black,
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginTop: 4,
        borderRadius: 12, // Pill shape
        // Hard shadow for tag
        shadowColor: MEMORY.colors.black,
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    contextText: {
        fontSize: 10,
        fontWeight: '900',
    },

    // DASHBOARD
    dashboardContainer: {
        flexDirection: 'row',
        borderTopWidth: MEMORY.border,
        borderBottomWidth: MEMORY.border,
        borderColor: MEMORY.colors.black,
        height: 80,
    },
    dashCell: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: MEMORY.colors.white,
    },
    dashDivider: {
        width: MEMORY.border,
        height: '100%',
        backgroundColor: MEMORY.colors.black,
    },
    dashLabel: {
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 4,
        fontFamily: 'monospace',
    },
    dashValue: {
        fontSize: 32,
        fontWeight: '900',
    },

    // HAZARD STRIP
    hazardContainer: {
        width: '100%',
        height: 32,
        backgroundColor: MEMORY.colors.yellow,
        justifyContent: 'center',
        overflow: 'hidden',
        borderBottomWidth: MEMORY.border,
        borderColor: MEMORY.colors.black,
    },
    hazardBackground: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hazardText: {
        fontSize: 10,
        fontWeight: '900',
        fontFamily: 'monospace',
        letterSpacing: 1,
    },
    stripeOverlay: {
        // Complex to do CSS pattern in RN, skipping visual stripes for perf/simplicity as per prompt 'plan' vs 'do' constraints
    },

    // SCROLL
    scrollContent: {
        padding: 20,
    },

    // BRICKS
    brickContainer: {
        flexDirection: 'row',
        minHeight: 140,
        backgroundColor: MEMORY.colors.white,
        borderWidth: MEMORY.border,
        borderColor: MEMORY.colors.black,
        marginBottom: 20,
        shadowColor: MEMORY.colors.black,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    brickSidebar: {
        width: 12,
        height: '100%',
        borderRightWidth: MEMORY.border,
        borderColor: MEMORY.colors.black,
    },
    brickContent: {
        flex: 1,
        padding: 12,
    },
    brickHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderWidth: 2,
        borderColor: MEMORY.colors.black,
        justifyContent: 'center',
        alignItems: 'center',
    },
    brickTitle: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 2,
    },
    brickSchedule: {
        fontSize: 10,
        fontFamily: 'monospace',
        color: '#555',
    },

    // SWITCH
    neoSwitch: {
        width: 60,
        height: 28,
        borderWidth: 2,
        borderColor: MEMORY.colors.black,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 2,
    },
    switchThumb: {
        width: 20,
        height: 20,
        backgroundColor: MEMORY.colors.black,
    },

    // MESSAGE
    messageBox: {
        backgroundColor: MEMORY.colors.greyLight,
        borderWidth: 2,
        borderColor: MEMORY.colors.black,
        padding: 8,
        marginBottom: 12,
    },
    messageText: {
        fontFamily: 'monospace',
        fontSize: 12,
        lineHeight: 16,
    },

    // TAG
    brickTag: {
        position: 'absolute',
        bottom: -3,
        left: -3, // Overlap border
        borderWidth: 2,
        borderColor: MEMORY.colors.black,
        paddingHorizontal: 8,
        paddingVertical: 2,
        zIndex: 10,
    },
    tagText: {
        fontSize: 10,
        fontWeight: '900',
        color: MEMORY.colors.black,
    },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 90, // Above tab bar
        right: 20,
        width: 64,
        height: 64,
        backgroundColor: MEMORY.colors.pink,
        borderWidth: MEMORY.border,
        borderColor: MEMORY.colors.black,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: MEMORY.colors.black,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },

    // EMPTY
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
        opacity: 0.5,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '900',
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 12,
        fontFamily: 'monospace',
    }
});
