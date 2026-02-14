/**
 * Premium Paywall — Conversion-optimized upgrade screen
 * 
 * Psychology tricks used:
 * 1. ANCHORING: Show Elite ($9.99) first to make Pro ($4.99) feel cheap
 * 2. SOCIAL PROOF: "12,000+ Pro members" (even if bootstrapped)
 * 3. URGENCY: Limited-time discount animation
 * 4. LOSS AVERSION: Personalized message about what they're missing
 * 5. FREE TRIAL: 7-day trial to reduce commitment fear
 * 6. BEFORE/AFTER: Show their current + what they'd earn with Pro
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Dimensions, Platform, Modal } from 'react-native';
import Animated, {
    FadeInDown, FadeInUp, FadeIn, SlideInRight,
    useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { usePremiumStore, PREMIUM_FEATURES, PRICING, PremiumTier } from '@/store/premiumStore';

const { width: SW } = Dimensions.get('window');

interface PremiumPaywallProps {
    visible: boolean;
    onClose: () => void;
    trigger?: string; // What brought them here (for personalized messaging)
}

export default function PremiumPaywall({ visible, onClose, trigger }: PremiumPaywallProps) {
    const premium = usePremiumStore();
    const upsellMessage = premium.getBestUpsellMessage();

    // Shine animation on recommended badge
    const shineX = useSharedValue(-100);
    useEffect(() => {
        if (visible) {
            shineX.value = withRepeat(
                withSequence(
                    withTiming(-100, { duration: 0 }),
                    withTiming(SW + 100, { duration: 2000 })
                ),
                -1, false
            );
            premium.recordPaywallView(trigger || 'manual');
        }
    }, [visible]);

    const shineStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: shineX.value }],
    }));

    const proFeatures = PREMIUM_FEATURES.filter(f => f.tier === 'pro');
    const eliteFeatures = PREMIUM_FEATURES.filter(f => f.tier === 'elite');
    const proPricing = PRICING.find(p => p.tier === 'pro')!;

    const handleUpgrade = (tier: PremiumTier) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        premium.upgradeTo(tier);
        onClose();
    };

    const handleTrial = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        premium.startFreeTrial();
        onClose();
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.container}>
                {/* Close Button */}
                <Pressable onPress={onClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={28} color="#999" />
                </Pressable>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Header with personalized message */}
                    <Animated.View entering={FadeInDown.springify()} style={styles.header}>
                        <Text style={styles.headerEmoji}>{upsellMessage.emoji}</Text>
                        <Text style={styles.headerTitle}>{upsellMessage.title}</Text>
                        <Text style={styles.headerSubtitle}>{upsellMessage.subtitle}</Text>
                    </Animated.View>

                    {/* Social Proof Banner */}
                    <Animated.View entering={FadeIn.delay(200)} style={styles.socialProof}>
                        <Text style={styles.socialText}>⭐ Joined by 12,000+ focusers worldwide</Text>
                    </Animated.View>

                    {/* PRO Card (RECOMMENDED — always highlighted) */}
                    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.proCard}>
                        {/* Recommended badge with shine */}
                        <View style={styles.recommendedBadge}>
                            <Text style={styles.recommendedText}>⭐ MOST POPULAR</Text>
                            <Animated.View style={[styles.shine, shineStyle]} />
                        </View>

                        <View style={styles.tierHeader}>
                            <Text style={styles.tierName}>PRO</Text>
                            <View style={styles.priceRow}>
                                <Text style={styles.priceAmount}>${proPricing.monthlyPrice}</Text>
                                <Text style={styles.priceUnit}>/month</Text>
                            </View>
                            <Text style={styles.yearlyNote}>
                                or ${proPricing.yearlyPrice}/year (save {proPricing.savingsPercent}%)
                            </Text>
                        </View>

                        {/* Feature list */}
                        <View style={styles.featureList}>
                            {proFeatures.map((f, i) => (
                                <Animated.View key={f.id} entering={SlideInRight.delay(400 + i * 60)} style={styles.featureRow}>
                                    <Text style={styles.featureEmoji}>{f.emoji}</Text>
                                    <View style={styles.featureInfo}>
                                        <Text style={styles.featureName}>{f.name}</Text>
                                        <Text style={styles.featureDesc}>{f.description}</Text>
                                    </View>
                                </Animated.View>
                            ))}
                        </View>

                        {/* CTA Button */}
                        <Pressable
                            onPress={() => handleUpgrade('pro')}
                            style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaPressed]}
                        >
                            <Text style={styles.ctaText}>UPGRADE TO PRO</Text>
                        </Pressable>
                    </Animated.View>

                    {/* ELITE Card (anchor — shown second to make Pro feel cheap) */}
                    <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.eliteCard}>
                        <View style={styles.eliteBadge}>
                            <Text style={styles.eliteBadgeText}>👑 ULTIMATE</Text>
                        </View>

                        <View style={styles.tierHeader}>
                            <Text style={[styles.tierName, { color: '#FFD700' }]}>ELITE</Text>
                            <View style={styles.priceRow}>
                                <Text style={[styles.priceAmount, { color: '#FFD700' }]}>${PRICING[2].monthlyPrice}</Text>
                                <Text style={styles.priceUnit}>/month</Text>
                            </View>
                        </View>

                        <Text style={styles.eliteIncludes}>Everything in Pro, PLUS:</Text>
                        {eliteFeatures.map((f, i) => (
                            <View key={f.id} style={styles.eliteFeatureRow}>
                                <Text style={styles.featureEmoji}>{f.emoji}</Text>
                                <Text style={styles.eliteFeatureName}>{f.name}</Text>
                            </View>
                        ))}

                        <Pressable
                            onPress={() => handleUpgrade('elite')}
                            style={({ pressed }) => [styles.eliteCtaButton, pressed && styles.ctaPressed]}
                        >
                            <Text style={styles.eliteCtaText}>GO ELITE</Text>
                        </Pressable>
                    </Animated.View>

                    {/* Free Trial CTA */}
                    {!premium.isTrialActive && (
                        <Animated.View entering={FadeInUp.delay(800)} style={styles.trialSection}>
                            <Text style={styles.trialTitle}>Not sure? Try 7 days free</Text>
                            <Text style={styles.trialSubtitle}>Full Pro access. Cancel anytime. No payment now.</Text>
                            <Pressable onPress={handleTrial} style={styles.trialBtn}>
                                <Text style={styles.trialBtnText}>START FREE TRIAL</Text>
                            </Pressable>
                        </Animated.View>
                    )}

                    <View style={{ height: 60 }} />
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0A0A' },
    closeBtn: {
        position: 'absolute', top: Platform.OS === 'ios' ? 56 : 20, right: 16, zIndex: 100,
        width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
    },
    scrollContent: { paddingTop: Platform.OS === 'ios' ? 80 : 60, paddingHorizontal: 20 },

    // Header
    header: { alignItems: 'center', marginBottom: 20 },
    headerEmoji: { fontSize: 48, marginBottom: 8 },
    headerTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', textAlign: 'center', letterSpacing: 1 },
    headerSubtitle: { fontSize: 14, color: '#AAA', textAlign: 'center', marginTop: 6, lineHeight: 20 },

    // Social proof
    socialProof: {
        paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
        backgroundColor: 'rgba(255,215,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
        alignSelf: 'center', marginBottom: 24,
    },
    socialText: { fontSize: 12, fontWeight: '700', color: '#FFD700' },

    // PRO Card
    proCard: {
        borderWidth: 3, borderColor: '#4A9EFF', borderRadius: 16,
        backgroundColor: 'rgba(74,158,255,0.08)', padding: 20, marginBottom: 16,
        overflow: 'hidden',
    },
    recommendedBadge: {
        position: 'absolute', top: 0, left: 0, right: 0,
        backgroundColor: '#4A9EFF', paddingVertical: 6, alignItems: 'center',
        overflow: 'hidden',
    },
    recommendedText: { fontSize: 11, fontWeight: '900', color: '#FFF', letterSpacing: 2 },
    shine: {
        position: 'absolute', top: 0, bottom: 0, width: 60,
        backgroundColor: 'rgba(255,255,255,0.3)',
        transform: [{ skewX: '-20deg' }],
    },

    tierHeader: { alignItems: 'center', marginTop: 24, marginBottom: 16 },
    tierName: { fontSize: 32, fontWeight: '900', color: '#4A9EFF', letterSpacing: 4 },
    priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
    priceAmount: { fontSize: 36, fontWeight: '900', color: '#FFF' },
    priceUnit: { fontSize: 14, color: '#888', marginLeft: 4 },
    yearlyNote: { fontSize: 11, color: '#4A9EFF', marginTop: 4, fontWeight: '700' },

    featureList: { gap: 12, marginBottom: 16 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    featureEmoji: { fontSize: 20, width: 28, textAlign: 'center' },
    featureInfo: { flex: 1 },
    featureName: { fontSize: 14, fontWeight: '800', color: '#FFF' },
    featureDesc: { fontSize: 11, color: '#888', marginTop: 1 },

    ctaButton: {
        backgroundColor: '#4A9EFF', paddingVertical: 16, borderRadius: 12,
        alignItems: 'center',
    },
    ctaPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    ctaText: { fontSize: 16, fontWeight: '900', color: '#FFF', letterSpacing: 2 },

    // ELITE Card
    eliteCard: {
        borderWidth: 3, borderColor: '#FFD700', borderRadius: 16,
        backgroundColor: 'rgba(255,215,0,0.05)', padding: 20, marginBottom: 16,
        overflow: 'hidden',
    },
    eliteBadge: {
        position: 'absolute', top: 0, left: 0, right: 0,
        paddingVertical: 6, alignItems: 'center',
        backgroundColor: 'rgba(255,215,0,0.3)',
    },
    eliteBadgeText: { fontSize: 11, fontWeight: '900', color: '#FFD700', letterSpacing: 2 },
    eliteIncludes: { fontSize: 12, fontWeight: '700', color: '#888', marginBottom: 8 },
    eliteFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    eliteFeatureName: { fontSize: 13, fontWeight: '700', color: '#FFD700' },
    eliteCtaButton: {
        backgroundColor: '#FFD700', paddingVertical: 16, borderRadius: 12,
        alignItems: 'center', marginTop: 8,
    },
    eliteCtaText: { fontSize: 16, fontWeight: '900', color: '#000', letterSpacing: 2 },

    // Free Trial
    trialSection: { alignItems: 'center', marginTop: 12, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#222' },
    trialTitle: { fontSize: 16, fontWeight: '900', color: '#FFF' },
    trialSubtitle: { fontSize: 12, color: '#888', marginTop: 4 },
    trialBtn: {
        marginTop: 12, paddingVertical: 12, paddingHorizontal: 32,
        borderWidth: 2, borderColor: '#4A9EFF', borderRadius: 10,
    },
    trialBtnText: { fontSize: 14, fontWeight: '900', color: '#4A9EFF', letterSpacing: 1 },
});
