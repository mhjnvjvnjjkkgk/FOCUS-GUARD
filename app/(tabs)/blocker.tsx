import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Switch,
    Alert,
} from 'react-native';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSettingsStore } from '@/store/settingsStore';

// NEO-BRUTALIST CONSTANTS
const NEO_BLACK = '#000000';
const NEO_WHITE = '#FFFFFF';
const NEO_CYAN = '#00FFFF';
const NEO_GREEN = '#00FF00';
const NEO_ORANGE = '#FF5500';
const NEO_RED = '#DC143C';
const NEO_PURPLE = '#9370DB';

// Types
interface BlockedApp {
    id: string;
    name: string;
    icon: string;
    packageName: string;
    dailyLimit: number; // minutes
    usedToday: number;
    enabled: boolean;
    unlockTask: 'none' | 'shake' | 'typing' | 'math' | 'breathing';
}

// Sample data (replace with actual store later)
const SAMPLE_APPS: BlockedApp[] = [
    {
        id: '1',
        name: 'instagram',
        icon: 'logo-instagram',
        packageName: 'com.instagram.android',
        dailyLimit: 30,
        usedToday: 45,
        enabled: true,
        unlockTask: 'shake',
    },
    {
        id: '2',
        name: 'twitter',
        icon: 'logo-twitter',
        packageName: 'com.twitter.android',
        dailyLimit: 20,
        usedToday: 12,
        enabled: true,
        unlockTask: 'typing',
    },
];

// Get protocol text
function getProtocolText(task: string): string {
    switch (task) {
        case 'shake': return 'SHAKE';
        case 'typing': return 'TYPING';
        case 'math': return 'MATH';
        case 'breathing': return 'BREATHING';
        default: return 'NONE';
    }
}

// ============================================
// APP CARD COMPONENT
// ============================================

interface AppCardProps {
    app: BlockedApp;
    index: number;
    onToggle: () => void;
    onPress: () => void;
}

function NeoAppCard({ app, index, onToggle, onPress }: AppCardProps) {
    const scale = useSharedValue(1);
    const isBreached = app.usedToday >= app.dailyLimit;
    const usagePercent = Math.min((app.usedToday / app.dailyLimit) * 100, 100);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.98);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 80).springify()}
            style={[styles.appCard, animatedStyle]}
        >
            {/* Status Strip */}
            <View style={[styles.statusStrip, { backgroundColor: isBreached ? NEO_RED : NEO_GREEN }]}>
                <Text style={styles.statusText}>{isBreached ? 'breached' : 'secure'}</Text>
            </View>

            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.appCardContent}
            >
                {/* App Icon */}
                <View style={styles.appIconContainer}>
                    <View style={styles.appIconBox}>
                        <Ionicons name={app.icon as any} size={48} color={NEO_BLACK} />
                    </View>
                </View>

                {/* App Info */}
                <View style={styles.appInfo}>
                    <Text style={styles.appName}>{app.name}</Text>
                    <Text style={styles.usageLabel}>USAGE</Text>

                    {/* Usage Bar */}
                    <View style={styles.usageBarContainer}>
                        <View style={styles.usageBarBg}>
                            <View style={[
                                styles.usageBarFill,
                                {
                                    width: `${usagePercent}%`,
                                    backgroundColor: isBreached ? NEO_RED : NEO_CYAN,
                                }
                            ]} />
                        </View>
                    </View>

                    {/* Usage Text */}
                    <Text style={styles.usageText}>
                        {usagePercent >= 100 ? '100%' : `${Math.round(usagePercent)}%`} {app.usedToday}m/{app.dailyLimit}m
                    </Text>

                    {/* Protocol Badge */}
                    <View style={styles.protocolBadge}>
                        <Text style={styles.protocolText}>
                            [ PROTOCOL: {getProtocolText(app.unlockTask)} ]
                        </Text>
                    </View>
                </View>

                {/* Toggle Switch */}
                <View style={styles.toggleContainer}>
                    {isBreached ? (
                        <View style={styles.blockedBadge}>
                            <Text style={styles.blockedText}>BLOCKED</Text>
                        </View>
                    ) : (
                        <Switch
                            value={app.enabled}
                            onValueChange={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onToggle();
                            }}
                            trackColor={{ false: '#888888', true: NEO_CYAN }}
                            thumbColor={NEO_WHITE}
                            ios_backgroundColor="#888888"
                        />
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

// ============================================
// MAIN BLOCKER SCREEN
// ============================================

export default function BlockerScreen() {
    const [apps, setApps] = useState(SAMPLE_APPS);

    // Calculate stats
    const totalUsedToday = apps.reduce((sum, app) => sum + app.usedToday, 0);
    const totalLimit = apps.reduce((sum, app) => sum + app.dailyLimit, 0);
    const remainingTime = Math.max(0, totalLimit - totalUsedToday);
    const blockedAppsCount = apps.filter(app => app.usedToday >= app.dailyLimit).length;

    const handleToggleApp = (id: string) => {
        setApps(prev => prev.map(app =>
            app.id === id ? { ...app, enabled: !app.enabled } : app
        ));
    };

    const handleAppPress = (app: BlockedApp) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert('Edit App', `Edit settings for ${app.name}`);
        // TODO: Navigate to app edit screen
    };

    const handlePauseAll = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('Pause All', 'Pause all app blocking temporarily');
    };

    const handleViewStats = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push('/(tabs)/stats');
    };

    const handleSchedule = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('Schedule', 'Set blocking schedules');
    };

    const handleConfig = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('Config', 'Configure global settings');
    };

    const handleAddApp = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert('Add App', 'Add new app to block list');
        // TODO: Navigate to add app screen
    };

    return (
        <View style={styles.container}>
            {/* UNIFIED HEADER */}
            <View style={styles.neoHeader}>
                <Pressable
                    style={styles.neoAvatarBox}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        useSettingsStore.getState().openSidebar();
                    }}
                >
                    <Ionicons name="person" size={24} color={NEO_WHITE} />
                </Pressable>
                <View style={styles.neoHeaderText}>
                    <Text style={styles.neoTitle}>FOCUSGUARD</Text>
                    <View style={styles.neoSubtitleBox}>
                        <Text style={styles.neoSubtitle}>🚫 BLOCKER</Text>
                    </View>
                </View>
            </View>

            {/* STATS CARD */}
            <View style={styles.statsCard}>
                <View style={[styles.statBox, { backgroundColor: NEO_CYAN }]}>
                    <Text style={styles.statLabel}>USED TODAY</Text>
                    <Text style={styles.statValue}>{totalUsedToday}m</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: NEO_GREEN }]}>
                    <Text style={styles.statLabel}>REMAINING</Text>
                    <Text style={styles.statValue}>{remainingTime}m</Text>
                </View>

                <View style={[styles.statBox, { backgroundColor: NEO_ORANGE }]}>
                    <Text style={styles.statLabel}>BLOCKED APPS</Text>
                    <Text style={styles.statValue}>{blockedAppsCount.toString().padStart(2, '0')}</Text>
                </View>
            </View>

            {/* APPS LIST */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {apps.map((app, index) => (
                    <NeoAppCard
                        key={app.id}
                        app={app}
                        index={index}
                        onToggle={() => handleToggleApp(app.id)}
                        onPress={() => handleAppPress(app)}
                    />
                ))}

                {apps.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyEmoji}>🛡️</Text>
                        <Text style={styles.emptyTitle}>NO APPS BLOCKED</Text>
                        <Text style={styles.emptyText}>
                            Tap the + button to add apps to block
                        </Text>
                    </View>
                )}

                {/* ACTION BUTTONS GRID */}
                <View style={styles.actionsGrid}>
                    <Pressable
                        onPress={handlePauseAll}
                        style={({ pressed }) => [
                            styles.actionBtn,
                            pressed && styles.actionBtnPressed
                        ]}
                    >
                        <Ionicons name="pause" size={20} color={NEO_ORANGE} />
                        <Text style={styles.actionBtnText}>PAUSE ALL</Text>
                    </Pressable>

                    <Pressable
                        onPress={handleViewStats}
                        style={({ pressed }) => [
                            styles.actionBtn,
                            pressed && styles.actionBtnPressed
                        ]}
                    >
                        <Ionicons name="trending-up" size={20} color={NEO_PURPLE} />
                        <Text style={styles.actionBtnText}>VIEW STATS</Text>
                    </Pressable>

                    <Pressable
                        onPress={handleSchedule}
                        style={({ pressed }) => [
                            styles.actionBtn,
                            pressed && styles.actionBtnPressed
                        ]}
                    >
                        <Ionicons name="calendar" size={20} color={NEO_GREEN} />
                        <Text style={styles.actionBtnText}>SCHEDULE</Text>
                    </Pressable>

                    <Pressable
                        onPress={handleConfig}
                        style={({ pressed }) => [
                            styles.actionBtn,
                            pressed && styles.actionBtnPressed
                        ]}
                    >
                        <Ionicons name="list" size={20} color={NEO_BLACK} />
                        <Text style={styles.actionBtnText}>CONFIG</Text>
                    </Pressable>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* FAB */}
            <Pressable
                onPress={handleAddApp}
                style={({ pressed }) => [
                    styles.fab,
                    pressed && {
                        transform: [{ scale: 0.95 }, { translateY: 4 }, { translateX: 4 }],
                        shadowOpacity: 0,
                    }
                ]}
            >
                <Ionicons name="add" size={36} color={NEO_BLACK} />
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
        backgroundColor: '#F5F5F5',
        paddingTop: 60,
    },

    // NEO HEADER
    neoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        backgroundColor: NEO_WHITE,
        padding: 12,
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    neoAvatarBox: {
        width: 50,
        height: 50,
        backgroundColor: NEO_BLACK,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    neoHeaderText: {
        flex: 1,
    },
    neoTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: NEO_BLACK,
        letterSpacing: 2,
    },
    neoSubtitleBox: {
        backgroundColor: NEO_WHITE,
        borderWidth: 2,
        borderColor: NEO_BLACK,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        marginTop: 4,
    },
    neoSubtitle: {
        fontSize: 12,
        fontWeight: '900',
        color: NEO_BLACK,
        letterSpacing: 1,
    },

    // STATS CARD
    statsCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        flexDirection: 'row',
        gap: 8,
        backgroundColor: NEO_WHITE,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        borderRadius: 8,
        padding: 8,
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    statBox: {
        flex: 1,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        borderRadius: 4,
        padding: 8,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: NEO_BLACK,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '900',
        color: NEO_BLACK,
    },

    // SCROLL VIEW
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
    },

    // APP CARD
    appCard: {
        marginBottom: 16,
        backgroundColor: NEO_WHITE,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        borderRadius: 8,
        overflow: 'hidden',
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    statusStrip: {
        paddingVertical: 4,
        paddingHorizontal: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '900',
        color: NEO_BLACK,
        letterSpacing: 0.5,
    },
    appCardContent: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
    },
    appIconContainer: {
        marginRight: 12,
    },
    appIconBox: {
        width: 72,
        height: 72,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        backgroundColor: NEO_WHITE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    appInfo: {
        flex: 1,
    },
    appName: {
        fontSize: 20,
        fontWeight: '900',
        color: NEO_BLACK,
        marginBottom: 4,
        textTransform: 'lowercase',
    },
    usageLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: NEO_BLACK,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    usageBarContainer: {
        marginBottom: 4,
    },
    usageBarBg: {
        height: 20,
        backgroundColor: '#E0E0E0',
        borderWidth: 3,
        borderColor: NEO_BLACK,
        overflow: 'hidden',
    },
    usageBarFill: {
        height: '100%',
    },
    usageText: {
        fontSize: 12,
        fontWeight: '700',
        color: NEO_BLACK,
        marginBottom: 8,
        textAlign: 'right',
    },
    protocolBadge: {
        alignSelf: 'flex-end',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 2,
        borderColor: NEO_BLACK,
        backgroundColor: NEO_WHITE,
    },
    protocolText: {
        fontSize: 10,
        fontWeight: '900',
        color: NEO_BLACK,
        letterSpacing: 0.5,
    },
    toggleContainer: {
        marginLeft: 12,
        justifyContent: 'center',
    },
    blockedBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: NEO_RED,
        borderWidth: 3,
        borderColor: NEO_BLACK,
    },
    blockedText: {
        fontSize: 12,
        fontWeight: '900',
        color: NEO_WHITE,
        letterSpacing: 0.5,
    },

    // EMPTY STATE
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyEmoji: {
        fontSize: 80,
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: NEO_BLACK,
        marginBottom: 8,
        letterSpacing: 1,
    },
    emptyText: {
        fontSize: 14,
        color: '#888888',
        textAlign: 'center',
        paddingHorizontal: 40,
    },

    // ACTIONS GRID
    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 16,
    },
    actionBtn: {
        flex: 1,
        minWidth: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        paddingHorizontal: 12,
        backgroundColor: NEO_WHITE,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        borderRadius: 8,
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    actionBtnPressed: {
        transform: [{ translateY: 4 }, { translateX: 4 }],
        shadowOpacity: 0,
    },
    actionBtnText: {
        fontSize: 12,
        fontWeight: '900',
        color: NEO_BLACK,
        letterSpacing: 0.5,
    },

    // FAB
    fab: {
        position: 'absolute',
        bottom: 90, // Moved up to avoid navbar overlap
        right: 24,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: NEO_CYAN,
        borderWidth: 4,
        borderColor: NEO_BLACK,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: NEO_BLACK,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 10, // Added for Android visibility
    },
});
