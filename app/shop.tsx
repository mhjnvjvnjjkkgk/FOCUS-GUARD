/**
 * Shop Screen — Purchase themes, sounds, avatars, titles, and power-ups
 * Entry: Button on Stats tab or Settings sidebar
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Dimensions,
    Alert,
    Modal,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';

import { useShopStore } from '@/store/shopStore';
import { usePointsStore } from '@/store/pointsStore';
import { SHOP_ITEMS, SHOP_CATEGORIES, ShopCategory, ShopItem, getThemeById } from '@/data/shopItems';
import { getRankForXP } from '@/data/ranks';

const { width } = Dimensions.get('window');

// ============================================
// NEOBRUTALIST CONSTANTS
// ============================================
const NEO = {
    border: 3,
    shadowOffset: 6,
    fonts: { heavy: '900' as const, bold: '700' as const },
    colors: {
        background: '#FFFFFF',
        black: '#000000',
        green: '#39FF14',
        red: '#FF0000',
        yellow: '#FFD700',
        grey: '#C0C0C0',
    },
};

export default function ShopScreen() {
    const [activeCategory, setActiveCategory] = useState<ShopCategory>('themes');
    const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);

    const shopStore = useShopStore();
    const pointsStore = usePointsStore();

    const balance = shopStore.getSpendableBalance();
    const currentRank = getRankForXP(pointsStore.totalPointsEarned);

    const categoryItems = useMemo(() => {
        return SHOP_ITEMS.filter(item => item.category === activeCategory);
    }, [activeCategory]);

    const handlePurchase = useCallback((item: ShopItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setConfirmItem(item);
    }, []);

    const confirmPurchase = useCallback(() => {
        if (!confirmItem) return;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        const result = shopStore.purchaseItem(confirmItem.id);
        setConfirmItem(null);

        if (!result.success) {
            Alert.alert('Cannot Purchase', result.message);
        } else {
            // Auto-equip if it's a theme, avatar, or title
            if (['themes', 'avatars', 'titles'].includes(confirmItem.category)) {
                shopStore.equipItem(confirmItem.id);
            }
            Alert.alert('🎉 Purchased!', result.message);
        }
    }, [confirmItem, shopStore]);

    const handleEquip = useCallback((item: ShopItem) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (shopStore.isEquipped(item.id)) {
            // Unequip
            switch (item.category) {
                case 'themes': shopStore.unequipItem('theme'); break;
                case 'avatars': shopStore.unequipItem('avatar'); break;
                case 'titles': shopStore.unequipItem('title'); break;
            }
        } else {
            shopStore.equipItem(item.id);
        }
    }, [shopStore]);

    const renderItemCard = (item: ShopItem, index: number) => {
        const purchased = shopStore.isPurchased(item.id);
        const equipped = shopStore.isEquipped(item.id);
        const canAfford = shopStore.canAfford(item.price);
        const meetsLevel = currentRank.level >= item.unlockLevel;
        const isPowerUp = item.category === 'powerups';
        const activePowerUp = isPowerUp && shopStore.hasActivePowerUp(item.id);

        let statusColor = NEO.colors.grey;
        let statusText = `🪙 ${item.price}`;

        if (equipped) {
            statusColor = NEO.colors.green;
            statusText = '✅ EQUIPPED';
        } else if (purchased && !isPowerUp) {
            statusColor = '#4A9EFF';
            statusText = 'EQUIP';
        } else if (activePowerUp) {
            statusColor = '#FF9800';
            statusText = '⚡ ACTIVE';
        } else if (!meetsLevel) {
            statusColor = '#FF4444';
            statusText = `🔒 Lv.${item.unlockLevel}`;
        } else if (!canAfford) {
            statusColor = '#FF4444';
            statusText = `🪙 ${item.price}`;
        }

        return (
            <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 60).springify()}
            >
                <Pressable
                    style={[styles.itemCard, equipped && { borderColor: currentRank.color }]}
                    onPress={() => {
                        if (equipped) {
                            handleEquip(item);
                        } else if (purchased && !isPowerUp) {
                            handleEquip(item);
                        } else if (meetsLevel) {
                            handlePurchase(item);
                        }
                    }}
                    disabled={!meetsLevel && !purchased}
                >
                    {/* Icon */}
                    <View style={styles.itemIcon}>
                        <Text style={styles.itemIconText}>{item.icon}</Text>
                    </View>

                    {/* Info */}
                    <View style={styles.itemInfo}>
                        <Text style={styles.itemName} numberOfLines={1}>
                            {item.name}
                        </Text>
                        <Text style={styles.itemDesc} numberOfLines={2}>
                            {item.description}
                        </Text>
                    </View>

                    {/* Price / Status */}
                    <View style={[styles.itemStatus, { backgroundColor: statusColor + '20', borderColor: statusColor }]}>
                        <Text style={[styles.itemStatusText, { color: statusColor === NEO.colors.grey ? '#000' : statusColor }]}>
                            {statusText}
                        </Text>
                    </View>
                </Pressable>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <Animated.View entering={FadeInUp.springify()} style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </Pressable>
                <Text style={styles.headerTitle}>SHOP</Text>
                <View style={styles.balancePill}>
                    <Text style={styles.balanceText}>🪙 {balance.toLocaleString()}</Text>
                </View>
            </Animated.View>

            {/* Category Tabs */}
            <Animated.View entering={FadeInUp.delay(50).springify()} style={styles.categoryRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {SHOP_CATEGORIES.map((cat) => (
                        <Pressable
                            key={cat.key}
                            style={[
                                styles.categoryTab,
                                activeCategory === cat.key && styles.categoryTabActive,
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setActiveCategory(cat.key);
                            }}
                        >
                            <Text style={[
                                styles.categoryTabText,
                                activeCategory === cat.key && styles.categoryTabTextActive,
                            ]}>
                                {cat.icon} {cat.label}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </Animated.View>

            {/* Items List */}
            <ScrollView
                contentContainerStyle={styles.itemsList}
                showsVerticalScrollIndicator={false}
            >
                {/* Theme Preview */}
                {activeCategory === 'themes' && (
                    <Animated.View entering={FadeInDown.springify()} style={styles.previewCard}>
                        <Text style={styles.previewTitle}>CURRENT THEME</Text>
                        <View style={styles.themePreview}>
                            {(() => {
                                const theme = getThemeById(shopStore.equippedTheme);
                                return (
                                    <View style={styles.themeSwatches}>
                                        <View style={[styles.swatch, { backgroundColor: theme.background }]} />
                                        <View style={[styles.swatch, { backgroundColor: theme.accent }]} />
                                        <View style={[styles.swatch, { backgroundColor: theme.accentSecondary }]} />
                                        <View style={[styles.swatch, { backgroundColor: theme.text }]} />
                                        <View style={[styles.swatch, { backgroundColor: theme.border }]} />
                                    </View>
                                );
                            })()}
                        </View>
                    </Animated.View>
                )}

                {/* Power-ups status */}
                {activeCategory === 'powerups' && shopStore.getActivePowerUps().length > 0 && (
                    <Animated.View entering={FadeInDown.springify()} style={[styles.previewCard, { borderColor: '#FF9800' }]}>
                        <Text style={styles.previewTitle}>⚡ ACTIVE POWER-UPS</Text>
                        {shopStore.getActivePowerUps().map(pu => {
                            const item = SHOP_ITEMS.find(i => i.id === pu.id);
                            const remaining = Math.max(0, Math.ceil((pu.expiresAt - Date.now()) / (60 * 60 * 1000)));
                            return (
                                <Text key={pu.id + pu.activatedAt} style={styles.activePowerUpText}>
                                    {item?.icon} {item?.name} — {remaining}h remaining
                                </Text>
                            );
                        })}
                    </Animated.View>
                )}

                {categoryItems.map((item, index) => renderItemCard(item, index))}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Purchase Confirmation Modal */}
            <Modal visible={!!confirmItem} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalEmoji}>{confirmItem?.icon}</Text>
                        <Text style={styles.modalTitle}>{confirmItem?.name}</Text>
                        <Text style={styles.modalDesc}>{confirmItem?.description}</Text>

                        <View style={styles.modalPriceRow}>
                            <Text style={styles.modalPriceLabel}>Price:</Text>
                            <Text style={styles.modalPrice}>🪙 {confirmItem?.price.toLocaleString()}</Text>
                        </View>

                        <View style={styles.modalPriceRow}>
                            <Text style={styles.modalPriceLabel}>Balance after:</Text>
                            <Text style={[
                                styles.modalPrice,
                                { color: (balance - (confirmItem?.price || 0)) < 0 ? '#FF0000' : '#39FF14' }
                            ]}>
                                🪙 {(balance - (confirmItem?.price || 0)).toLocaleString()}
                            </Text>
                        </View>

                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalBtn, { backgroundColor: '#E0E0E0' }]}
                                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setConfirmItem(null); }}
                            >
                                <Text style={styles.modalBtnText}>CANCEL</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalBtn, { backgroundColor: currentRank.color }]}
                                onPress={confirmPurchase}
                            >
                                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>BUY</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 12,
        borderBottomWidth: NEO.border,
        borderBottomColor: '#000',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderWidth: NEO.border,
        borderColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#000',
        letterSpacing: 3,
    },
    balancePill: {
        backgroundColor: '#FFD700',
        borderWidth: NEO.border,
        borderColor: '#000',
        paddingHorizontal: 12,
        paddingVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    balanceText: {
        fontSize: 14,
        fontWeight: '900',
        color: '#000',
        fontFamily: 'monospace',
    },
    categoryRow: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: '#E0E0E0',
    },
    categoryTab: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 2,
        borderColor: '#000',
        backgroundColor: '#FFF',
    },
    categoryTabActive: {
        backgroundColor: '#000',
    },
    categoryTabText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#000',
    },
    categoryTabTextActive: {
        color: '#FFF',
    },
    itemsList: {
        padding: 16,
        gap: 10,
    },
    previewCard: {
        borderWidth: NEO.border,
        borderColor: '#000',
        padding: 14,
        marginBottom: 10,
        backgroundColor: '#FAFAFA',
        shadowColor: '#000',
        shadowOffset: { width: NEO.shadowOffset, height: NEO.shadowOffset },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    previewTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: '#000',
        letterSpacing: 2,
        marginBottom: 8,
    },
    themePreview: {
        flexDirection: 'row',
        gap: 8,
    },
    themeSwatches: {
        flexDirection: 'row',
        gap: 6,
    },
    swatch: {
        width: 36,
        height: 36,
        borderWidth: 2,
        borderColor: '#000',
    },
    activePowerUpText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FF9800',
        marginTop: 4,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: NEO.border,
        borderColor: '#000',
        padding: 12,
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    itemIcon: {
        width: 44,
        height: 44,
        borderWidth: 2,
        borderColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        marginRight: 12,
    },
    itemIconText: {
        fontSize: 22,
    },
    itemInfo: {
        flex: 1,
        marginRight: 10,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '900',
        color: '#000',
        letterSpacing: 0.5,
    },
    itemDesc: {
        fontSize: 11,
        fontWeight: '600',
        color: '#666',
        marginTop: 2,
    },
    itemStatus: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 2,
        minWidth: 70,
        alignItems: 'center',
    },
    itemStatusText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#FFF',
        borderWidth: NEO.border,
        borderColor: '#000',
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 8, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    modalEmoji: {
        fontSize: 48,
        marginBottom: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#000',
        letterSpacing: 1,
        marginBottom: 6,
    },
    modalDesc: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalPriceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 8,
    },
    modalPriceLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
    },
    modalPrice: {
        fontSize: 14,
        fontWeight: '900',
        color: '#000',
        fontFamily: 'monospace',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        width: '100%',
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: NEO.border,
        borderColor: '#000',
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    modalBtnText: {
        fontSize: 16,
        fontWeight: '900',
        color: '#000',
        letterSpacing: 2,
    },
});
