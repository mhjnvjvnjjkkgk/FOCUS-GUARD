/**
 * Social Tab — Friends list, add friends, manage requests
 * Full UI with FocusGuard ID sharing, friend search, and status indicators
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, Pressable, ScrollView, TextInput,
    Modal, Alert, RefreshControl, Dimensions, Platform,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';

import { useFriendsStore, FriendEntry, FriendProfile, PresenceStatus } from '@/store/friendsStore';
import { useAuthStore } from '@/store/authStore';
import { usePointsStore } from '@/store/pointsStore';
import RankBadge from '@/components/RankBadge';
import { RANKS } from '@/data/ranks';

const { width } = Dimensions.get('window');

const NEO = {
    border: 3,
    shadow: 5,
    colors: {
        black: '#000', white: '#FFF', bg: '#FFFDF0',
        blue: '#4A9EFF', green: '#4CAF50', orange: '#FF9800',
        red: '#FF4444', purple: '#B366FF', cyan: '#00BCD4',
    },
};

// Status indicator component
function StatusDot({ status }: { status: PresenceStatus }) {
    const colors: Record<PresenceStatus, string> = {
        focusing: NEO.colors.green,
        in_battle: NEO.colors.orange,
        idle: '#999',
        offline: '#555',
    };
    const labels: Record<PresenceStatus, string> = {
        focusing: 'FOCUSING',
        in_battle: 'IN BATTLE',
        idle: 'IDLE',
        offline: 'OFFLINE',
    };
    return (
        <View style={styles.statusDotRow}>
            <View style={[styles.statusDot, { backgroundColor: colors[status] }]} />
            <Text style={[styles.statusLabel, { color: colors[status] }]}>{labels[status]}</Text>
        </View>
    );
}

export default function SocialScreen() {
    const {
        friends, incomingRequests, myFocusGuardId, friendProfiles,
        isLoading, error,
        generateFocusGuardId, sendFriendRequest, acceptFriendRequest,
        rejectFriendRequest, removeFriend, loadFriends, loadIncomingRequests,
        subscribeToFriends,
    } = useFriendsStore();
    const { user } = useAuthStore();
    const pointsStore = usePointsStore();

    const [showAddModal, setShowAddModal] = useState(false);
    const [addFriendId, setAddFriendId] = useState('');
    const [sending, setSending] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [copiedId, setCopiedId] = useState(false);

    // Initialize
    useEffect(() => {
        if (user) {
            generateFocusGuardId();
            loadFriends();
            loadIncomingRequests();
            const unsub = subscribeToFriends();
            return () => unsub?.();
        }
    }, [user]);

    // Pull to refresh
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadFriends();
        await loadIncomingRequests();
        setRefreshing(false);
    }, []);

    // Copy FocusGuard ID
    const copyMyId = async () => {
        if (myFocusGuardId) {
            await Clipboard.setStringAsync(myFocusGuardId);
            setCopiedId(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => setCopiedId(false), 2000);
        }
    };

    // Send friend request
    const handleSendRequest = async () => {
        if (!addFriendId.trim() || addFriendId.trim().length < 6) {
            Alert.alert('Error', 'Enter a valid 6-character FocusGuard ID');
            return;
        }
        setSending(true);
        const success = await sendFriendRequest(addFriendId.trim());
        setSending(false);
        if (success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('✅ Sent!', 'Friend request sent successfully');
            setAddFriendId('');
            setShowAddModal(false);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('❌ Error', error || 'Failed to send request');
        }
    };

    // Accept request
    const handleAccept = async (requestId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await acceptFriendRequest(requestId);
    };

    // Reject request
    const handleReject = async (requestId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await rejectFriendRequest(requestId);
    };

    // Remove friend
    const handleRemove = (friendUid: string, name: string) => {
        Alert.alert('Remove Friend', `Remove ${name} from your friends?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive',
                onPress: async () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    await removeFriend(friendUid);
                }
            },
        ]);
    };

    const getRankBadge = (level: number) => {
        const rank = RANKS.find(r => r.level === level) || RANKS[0];
        return rank.badge;
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
                <Text style={styles.headerTitle}>👥 SOCIAL</Text>
                <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowAddModal(true); }}
                    style={[styles.addBtn, { backgroundColor: NEO.colors.blue }]}
                >
                    <Ionicons name="person-add" size={20} color="#FFF" />
                </Pressable>
            </Animated.View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#000" />}
            >
                {/* My FocusGuard ID Card */}
                <Animated.View entering={FadeInDown.delay(50).springify()} style={styles.idCard}>
                    <Text style={styles.idCardLabel}>YOUR FOCUSGUARD ID</Text>
                    <Pressable onPress={copyMyId} style={styles.idRow}>
                        <Text style={styles.idText}>{myFocusGuardId || '------'}</Text>
                        <View style={[styles.copyBtn, copiedId && { backgroundColor: NEO.colors.green }]}>
                            <Text style={styles.copyBtnText}>{copiedId ? '✓ COPIED' : 'COPY'}</Text>
                        </View>
                    </Pressable>
                    <Text style={styles.idHint}>Share this code so friends can add you</Text>
                </Animated.View>

                {/* Incoming Friend Requests */}
                {incomingRequests.length > 0 && (
                    <Animated.View entering={FadeInDown.delay(100).springify()}>
                        <Text style={styles.sectionTitle}>📥 FRIEND REQUESTS ({incomingRequests.length})</Text>
                        {incomingRequests.map((req) => (
                            <View key={req.id} style={styles.requestCard}>
                                <View style={styles.requestInfo}>
                                    <Text style={styles.requestName}>{req.fromName}</Text>
                                    <Text style={styles.requestId}>{getRankBadge(req.fromRank)} ID: {req.fromFocusGuardId}</Text>
                                </View>
                                <View style={styles.requestActions}>
                                    <Pressable
                                        onPress={() => handleAccept(req.id)}
                                        style={[styles.actionBtn, { backgroundColor: NEO.colors.green }]}
                                    >
                                        <Ionicons name="checkmark" size={20} color="#FFF" />
                                    </Pressable>
                                    <Pressable
                                        onPress={() => handleReject(req.id)}
                                        style={[styles.actionBtn, { backgroundColor: NEO.colors.red }]}
                                    >
                                        <Ionicons name="close" size={20} color="#FFF" />
                                    </Pressable>
                                </View>
                            </View>
                        ))}
                    </Animated.View>
                )}

                {/* Friends List */}
                <Text style={styles.sectionTitle}>
                    👥 FRIENDS ({friends.filter(f => f.status === 'accepted').length})
                </Text>

                {friends.filter(f => f.status === 'accepted').length === 0 ? (
                    <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.emptyCard}>
                        <Text style={styles.emptyEmoji}>🫂</Text>
                        <Text style={styles.emptyTitle}>NO FRIENDS YET</Text>
                        <Text style={styles.emptySubtitle}>Share your FocusGuard ID or tap + to add friends</Text>
                    </Animated.View>
                ) : (
                    friends.filter(f => f.status === 'accepted').map((friend, idx) => {
                        const profile = friendProfiles[friend.uid];
                        return (
                            <Animated.View key={friend.uid} entering={FadeInDown.delay(150 + idx * 50).springify()}>
                                <Pressable
                                    onLongPress={() => handleRemove(friend.uid, friend.displayName)}
                                    style={styles.friendCard}
                                >
                                    <View style={styles.friendAvatar}>
                                        <Text style={styles.friendAvatarText}>
                                            {getRankBadge(profile?.rank || 1)}
                                        </Text>
                                    </View>
                                    <View style={styles.friendInfo}>
                                        <Text style={styles.friendName}>{friend.displayName}</Text>
                                        <StatusDot status={profile?.presence || 'offline'} />
                                    </View>
                                    <View style={styles.friendStats}>
                                        <Text style={styles.friendXP}>
                                            {(profile?.totalXP || 0).toLocaleString()} XP
                                        </Text>
                                        {profile?.streak ? (
                                            <Text style={styles.friendStreak}>🔥 {profile.streak}d</Text>
                                        ) : null}
                                    </View>
                                    <Pressable
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            // Future: navigate to battle with friend
                                            Alert.alert('⚔️ Coming Soon', 'Battles will be available soon!');
                                        }}
                                        style={styles.challengeBtn}
                                    >
                                        <Text style={styles.challengeBtnText}>⚔️</Text>
                                    </Pressable>
                                </Pressable>
                            </Animated.View>
                        );
                    })
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Add Friend Modal */}
            <Modal visible={showAddModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <Animated.View entering={FadeIn.duration(200)} style={styles.modalCard}>
                        <Text style={styles.modalTitle}>ADD FRIEND</Text>
                        <Text style={styles.modalSubtitle}>Enter their 6-character FocusGuard ID</Text>

                        <TextInput
                            style={styles.modalInput}
                            value={addFriendId}
                            onChangeText={(t) => setAddFriendId(t.toUpperCase().slice(0, 6))}
                            placeholder="ABC123"
                            placeholderTextColor="#ccc"
                            maxLength={6}
                            autoCapitalize="characters"
                            autoCorrect={false}
                        />

                        <View style={styles.modalBtns}>
                            <Pressable
                                onPress={() => { setShowAddModal(false); setAddFriendId(''); }}
                                style={styles.modalCancelBtn}
                            >
                                <Text style={styles.modalCancelText}>CANCEL</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleSendRequest}
                                style={[styles.modalSendBtn, sending && { opacity: 0.5 }]}
                                disabled={sending}
                            >
                                <Text style={styles.modalSendText}>
                                    {sending ? 'SENDING...' : 'SEND REQUEST'}
                                </Text>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
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
    addBtn: {
        width: 40, height: 40, borderWidth: 3, borderColor: '#000',
        justifyContent: 'center', alignItems: 'center',
    },

    scrollContent: { padding: 16, paddingBottom: 40 },

    // My ID Card
    idCard: {
        borderWidth: NEO.border, borderColor: NEO.colors.blue, padding: 16, marginBottom: 16,
        backgroundColor: NEO.colors.blue + '10',
        shadowColor: '#000', shadowOffset: { width: NEO.shadow, height: NEO.shadow }, shadowOpacity: 1, shadowRadius: 0,
    },
    idCardLabel: { fontSize: 10, fontWeight: '900', color: NEO.colors.blue, letterSpacing: 2, marginBottom: 8 },
    idRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    idText: {
        fontSize: 32, fontWeight: '900', color: '#000', letterSpacing: 6,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    copyBtn: {
        paddingHorizontal: 14, paddingVertical: 8, borderWidth: 3, borderColor: '#000',
        backgroundColor: NEO.colors.blue,
    },
    copyBtnText: { fontSize: 12, fontWeight: '900', color: '#FFF', letterSpacing: 1 },
    idHint: { fontSize: 10, fontWeight: '600', color: '#888', marginTop: 8 },

    // Section Title
    sectionTitle: { fontSize: 12, fontWeight: '900', color: '#000', letterSpacing: 2, marginBottom: 10, marginTop: 8 },

    // Request Card
    requestCard: {
        flexDirection: 'row', alignItems: 'center', borderWidth: NEO.border, borderColor: '#000',
        padding: 12, marginBottom: 8, backgroundColor: '#FFF5E0',
        shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
    },
    requestInfo: { flex: 1 },
    requestName: { fontSize: 14, fontWeight: '900', color: '#000' },
    requestId: { fontSize: 10, fontWeight: '700', color: '#888', marginTop: 2 },
    requestActions: { flexDirection: 'row', gap: 6 },
    actionBtn: {
        width: 36, height: 36, borderWidth: 3, borderColor: '#000',
        justifyContent: 'center', alignItems: 'center',
    },

    // Empty State
    emptyCard: {
        borderWidth: NEO.border, borderColor: '#ddd', padding: 32, alignItems: 'center',
        backgroundColor: '#FFF',
    },
    emptyEmoji: { fontSize: 48, marginBottom: 12 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#000', letterSpacing: 2 },
    emptySubtitle: { fontSize: 12, fontWeight: '600', color: '#888', marginTop: 6, textAlign: 'center' },

    // Friend Card
    friendCard: {
        flexDirection: 'row', alignItems: 'center', borderWidth: NEO.border, borderColor: '#000',
        padding: 12, marginBottom: 8, backgroundColor: '#FFF',
        shadowColor: '#000', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0,
    },
    friendAvatar: {
        width: 44, height: 44, borderWidth: 2, borderColor: '#000',
        justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5', marginRight: 12,
    },
    friendAvatarText: { fontSize: 22 },
    friendInfo: { flex: 1 },
    friendName: { fontSize: 14, fontWeight: '900', color: '#000', marginBottom: 2 },
    friendStats: { alignItems: 'flex-end', marginRight: 8 },
    friendXP: {
        fontSize: 12, fontWeight: '900', color: '#000',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    friendStreak: { fontSize: 10, fontWeight: '700', color: '#FF9800', marginTop: 2 },
    challengeBtn: {
        width: 40, height: 40, borderWidth: 3, borderColor: '#000',
        justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFE0E0',
    },
    challengeBtnText: { fontSize: 18 },

    // Status Dot
    statusDotRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

    // Modal
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center', alignItems: 'center', padding: 20,
    },
    modalCard: {
        width: '100%', borderWidth: NEO.border, borderColor: '#000',
        backgroundColor: NEO.colors.white, padding: 24,
        shadowColor: '#000', shadowOffset: { width: 6, height: 6 }, shadowOpacity: 1, shadowRadius: 0,
    },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#000', letterSpacing: 2, marginBottom: 6 },
    modalSubtitle: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 20 },
    modalInput: {
        borderWidth: 3, borderColor: '#000', padding: 16, fontSize: 24, fontWeight: '900',
        letterSpacing: 8, textAlign: 'center',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    modalBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
    modalCancelBtn: {
        flex: 1, padding: 14, borderWidth: 3, borderColor: '#000', alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    modalCancelText: { fontSize: 14, fontWeight: '900', color: '#000' },
    modalSendBtn: {
        flex: 1, padding: 14, borderWidth: 3, borderColor: '#000', alignItems: 'center',
        backgroundColor: NEO.colors.blue,
    },
    modalSendText: { fontSize: 14, fontWeight: '900', color: '#FFF' },
});
