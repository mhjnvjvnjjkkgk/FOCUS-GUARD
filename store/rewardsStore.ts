/**
 * Rewards Store — The Psychology Engine 🧠
 * 
 * Implements engagement mechanics from billion-dollar apps:
 * 
 * 1. DAILY LOGIN REWARDS (Clash Royale) — Escalating rewards over 7 days, reset on miss
 * 2. FOCUS STREAK (Snapchat/Duolingo) — Consecutive daily focus days with streak freeze
 * 3. CHEST SYSTEM (Clash Royale) — Winner chests with timer-based opening
 * 4. DAILY CHALLENGES (Fortnite) — 3 rotating challenges refreshed at midnight
 * 5. LUCKY SPIN (Coin Master) — 1 free spin per day for random XP multiplier
 * 6. NEAR-MISS SYSTEM (Slot Machines) — "X seconds away from bonus!" messaging
 * 7. LOSS RECOVERY (Casinos) — "Quick rematch, 1.5x XP next win!" after loss
 * 8. COMEBACK BONUS (TikTok) — Return after absence = bonus XP burst
 * 9. APPOINTMENT MECHANICS (Candy Crush) — Timed events that make you return later
 * 10. VARIABLE RATIO SCHEDULE (Slot Machines) — Randomized bonus drops
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// DAILY LOGIN REWARDS (Clash Royale / Coin Master)
// Day 1: 10 XP → Day 7: 200 XP → Reset
// Miss a day = RESET (loss aversion)
// ============================================
const DAILY_REWARDS = [
    { day: 1, xp: 10, label: '🎁 Welcome Back!', rarity: 'common' },
    { day: 2, xp: 15, label: '📦 Day 2 Bonus', rarity: 'common' },
    { day: 3, xp: 25, label: '🎯 Halfway There!', rarity: 'uncommon' },
    { day: 4, xp: 40, label: '⚡ Momentum!', rarity: 'uncommon' },
    { day: 5, xp: 60, label: '🔥 On Fire!', rarity: 'rare' },
    { day: 6, xp: 100, label: '💎 Almost There!', rarity: 'rare' },
    { day: 7, xp: 200, label: '🏆 JACKPOT!', rarity: 'legendary' },
];

// ============================================
// CHEST TYPES (Clash Royale)
// Win battles → earn chests → chests have TIMERS → appointment mechanic
// ============================================
export type ChestRarity = 'wooden' | 'silver' | 'gold' | 'magical' | 'legendary';

export interface Chest {
    id: string;
    rarity: ChestRarity;
    xpReward: number;
    bonusXpRange: [number, number]; // Random bonus range for variable ratio
    unlockDurationMs: number; // Time to unlock (appointment mechanic!)
    startedAt: number | null; // When unlock timer started
    emoji: string;
}

const CHEST_CONFIGS: Record<ChestRarity, Omit<Chest, 'id' | 'startedAt'>> = {
    wooden: { rarity: 'wooden', xpReward: 15, bonusXpRange: [0, 10], unlockDurationMs: 30 * 1000, emoji: '📦' },    // 30 sec (instant gratification hook)
    silver: { rarity: 'silver', xpReward: 35, bonusXpRange: [5, 25], unlockDurationMs: 3 * 60 * 1000, emoji: '🥈' },    // 3 min
    gold: { rarity: 'gold', xpReward: 75, bonusXpRange: [10, 50], unlockDurationMs: 15 * 60 * 1000, emoji: '🥇' },    // 15 min
    magical: { rarity: 'magical', xpReward: 150, bonusXpRange: [25, 100], unlockDurationMs: 60 * 60 * 1000, emoji: '✨' },    // 1 hour
    legendary: { rarity: 'legendary', xpReward: 300, bonusXpRange: [50, 200], unlockDurationMs: 3 * 60 * 60 * 1000, emoji: '👑' }, // 3 hours
};

// Chest drop rates after a win (variable ratio — like slot machines)
function rollChestDrop(winStreak: number): ChestRarity | null {
    const roll = Math.random() * 100;
    const streakBonus = Math.min(winStreak * 2, 15); // Streak increases rare drop chance

    if (roll < 1 + streakBonus * 0.1) return 'legendary';    // ~1-2.5%
    if (roll < 5 + streakBonus * 0.3) return 'magical';      // ~5-9.5%
    if (roll < 20 + streakBonus) return 'gold';               // ~20-35%
    if (roll < 50 + streakBonus) return 'silver';             // ~50-65%
    if (roll < 85) return 'wooden';                           // ~35-85%
    return null; // No chest — creates scarcity and "next time!" anticipation
}

// ============================================
// DAILY CHALLENGES (Fortnite / Duolingo)
// 3 per day, refresh at midnight, all must be done for bonus
// ============================================
export interface DailyChallenge {
    id: string;
    title: string;
    description: string;
    emoji: string;
    target: number;
    current: number;
    completed: boolean;
    xpReward: number;
    type: 'battles' | 'focus_minutes' | 'win_streak' | 'category_specific' | 'social';
}

const CHALLENGE_POOL: Omit<DailyChallenge, 'id' | 'current' | 'completed'>[] = [
    { title: 'Battle Ready', description: 'Complete 3 battles', emoji: '⚔️', target: 3, xpReward: 30, type: 'battles' },
    { title: 'Quick Draw', description: 'Win a Quick battle', emoji: '⚡', target: 1, xpReward: 20, type: 'category_specific' },
    { title: 'Marathon Runner', description: 'Complete a Marathon battle', emoji: '💀', target: 1, xpReward: 50, type: 'category_specific' },
    { title: 'Focus Machine', description: 'Focus for 60 minutes total', emoji: '🧠', target: 60, xpReward: 40, type: 'focus_minutes' },
    { title: 'Hot Streak', description: 'Win 3 battles in a row', emoji: '🔥', target: 3, xpReward: 60, type: 'win_streak' },
    { title: 'Deep Focus', description: 'Focus for 30 min straight', emoji: '🎯', target: 30, xpReward: 35, type: 'focus_minutes' },
    { title: 'Battle Veteran', description: 'Complete 5 battles', emoji: '🏅', target: 5, xpReward: 50, type: 'battles' },
    { title: 'Unbreakable', description: 'Win 2 battles without losing', emoji: '🛡️', target: 2, xpReward: 40, type: 'win_streak' },
    { title: 'Morning Warrior', description: 'Complete a battle before noon', emoji: '🌅', target: 1, xpReward: 25, type: 'battles' },
    { title: 'Social Butterfly', description: 'Challenge a friend', emoji: '🦋', target: 1, xpReward: 20, type: 'social' },
];

function generateDailyChallenges(): DailyChallenge[] {
    // Shuffle and pick 3 — different every day (variable ratio schedule)
    const shuffled = [...CHALLENGE_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).map((c, i) => ({
        ...c, id: `challenge_${Date.now()}_${i}`, current: 0, completed: false,
    }));
}

// ============================================
// LUCKY SPIN (Coin Master / Slot Machines)
// 1 free spin per day — multiplier for next battle
// Variable ratio reinforcement at its finest
// ============================================
export interface SpinResult {
    multiplier: number;
    label: string;
    emoji: string;
    color: string;
}

const SPIN_SEGMENTS: SpinResult[] = [
    { multiplier: 1.0, label: '1x', emoji: '⭐', color: '#888' },
    { multiplier: 1.2, label: '1.2x', emoji: '✨', color: '#4A9EFF' },
    { multiplier: 1.5, label: '1.5x', emoji: '🔥', color: '#FF9800' },
    { multiplier: 1.0, label: '1x', emoji: '⭐', color: '#888' },
    { multiplier: 2.0, label: '2x!', emoji: '💎', color: '#9C27B0' },
    { multiplier: 1.2, label: '1.2x', emoji: '✨', color: '#4A9EFF' },
    { multiplier: 1.0, label: '1x', emoji: '⭐', color: '#888' },
    { multiplier: 3.0, label: '3x!!', emoji: '👑', color: '#FFD600' }, // 12.5% — JACKPOT
];

function spinWheel(): SpinResult {
    // Weighted — jackpot is rare (variable ratio!)
    const weights = [25, 20, 15, 25, 5, 15, 20, 3]; // out of 128
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < SPIN_SEGMENTS.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return SPIN_SEGMENTS[i];
    }
    return SPIN_SEGMENTS[0];
}

// ============================================
// NEAR-MISS CALCULATOR (Slot Machines)
// Shows "You were X seconds from bonus XP!" to trigger "so close!" psychology
// ============================================
export function calculateNearMiss(mySeconds: number, opponentSeconds: number, categoryMaxMin: number): {
    isNearMiss: boolean;
    message: string;
    bonusThreshold: number;
} {
    const maxSec = categoryMaxMin * 60;
    const percentComplete = mySeconds / maxSec;
    const diff = Math.abs(mySeconds - opponentSeconds);

    // Near-miss: lost but was within 2 minutes
    if (mySeconds < opponentSeconds && diff < 120) {
        return {
            isNearMiss: true,
            message: `😱 Just ${Math.round(diff)} seconds away from winning!`,
            bonusThreshold: diff,
        };
    }

    // Near-miss: almost hit focus quality bonus (80%)
    if (percentComplete >= 0.7 && percentComplete < 0.8) {
        const secsAway = Math.round(maxSec * 0.8 - mySeconds);
        return {
            isNearMiss: true,
            message: `💫 ${secsAway}s more and you'd have earned the Quality Bonus!`,
            bonusThreshold: secsAway,
        };
    }

    // Near-miss: almost hit dominance bonus (5 min margin)
    if (mySeconds > opponentSeconds && diff < 300 && diff > 120) {
        const secsToBonus = 300 - diff;
        return {
            isNearMiss: true,
            message: `⚡ ${Math.round(secsToBonus)}s more for Dominance Bonus XP!`,
            bonusThreshold: secsToBonus,
        };
    }

    return { isNearMiss: false, message: '', bonusThreshold: 0 };
}

// ============================================
// LOSS RECOVERY SYSTEM (Casino Comps)
// After a loss, offer 1.5x XP on next win — makes them play another round
// ============================================
export interface LossRecoveryOffer {
    active: boolean;
    multiplier: number;
    expiresAt: number;
    message: string;
}

// ============================================
// STORE
// ============================================
interface RewardsState {
    // Daily Login
    dailyLoginDay: number;           // 1-7
    lastLoginDate: string;           // YYYY-MM-DD
    dailyRewardClaimed: boolean;
    loginStreak: number;

    // Focus Streak (Snapchat-style)
    focusStreak: number;             // Consecutive days with ≥1 focus session
    bestFocusStreak: number;
    lastFocusDate: string;
    streakFreezes: number;           // Earned from chests/challenges

    // Chests
    chestSlots: (Chest | null)[];    // 4 chest slots (like Clash Royale)
    maxChestSlots: number;

    // Daily Challenges
    dailyChallenges: DailyChallenge[];
    challengesDate: string;          // When challenges were generated
    allChallengesBonus: number;      // Bonus for completing all 3

    // Lucky Spin
    lastSpinDate: string;
    activeMultiplier: number;        // Current XP multiplier
    multiplierExpiresAt: number;     // When multiplier expires

    // Loss Recovery
    lossRecovery: LossRecoveryOffer;

    // Comeback Bonus
    daysSinceLastSession: number;
    comebackBonusActive: boolean;
    comebackMultiplier: number;

    // Total rewards earned (for dopamine display)
    totalChestsOpened: number;
    totalDailyRewardsClaimed: number;
    totalSpins: number;

    // Actions
    claimDailyReward: () => { xp: number; day: number; label: string; rarity: string } | null;
    checkFocusStreak: () => void;
    useStreakFreeze: () => boolean;
    addChest: (rarity: ChestRarity) => boolean;
    startChestUnlock: (slotIndex: number) => void;
    openChest: (slotIndex: number) => { xp: number; bonusXp: number; streakFreeze: boolean } | null;
    isChestReady: (slotIndex: number) => boolean;
    refreshChallenges: () => void;
    updateChallengeProgress: (type: DailyChallenge['type'], amount: number) => void;
    spinWheel: () => SpinResult | null;
    getActiveMultiplier: () => number;
    activateLossRecovery: () => void;
    consumeLossRecovery: () => number;
    checkComebackBonus: () => void;
    rollChestAfterWin: (winStreak: number) => ChestRarity | null;

    // Helpers
    getTodayString: () => string;
    getDailyRewardInfo: () => typeof DAILY_REWARDS[0];
}

const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const useRewardsStore = create<RewardsState>()(
    persist(
        (set, get) => ({
            // Daily Login
            dailyLoginDay: 0,
            lastLoginDate: '',
            dailyRewardClaimed: false,
            loginStreak: 0,

            // Focus Streak
            focusStreak: 0,
            bestFocusStreak: 0,
            lastFocusDate: '',
            streakFreezes: 0,

            // Chests
            chestSlots: [null, null, null, null],
            maxChestSlots: 4,

            // Daily Challenges
            dailyChallenges: [],
            challengesDate: '',
            allChallengesBonus: 50,

            // Lucky Spin
            lastSpinDate: '',
            activeMultiplier: 1.0,
            multiplierExpiresAt: 0,

            // Loss Recovery
            lossRecovery: { active: false, multiplier: 1.5, expiresAt: 0, message: '' },

            // Comeback
            daysSinceLastSession: 0,
            comebackBonusActive: false,
            comebackMultiplier: 1.0,

            // Totals
            totalChestsOpened: 0,
            totalDailyRewardsClaimed: 0,
            totalSpins: 0,

            getTodayString: getToday,

            getDailyRewardInfo: () => {
                const { dailyLoginDay } = get();
                const idx = Math.min(dailyLoginDay, DAILY_REWARDS.length - 1);
                return DAILY_REWARDS[idx];
            },

            // ==========================================
            // DAILY LOGIN REWARDS
            // ==========================================
            claimDailyReward: () => {
                const { lastLoginDate, dailyLoginDay, dailyRewardClaimed } = get();
                const today = getToday();

                if (lastLoginDate === today && dailyRewardClaimed) return null; // Already claimed

                let newDay = dailyLoginDay;
                if (lastLoginDate === '') {
                    // First ever login
                    newDay = 1;
                } else {
                    const lastDate = new Date(lastLoginDate);
                    const todayDate = new Date(today);
                    const diff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

                    if (diff === 1) {
                        // Consecutive day — advance!
                        newDay = dailyLoginDay >= 7 ? 1 : dailyLoginDay + 1;
                    } else if (diff > 1) {
                        // Missed a day — RESET (loss aversion trigger!)
                        newDay = 1;
                    } else {
                        // Same day
                        newDay = dailyLoginDay;
                    }
                }

                const reward = DAILY_REWARDS[newDay - 1];

                set({
                    dailyLoginDay: newDay,
                    lastLoginDate: today,
                    dailyRewardClaimed: true,
                    loginStreak: newDay,
                    totalDailyRewardsClaimed: get().totalDailyRewardsClaimed + 1,
                });

                return { xp: reward.xp, day: newDay, label: reward.label, rarity: reward.rarity };
            },

            // ==========================================
            // FOCUS STREAK (Snapchat streaks)
            // ==========================================
            checkFocusStreak: () => {
                const { lastFocusDate, focusStreak, bestFocusStreak, streakFreezes } = get();
                const today = getToday();

                if (lastFocusDate === today) return; // Already tracked today

                const lastDate = new Date(lastFocusDate || today);
                const todayDate = new Date(today);
                const diff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

                if (diff === 1 || lastFocusDate === '') {
                    // Consecutive day — streak grows
                    const newStreak = focusStreak + 1;
                    set({
                        focusStreak: newStreak,
                        bestFocusStreak: Math.max(bestFocusStreak, newStreak),
                        lastFocusDate: today,
                    });
                } else if (diff === 2 && streakFreezes > 0) {
                    // Missed 1 day but has freeze — auto-use (like Duolingo)
                    set({
                        streakFreezes: streakFreezes - 1,
                        lastFocusDate: today,
                        focusStreak: focusStreak + 1,
                    });
                } else if (diff > 1) {
                    // Streak broken 💀
                    set({ focusStreak: 1, lastFocusDate: today });
                }
            },

            useStreakFreeze: () => {
                const { streakFreezes } = get();
                if (streakFreezes <= 0) return false;
                set({ streakFreezes: streakFreezes - 1 });
                return true;
            },

            // ==========================================
            // CHEST SYSTEM (Clash Royale)
            // ==========================================
            addChest: (rarity: ChestRarity) => {
                const { chestSlots } = get();
                const emptyIdx = chestSlots.findIndex(s => s === null);
                if (emptyIdx === -1) return false; // All slots full — creates "clear slots to earn more!" urgency

                const config = CHEST_CONFIGS[rarity];
                const newChest: Chest = {
                    id: `chest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    ...config,
                    startedAt: null,
                };

                const newSlots = [...chestSlots];
                newSlots[emptyIdx] = newChest;
                set({ chestSlots: newSlots });
                return true;
            },

            startChestUnlock: (slotIndex: number) => {
                const { chestSlots } = get();
                const chest = chestSlots[slotIndex];
                if (!chest || chest.startedAt !== null) return;

                // Check no other chest is being unlocked (appointment mechanic — one at a time!)
                const isUnlocking = chestSlots.some(c => c && c.startedAt !== null && !get().isChestReady(chestSlots.indexOf(c)));
                if (isUnlocking) return;

                const newSlots = [...chestSlots];
                newSlots[slotIndex] = { ...chest, startedAt: Date.now() };
                set({ chestSlots: newSlots });
            },

            isChestReady: (slotIndex: number) => {
                const chest = get().chestSlots[slotIndex];
                if (!chest || chest.startedAt === null) return false;
                return Date.now() >= chest.startedAt + chest.unlockDurationMs;
            },

            openChest: (slotIndex: number) => {
                const { chestSlots } = get();
                const chest = chestSlots[slotIndex];
                if (!chest || !get().isChestReady(slotIndex)) return null;

                // Variable ratio reward — never the same amount!
                const [minBonus, maxBonus] = chest.bonusXpRange;
                const bonusXp = Math.round(minBonus + Math.random() * (maxBonus - minBonus));

                // 15% chance of streak freeze from gold+ chests (rare drop!)
                const streakFreezeChance = chest.rarity === 'wooden' ? 0 : chest.rarity === 'silver' ? 0.05 : 0.15;
                const gotStreakFreeze = Math.random() < streakFreezeChance;

                if (gotStreakFreeze) {
                    set({ streakFreezes: get().streakFreezes + 1 });
                }

                // Clear slot
                const newSlots = [...chestSlots];
                newSlots[slotIndex] = null;
                set({ chestSlots: newSlots, totalChestsOpened: get().totalChestsOpened + 1 });

                return {
                    xp: chest.xpReward,
                    bonusXp,
                    streakFreeze: gotStreakFreeze,
                };
            },

            // ==========================================
            // DAILY CHALLENGES (Fortnite)
            // ==========================================
            refreshChallenges: () => {
                const today = getToday();
                if (get().challengesDate === today) return; // Already refreshed

                set({
                    dailyChallenges: generateDailyChallenges(),
                    challengesDate: today,
                });
            },

            updateChallengeProgress: (type, amount) => {
                const { dailyChallenges } = get();
                const updated = dailyChallenges.map(c => {
                    if (c.type === type && !c.completed) {
                        const newCurrent = Math.min(c.current + amount, c.target);
                        return {
                            ...c,
                            current: newCurrent,
                            completed: newCurrent >= c.target,
                        };
                    }
                    return c;
                });
                set({ dailyChallenges: updated });
            },

            // ==========================================
            // LUCKY SPIN (Slot Machine)
            // ==========================================
            spinWheel: () => {
                const today = getToday();
                if (get().lastSpinDate === today) return null; // Already spun

                const result = spinWheel();
                set({
                    lastSpinDate: today,
                    activeMultiplier: result.multiplier,
                    multiplierExpiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hour window (urgency!)
                    totalSpins: get().totalSpins + 1,
                });

                return result;
            },

            getActiveMultiplier: () => {
                const { activeMultiplier, multiplierExpiresAt, lossRecovery, comebackBonusActive, comebackMultiplier } = get();
                let mult = 1.0;

                // Lucky spin multiplier
                if (Date.now() < multiplierExpiresAt) {
                    mult *= activeMultiplier;
                }

                // Loss recovery multiplier
                if (lossRecovery.active && Date.now() < lossRecovery.expiresAt) {
                    mult *= lossRecovery.multiplier;
                }

                // Comeback bonus
                if (comebackBonusActive) {
                    mult *= comebackMultiplier;
                }

                return mult;
            },

            // ==========================================
            // LOSS RECOVERY (Casino Comps)
            // ==========================================
            activateLossRecovery: () => {
                set({
                    lossRecovery: {
                        active: true,
                        multiplier: 1.5,
                        expiresAt: Date.now() + (30 * 60 * 1000), // 30 min window (urgency!)
                        message: '🔥 1.5x XP — Quick Rematch!',
                    },
                });
            },

            consumeLossRecovery: () => {
                const { lossRecovery } = get();
                if (!lossRecovery.active || Date.now() > lossRecovery.expiresAt) {
                    set({ lossRecovery: { active: false, multiplier: 1.0, expiresAt: 0, message: '' } });
                    return 1.0;
                }
                const mult = lossRecovery.multiplier;
                set({ lossRecovery: { active: false, multiplier: 1.0, expiresAt: 0, message: '' } });
                return mult;
            },

            // ==========================================
            // COMEBACK BONUS (TikTok re-engagement)
            // ==========================================
            checkComebackBonus: () => {
                const { lastFocusDate } = get();
                if (!lastFocusDate) return;

                const last = new Date(lastFocusDate);
                const now = new Date();
                const daysDiff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

                if (daysDiff >= 3) {
                    // 3+ days away = comeback bonus!
                    const mult = daysDiff >= 7 ? 2.0 : daysDiff >= 5 ? 1.5 : 1.3;
                    set({
                        comebackBonusActive: true,
                        comebackMultiplier: mult,
                        daysSinceLastSession: daysDiff,
                    });
                }
            },

            // ==========================================
            // CHEST DROPS (Variable Ratio)
            // ==========================================
            rollChestAfterWin: (winStreak: number) => {
                const rarity = rollChestDrop(winStreak);
                if (rarity) {
                    get().addChest(rarity);
                }
                return rarity;
            },
        }),
        {
            name: 'focusguard-rewards',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                dailyLoginDay: state.dailyLoginDay,
                lastLoginDate: state.lastLoginDate,
                dailyRewardClaimed: state.dailyRewardClaimed,
                loginStreak: state.loginStreak,
                focusStreak: state.focusStreak,
                bestFocusStreak: state.bestFocusStreak,
                lastFocusDate: state.lastFocusDate,
                streakFreezes: state.streakFreezes,
                chestSlots: state.chestSlots,
                dailyChallenges: state.dailyChallenges,
                challengesDate: state.challengesDate,
                lastSpinDate: state.lastSpinDate,
                activeMultiplier: state.activeMultiplier,
                multiplierExpiresAt: state.multiplierExpiresAt,
                lossRecovery: state.lossRecovery,
                totalChestsOpened: state.totalChestsOpened,
                totalDailyRewardsClaimed: state.totalDailyRewardsClaimed,
                totalSpins: state.totalSpins,
            }),
        }
    )
);

export { DAILY_REWARDS, CHEST_CONFIGS };
export default useRewardsStore;
