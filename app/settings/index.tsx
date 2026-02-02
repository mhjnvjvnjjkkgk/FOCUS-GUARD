import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Switch,
    Alert,
    Share,
    Linking,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors, Spacing, BorderRadius, Shadows, FeatureColors } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Settings Section Component
interface SettingsSectionProps {
    title: string;
    children: React.ReactNode;
    delay?: number;
}

function SettingsSection({ title, children, delay = 0 }: SettingsSectionProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).springify()}
            style={styles.section}
        >
            <Text style={[styles.sectionTitle, isDark && styles.textSecondaryDark]}>
                {title}
            </Text>
            <View style={[styles.sectionContent, isDark && styles.sectionContentDark]}>
                {children}
            </View>
        </Animated.View>
    );
}

// Settings Row Component
interface SettingsRowProps {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    title: string;
    subtitle?: string;
    value?: string;
    toggle?: boolean;
    onToggle?: (value: boolean) => void;
    onPress?: () => void;
    showChevron?: boolean;
    danger?: boolean;
}

function SettingsRow({
    icon,
    iconColor = Colors.gray[600],
    title,
    subtitle,
    value,
    toggle,
    onToggle,
    onPress,
    showChevron = true,
    danger = false,
}: SettingsRowProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const handlePress = () => {
        if (onPress) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
        }
    };

    const content = (
        <View style={styles.settingsRow}>
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                <Ionicons name={icon} size={20} color={iconColor} />
            </View>

            <View style={styles.rowContent}>
                <Text style={[
                    styles.rowTitle,
                    isDark && styles.textDark,
                    danger && styles.dangerText,
                ]}>
                    {title}
                </Text>
                {subtitle && (
                    <Text style={[styles.rowSubtitle, isDark && styles.textSecondaryDark]}>
                        {subtitle}
                    </Text>
                )}
            </View>

            {value && (
                <Text style={styles.rowValue}>{value}</Text>
            )}

            {toggle !== undefined && onToggle && (
                <Switch
                    value={toggle}
                    onValueChange={(v) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onToggle(v);
                    }}
                    trackColor={{ false: Colors.gray[300], true: Colors.primary[500] + '60' }}
                    thumbColor={toggle ? Colors.primary[500] : Colors.gray[100]}
                />
            )}

            {showChevron && !toggle && onPress && (
                <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
            )}
        </View>
    );

    if (onPress) {
        return (
            <Pressable onPress={handlePress}>
                {content}
            </Pressable>
        );
    }

    return content;
}

// Main Settings Screen
export default function SettingsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // Settings state
    const [notifications, setNotifications] = useState(true);
    const [haptics, setHaptics] = useState(true);
    const [darkMode, setDarkMode] = useState(isDark);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [autoStart, setAutoStart] = useState(false);
    const [strictMode, setStrictMode] = useState(false);
    const [analytics, setAnalytics] = useState(true);

    const handleExportData = () => {
        Alert.alert(
            'Export Data',
            'Your data will be exported as a JSON file.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Export', onPress: () => { } },
            ]
        );
    };

    const handleDeleteData = async () => {
        Alert.alert(
            'Delete All Data',
            'This will permanently delete all your alarms, reminders, and statistics. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        // Clear all AsyncStorage keys for our app
                        await AsyncStorage.multiRemove([
                            'focusguard-alarms',
                            'focusguard-reminders',
                            'focusguard-focus',
                            'focusguard-blocker',
                            'focusguard-planner',
                            'focusguard-points',
                        ]);
                        Alert.alert('Done', 'All data has been deleted.');
                    }
                },
            ]
        );
    };

    const handleRateApp = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Opens Play Store or App Store (placeholder)
        Linking.openURL('https://play.google.com/store');
    };

    const handleShareApp = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await Share.share({
                message: 'Check out FocusGuard - the ultimate productivity app! Download now: https://focusguard.app',
            });
        } catch (error) {
            console.log(error);
        }
    };

    const handleContactSupport = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Linking.openURL('mailto:support@focusguard.app');
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: '⚙️ Settings',
                    headerStyle: { backgroundColor: isDark ? Colors.gray[900] : Colors.background.primary },
                    headerTintColor: isDark ? Colors.text.inverse : Colors.text.primary,
                }}
            />

            <ScrollView
                style={[styles.container, isDark && styles.containerDark]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Notifications */}
                <SettingsSection title="Notifications" delay={100}>
                    <SettingsRow
                        icon="notifications"
                        iconColor={Colors.primary[500]}
                        title="Push Notifications"
                        subtitle="Receive alarm and reminder alerts"
                        toggle={notifications}
                        onToggle={setNotifications}
                        showChevron={false}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="volume-high"
                        iconColor={Colors.accent.orange}
                        title="Sound"
                        subtitle="Play sounds for notifications"
                        toggle={soundEnabled}
                        onToggle={setSoundEnabled}
                        showChevron={false}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="phone-portrait"
                        iconColor={Colors.accent.purple}
                        title="Haptic Feedback"
                        subtitle="Vibrate on button presses"
                        toggle={haptics}
                        onToggle={setHaptics}
                        showChevron={false}
                    />
                </SettingsSection>

                {/* Appearance */}
                <SettingsSection title="Appearance" delay={150}>
                    <SettingsRow
                        icon="moon"
                        iconColor={Colors.gray[700]}
                        title="Dark Mode"
                        subtitle="Use dark theme throughout app"
                        toggle={darkMode}
                        onToggle={setDarkMode}
                        showChevron={false}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="text"
                        iconColor={Colors.accent.cyan}
                        title="Text Size"
                        value="Medium"
                        onPress={() => { }}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="color-palette"
                        iconColor={Colors.accent.pink}
                        title="Accent Color"
                        value="Blue"
                        onPress={() => { }}
                    />
                </SettingsSection>

                {/* Alarms */}
                <SettingsSection title="Alarms" delay={200}>
                    <SettingsRow
                        icon="alarm"
                        iconColor={FeatureColors.alarm.primary}
                        title="Default Ringtone"
                        value="Gentle Sunrise"
                        onPress={() => { }}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="time"
                        iconColor={Colors.accent.amber}
                        title="Default Snooze Duration"
                        value="5 min"
                        onPress={() => { }}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="flash"
                        iconColor={Colors.accent.green}
                        title="Auto Start Ringtone"
                        subtitle="Start playing when alarm triggers"
                        toggle={autoStart}
                        onToggle={setAutoStart}
                        showChevron={false}
                    />
                </SettingsSection>

                {/* Focus & Blocking */}
                <SettingsSection title="Focus & Blocking" delay={250}>
                    <SettingsRow
                        icon="shield"
                        iconColor={FeatureColors.blocker.primary}
                        title="Strict Mode"
                        subtitle="Prevent disabling blockers during sessions"
                        toggle={strictMode}
                        onToggle={setStrictMode}
                        showChevron={false}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="timer"
                        iconColor={FeatureColors.focus.primary}
                        title="Focus Presets"
                        subtitle="Customize focus session presets"
                        onPress={() => { }}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="apps"
                        iconColor={Colors.accent.cyan}
                        title="Default Block List"
                        value="8 apps"
                        onPress={() => { }}
                    />
                </SettingsSection>

                {/* Data & Privacy */}
                <SettingsSection title="Data & Privacy" delay={300}>
                    <SettingsRow
                        icon="analytics"
                        iconColor={FeatureColors.stats.primary}
                        title="Usage Analytics"
                        subtitle="Help improve the app by sharing usage data"
                        toggle={analytics}
                        onToggle={setAnalytics}
                        showChevron={false}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="cloud-upload"
                        iconColor={Colors.accent.green}
                        title="Backup Data"
                        subtitle="Save your data to the cloud"
                        onPress={() => { }}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="download"
                        iconColor={Colors.primary[500]}
                        title="Export Data"
                        subtitle="Download your data as JSON"
                        onPress={handleExportData}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="trash"
                        iconColor={Colors.accent.red}
                        title="Delete All Data"
                        subtitle="Permanently remove all your data"
                        onPress={handleDeleteData}
                        danger
                    />
                </SettingsSection>

                {/* About */}
                <SettingsSection title="About" delay={350}>
                    <SettingsRow
                        icon="information-circle"
                        iconColor={Colors.primary[500]}
                        title="App Version"
                        value="1.0.0"
                        showChevron={false}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="document-text"
                        iconColor={Colors.gray[600]}
                        title="Terms of Service"
                        onPress={() => { }}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="lock-closed"
                        iconColor={Colors.accent.green}
                        title="Privacy Policy"
                        onPress={() => { }}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="mail"
                        iconColor={Colors.accent.purple}
                        title="Contact Support"
                        onPress={handleContactSupport}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="share-social"
                        iconColor={Colors.accent.cyan}
                        title="Share App"
                        onPress={handleShareApp}
                    />
                    <View style={styles.divider} />
                    <SettingsRow
                        icon="star"
                        iconColor={Colors.accent.amber}
                        title="Rate the App"
                        onPress={handleRateApp}
                    />
                </SettingsSection>

                {/* Footer */}
                <Animated.View
                    entering={FadeInUp.delay(400).springify()}
                    style={styles.footer}
                >
                    <Text style={styles.footerText}>Made with ❤️ by FocusGuard</Text>
                    <Text style={styles.footerVersion}>Version 1.0.0 • Build 100</Text>
                </Animated.View>
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
        paddingBottom: 100,
    },

    // Section
    section: {
        marginBottom: Spacing[6],
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing[2],
        marginLeft: Spacing[1],
    },
    sectionContent: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        overflow: 'hidden',
        ...Shadows.sm,
    },
    sectionContentDark: {
        backgroundColor: Colors.gray[800],
    },

    // Row
    settingsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing[4],
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing[3],
    },
    rowContent: {
        flex: 1,
    },
    rowTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text.primary,
    },
    rowSubtitle: {
        fontSize: 12,
        color: Colors.text.secondary,
        marginTop: 2,
    },
    rowValue: {
        fontSize: 14,
        color: Colors.text.secondary,
        marginRight: Spacing[2],
    },
    dangerText: {
        color: Colors.accent.red,
    },
    divider: {
        height: 1,
        backgroundColor: Colors.gray[100],
        marginLeft: 60,
    },

    // Footer
    footer: {
        alignItems: 'center',
        paddingVertical: Spacing[8],
    },
    footerText: {
        fontSize: 14,
        color: Colors.text.secondary,
        marginBottom: Spacing[1],
    },
    footerVersion: {
        fontSize: 12,
        color: Colors.text.tertiary,
    },

    // Text Theme
    textDark: {
        color: Colors.text.inverse,
    },
    textSecondaryDark: {
        color: Colors.gray[400],
    },
});
