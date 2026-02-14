/**
 * Friends Store — Social system state management
 * Handles friend requests, friend list, and presence tracking via Firestore
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '@/configs/firebaseConfig';
import {
    doc, setDoc, getDoc, getDocs, deleteDoc,
    collection, query, where, onSnapshot,
    serverTimestamp, Timestamp,
} from 'firebase/firestore';

// ============================================
// TYPES
// ============================================
export type FriendStatus = 'pending_sent' | 'pending_received' | 'accepted';
export type PresenceStatus = 'idle' | 'focusing' | 'in_battle' | 'offline';

export interface FriendProfile {
    uid: string;
    focusGuardId: string;
    displayName: string;
    photoURL?: string;
    rank: number;
    rankTitle: string;
    totalXP: number;
    streak: number;
    totalFocusMinutes: number;
    battlesWon: number;
    battlesLost: number;
    presence: PresenceStatus;
    lastSeen: number; // timestamp
}

export interface FriendRequest {
    id: string;
    fromUid: string;
    fromName: string;
    fromFocusGuardId: string;
    fromRank: number;
    toUid: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: number;
}

export interface FriendEntry {
    uid: string;
    focusGuardId: string;
    displayName: string;
    status: FriendStatus;
    addedAt: number;
}

// ============================================
// STATE
// ============================================
interface FriendsState {
    // Data
    friends: FriendEntry[];
    incomingRequests: FriendRequest[];
    outgoingRequests: FriendRequest[];
    friendProfiles: Record<string, FriendProfile>; // uid -> profile
    myFocusGuardId: string;

    // Loading
    isLoading: boolean;
    error: string | null;

    // Actions
    generateFocusGuardId: () => Promise<string>;
    lookupUserByFocusGuardId: (fgId: string) => Promise<FriendProfile | null>;
    sendFriendRequest: (targetFocusGuardId: string) => Promise<boolean>;
    acceptFriendRequest: (requestId: string) => Promise<boolean>;
    rejectFriendRequest: (requestId: string) => Promise<boolean>;
    removeFriend: (friendUid: string) => Promise<boolean>;
    loadFriends: () => Promise<void>;
    loadIncomingRequests: () => Promise<void>;
    updatePresence: (status: PresenceStatus) => Promise<void>;
    writeMyProfile: (data: {
        displayName: string;
        rank: number;
        rankTitle: string;
        totalXP: number;
        streak: number;
        totalFocusMinutes: number;
        battlesWon: number;
        battlesLost: number;
    }) => Promise<void>;
    subscribeToFriends: () => (() => void) | undefined;
}

// ============================================
// HELPER: Generate 6-char alphanumeric ID
// ============================================
function generateId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ============================================
// STORE
// ============================================
export const useFriendsStore = create<FriendsState>()(
    persist(
        (set, get) => ({
            friends: [],
            incomingRequests: [],
            outgoingRequests: [],
            friendProfiles: {},
            myFocusGuardId: '',
            isLoading: false,
            error: null,

            // Generate unique FocusGuard ID and save to Firestore
            generateFocusGuardId: async () => {
                const user = auth.currentUser;
                if (!user) return '';

                // Check if already has one
                const existing = get().myFocusGuardId;
                if (existing) return existing;

                // Check Firestore for existing ID
                const profileRef = doc(db, 'users', user.uid, 'profile', 'main');
                const profileSnap = await getDoc(profileRef);
                if (profileSnap.exists() && profileSnap.data().focusGuardId) {
                    const fgId = profileSnap.data().focusGuardId;
                    set({ myFocusGuardId: fgId });
                    return fgId;
                }

                // Generate new unique ID
                let newId = generateId();
                // Simple collision check (very unlikely with 6 chars)
                const idQuery = query(collection(db, 'focusguard_ids'), where('id', '==', newId));
                const idSnap = await getDocs(idQuery);
                if (!idSnap.empty) {
                    newId = generateId(); // Retry once
                }

                // Save ID mapping
                await setDoc(doc(db, 'focusguard_ids', newId), {
                    uid: user.uid,
                    createdAt: serverTimestamp(),
                });

                // Save to profile
                await setDoc(profileRef, {
                    focusGuardId: newId,
                    uid: user.uid,
                    displayName: user.displayName || 'User',
                    photoURL: user.photoURL || null,
                }, { merge: true });

                set({ myFocusGuardId: newId });
                return newId;
            },

            // Lookup a user by their FocusGuard ID
            lookupUserByFocusGuardId: async (fgId: string) => {
                try {
                    const idDoc = await getDoc(doc(db, 'focusguard_ids', fgId.toUpperCase()));
                    if (!idDoc.exists()) return null;

                    const targetUid = idDoc.data().uid;
                    const profileSnap = await getDoc(doc(db, 'users', targetUid, 'profile', 'main'));
                    const statsSnap = await getDoc(doc(db, 'users', targetUid, 'stats', 'main'));
                    const presenceSnap = await getDoc(doc(db, 'users', targetUid, 'presence', 'main'));

                    const profile = profileSnap.data() || {};
                    const stats = statsSnap.data() || {};
                    const presence = presenceSnap.data() || {};

                    return {
                        uid: targetUid,
                        focusGuardId: fgId.toUpperCase(),
                        displayName: profile.displayName || 'User',
                        photoURL: profile.photoURL,
                        rank: profile.rank || 1,
                        rankTitle: profile.rankTitle || 'Rookie',
                        totalXP: stats.totalXP || 0,
                        streak: stats.streak || 0,
                        totalFocusMinutes: stats.totalFocusMinutes || 0,
                        battlesWon: stats.battlesWon || 0,
                        battlesLost: stats.battlesLost || 0,
                        presence: presence.status || 'offline',
                        lastSeen: presence.lastSeen?.toMillis?.() || Date.now(),
                    } as FriendProfile;
                } catch (err) {
                    console.error('Lookup error:', err);
                    return null;
                }
            },

            // Send friend request
            sendFriendRequest: async (targetFocusGuardId: string) => {
                const user = auth.currentUser;
                if (!user) return false;

                try {
                    set({ isLoading: true, error: null });

                    // Look up target user
                    const idDoc = await getDoc(doc(db, 'focusguard_ids', targetFocusGuardId.toUpperCase()));
                    if (!idDoc.exists()) {
                        set({ error: 'User not found', isLoading: false });
                        return false;
                    }

                    const targetUid = idDoc.data().uid;
                    if (targetUid === user.uid) {
                        set({ error: "You can't add yourself", isLoading: false });
                        return false;
                    }

                    // Check if already friends
                    const existing = get().friends.find(f => f.uid === targetUid);
                    if (existing) {
                        set({ error: 'Already friends', isLoading: false });
                        return false;
                    }

                    // Get my profile
                    const myProfile = await getDoc(doc(db, 'users', user.uid, 'profile', 'main'));
                    const myData = myProfile.data() || {};

                    // Create friend request
                    const requestId = `${user.uid}_${targetUid}`;
                    await setDoc(doc(db, 'friend_requests', requestId), {
                        from: user.uid,
                        fromName: myData.displayName || user.displayName || 'User',
                        fromFocusGuardId: get().myFocusGuardId,
                        fromRank: myData.rank || 1,
                        to: targetUid,
                        status: 'pending',
                        createdAt: serverTimestamp(),
                    });

                    set({ isLoading: false });
                    return true;
                } catch (err) {
                    console.error('Send request error:', err);
                    set({ error: 'Failed to send request', isLoading: false });
                    return false;
                }
            },

            // Accept friend request
            acceptFriendRequest: async (requestId: string) => {
                const user = auth.currentUser;
                if (!user) return false;

                try {
                    set({ isLoading: true });

                    // Get request
                    const requestSnap = await getDoc(doc(db, 'friend_requests', requestId));
                    if (!requestSnap.exists()) return false;

                    const request = requestSnap.data();
                    const friendUid = request.from;

                    // Update request status
                    await setDoc(doc(db, 'friend_requests', requestId), { status: 'accepted' }, { merge: true });

                    // Add to both users' friend lists
                    await setDoc(doc(db, 'users', user.uid, 'friends', friendUid), {
                        addedAt: serverTimestamp(),
                        status: 'accepted',
                    });
                    await setDoc(doc(db, 'users', friendUid, 'friends', user.uid), {
                        addedAt: serverTimestamp(),
                        status: 'accepted',
                    });

                    // Update local state
                    const friendProfile = await get().lookupUserByFocusGuardId(request.fromFocusGuardId);
                    if (friendProfile) {
                        set(state => ({
                            friends: [...state.friends, {
                                uid: friendUid,
                                focusGuardId: request.fromFocusGuardId,
                                displayName: request.fromName,
                                status: 'accepted' as FriendStatus,
                                addedAt: Date.now(),
                            }],
                            incomingRequests: state.incomingRequests.filter(r => r.id !== requestId),
                            friendProfiles: { ...state.friendProfiles, [friendUid]: friendProfile },
                            isLoading: false,
                        }));
                    }

                    return true;
                } catch (err) {
                    console.error('Accept request error:', err);
                    set({ isLoading: false });
                    return false;
                }
            },

            // Reject friend request
            rejectFriendRequest: async (requestId: string) => {
                try {
                    await setDoc(doc(db, 'friend_requests', requestId), { status: 'rejected' }, { merge: true });
                    set(state => ({
                        incomingRequests: state.incomingRequests.filter(r => r.id !== requestId),
                    }));
                    return true;
                } catch (err) {
                    console.error('Reject request error:', err);
                    return false;
                }
            },

            // Remove a friend
            removeFriend: async (friendUid: string) => {
                const user = auth.currentUser;
                if (!user) return false;

                try {
                    // Remove from both sides
                    await deleteDoc(doc(db, 'users', user.uid, 'friends', friendUid));
                    await deleteDoc(doc(db, 'users', friendUid, 'friends', user.uid));

                    set(state => ({
                        friends: state.friends.filter(f => f.uid !== friendUid),
                        friendProfiles: (() => {
                            const { [friendUid]: _, ...rest } = state.friendProfiles;
                            return rest;
                        })(),
                    }));

                    return true;
                } catch (err) {
                    console.error('Remove friend error:', err);
                    return false;
                }
            },

            // Load friends from Firestore
            loadFriends: async () => {
                const user = auth.currentUser;
                if (!user) return;

                try {
                    set({ isLoading: true });
                    const friendsSnap = await getDocs(collection(db, 'users', user.uid, 'friends'));
                    const friends: FriendEntry[] = [];

                    for (const friendDoc of friendsSnap.docs) {
                        const data = friendDoc.data();
                        const profileSnap = await getDoc(doc(db, 'users', friendDoc.id, 'profile', 'main'));
                        const profile = profileSnap.data() || {};

                        friends.push({
                            uid: friendDoc.id,
                            focusGuardId: profile.focusGuardId || '',
                            displayName: profile.displayName || 'User',
                            status: data.status || 'accepted',
                            addedAt: data.addedAt?.toMillis?.() || Date.now(),
                        });
                    }

                    set({ friends, isLoading: false });
                } catch (err) {
                    console.error('Load friends error:', err);
                    set({ isLoading: false });
                }
            },

            // Load incoming friend requests
            loadIncomingRequests: async () => {
                const user = auth.currentUser;
                if (!user) return;

                try {
                    const q = query(
                        collection(db, 'friend_requests'),
                        where('to', '==', user.uid),
                        where('status', '==', 'pending')
                    );
                    const snap = await getDocs(q);

                    const requests: FriendRequest[] = snap.docs.map(d => ({
                        id: d.id,
                        fromUid: d.data().from,
                        fromName: d.data().fromName,
                        fromFocusGuardId: d.data().fromFocusGuardId,
                        fromRank: d.data().fromRank || 1,
                        toUid: d.data().to,
                        status: d.data().status,
                        createdAt: d.data().createdAt?.toMillis?.() || Date.now(),
                    }));

                    set({ incomingRequests: requests });
                } catch (err) {
                    console.error('Load requests error:', err);
                }
            },

            // Update my presence status
            updatePresence: async (status: PresenceStatus) => {
                const user = auth.currentUser;
                if (!user) return;

                try {
                    await setDoc(doc(db, 'users', user.uid, 'presence', 'main'), {
                        status,
                        lastSeen: serverTimestamp(),
                    }, { merge: true });
                } catch (err) {
                    console.error('Update presence error:', err);
                }
            },

            // Write my profile data to Firestore (called on points change)
            writeMyProfile: async (data) => {
                const user = auth.currentUser;
                if (!user) return;

                try {
                    const fgId = get().myFocusGuardId;

                    await setDoc(doc(db, 'users', user.uid, 'profile', 'main'), {
                        uid: user.uid,
                        focusGuardId: fgId,
                        displayName: data.displayName,
                        photoURL: user.photoURL || null,
                        rank: data.rank,
                        rankTitle: data.rankTitle,
                    }, { merge: true });

                    await setDoc(doc(db, 'users', user.uid, 'stats', 'main'), {
                        totalXP: data.totalXP,
                        streak: data.streak,
                        totalFocusMinutes: data.totalFocusMinutes,
                        battlesWon: data.battlesWon,
                        battlesLost: data.battlesLost,
                    }, { merge: true });
                } catch (err) {
                    console.error('Write profile error:', err);
                }
            },

            // Subscribe to real-time friend updates (returns unsubscribe)
            subscribeToFriends: () => {
                const user = auth.currentUser;
                if (!user) return undefined;

                const unsub = onSnapshot(
                    collection(db, 'users', user.uid, 'friends'),
                    (snap) => {
                        // Refresh friends when changes detected
                        get().loadFriends();
                    }
                );

                return unsub;
            },
        }),
        {
            name: 'focusguard-friends',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                friends: state.friends,
                myFocusGuardId: state.myFocusGuardId,
            }),
        }
    )
);

export default useFriendsStore;
