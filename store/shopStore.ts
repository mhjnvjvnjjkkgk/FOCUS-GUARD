/**
 * Shop Store — Purchase, equip, and manage shop items
 * Currency: Points (from pointsStore)
 * Spending does NOT reduce XP/Level — only spendableBalance
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/configs/firebaseConfig';
import { usePointsStore } from './pointsStore';
import { SHOP_ITEMS, ShopItem } from '@/data/shopItems';
import { getRankForXP } from '@/data/ranks';

export interface ActivePowerUp {
    id: string;
    activatedAt: number;  // timestamp
    expiresAt: number;    // timestamp
}

interface ShopState {
    // Purchased items
    purchasedItems: string[];

    // Equipped items (only one per category)
    equippedTheme: string;     // 'default' or item ID
    equippedAvatar: string;    // '' or item ID
    equippedTitle: string;     // '' or item ID (overrides rank title)

    // Power-ups
    activePowerUps: ActivePowerUp[];

    // Spending tracker
    totalSpent: number;

    // Actions
    purchaseItem: (itemId: string) => { success: boolean; message: string };
    equipItem: (itemId: string) => void;
    unequipItem: (category: 'theme' | 'avatar' | 'title') => void;
    activatePowerUp: (itemId: string) => void;

    // Getters
    getSpendableBalance: () => number;
    isPurchased: (itemId: string) => boolean;
    isEquipped: (itemId: string) => boolean;
    getActivePowerUps: () => ActivePowerUp[];
    hasActivePowerUp: (itemId: string) => boolean;
    getPointsMultiplier: () => number;
    canAfford: (price: number) => boolean;
    meetsLevelRequirement: (unlockLevel: number) => boolean;

    // Sync
    syncWithFirestore: () => void;
    stopSync: () => void;
    saveToFirestore: () => Promise<void>;
}

let unsubscribeFirestore: (() => void) | null = null;

export const useShopStore = create<ShopState>()(
    persist(
        (set, get) => ({
            purchasedItems: [],
            equippedTheme: 'default',
            equippedAvatar: '',
            equippedTitle: '',
            activePowerUps: [],
            totalSpent: 0,

            purchaseItem: (itemId: string) => {
                const state = get();
                const item = SHOP_ITEMS.find(i => i.id === itemId);

                if (!item) return { success: false, message: 'Item not found' };
                if (state.isPurchased(itemId) && item.category !== 'powerups') {
                    return { success: false, message: 'Already purchased' };
                }

                // Check level requirement
                if (!state.meetsLevelRequirement(item.unlockLevel)) {
                    return { success: false, message: `Requires Level ${item.unlockLevel}` };
                }

                // Check balance
                if (!state.canAfford(item.price)) {
                    return { success: false, message: 'Not enough points' };
                }

                // Purchase!
                if (item.category === 'powerups') {
                    // Power-ups can be purchased multiple times
                    set(s => ({
                        totalSpent: s.totalSpent + item.price,
                    }));
                    // Activate immediately
                    state.activatePowerUp(itemId);
                } else {
                    set(s => ({
                        purchasedItems: [...s.purchasedItems, itemId],
                        totalSpent: s.totalSpent + item.price,
                    }));
                }

                // Save to cloud
                get().saveToFirestore();

                return { success: true, message: `Purchased ${item.name}!` };
            },

            equipItem: (itemId: string) => {
                const item = SHOP_ITEMS.find(i => i.id === itemId);
                if (!item) return;

                switch (item.category) {
                    case 'themes':
                        set({ equippedTheme: itemId });
                        break;
                    case 'avatars':
                        set({ equippedAvatar: itemId });
                        break;
                    case 'titles':
                        set({ equippedTitle: itemId });
                        break;
                }

                get().saveToFirestore();
            },

            unequipItem: (category) => {
                switch (category) {
                    case 'theme':
                        set({ equippedTheme: 'default' });
                        break;
                    case 'avatar':
                        set({ equippedAvatar: '' });
                        break;
                    case 'title':
                        set({ equippedTitle: '' });
                        break;
                }

                get().saveToFirestore();
            },

            activatePowerUp: (itemId: string) => {
                const now = Date.now();
                const duration = 24 * 60 * 60 * 1000; // 24 hours

                set(s => ({
                    activePowerUps: [
                        ...s.activePowerUps.filter(p => p.expiresAt > now), // Clean expired
                        {
                            id: itemId,
                            activatedAt: now,
                            expiresAt: now + duration,
                        },
                    ],
                }));
            },

            // === GETTERS ===

            getSpendableBalance: () => {
                const points = usePointsStore.getState();
                const shop = get();
                return points.totalPointsEarned - points.totalPointsDeducted - shop.totalSpent;
            },

            isPurchased: (itemId: string) => {
                return get().purchasedItems.includes(itemId);
            },

            isEquipped: (itemId: string) => {
                const state = get();
                return state.equippedTheme === itemId ||
                    state.equippedAvatar === itemId ||
                    state.equippedTitle === itemId;
            },

            getActivePowerUps: () => {
                const now = Date.now();
                return get().activePowerUps.filter(p => p.expiresAt > now);
            },

            hasActivePowerUp: (itemId: string) => {
                const now = Date.now();
                return get().activePowerUps.some(p => p.id === itemId && p.expiresAt > now);
            },

            getPointsMultiplier: () => {
                const active = get().getActivePowerUps();
                let multiplier = 1;

                if (active.some(p => p.id === 'powerup_double_xp')) {
                    multiplier *= 2;
                }
                if (active.some(p => p.id === 'powerup_point_magnet')) {
                    multiplier *= 1.5;
                }

                return multiplier;
            },

            canAfford: (price: number) => {
                return get().getSpendableBalance() >= price;
            },

            meetsLevelRequirement: (unlockLevel: number) => {
                const points = usePointsStore.getState();
                const rank = getRankForXP(points.totalPointsEarned);
                return rank.level >= unlockLevel;
            },

            // === FIRESTORE SYNC ===
            saveToFirestore: async () => {
                const user = auth.currentUser;
                if (!user) return;

                const state = get();
                try {
                    await setDoc(doc(db, 'users', user.uid, 'shop', 'data'), {
                        purchasedItems: state.purchasedItems,
                        equippedTheme: state.equippedTheme,
                        equippedAvatar: state.equippedAvatar,
                        equippedTitle: state.equippedTitle,
                        activePowerUps: state.activePowerUps,
                        totalSpent: state.totalSpent,
                    }, { merge: true });
                } catch (e) {
                    console.error('Shop Firestore Sync Error:', e);
                }
            },

            syncWithFirestore: () => {
                const user = auth.currentUser;
                if (!user) return;

                if (unsubscribeFirestore) unsubscribeFirestore();

                unsubscribeFirestore = onSnapshot(
                    doc(db, 'users', user.uid, 'shop', 'data'),
                    (snapshot) => {
                        if (snapshot.exists()) {
                            const data = snapshot.data();
                            set({
                                purchasedItems: data.purchasedItems || [],
                                equippedTheme: data.equippedTheme || 'default',
                                equippedAvatar: data.equippedAvatar || '',
                                equippedTitle: data.equippedTitle || '',
                                activePowerUps: data.activePowerUps || [],
                                totalSpent: data.totalSpent || 0,
                            });
                        }
                    }
                );
            },

            stopSync: () => {
                if (unsubscribeFirestore) {
                    unsubscribeFirestore();
                    unsubscribeFirestore = null;
                }
            },
        }),
        {
            name: 'focusguard-shop',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                purchasedItems: state.purchasedItems,
                equippedTheme: state.equippedTheme,
                equippedAvatar: state.equippedAvatar,
                equippedTitle: state.equippedTitle,
                activePowerUps: state.activePowerUps,
                totalSpent: state.totalSpent,
            }),
        }
    )
);

export default useShopStore;
