/**
 * Account / Profile Screen
 * Replaces the old sidebar — full-screen page with all user data & settings
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Switch,
    Alert,
    Dimensions,
    Platform,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';

import { usePointsStore } from '@/store/pointsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useShopStore } from '@/store/shopStore';
import { useAuthStore } from '@/store/authStore';
import { getRankForXP, getNextRank, RANKS, getStreakBadge } from '@/data/ranks';
import { ALL_ACHIEVEMENTS } from '@/data/achievements';
import RankBadge from '@/components/RankBadge';

const { width } = Dimensions.get('window');

// ============================================
// NEO DESIGN SYSTEM
// ============================================
const NEO = {
    border: 3,
    shadow: 6,
    colors: { black: '#000', white: '#FFF', bg: '#FFFDF0', yellow: '#FFE500', green: '#C8F7C5', orange: '#FFB347', red: '#FF4444', blue: '#4A9EFF', purple: '#B366FF', cyan: '#00BCD4' },
    fonts: { heavy: '900' as const, bold: '700' as const, mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string },
};

// Neobrutalist section card
function NeoSection({ title, color, delay, children }: { title: string; color: string; delay: number; children: React.ReactNode }) {
    return (
        <Animated.View entering={FadeInDown.delay(delay).springify()} style={[s.section, { backgroundColor: color + '15', borderColor: color }]}>
            <Text style={[s.sectionTitle, { color }]}>{title}</Text>
            {children}
        </Animated.View>
    );
}

export default function AccountScreen() {
    const pointsStore = usePointsStore();
    const settingsStore = useSettingsStore();
    const shopStore = useShopStore();
    const { user, logout } = useAuthStore();

    const currentRank = getRankForXP(pointsStore.totalPointsEarned);
    const nextRankInfo = getNextRank(pointsStore.totalPointsEarned);
    const streakBadge = getStreakBadge(pointsStore.currentStreak);
    const balance = shopStore.getSpendableBalance();

    // Achievement stats
    const unlockedCount = useMemo(() => pointsStore.achievements.filter(a => a.unlockedAt).length, [pointsStore.achievements]);
    const totalAchievements = ALL_ACHIEVEMENTS.length;

    // Editable settings (temp state)
    const [tempName, setTempName] = useState(settingsStore.displayName);
    const [tempPointsGoal, setTempPointsGoal] = useState(String(settingsStore.dailyPointsGoal));
    const [tempTasksGoal, setTempTasksGoal] = useState(String(settingsStore.dailyTasksGoal));
    const [tempFocusGoal, setTempFocusGoal] = useState(String(settingsStore.dailyFocusGoal));
    const [tempAlarmPhrase, setTempAlarmPhrase] = useState(settingsStore.alarmDismissPhrase);
    const [tempFocusPhrase, setTempFocusPhrase] = useState(settingsStore.focusDismissPhrase);
    const [tempSnoozeLimit, setTempSnoozeLimit] = useState(String(settingsStore.alarmSnoozeLimit));
    const [tempFocusDuration, setTempFocusDuration] = useState(String(settingsStore.defaultFocusDuration));
    const [tempBreakDuration, setTempBreakDuration] = useState(String(settingsStore.defaultBreakDuration));

    // Achievement categories for display
    const achievementCategories = useMemo(() => {
        const cats: Record<string, { total: number; unlocked: number }> = {};
        ALL_ACHIEVEMENTS.forEach(ach => {
            if (!cats[ach.category]) cats[ach.category] = { total: 0, unlocked: 0 };
            cats[ach.category].total++;
            const storeAch = pointsStore.achievements.find(a => a.id === ach.id);
            if (storeAch?.unlockedAt) cats[ach.category].unlocked++;
        });
        return cats;
    }, [pointsStore.achievements]);

    // Show more achievements toggle
    const [showAllAchievements, setShowAllAchievements] = useState(false);

    const saveSettings = useCallback(() => {
        if (tempName.trim()) settingsStore.setDisplayName(tempName.trim().toUpperCase());
        const pg = parseInt(tempPointsGoal);
        if (!isNaN(pg) && pg > 0) settingsStore.setDailyPointsGoal(pg);
        const tg = parseInt(tempTasksGoal);
        if (!isNaN(tg) && tg > 0) settingsStore.setDailyTasksGoal(tg);
        const fg = parseInt(tempFocusGoal);
        if (!isNaN(fg) && fg > 0) settingsStore.setDailyFocusGoal(fg);
        if (tempAlarmPhrase.trim()) settingsStore.setAlarmDismissPhrase(tempAlarmPhrase.trim().toUpperCase());
        if (tempFocusPhrase.trim()) settingsStore.setFocusDismissPhrase(tempFocusPhrase.trim().toUpperCase());
        const sl = parseInt(tempSnoozeLimit);
        if (!isNaN(sl) && sl >= 0) settingsStore.setAlarmSnoozeLimit(sl);
        const fd = parseInt(tempFocusDuration);
        if (!isNaN(fd) && fd > 0) settingsStore.setDefaultFocusDuration(fd);
        const bd = parseInt(tempBreakDuration);
        if (!isNaN(bd) && bd > 0) settingsStore.setDefaultBreakDuration(bd);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('✅ Saved', 'Settings updated successfully!');
    }, [tempName, tempPointsGoal, tempTasksGoal, tempFocusGoal, tempAlarmPhrase, tempFocusPhrase, tempSnoozeLimit, tempFocusDuration, tempBreakDuration]);

    const handleResetData = () => {
        Alert.alert('⚠️ RESET ALL DATA', 'This will permanently delete all data. Are you sure?', [
            { text: 'CANCEL', style: 'cancel' },
            {
                text: 'RESET', style: 'destructive', onPress: async () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    await AsyncStorage.multiRemove([
                        'focusguard-alarms', 'focusguard-reminders', 'focusguard-focus',
                        'focusguard-blocker', 'focusguard-planner', 'focusguard-points', 'focusguard-shop',
                    ]);
                    settingsStore.resetAllData();
                    Alert.alert('Done', 'All data has been deleted.');
                }
            },
        ]);
    };

    const formatMinutes = (mins: number) => {
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const toggleRow = (label: string, value: boolean, onToggle: (v: boolean) => void) => (
        <View style={s.toggleRow}>
            <Text style={s.toggleLabel}>{label}</Text>
            <Switch
                value={value}
                onValueChange={(v) => { onToggle(v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                trackColor={{ false: '#ddd', true: '#76FF03' }}
                thumbColor={value ? NEO.colors.black : '#999'}
            />
        </View>
    );

    return (
        <View style={s.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <Animated.View entering={FadeInUp.springify()} style={s.header}>
                <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); }} style={s.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </Pressable>
                <Text style={s.headerTitle}>ACCOUNT</Text>
                <View style={{ width: 40 }} />
            </Animated.View>

            <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* ========== PROFILE HEADER ========== */}
                <Animated.View entering={FadeInDown.delay(50).springify()} style={s.profileCard}>
                    <View style={s.profileRow}>
                        <View style={[s.avatarBox, { borderColor: currentRank.color }]}>
                            {user?.photoURL ? (
                                <Image source={{ uri: user.photoURL }} style={{ width: '100%', height: '100%' }} />
                            ) : (
                                <Text style={s.avatarText}>{currentRank.badge}</Text>
                            )}
                        </View>
                        <View style={s.profileInfo}>
                            <Text style={s.profileName} numberOfLines={1}>
                                {settingsStore.displayName || user?.displayName?.toUpperCase() || 'FOCUSGUARD USER'}
                            </Text>
                            <RankBadge size="small" showStreak />
                            {user?.email && (
                                <Text style={s.profileEmail} numberOfLines={1}>{user.email}</Text>
                            )}
                        </View>
                    </View>

                    {/* Quick Stats */}
                    <View style={s.quickStats}>
                        <View style={s.quickStat}>
                            <Text style={s.quickStatValue}>{pointsStore.totalPointsEarned.toLocaleString()}</Text>
                            <Text style={s.quickStatLabel}>TOTAL XP</Text>
                        </View>
                        <View style={[s.quickStatDivider, { backgroundColor: currentRank.color }]} />
                        <View style={s.quickStat}>
                            <Text style={s.quickStatValue}>{pointsStore.currentStreak}</Text>
                            <Text style={s.quickStatLabel}>STREAK 🔥</Text>
                        </View>
                        <View style={[s.quickStatDivider, { backgroundColor: currentRank.color }]} />
                        <View style={s.quickStat}>
                            <Text style={s.quickStatValue}>{unlockedCount}/{totalAchievements}</Text>
                            <Text style={s.quickStatLabel}>ACHIEVEMENTS</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* ========== XP & RANK ========== */}
                <NeoSection title="⚡ XP & RANK" color={currentRank.color} delay={100}>
                    <View style={s.xpRow}>
                        <Text style={s.xpLabel}>Level {currentRank.level}</Text>
                        <Text style={[s.xpValue, { color: currentRank.color }]}>{pointsStore.totalPointsEarned.toLocaleString()} XP</Text>
                    </View>
                    {nextRankInfo ? (
                        <>
                            <View style={s.progressBg}>
                                <View style={[s.progressFill, { width: `${Math.max(nextRankInfo.progress * 100, 2)}%`, backgroundColor: currentRank.color }]} />
                            </View>
                            <Text style={s.nextRankText}>
                                Next: {nextRankInfo.rank.badge} {nextRankInfo.rank.title} — {nextRankInfo.xpNeeded.toLocaleString()} XP to go
                            </Text>
                        </>
                    ) : (
                        <Text style={[s.nextRankText, { color: '#FFD700', fontWeight: '900' }]}>⚡ MAX RANK ACHIEVED</Text>
                    )}

                    {/* All Ranks Timeline */}
                    <Text style={s.subHeader}>ALL RANKS</Text>
                    <View style={s.ranksGrid}>
                        {RANKS.map((rank) => {
                            const unlocked = currentRank.level >= rank.level;
                            return (
                                <View key={rank.level} style={[s.rankPill, unlocked && { borderColor: rank.color, backgroundColor: rank.color + '20' }]}>
                                    <Text style={s.rankEmoji}>{rank.badge}</Text>
                                    <Text style={[s.rankPillText, unlocked && { color: rank.color }]} numberOfLines={1}>
                                        {rank.title}
                                    </Text>
                                    {unlocked && <Text style={s.rankCheck}>✓</Text>}
                                </View>
                            );
                        })}
                    </View>
                </NeoSection>

                {/* ========== SHOP ========== */}
                <NeoSection title="🛒 SHOP" color={NEO.colors.yellow} delay={150}>
                    <View style={s.shopRow}>
                        <View>
                            <Text style={s.shopBalance}>🪙 {balance.toLocaleString()}</Text>
                            <Text style={s.shopSub}>Spendable Balance</Text>
                        </View>
                        <Pressable
                            style={[s.neoBtn, { backgroundColor: NEO.colors.yellow }]}
                            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/shop' as any); }}
                        >
                            <Text style={s.neoBtnText}>OPEN SHOP →</Text>
                        </Pressable>
                    </View>
                    <Text style={s.shopInfo}>
                        Items purchased: {shopStore.purchasedItems.length} • Total spent: 🪙 {shopStore.totalSpent.toLocaleString()}
                    </Text>
                </NeoSection>

                {/* ========== ACHIEVEMENTS ========== */}
                <NeoSection title="🏆 ACHIEVEMENTS" color={NEO.colors.orange} delay={200}>
                    <Text style={s.achievementSummary}>{unlockedCount} / {totalAchievements} unlocked</Text>

                    {/* Category breakdown */}
                    <View style={s.achieveCatGrid}>
                        {Object.entries(achievementCategories).map(([cat, data]) => (
                            <View key={cat} style={s.achieveCatPill}>
                                <Text style={s.achieveCatName}>{cat.toUpperCase()}</Text>
                                <Text style={s.achieveCatCount}>{data.unlocked}/{data.total}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Recent/Unlocked achievements */}
                    <Text style={s.subHeader}>RECENT UNLOCKS</Text>
                    {pointsStore.achievements
                        .filter(a => a.unlockedAt)
                        .sort((a, b) => Number(b.unlockedAt || 0) - Number(a.unlockedAt || 0))
                        .slice(0, showAllAchievements ? 20 : 5)
                        .map(ach => {
                            const def = ALL_ACHIEVEMENTS.find(a => a.id === ach.id);
                            return (
                                <View key={ach.id} style={s.achieveRow}>
                                    <Text style={s.achieveIcon}>{def?.icon || '🏅'}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.achieveName}>{def?.name || ach.id}</Text>
                                        <Text style={s.achieveDesc}>{def?.description}</Text>
                                    </View>
                                    <Text style={s.achieveBonus}>+{def?.bonusPoints || 0}</Text>
                                </View>
                            );
                        })}
                    {unlockedCount > 5 && (
                        <Pressable onPress={() => setShowAllAchievements(!showAllAchievements)} style={s.showMoreBtn}>
                            <Text style={s.showMoreText}>{showAllAchievements ? 'SHOW LESS' : `SHOW ALL (${unlockedCount})`}</Text>
                        </Pressable>
                    )}
                </NeoSection>

                {/* ========== PROGRESS STATS ========== */}
                <NeoSection title="📊 PROGRESS" color={NEO.colors.blue} delay={250}>
                    <View style={s.statGrid}>
                        {[
                            { label: 'Total XP', value: pointsStore.totalPointsEarned.toLocaleString() },
                            { label: 'Focus Time', value: formatMinutes(pointsStore.totalFocusMinutes) },
                            { label: 'Sessions', value: String(pointsStore.totalSessionsCompleted) },
                            { label: 'Tasks Done', value: String(pointsStore.totalTasksCompleted) },
                            { label: 'Current Streak', value: `${pointsStore.currentStreak} 🔥` },
                            { label: 'Best Streak', value: `${pointsStore.longestStreak} 🔥` },
                        ].map(stat => (
                            <View key={stat.label} style={s.statItem}>
                                <Text style={s.statValue}>{stat.value}</Text>
                                <Text style={s.statLabel}>{stat.label}</Text>
                            </View>
                        ))}
                    </View>
                </NeoSection>

                {/* ========== DAILY GOALS ========== */}
                <NeoSection title="🎯 DAILY GOALS" color={NEO.colors.green} delay={300}>
                    <View style={s.fieldGroup}>
                        <Text style={s.fieldLabel}>POINTS GOAL</Text>
                        <TextInput style={s.fieldInput} value={tempPointsGoal} onChangeText={setTempPointsGoal} keyboardType="numeric" placeholder="500" />
                    </View>
                    <View style={s.fieldGroup}>
                        <Text style={s.fieldLabel}>TASKS GOAL</Text>
                        <TextInput style={s.fieldInput} value={tempTasksGoal} onChangeText={setTempTasksGoal} keyboardType="numeric" placeholder="5" />
                    </View>
                    <View style={s.fieldGroup}>
                        <Text style={s.fieldLabel}>FOCUS GOAL (MINUTES)</Text>
                        <TextInput style={s.fieldInput} value={tempFocusGoal} onChangeText={setTempFocusGoal} keyboardType="numeric" placeholder="60" />
                    </View>
                </NeoSection>

                {/* ========== PROFILE SETTINGS ========== */}
                <NeoSection title="👤 PROFILE" color={NEO.colors.purple} delay={350}>
                    <View style={s.fieldGroup}>
                        <Text style={s.fieldLabel}>DISPLAY NAME</Text>
                        <TextInput style={s.fieldInput} value={tempName} onChangeText={setTempName} placeholder="YOUR NAME" placeholderTextColor="#999" />
                    </View>
                </NeoSection>

                {/* ========== ALARM & FOCUS SETTINGS ========== */}
                <NeoSection title="⚙️ APP SETTINGS" color={NEO.colors.cyan} delay={400}>
                    <Text style={s.subHeader}>DISMISS PHRASES</Text>
                    <View style={s.fieldGroup}>
                        <Text style={s.fieldLabel}>ALARM PHRASE</Text>
                        <TextInput style={s.fieldInput} value={tempAlarmPhrase} onChangeText={setTempAlarmPhrase} autoCapitalize="characters" placeholder="I AM AWAKE" />
                    </View>
                    <View style={s.fieldGroup}>
                        <Text style={s.fieldLabel}>FOCUS STOP PHRASE</Text>
                        <TextInput style={s.fieldInput} value={tempFocusPhrase} onChangeText={setTempFocusPhrase} autoCapitalize="characters" placeholder="I GIVE UP" />
                    </View>

                    <Text style={[s.subHeader, { marginTop: 16 }]}>ALARM</Text>
                    <View style={s.fieldGroup}>
                        <Text style={s.fieldLabel}>MAX SNOOZES</Text>
                        <TextInput style={s.fieldInput} value={tempSnoozeLimit} onChangeText={setTempSnoozeLimit} keyboardType="numeric" placeholder="3" />
                    </View>
                    {toggleRow('🔔 ALARM SOUND', settingsStore.alarmSoundEnabled, settingsStore.setAlarmSoundEnabled)}
                    {toggleRow('📳 ALARM VIBRATION', settingsStore.alarmVibrationEnabled, settingsStore.setAlarmVibrationEnabled)}

                    <Text style={[s.subHeader, { marginTop: 16 }]}>FOCUS SESSION</Text>
                    <View style={s.fieldGroup}>
                        <Text style={s.fieldLabel}>FOCUS DURATION (MIN)</Text>
                        <TextInput style={s.fieldInput} value={tempFocusDuration} onChangeText={setTempFocusDuration} keyboardType="numeric" placeholder="25" />
                    </View>
                    <View style={s.fieldGroup}>
                        <Text style={s.fieldLabel}>BREAK DURATION (MIN)</Text>
                        <TextInput style={s.fieldInput} value={tempBreakDuration} onChangeText={setTempBreakDuration} keyboardType="numeric" placeholder="5" />
                    </View>
                    {toggleRow('🔒 STRICT MODE', settingsStore.focusStrictMode, settingsStore.setFocusStrictMode)}
                    {toggleRow('🔊 FOCUS SOUNDS', settingsStore.focusSoundEnabled, settingsStore.setFocusSoundEnabled)}

                    <Text style={[s.subHeader, { marginTop: 16 }]}>NOTIFICATIONS</Text>
                    {toggleRow('📅 DAILY REMINDER', settingsStore.dailyReminderEnabled, settingsStore.setDailyReminderEnabled)}
                    {toggleRow('🔥 STREAK REMINDER', settingsStore.streakReminderEnabled, settingsStore.setStreakReminderEnabled)}
                </NeoSection>

                {/* ========== SAVE BUTTON ========== */}
                <Animated.View entering={FadeInDown.delay(450).springify()}>
                    <Pressable style={s.saveBtn} onPress={saveSettings}>
                        <Text style={s.saveBtnText}>💾 SAVE ALL SETTINGS</Text>
                    </Pressable>
                </Animated.View>

                {/* ========== DATA & ACCOUNT ========== */}
                <NeoSection title="🗂️ DATA & ACCOUNT" color={NEO.colors.red} delay={500}>
                    <Pressable style={s.dangerBtn} onPress={handleResetData}>
                        <Text style={s.dangerBtnText}>🗑️ RESET ALL DATA</Text>
                    </Pressable>
                    {user && (
                        <Pressable
                            style={[s.dangerBtn, { backgroundColor: '#FF0000', marginTop: 10 }]}
                            onPress={() => { logout(); router.back(); }}
                        >
                            <Text style={[s.dangerBtnText, { color: '#FFF' }]}>🚪 LOGOUT</Text>
                        </Pressable>
                    )}
                </NeoSection>

                {/* Footer */}
                <Animated.View entering={FadeInDown.delay(550).springify()} style={s.footer}>
                    <Text style={s.footerTitle}>FOCUSGUARD</Text>
                    <Text style={s.footerSub}>VERSION 1.0.0 • BUILT WITH ❤️</Text>
                </Animated.View>

            </ScrollView>
        </View>
    );
}

// ============================================
// STYLES
// ============================================
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: NEO.colors.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12,
        borderBottomWidth: NEO.border, borderBottomColor: '#000', backgroundColor: NEO.colors.bg,
    },
    backBtn: {
        width: 40, height: 40, borderWidth: NEO.border, borderColor: '#000',
        justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF',
        shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
    },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#000', letterSpacing: 3 },
    scrollContent: { padding: 16, paddingBottom: 40 },

    // Profile Card
    profileCard: {
        borderWidth: NEO.border, borderColor: '#000', padding: 16, marginBottom: 16, backgroundColor: '#FFF',
        shadowColor: '#000', shadowOffset: { width: NEO.shadow, height: NEO.shadow }, shadowOpacity: 1, shadowRadius: 0,
    },
    profileRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatarBox: {
        width: 60, height: 60, borderWidth: 3, justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#F5F5F5', marginRight: 14, overflow: 'hidden',
    },
    avatarText: { fontSize: 28 },
    profileInfo: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: '900', color: '#000', letterSpacing: 1, marginBottom: 4 },
    profileEmail: { fontSize: 11, fontWeight: '600', color: '#888', marginTop: 4 },
    quickStats: { flexDirection: 'row', borderTopWidth: 2, borderColor: '#E0E0E0', paddingTop: 12 },
    quickStat: { flex: 1, alignItems: 'center' },
    quickStatValue: { fontSize: 16, fontWeight: '900', color: '#000', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
    quickStatLabel: { fontSize: 9, fontWeight: '700', color: '#999', letterSpacing: 1, marginTop: 2 },
    quickStatDivider: { width: 2, height: '100%' },

    // Section
    section: {
        borderWidth: NEO.border, padding: 14, marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
    },
    sectionTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
    subHeader: { fontSize: 11, fontWeight: '900', color: '#666', letterSpacing: 1.5, marginBottom: 8, marginTop: 12 },

    // XP
    xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    xpLabel: { fontSize: 14, fontWeight: '900', color: '#000' },
    xpValue: { fontSize: 16, fontWeight: '900', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
    progressBg: { height: 10, backgroundColor: '#E0E0E0', borderWidth: 2, borderColor: '#000', marginBottom: 6, overflow: 'hidden' },
    progressFill: { height: '100%' },
    nextRankText: { fontSize: 11, fontWeight: '700', color: '#666', textAlign: 'center' },

    // Ranks Grid
    ranksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    rankPill: {
        flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#ddd',
        paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#F5F5F5', gap: 4,
    },
    rankEmoji: { fontSize: 14 },
    rankPillText: { fontSize: 10, fontWeight: '700', color: '#999' },
    rankCheck: { fontSize: 10, fontWeight: '900', color: '#39FF14' },

    // Shop
    shopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    shopBalance: { fontSize: 20, fontWeight: '900', color: '#000', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
    shopSub: { fontSize: 10, fontWeight: '700', color: '#888', letterSpacing: 1 },
    shopInfo: { fontSize: 11, fontWeight: '600', color: '#888', marginTop: 10 },
    neoBtn: {
        paddingHorizontal: 16, paddingVertical: 10, borderWidth: NEO.border, borderColor: '#000',
        shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
    },
    neoBtnText: { fontSize: 13, fontWeight: '900', color: '#000', letterSpacing: 1 },

    // Achievements
    achievementSummary: { fontSize: 14, fontWeight: '900', color: '#000', marginBottom: 8 },
    achieveCatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    achieveCatPill: {
        flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#000',
        paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#FFF', gap: 6,
    },
    achieveCatName: { fontSize: 9, fontWeight: '900', color: '#666', letterSpacing: 0.5 },
    achieveCatCount: { fontSize: 11, fontWeight: '900', color: '#000' },
    achieveRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    achieveIcon: { fontSize: 20 },
    achieveName: { fontSize: 13, fontWeight: '900', color: '#000' },
    achieveDesc: { fontSize: 10, fontWeight: '600', color: '#888' },
    achieveBonus: { fontSize: 11, fontWeight: '900', color: '#39FF14' },
    showMoreBtn: { alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderColor: '#E0E0E0', marginTop: 4 },
    showMoreText: { fontSize: 11, fontWeight: '900', color: '#000', letterSpacing: 1 },

    // Stats
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    statItem: {
        width: (width - 76) / 3, alignItems: 'center', borderWidth: 2, borderColor: '#000',
        paddingVertical: 10, backgroundColor: '#FFF',
    },
    statValue: { fontSize: 14, fontWeight: '900', color: '#000', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
    statLabel: { fontSize: 8, fontWeight: '900', color: '#888', letterSpacing: 1, marginTop: 2 },

    // Fields
    fieldGroup: { marginBottom: 12 },
    fieldLabel: { fontSize: 10, fontWeight: '900', color: '#000', letterSpacing: 0.5, marginBottom: 6 },
    fieldInput: {
        borderWidth: 2, borderColor: '#000', padding: 10, fontSize: 14, fontWeight: '700',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
        backgroundColor: '#FFF',
    },

    // Toggles
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    toggleLabel: { fontSize: 12, fontWeight: '700', color: '#000' },

    // Save
    saveBtn: {
        backgroundColor: '#000', padding: 16, alignItems: 'center',
        borderWidth: NEO.border, borderColor: '#000', marginBottom: 16,
        shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
    },
    saveBtnText: { color: NEO.colors.bg, fontSize: 16, fontWeight: '900', letterSpacing: 2 },

    // Danger
    dangerBtn: {
        backgroundColor: '#FFE0E0', padding: 14, alignItems: 'center',
        borderWidth: NEO.border, borderColor: '#000',
    },
    dangerBtnText: { fontSize: 13, fontWeight: '900', letterSpacing: 1, color: '#CC0000' },

    // Footer
    footer: { alignItems: 'center', paddingVertical: 24 },
    footerTitle: { fontSize: 18, fontWeight: '900', color: '#000' },
    footerSub: { fontSize: 10, fontWeight: '600', color: '#bbb', marginTop: 4, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) },
});
