import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Pressable,
    TextInput,
    Image,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    Layout,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';

import { Colors, Spacing, BorderRadius, Shadows, Animations, FeatureColors } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useBlockerStore } from '@/store/blockerStore';

// Sample installed apps (in real app, this would come from native module)
const INSTALLED_APPS = [
    { packageName: 'com.instagram.android', name: 'Instagram', icon: '📷', category: 'social' as const },
    { packageName: 'com.twitter.android', name: 'Twitter', icon: '🐦', category: 'social' as const },
    { packageName: 'com.facebook.katana', name: 'Facebook', icon: '📘', category: 'social' as const },
    { packageName: 'com.google.android.youtube', name: 'YouTube', icon: '📺', category: 'entertainment' as const },
    { packageName: 'com.netflix.mediaclient', name: 'Netflix', icon: '🎬', category: 'entertainment' as const },
    { packageName: 'com.zhiliaoapp.musically', name: 'TikTok', icon: '🎵', category: 'entertainment' as const },
    { packageName: 'com.snapchat.android', name: 'Snapchat', icon: '👻', category: 'social' as const },
    { packageName: 'com.pinterest', name: 'Pinterest', icon: '📌', category: 'social' as const },
    { packageName: 'com.reddit.frontpage', name: 'Reddit', icon: '🤖', category: 'social' as const },
    { packageName: 'com.linkedin.android', name: 'LinkedIn', icon: '💼', category: 'social' as const },
    { packageName: 'com.whatsapp', name: 'WhatsApp', icon: '💬', category: 'communication' as const },
    { packageName: 'org.telegram.messenger', name: 'Telegram', icon: '✈️', category: 'communication' as const },
    { packageName: 'com.discord', name: 'Discord', icon: '🎮', category: 'communication' as const },
    { packageName: 'com.spotify.music', name: 'Spotify', icon: '🎧', category: 'entertainment' as const },
    { packageName: 'com.amazon.mShop.android.shopping', name: 'Amazon', icon: '📦', category: 'shopping' as const },
    { packageName: 'com.king.candycrushsaga', name: 'Candy Crush', icon: '🍬', category: 'games' as const },
    { packageName: 'com.supercell.clashofclans', name: 'Clash of Clans', icon: '⚔️', category: 'games' as const },
    { packageName: 'com.mojang.minecraftpe', name: 'Minecraft', icon: '🧱', category: 'games' as const },
    { packageName: 'com.cnn.mobile.android.phone', name: 'CNN', icon: '📰', category: 'news' as const },
    { packageName: 'com.bbc.news', name: 'BBC News', icon: '🌍', category: 'news' as const },
];

// Category filters
const CATEGORIES = [
    { id: 'all', label: 'All', icon: '📱' },
    { id: 'social', label: 'Social', icon: '👥' },
    { id: 'entertainment', label: 'Entertainment', icon: '🎬' },
    { id: 'games', label: 'Games', icon: '🎮' },
    { id: 'communication', label: 'Chat', icon: '💬' },
    { id: 'shopping', label: 'Shopping', icon: '🛒' },
    { id: 'news', label: 'News', icon: '📰' },
];

// App Item Component
interface AppItemProps {
    app: typeof INSTALLED_APPS[0];
    isSelected: boolean;
    onToggle: () => void;
    index: number;
}

function AppItem({ app, isSelected, onToggle, index }: AppItemProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const scale = useSharedValue(1);

    const handlePressIn = () => {
        scale.value = withSpring(0.97, Animations.spring.snappy);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, Animations.spring.bouncy);
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 30).springify()}
            layout={Layout.springify()}
        >
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onToggle}
            >
                <Animated.View
                    style={[
                        styles.appItem,
                        isDark && styles.appItemDark,
                        isSelected && styles.appItemSelected,
                        animatedStyle,
                    ]}
                >
                    <View style={[
                        styles.appIconContainer,
                        { backgroundColor: isSelected ? FeatureColors.blocker.light : Colors.gray[100] }
                    ]}>
                        <Text style={styles.appIcon}>{app.icon}</Text>
                    </View>

                    <View style={styles.appInfo}>
                        <Text style={[
                            styles.appName,
                            isDark && styles.textDark,
                        ]}>
                            {app.name}
                        </Text>
                        <Text style={styles.appCategory}>
                            {app.category.charAt(0).toUpperCase() + app.category.slice(1)}
                        </Text>
                    </View>

                    <View style={[
                        styles.checkbox,
                        isSelected && styles.checkboxChecked,
                    ]}>
                        {isSelected && (
                            <Ionicons name="checkmark" size={16} color={Colors.text.inverse} />
                        )}
                    </View>
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
}

// Main Add App Screen
export default function AddAppScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const blockedApps = useBlockerStore(state => state.blockedApps);
    const addBlockedApp = useBlockerStore(state => state.addBlockedApp);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());

    // Filter apps
    const filteredApps = INSTALLED_APPS.filter(app => {
        // Exclude already blocked apps
        if (blockedApps.some(b => b.packageName === app.packageName)) return false;

        // Search filter
        if (searchQuery && !app.name.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && app.category !== selectedCategory) {
            return false;
        }

        return true;
    });

    const toggleApp = (packageName: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedApps(prev => {
            const next = new Set(prev);
            if (next.has(packageName)) {
                next.delete(packageName);
            } else {
                next.add(packageName);
            }
            return next;
        });
    };

    const selectAll = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedApps(new Set(filteredApps.map(a => a.packageName)));
    };

    const clearSelection = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedApps(new Set());
    };

    const handleAddApps = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Add each selected app
        selectedApps.forEach(packageName => {
            const app = INSTALLED_APPS.find(a => a.packageName === packageName);
            if (app) {
                addBlockedApp({
                    packageName: app.packageName,
                    appName: app.name,
                    appIcon: app.icon,
                    category: app.category,
                    trackingEnabled: true,
                    dailyLimitEnabled: true,
                    dailyLimitMinutes: 30,
                    reminderEnabled: true,
                    reminderIntervalMinutes: 10,
                    reminderMessage: `You've been using ${app.name} for a while. Take a break!`,
                    blockAfterLimit: true,
                    blockMessage: `You've reached your daily limit for ${app.name}!`,
                    unlockTask: { type: 'none' },
                    scheduleEnabled: false,
                    schedules: [],
                });
            }
        });

        router.back();
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Add Apps to Block',
                    headerStyle: { backgroundColor: isDark ? Colors.gray[900] : Colors.background.primary },
                    headerTintColor: isDark ? Colors.text.inverse : Colors.text.primary,
                    headerRight: () => (
                        <Pressable
                            onPress={selectedApps.size > 0 ? handleAddApps : undefined}
                            style={styles.saveButton}
                            disabled={selectedApps.size === 0}
                        >
                            <Text style={[
                                styles.saveButtonText,
                                selectedApps.size === 0 && styles.saveButtonTextDisabled
                            ]}>
                                Add ({selectedApps.size})
                            </Text>
                        </Pressable>
                    ),
                }}
            />

            <View style={[styles.container, isDark && styles.containerDark]}>
                {/* Search Bar */}
                <Animated.View
                    entering={FadeInUp.delay(100).springify()}
                    style={styles.searchContainer}
                >
                    <View style={[styles.searchBar, isDark && styles.searchBarDark]}>
                        <Ionicons name="search" size={20} color={Colors.gray[400]} />
                        <TextInput
                            style={[styles.searchInput, isDark && styles.textDark]}
                            placeholder="Search apps..."
                            placeholderTextColor={Colors.gray[400]}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color={Colors.gray[400]} />
                            </Pressable>
                        )}
                    </View>
                </Animated.View>

                {/* Category Filter */}
                <Animated.View entering={FadeInUp.delay(150).springify()}>
                    <FlatList
                        horizontal
                        data={CATEGORIES}
                        keyExtractor={item => item.id}
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryList}
                        renderItem={({ item }) => (
                            <Pressable
                                style={[
                                    styles.categoryChip,
                                    selectedCategory === item.id && styles.categoryChipActive,
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedCategory(item.id);
                                }}
                            >
                                <Text style={styles.categoryIcon}>{item.icon}</Text>
                                <Text style={[
                                    styles.categoryLabel,
                                    selectedCategory === item.id && styles.categoryLabelActive,
                                ]}>
                                    {item.label}
                                </Text>
                            </Pressable>
                        )}
                    />
                </Animated.View>

                {/* Selection Actions */}
                <Animated.View
                    entering={FadeInUp.delay(200).springify()}
                    style={styles.selectionActions}
                >
                    <Text style={[styles.appCount, isDark && styles.textSecondaryDark]}>
                        {filteredApps.length} apps available
                    </Text>
                    <View style={styles.selectionButtons}>
                        <Pressable onPress={selectAll}>
                            <Text style={styles.selectAllText}>Select All</Text>
                        </Pressable>
                        {selectedApps.size > 0 && (
                            <Pressable onPress={clearSelection}>
                                <Text style={styles.clearText}>Clear</Text>
                            </Pressable>
                        )}
                    </View>
                </Animated.View>

                {/* Apps List */}
                <FlatList
                    data={filteredApps}
                    keyExtractor={item => item.packageName}
                    contentContainerStyle={styles.appsList}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item, index }) => (
                        <AppItem
                            app={item}
                            index={index}
                            isSelected={selectedApps.has(item.packageName)}
                            onToggle={() => toggleApp(item.packageName)}
                        />
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyIcon}>🔍</Text>
                            <Text style={[styles.emptyTitle, isDark && styles.textDark]}>No apps found</Text>
                            <Text style={styles.emptySubtitle}>Try a different search or category</Text>
                        </View>
                    }
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
    saveButton: {
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing[1],
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: FeatureColors.blocker.primary,
    },
    saveButtonTextDisabled: {
        color: Colors.gray[400],
    },

    // Search
    searchContainer: {
        padding: Spacing[4],
        paddingBottom: Spacing[2],
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[3],
        gap: Spacing[2],
        ...Shadows.sm,
    },
    searchBarDark: {
        backgroundColor: Colors.gray[800],
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: Colors.text.primary,
    },

    // Categories
    categoryList: {
        paddingHorizontal: Spacing[4],
        paddingBottom: Spacing[3],
        gap: Spacing[2],
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing[2],
        borderRadius: BorderRadius.full,
        backgroundColor: Colors.gray[100],
        gap: 4,
    },
    categoryChipActive: {
        backgroundColor: FeatureColors.blocker.primary,
    },
    categoryIcon: {
        fontSize: 14,
    },
    categoryLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.text.secondary,
    },
    categoryLabelActive: {
        color: Colors.text.inverse,
    },

    // Selection Actions
    selectionActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing[4],
        paddingBottom: Spacing[3],
    },
    appCount: {
        fontSize: 13,
        color: Colors.text.secondary,
    },
    selectionButtons: {
        flexDirection: 'row',
        gap: Spacing[4],
    },
    selectAllText: {
        fontSize: 13,
        fontWeight: '600',
        color: FeatureColors.blocker.primary,
    },
    clearText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.accent.red,
    },

    // Apps List
    appsList: {
        paddingHorizontal: Spacing[4],
        paddingBottom: 100,
    },
    appItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing[3],
        marginBottom: Spacing[2],
        borderWidth: 2,
        borderColor: 'transparent',
        ...Shadows.sm,
    },
    appItemDark: {
        backgroundColor: Colors.gray[800],
    },
    appItemSelected: {
        borderColor: FeatureColors.blocker.primary,
        backgroundColor: FeatureColors.blocker.light,
    },
    appIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing[3],
    },
    appIcon: {
        fontSize: 24,
    },
    appInfo: {
        flex: 1,
    },
    appName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: 2,
    },
    appCategory: {
        fontSize: 12,
        color: Colors.text.secondary,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.gray[300],
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: FeatureColors.blocker.primary,
        borderColor: FeatureColors.blocker.primary,
    },

    // Empty State
    emptyState: {
        alignItems: 'center',
        paddingVertical: Spacing[12],
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: Spacing[4],
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text.primary,
        marginBottom: Spacing[2],
    },
    emptySubtitle: {
        fontSize: 14,
        color: Colors.text.secondary,
    },

    // Text Theme
    textDark: {
        color: Colors.text.inverse,
    },
    textSecondaryDark: {
        color: Colors.gray[400],
    },
});
