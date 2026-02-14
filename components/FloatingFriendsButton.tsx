/**
 * FloatingFriendsButton — Small FAB on every tab showing online friends
 * Tap → slides up a mini bottom sheet with friend statuses
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform, FlatList } from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withSpring, withTiming,
    FadeIn, FadeOut, SlideInDown, SlideOutDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFriendsStore, PresenceStatus } from '@/store/friendsStore';

const { width: SW, height: SH } = Dimensions.get('window');
const BOTTOM_OFFSET = Platform.OS === 'ios' ? 100 : 80; // above tab bar

const NEO = {
    border: 3,
    colors: { black: '#000', white: '#FFF', blue: '#4A9EFF', green: '#4CAF50' },
};

function StatusDot({ status }: { status: PresenceStatus }) {
    const colors: Record<PresenceStatus, string> = {
        focusing: '#4CAF50', in_battle: '#FF9800', idle: '#999', offline: '#555',
    };
    return <View style={[styles.dot, { backgroundColor: colors[status] }]} />;
}

export default function FloatingFriendsButton() {
    const { friends, friendProfiles, loadFriends } = useFriendsStore();
    const [isOpen, setIsOpen] = useState(false);

    const acceptedFriends = friends.filter(f => f.status === 'accepted');
    const onlineFriends = acceptedFriends.filter(f => {
        const profile = friendProfiles[f.uid];
        return profile && (profile.presence === 'focusing' || profile.presence === 'in_battle' || profile.presence === 'idle');
    });

    const onlineCount = onlineFriends.length;

    const toggle = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (!isOpen) loadFriends();
        setIsOpen(!isOpen);
    };

    const formatTimeAgo = (ts: number) => {
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    const getStatusLabel = (status: PresenceStatus) => {
        const labels: Record<PresenceStatus, string> = {
            focusing: '🟢 Focusing', in_battle: '⚔️ In Battle', idle: '⚪ Idle', offline: '🔴 Offline',
        };
        return labels[status];
    };

    if (acceptedFriends.length === 0) return null; // Don't show if no friends

    return (
        <>
            {/* Mini Bottom Sheet */}
            {isOpen && (
                <Animated.View
                    entering={SlideInDown.springify().damping(18)}
                    exiting={SlideOutDown.duration(200)}
                    style={styles.sheet}
                >
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>👥 FRIENDS ({onlineCount} online)</Text>
                        <Pressable onPress={toggle}>
                            <Ionicons name="chevron-down" size={20} color="#000" />
                        </Pressable>
                    </View>

                    {acceptedFriends.length === 0 ? (
                        <Text style={styles.emptyText}>No friends yet</Text>
                    ) : (
                        <FlatList
                            data={acceptedFriends.slice(0, 8)}
                            keyExtractor={(item) => item.uid}
                            style={styles.friendsList}
                            renderItem={({ item }) => {
                                const profile = friendProfiles[item.uid];
                                const presence = profile?.presence || 'offline';
                                return (
                                    <View style={styles.friendRow}>
                                        <StatusDot status={presence} />
                                        <Text style={styles.friendName} numberOfLines={1}>
                                            {item.displayName}
                                        </Text>
                                        {profile?.totalFocusMinutes ? (
                                            <Text style={styles.friendMeta}>
                                                {Math.round(profile.totalFocusMinutes)}m total
                                            </Text>
                                        ) : null}
                                        <Text style={styles.friendStatus}>
                                            {formatTimeAgo(profile?.lastSeen || 0)}
                                        </Text>
                                    </View>
                                );
                            }}
                        />
                    )}
                </Animated.View>
            )}

            {/* FAB */}
            <Pressable onPress={toggle} style={[styles.fab, isOpen && styles.fabActive]}>
                <Ionicons name={isOpen ? 'close' : 'people'} size={22} color="#FFF" />
                {onlineCount > 0 && !isOpen && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{onlineCount}</Text>
                    </View>
                )}
            </Pressable>
        </>
    );
}

const styles = StyleSheet.create({
    // FAB
    fab: {
        position: 'absolute', bottom: BOTTOM_OFFSET, right: 16,
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: '#4A9EFF', justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#000',
        shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
        zIndex: 2000,
    },
    fabActive: { backgroundColor: '#555' },
    badge: {
        position: 'absolute', top: -4, right: -4,
        backgroundColor: '#FF4444', width: 20, height: 20, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#000',
    },
    badgeText: { fontSize: 10, fontWeight: '900', color: '#FFF' },

    // Sheet
    sheet: {
        position: 'absolute', bottom: BOTTOM_OFFSET + 56, right: 16,
        width: SW * 0.75, maxWidth: 300,
        backgroundColor: '#FFF', borderWidth: NEO.border, borderColor: '#000',
        shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0,
        zIndex: 1999, maxHeight: 300,
    },
    sheetHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 12, paddingVertical: 10,
        borderBottomWidth: 2, borderBottomColor: '#000',
    },
    sheetTitle: { fontSize: 11, fontWeight: '900', color: '#000', letterSpacing: 1 },

    emptyText: { padding: 16, textAlign: 'center', fontSize: 12, color: '#999' },

    friendsList: { maxHeight: 240 },
    friendRow: {
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
        borderBottomWidth: 1, borderBottomColor: '#EEE', gap: 8,
    },
    dot: { width: 8, height: 8, borderRadius: 4 },
    friendName: { flex: 1, fontSize: 12, fontWeight: '800', color: '#000' },
    friendMeta: {
        fontSize: 9, fontWeight: '700', color: '#888',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    friendStatus: { fontSize: 9, fontWeight: '700', color: '#BBB', minWidth: 40, textAlign: 'right' },
});
