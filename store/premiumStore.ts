/**
 * Premium Store — Monetization Engine
 * 
 * Three-tier model (like Spotify/YouTube Premium):
 * - FREE: Core features with limits + ads
 * - PRO ($4.99/mo): No ads, 2x XP, extra chests, premium themes
 * - ELITE ($9.99/mo): Everything + exclusive battle modes, custom avatars, priority matchmaking
 * 
 * Psychology hooks for conversion:
 * 1. SOFT PAYWALL: Show premium features in action before gating → desire before block
 * 2. LOSS AVERSION: "Your 15-day streak is at risk! Pro unlocks Streak Shield for free"
 * 3. SOCIAL PROOF: "Join 12,000+ Pro members who focus 3x more"
 * 4. FREE TRIAL: 7-day trial after key engagement moments (not on install!)
 * 5. FRICTION-POINT UPSELL: Offer upgrade at natural friction (chest slots full, lost battle)
 * 6. ANCHORING: Show Elite first ($9.99) to make Pro ($4.99) feel like a deal
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PremiumTier = 'free' | 'pro' | 'elite';

export interface PremiumFeature {
    id: string;
    name: string;
    description: string;
    emoji: string;
    tier: PremiumTier;
    category: 'battle' | 'focus' | 'social' | 'cosmetic' | 'utility';
}

// All premium features — shown in paywall
export const PREMIUM_FEATURES: PremiumFeature[] = [
    // PRO Features
    { id: 'no_ads', name: 'Ad-Free Experience', description: 'Zero interruptions', emoji: '🚫', tier: 'pro', category: 'utility' },
    { id: 'double_xp', name: '2x XP Boost', description: 'Earn XP twice as fast', emoji: '⚡', tier: 'pro', category: 'battle' },
    { id: 'extra_chests', name: '6 Chest Slots', description: '2 extra chest slots (4→6)', emoji: '📦', tier: 'pro', category: 'battle' },
    { id: 'streak_shield', name: 'Auto Streak Shield', description: 'Protects streak automatically', emoji: '🛡️', tier: 'pro', category: 'utility' },
    { id: 'premium_themes', name: 'Premium Themes', description: '20+ exclusive themes', emoji: '🎨', tier: 'pro', category: 'cosmetic' },
    { id: 'detailed_stats', name: 'Advanced Analytics', description: 'Deep focus heatmaps & trends', emoji: '📊', tier: 'pro', category: 'utility' },
    { id: 'custom_challenges', name: 'Custom Daily Challenges', description: 'Set your own challenge goals', emoji: '🎯', tier: 'pro', category: 'battle' },
    { id: 'pro_badge', name: 'Pro Badge', description: 'Visible on leaderboards', emoji: '💎', tier: 'pro', category: 'social' },

    // ELITE Features
    { id: 'triple_xp', name: '3x XP Boost', description: 'Maximum XP earning', emoji: '👑', tier: 'elite', category: 'battle' },
    { id: 'exclusive_modes', name: 'Exclusive Battle Modes', description: 'Tournament & Team battles', emoji: '⚔️', tier: 'elite', category: 'battle' },
    { id: 'custom_avatar', name: 'Custom Avatar Creator', description: 'Build your own avatar', emoji: '👤', tier: 'elite', category: 'cosmetic' },
    { id: 'priority_match', name: 'Priority Matchmaking', description: 'Faster, better-matched opponents', emoji: '🎯', tier: 'elite', category: 'battle' },
    { id: 'unlimited_friends', name: 'Unlimited Friends', description: 'No friend list cap', emoji: '👥', tier: 'elite', category: 'social' },
    { id: 'elite_badge', name: 'Elite Crown', description: 'Gold crown on profile', emoji: '👑', tier: 'elite', category: 'social' },
    { id: 'early_access', name: 'Early Access Features', description: 'Try new features first', emoji: '🚀', tier: 'elite', category: 'utility' },
];

interface PremiumPricing {
    tier: PremiumTier;
    monthlyPrice: number;
    yearlyPrice: number;        // Show annual as "save X%"
    yearlyMonthlyPrice: number; // Monthly cost of yearly plan
    savingsPercent: number;
}

export const PRICING: PremiumPricing[] = [
    { tier: 'free', monthlyPrice: 0, yearlyPrice: 0, yearlyMonthlyPrice: 0, savingsPercent: 0 },
    { tier: 'pro', monthlyPrice: 4.99, yearlyPrice: 29.99, yearlyMonthlyPrice: 2.49, savingsPercent: 50 },
    { tier: 'elite', monthlyPrice: 9.99, yearlyPrice: 59.99, yearlyMonthlyPrice: 4.99, savingsPercent: 50 },
];

interface PremiumState {
    // Current subscription
    currentTier: PremiumTier;
    subscriptionStartDate: string;
    subscriptionEndDate: string;
    isTrialActive: boolean;
    trialEndDate: string;

    // Upsell tracking (for smart timing)
    paywallViews: number;
    lastPaywallDate: string;
    conversionMoments: string[];  // Track what triggered paywall views

    // Feature gating
    hasFeature: (featureId: string) => boolean;
    isPro: () => boolean;
    isElite: () => boolean;
    isFree: () => boolean;
    getXPMultiplier: () => number;
    getMaxChestSlots: () => number;

    // Trial management
    startFreeTrial: () => void;
    isTrialExpired: () => boolean;

    // Subscription management  
    upgradeTo: (tier: PremiumTier) => void;
    cancelSubscription: () => void;

    // Upsell intelligence
    recordPaywallView: (trigger: string) => void;
    shouldShowPaywall: (trigger: string) => boolean;
    getBestUpsellMessage: () => { title: string; subtitle: string; emoji: string };
}

export const usePremiumStore = create<PremiumState>()(
    persist(
        (set, get) => ({
            currentTier: 'free',
            subscriptionStartDate: '',
            subscriptionEndDate: '',
            isTrialActive: false,
            trialEndDate: '',
            paywallViews: 0,
            lastPaywallDate: '',
            conversionMoments: [],

            // ==========================================
            // FEATURE GATING
            // ==========================================
            hasFeature: (featureId: string) => {
                const { currentTier, isTrialActive } = get();
                if (isTrialActive && !get().isTrialExpired()) {
                    return true; // Trial = all features
                }
                const feature = PREMIUM_FEATURES.find(f => f.id === featureId);
                if (!feature) return false;
                if (currentTier === 'elite') return true;
                if (currentTier === 'pro' && feature.tier === 'pro') return true;
                return false;
            },

            isPro: () => {
                const { currentTier, isTrialActive } = get();
                return currentTier === 'pro' || currentTier === 'elite' || (isTrialActive && !get().isTrialExpired());
            },

            isElite: () => {
                const { currentTier } = get();
                return currentTier === 'elite';
            },

            isFree: () => get().currentTier === 'free' && !get().isTrialActive,

            getXPMultiplier: () => {
                const { currentTier, isTrialActive } = get();
                if (isTrialActive && !get().isTrialExpired()) return 2;
                if (currentTier === 'elite') return 3;
                if (currentTier === 'pro') return 2;
                return 1;
            },

            getMaxChestSlots: () => {
                const { currentTier } = get();
                if (currentTier === 'elite') return 8;
                if (currentTier === 'pro') return 6;
                return 4;
            },

            // ==========================================
            // TRIAL MANAGEMENT (timed to engagement peaks)
            // ==========================================
            startFreeTrial: () => {
                const now = new Date();
                const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
                set({
                    isTrialActive: true,
                    trialEndDate: end.toISOString(),
                });
            },

            isTrialExpired: () => {
                const { trialEndDate, isTrialActive } = get();
                if (!isTrialActive || !trialEndDate) return true;
                return new Date() > new Date(trialEndDate);
            },

            // ==========================================
            // SUBSCRIPTION
            // ==========================================
            upgradeTo: (tier: PremiumTier) => {
                const now = new Date();
                const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
                set({
                    currentTier: tier,
                    subscriptionStartDate: now.toISOString(),
                    subscriptionEndDate: end.toISOString(),
                    isTrialActive: false,
                });
            },

            cancelSubscription: () => {
                set({
                    currentTier: 'free',
                    subscriptionStartDate: '',
                    subscriptionEndDate: '',
                });
            },

            // ==========================================
            // UPSELL INTELLIGENCE
            // Smart timing: don't spam, show at friction points
            // ==========================================
            recordPaywallView: (trigger: string) => {
                const today = new Date().toISOString().split('T')[0];
                set({
                    paywallViews: get().paywallViews + 1,
                    lastPaywallDate: today,
                    conversionMoments: [...get().conversionMoments.slice(-20), trigger],
                });
            },

            shouldShowPaywall: (trigger: string) => {
                const { lastPaywallDate, currentTier } = get();
                if (currentTier !== 'free') return false;

                const today = new Date().toISOString().split('T')[0];
                // Don't show more than once per day (respect the user)
                if (lastPaywallDate === today) return false;

                // High-conversion triggers always show
                const highConversionTriggers = [
                    'chest_slots_full',      // Can't earn more chests
                    'streak_about_to_break', // Streak at risk and no freeze
                    'battle_loss_recovery',  // Just lost, emotionally primed
                    'milestone_reached',     // Hit a big achievement
                ];
                return highConversionTriggers.includes(trigger);
            },

            getBestUpsellMessage: () => {
                const { conversionMoments } = get();
                const lastTrigger = conversionMoments[conversionMoments.length - 1] || '';

                const messages: Record<string, { title: string; subtitle: string; emoji: string }> = {
                    chest_slots_full: {
                        title: 'Your chests are FULL!',
                        subtitle: 'Pro unlocks 6 chest slots — never miss a drop',
                        emoji: '📦',
                    },
                    streak_about_to_break: {
                        title: "Don't lose your streak!",
                        subtitle: 'Pro includes Auto Streak Shield — never break again',
                        emoji: '🛡️',
                    },
                    battle_loss_recovery: {
                        title: 'Want revenge?',
                        subtitle: 'Pro gives 2x XP — bounce back twice as fast',
                        emoji: '⚡',
                    },
                    milestone_reached: {
                        title: "You're on fire! 🔥",
                        subtitle: 'Imagine earning 2x XP on every battle',
                        emoji: '💎',
                    },
                };

                return messages[lastTrigger] || {
                    title: 'Unlock Your Full Potential',
                    subtitle: 'Join 12,000+ Pro focusers who earn 2x more XP',
                    emoji: '💎',
                };
            },
        }),
        {
            name: 'focusguard-premium',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                currentTier: state.currentTier,
                subscriptionStartDate: state.subscriptionStartDate,
                subscriptionEndDate: state.subscriptionEndDate,
                isTrialActive: state.isTrialActive,
                trialEndDate: state.trialEndDate,
                paywallViews: state.paywallViews,
                lastPaywallDate: state.lastPaywallDate,
                conversionMoments: state.conversionMoments,
            }),
        }
    )
);

export default usePremiumStore;
