/**
 * Battle Store — State management for Focus Battles
 * Handles matchmaking, bot opponents, active battles, and battle history
 * 
 * XP FORMULA (dynamic, not fixed stakes):
 *   base = category base XP
 *   × focusDurationMultiplier (longer focus = more XP, diminishing returns)
 *   × rankDiffBonus (beating higher rank = bonus, lower = reduced)
 *   × streakBonus (consecutive wins compound 10% per win, max 2x)
 *   × focusQualityBonus (completing >80% of category max = 1.2x bonus)
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '@/configs/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
    BattleCategory, BattleCategoryConfig, BATTLE_CATEGORIES,
    BotConfig, selectBot, simulateBotFocus, getBotFocusLabel,
} from '@/data/bots';

// ============================================
// HUMAN-LIKE NAMES — Bots disguised as real players
// ============================================
const HUMAN_NAMES = [
    'Alex_K', 'Jordan.M', 'Sam_Lee', 'Chris.P', 'Taylor_R', 'Morgan.N',
    'Riley_J', 'Casey.B', 'Dylan_W', 'Avery.H', 'Quinn_S', 'Reese.D',
    'Jamie_F', 'Drew.T', 'Kai_V', 'Skyler.Z', 'Rowan_C', 'Phoenix.A',
    'Harper_G', 'Emerson.L', 'Sage_M', 'River.K', 'Blake_N', 'Finley.P',
    'Ari_B', 'Lennox.W', 'Zion_H', 'Nova.J', 'Ellis_D', 'Remy.S',
];
const HUMAN_AVATARS = ['🎓', '🧑‍💻', '📚', '🎯', '🚀', '💡', '🔥', '⭐', '🎮', '🏆'];

function getHumanDisguise() {
    return {
        name: HUMAN_NAMES[Math.floor(Math.random() * HUMAN_NAMES.length)],
        avatar: HUMAN_AVATARS[Math.floor(Math.random() * HUMAN_AVATARS.length)],
    };
}

// ============================================
// DYNAMIC XP CALCULATOR
// ============================================
const CATEGORY_BASE_XP: Record<BattleCategory, number> = {
    quick: 30, standard: 75, extended: 150, marathon: 300,
};

export function calculateBattleXP(params: {
    category: BattleCategory;
    myFocusSeconds: number;
    opponentFocusSeconds: number;
    myRank: number;
    opponentRank: number;
    winStreak: number;
    result: 'win' | 'loss' | 'tie';
}): number {
    const { category, myFocusSeconds, opponentFocusSeconds, myRank, opponentRank, winStreak, result } = params;
    const catConfig = BATTLE_CATEGORIES.find(c => c.id === category)!;
    const base = CATEGORY_BASE_XP[category];

    if (result === 'tie') {
        // Ties give 30% of base — still rewarding, not punishing
        return Math.round(base * 0.3);
    }

    if (result === 'loss') {
        // Losses: small consolation XP based on how long you focused
        // Minimum 5 XP so it never feels totally wasted (psychology: loss aversion reduction)
        const focusMinutes = myFocusSeconds / 60;
        const consolation = Math.max(5, Math.round(focusMinutes * 0.5));
        return consolation; // Always positive! No XP deduction.
    }

    // === WIN FORMULA ===
    // 1. Focus duration multiplier (longer = more, diminishing returns via sqrt)
    const focusMin = myFocusSeconds / 60;
    const catMaxMin = catConfig.maxMinutes;
    const durationRatio = Math.min(focusMin / catMaxMin, 1.5); // cap at 1.5x
    const durationMultiplier = 0.5 + (Math.sqrt(durationRatio) * 0.8); // 0.5 → 1.3

    // 2. Rank differential bonus (beating higher rank = big bonus)
    const rankDiff = opponentRank - myRank;
    const rankMultiplier = rankDiff > 0
        ? 1 + (rankDiff * 0.15)    // +15% per rank above you (underdog bonus)
        : 1 + (rankDiff * 0.05);   // -5% per rank below you (easy opponent penalty)

    // 3. Win streak bonus (10% per consecutive win, max 2x) — variable ratio schedule
    const streakMultiplier = Math.min(1 + (winStreak * 0.1), 2.0);

    // 4. Focus quality bonus (completing >80% of category max time = 1.2x)
    const qualityBonus = (focusMin / catMaxMin) >= 0.8 ? 1.2 : 1.0;

    // 5. Dominance bonus (winning by large margin = extra 10-20%)
    const marginSeconds = myFocusSeconds - opponentFocusSeconds;
    const marginBonus = marginSeconds > 300 ? 1.2 : marginSeconds > 120 ? 1.1 : 1.0;

    const totalXP = Math.round(
        base * durationMultiplier * rankMultiplier * streakMultiplier * qualityBonus * marginBonus
    );

    return Math.max(10, totalXP); // Minimum 10 XP for any win
}

// ============================================
// TYPES
// ============================================
export type BattleStatus = 'idle' | 'matchmaking' | 'countdown' | 'active' | 'completed';
export type BattleResult = 'win' | 'loss' | 'tie' | 'forfeit';

export interface BattleOpponent {
    id: string;
    name: string;
    avatar: string;
    rankLevel: number;
    focusLabel: string;
    isBot: boolean;
}

export interface ActiveBattle {
    id: string;
    category: BattleCategory;
    categoryConfig: BattleCategoryConfig;
    myFocusLabel: string;
    myRank: number;
    opponent: BattleOpponent;
    startTime: number;
    myFocusSeconds: number;
    opponentFocusSeconds: number;
    opponentTargetSeconds: number; // hidden until battle ends
    status: BattleStatus;
    result: BattleResult | null;
    xpEarned: number; // calculated at end
}

export interface BattleHistoryEntry {
    id: string;
    category: BattleCategory;
    myFocusLabel: string;
    opponentName: string;
    opponentAvatar: string;
    opponentRank: number;
    myTimeSeconds: number;
    opponentTimeSeconds: number;
    result: BattleResult;
    xpEarned: number;
    timestamp: number;
}

// ============================================
// STATE
// ============================================
interface BattleState {
    // Current battle
    currentBattle: ActiveBattle | null;
    status: BattleStatus;

    // History
    battleHistory: BattleHistoryEntry[];
    totalWins: number;
    totalLosses: number;
    totalTies: number;
    winStreak: number;
    bestWinStreak: number;

    // UI state
    selectedCategory: BattleCategory | null;

    // Actions
    selectCategory: (category: BattleCategory) => void;
    startMatchmaking: (focusLabel: string, playerRank: number) => Promise<void>;
    onMatchmakingComplete: () => void;
    onCountdownComplete: () => void;
    updateMyFocusTime: (seconds: number) => void;
    endBattle: (myFinalSeconds: number) => BattleResult;
    forfeitBattle: () => BattleResult;
    clearBattle: () => void;
    getStats: () => { wins: number; losses: number; ties: number; winRate: number; streak: number };
}

// ============================================
// STORE
// ============================================
export const useBattleStore = create<BattleState>()(
    persist(
        (set, get) => ({
            currentBattle: null,
            status: 'idle',
            battleHistory: [],
            totalWins: 0,
            totalLosses: 0,
            totalTies: 0,
            winStreak: 0,
            bestWinStreak: 0,
            selectedCategory: null,

            // Select battle category
            selectCategory: (category: BattleCategory) => {
                set({ selectedCategory: category });
            },

            // Start matchmaking — finds a bot disguised as real player
            // In future: check Firestore for real opponents first, fall back to bot after 10s
            startMatchmaking: async (focusLabel: string, playerRank: number) => {
                const { selectedCategory } = get();
                if (!selectedCategory) return;

                const categoryConfig = BATTLE_CATEGORIES.find(c => c.id === selectedCategory)!;

                // Select a bot matched to player rank
                const bot = selectBot(playerRank);
                const botFocusLabel = getBotFocusLabel(bot);
                const botFocusMinutes = simulateBotFocus(bot, selectedCategory);
                const botFocusSeconds = botFocusMinutes * 60;

                // Disguise bot as real player
                const disguise = getHumanDisguise();

                const battleId = `battle_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

                const battle: ActiveBattle = {
                    id: battleId,
                    category: selectedCategory,
                    categoryConfig,
                    myFocusLabel: focusLabel || 'Focus session',
                    myRank: playerRank,
                    opponent: {
                        id: `user_${Math.random().toString(36).slice(2, 10)}`,
                        name: disguise.name,
                        avatar: disguise.avatar,
                        rankLevel: bot.rankLevel,
                        focusLabel: botFocusLabel,
                        isBot: false, // Always false — indistinguishable from real
                    },
                    startTime: 0,
                    myFocusSeconds: 0,
                    opponentFocusSeconds: 0,
                    opponentTargetSeconds: botFocusSeconds,
                    status: 'matchmaking',
                    result: null,
                    xpEarned: 0,
                };

                set({ currentBattle: battle, status: 'matchmaking' });
            },

            // Called when matchmaking animation finishes → start countdown
            onMatchmakingComplete: () => {
                set(state => ({
                    status: 'countdown',
                    currentBattle: state.currentBattle
                        ? { ...state.currentBattle, status: 'countdown' }
                        : null,
                }));
            },

            // Called when countdown finishes → battle starts
            onCountdownComplete: () => {
                const now = Date.now();
                set(state => ({
                    status: 'active',
                    currentBattle: state.currentBattle
                        ? { ...state.currentBattle, status: 'active', startTime: now }
                        : null,
                }));
            },

            // Update player's focus time (called every second from timer)
            updateMyFocusTime: (seconds: number) => {
                set(state => {
                    if (!state.currentBattle) return {};

                    // Simulate opponent progress (for UI — bot "catches up" gradually)
                    const targetSec = state.currentBattle.opponentTargetSeconds;
                    // Bot progress is simulated as a smooth curve up to their target
                    // Show ~80% of their real progress to add suspense
                    const botElapsed = Math.min(seconds * 0.85, targetSec);

                    return {
                        currentBattle: {
                            ...state.currentBattle,
                            myFocusSeconds: seconds,
                            opponentFocusSeconds: Math.round(botElapsed),
                        },
                    };
                });
            },

            // End battle — determine winner + calculate dynamic XP
            endBattle: (myFinalSeconds: number): BattleResult => {
                const battle = get().currentBattle;
                if (!battle) return 'forfeit';

                const opponentSeconds = battle.opponentTargetSeconds;
                const diff = Math.abs(myFinalSeconds - opponentSeconds);
                const prevState = get();

                let result: BattleResult;

                if (diff <= 60) {
                    result = 'tie';
                } else if (myFinalSeconds > opponentSeconds) {
                    result = 'win';
                } else {
                    result = 'loss';
                }

                // ✨ Dynamic XP calculation
                const xpEarned = calculateBattleXP({
                    category: battle.category,
                    myFocusSeconds: myFinalSeconds,
                    opponentFocusSeconds: opponentSeconds,
                    myRank: battle.myRank,
                    opponentRank: battle.opponent.rankLevel,
                    winStreak: result === 'win' ? prevState.winStreak : 0,
                    result,
                });

                // Create history entry
                const historyEntry: BattleHistoryEntry = {
                    id: battle.id,
                    category: battle.category,
                    myFocusLabel: battle.myFocusLabel,
                    opponentName: battle.opponent.name,
                    opponentAvatar: battle.opponent.avatar,
                    opponentRank: battle.opponent.rankLevel,
                    myTimeSeconds: myFinalSeconds,
                    opponentTimeSeconds: opponentSeconds,
                    result,
                    xpEarned,
                    timestamp: Date.now(),
                };

                // Update stats
                const newWins = prevState.totalWins + (result === 'win' ? 1 : 0);
                const newLosses = prevState.totalLosses + (result === 'loss' ? 1 : 0);
                const newTies = prevState.totalTies + (result === 'tie' ? 1 : 0);
                const newStreak = result === 'win' ? prevState.winStreak + 1 : 0;
                const bestStreak = Math.max(prevState.bestWinStreak, newStreak);

                set({
                    currentBattle: {
                        ...battle,
                        myFocusSeconds: myFinalSeconds,
                        opponentFocusSeconds: opponentSeconds,
                        status: 'completed',
                        result,
                        xpEarned,
                    },
                    status: 'completed',
                    battleHistory: [historyEntry, ...prevState.battleHistory].slice(0, 50),
                    totalWins: newWins,
                    totalLosses: newLosses,
                    totalTies: newTies,
                    winStreak: newStreak,
                    bestWinStreak: bestStreak,
                });

                // Write to Firestore
                const user = auth.currentUser;
                if (user) {
                    setDoc(doc(db, 'users', user.uid, 'battle_history', battle.id), {
                        ...historyEntry,
                        timestamp: serverTimestamp(),
                    }).catch(err => console.error('Failed to save battle history:', err));

                    setDoc(doc(db, 'users', user.uid, 'stats', 'main'), {
                        battlesWon: newWins,
                        battlesLost: newLosses,
                        battlesPlayed: newWins + newLosses + newTies,
                    }, { merge: true }).catch(err => console.error('Failed to update stats:', err));
                }

                return result;
            },

            // Forfeit active battle
            forfeitBattle: (): BattleResult => {
                const battle = get().currentBattle;
                if (!battle) return 'forfeit';
                return get().endBattle(battle.myFocusSeconds);
            },

            // Clear battle state (after viewing results)
            clearBattle: () => {
                set({
                    currentBattle: null,
                    status: 'idle',
                });
            },

            // Get battle stats
            getStats: () => {
                const { totalWins, totalLosses, totalTies, winStreak } = get();
                const total = totalWins + totalLosses + totalTies;
                return {
                    wins: totalWins,
                    losses: totalLosses,
                    ties: totalTies,
                    winRate: total > 0 ? Math.round((totalWins / total) * 100) : 0,
                    streak: winStreak,
                };
            },
        }),
        {
            name: 'focusguard-battles',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                battleHistory: state.battleHistory,
                totalWins: state.totalWins,
                totalLosses: state.totalLosses,
                totalTies: state.totalTies,
                winStreak: state.winStreak,
                bestWinStreak: state.bestWinStreak,
            }),
        }
    )
);

export default useBattleStore;
