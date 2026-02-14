/**
 * Bot Pool — AI opponents for Focus Battles
 * Each bot has a personality, rank range, focus behavior, and quit tendency.
 * Designed for easy transition to real multiplayer later.
 */

// ============================================
// TYPES
// ============================================
export type BattleCategory = 'quick' | 'standard' | 'extended' | 'marathon';

export interface BattleCategoryConfig {
    id: BattleCategory;
    label: string;
    emoji: string;
    description: string;
    minMinutes: number;
    maxMinutes: number;
    minStake: number;
    maxStake: number;
    defaultStake: number;
    color: string;
    gradientStart: string;
    gradientEnd: string;
}

export interface BotConfig {
    id: string;
    name: string;
    rankLevel: number;
    avatar: string;
    focusLabels: string[];  // random pick each match
    // Per-category focus behavior
    behavior: {
        quick: { minMin: number; maxMin: number; quitChance: number };
        standard: { minMin: number; maxMin: number; quitChance: number };
        extended: { minMin: number; maxMin: number; quitChance: number };
        marathon: { minMin: number; maxMin: number; quitChance: number };
    };
}

// ============================================
// BATTLE CATEGORIES
// ============================================
export const BATTLE_CATEGORIES: BattleCategoryConfig[] = [
    {
        id: 'quick', label: 'QUICK', emoji: '⚡',
        description: 'Speed round. Prove you can lock in fast.',
        minMinutes: 0, maxMinutes: 15,
        minStake: 25, maxStake: 100, defaultStake: 25,
        color: '#FFB300', gradientStart: '#FFD54F', gradientEnd: '#FF8F00',
    },
    {
        id: 'standard', label: 'STANDARD', emoji: '🎯',
        description: 'The classic duel. Focus wins.',
        minMinutes: 15, maxMinutes: 45,
        minStake: 50, maxStake: 200, defaultStake: 75,
        color: '#4A9EFF', gradientStart: '#64B5F6', gradientEnd: '#1565C0',
    },
    {
        id: 'extended', label: 'EXTENDED', emoji: '🔥',
        description: 'Endurance test. Only the strong survive.',
        minMinutes: 45, maxMinutes: 90,
        minStake: 100, maxStake: 400, defaultStake: 150,
        color: '#FF6B35', gradientStart: '#FF8A65', gradientEnd: '#D84315',
    },
    {
        id: 'marathon', label: 'MARATHON', emoji: '💀',
        description: 'The ultimate challenge. Legends only.',
        minMinutes: 90, maxMinutes: 180,
        minStake: 200, maxStake: 500, defaultStake: 300,
        color: '#B366FF', gradientStart: '#CE93D8', gradientEnd: '#7B1FA2',
    },
];

// ============================================
// BOT POOL (20+ bots)
// ============================================
export const BOT_POOL: BotConfig[] = [
    // --- Tier 1: Rookie bots (rank 1-2) ---
    {
        id: 'bot_rookie_01', name: 'StudyBuddy_01', rankLevel: 1, avatar: '🤖',
        focusLabels: ['Reading notes', 'Homework', 'Reviewing flashcards'],
        behavior: {
            quick: { minMin: 3, maxMin: 8, quitChance: 0.35 },
            standard: { minMin: 8, maxMin: 20, quitChance: 0.30 },
            extended: { minMin: 15, maxMin: 35, quitChance: 0.40 },
            marathon: { minMin: 30, maxMin: 60, quitChance: 0.50 },
        },
    },
    {
        id: 'bot_rookie_02', name: 'Newbie_Nerd', rankLevel: 1, avatar: '🐣',
        focusLabels: ['Math practice', 'Spelling words', 'Science quiz'],
        behavior: {
            quick: { minMin: 2, maxMin: 7, quitChance: 0.40 },
            standard: { minMin: 5, maxMin: 18, quitChance: 0.35 },
            extended: { minMin: 10, maxMin: 30, quitChance: 0.45 },
            marathon: { minMin: 20, maxMin: 50, quitChance: 0.55 },
        },
    },
    {
        id: 'bot_rookie_03', name: 'FreshStart_X', rankLevel: 2, avatar: '🌱',
        focusLabels: ['Daily reading', 'Journaling', 'Language practice'],
        behavior: {
            quick: { minMin: 4, maxMin: 10, quitChance: 0.25 },
            standard: { minMin: 10, maxMin: 25, quitChance: 0.25 },
            extended: { minMin: 20, maxMin: 40, quitChance: 0.35 },
            marathon: { minMin: 35, maxMin: 70, quitChance: 0.40 },
        },
    },
    {
        id: 'bot_rookie_04', name: 'LearnBot_7', rankLevel: 2, avatar: '📚',
        focusLabels: ['Chapter review', 'Practice problems', 'Essay writing'],
        behavior: {
            quick: { minMin: 5, maxMin: 11, quitChance: 0.20 },
            standard: { minMin: 12, maxMin: 28, quitChance: 0.20 },
            extended: { minMin: 25, maxMin: 50, quitChance: 0.30 },
            marathon: { minMin: 40, maxMin: 80, quitChance: 0.35 },
        },
    },

    // --- Tier 2: Grinder bots (rank 3-4) ---
    {
        id: 'bot_grinder_01', name: 'GrindKing_42', rankLevel: 3, avatar: '⚒️',
        focusLabels: ['Coding project', 'Algorithm practice', 'Debugging'],
        behavior: {
            quick: { minMin: 7, maxMin: 13, quitChance: 0.15 },
            standard: { minMin: 18, maxMin: 35, quitChance: 0.15 },
            extended: { minMin: 35, maxMin: 65, quitChance: 0.20 },
            marathon: { minMin: 60, maxMin: 120, quitChance: 0.25 },
        },
    },
    {
        id: 'bot_grinder_02', name: 'CodeMonkey_99', rankLevel: 3, avatar: '🐒',
        focusLabels: ['Web development', 'React project', 'API integration'],
        behavior: {
            quick: { minMin: 6, maxMin: 12, quitChance: 0.20 },
            standard: { minMin: 15, maxMin: 32, quitChance: 0.18 },
            extended: { minMin: 30, maxMin: 60, quitChance: 0.25 },
            marathon: { minMin: 55, maxMin: 110, quitChance: 0.30 },
        },
    },
    {
        id: 'bot_grinder_03', name: 'NightOwl_X', rankLevel: 4, avatar: '🦉',
        focusLabels: ['Physics chapter 4', 'Lab report', 'Research paper'],
        behavior: {
            quick: { minMin: 8, maxMin: 14, quitChance: 0.10 },
            standard: { minMin: 20, maxMin: 38, quitChance: 0.12 },
            extended: { minMin: 40, maxMin: 70, quitChance: 0.18 },
            marathon: { minMin: 70, maxMin: 130, quitChance: 0.22 },
        },
    },
    {
        id: 'bot_grinder_04', name: 'BrainWave_11', rankLevel: 4, avatar: '🧠',
        focusLabels: ['Medical notes', 'Anatomy study', 'Clinical review'],
        behavior: {
            quick: { minMin: 9, maxMin: 14, quitChance: 0.08 },
            standard: { minMin: 22, maxMin: 40, quitChance: 0.10 },
            extended: { minMin: 42, maxMin: 75, quitChance: 0.15 },
            marathon: { minMin: 75, maxMin: 140, quitChance: 0.20 },
        },
    },

    // --- Tier 3: Warrior bots (rank 5-6) ---
    {
        id: 'bot_warrior_01', name: 'ZenMaster_V', rankLevel: 5, avatar: '🧘',
        focusLabels: ['Deep work session', 'Creative writing', 'Thesis chapter'],
        behavior: {
            quick: { minMin: 10, maxMin: 15, quitChance: 0.05 },
            standard: { minMin: 25, maxMin: 42, quitChance: 0.08 },
            extended: { minMin: 50, maxMin: 80, quitChance: 0.10 },
            marathon: { minMin: 85, maxMin: 150, quitChance: 0.15 },
        },
    },
    {
        id: 'bot_warrior_02', name: 'IronFocus_88', rankLevel: 5, avatar: '🛡️',
        focusLabels: ['Exam prep', 'Mock test', 'Problem solving'],
        behavior: {
            quick: { minMin: 10, maxMin: 15, quitChance: 0.05 },
            standard: { minMin: 28, maxMin: 43, quitChance: 0.07 },
            extended: { minMin: 48, maxMin: 82, quitChance: 0.12 },
            marathon: { minMin: 80, maxMin: 145, quitChance: 0.18 },
        },
    },
    {
        id: 'bot_warrior_03', name: 'EliteGrind_X', rankLevel: 6, avatar: '💎',
        focusLabels: ['Competitive programming', 'System design', 'Advanced algorithms'],
        behavior: {
            quick: { minMin: 11, maxMin: 15, quitChance: 0.03 },
            standard: { minMin: 30, maxMin: 44, quitChance: 0.05 },
            extended: { minMin: 55, maxMin: 85, quitChance: 0.08 },
            marathon: { minMin: 90, maxMin: 160, quitChance: 0.12 },
        },
    },
    {
        id: 'bot_warrior_04', name: 'LaserBeam_77', rankLevel: 6, avatar: '🔥',
        focusLabels: ['Machine learning', 'Data analysis', 'Neural networks'],
        behavior: {
            quick: { minMin: 12, maxMin: 15, quitChance: 0.02 },
            standard: { minMin: 32, maxMin: 45, quitChance: 0.04 },
            extended: { minMin: 58, maxMin: 88, quitChance: 0.07 },
            marathon: { minMin: 95, maxMin: 165, quitChance: 0.10 },
        },
    },

    // --- Tier 4: Elite bots (rank 7-8) ---
    {
        id: 'bot_elite_01', name: 'Champion_01', rankLevel: 7, avatar: '👑',
        focusLabels: ['Dissertation writing', 'Research analysis', 'Publication review'],
        behavior: {
            quick: { minMin: 12, maxMin: 15, quitChance: 0.02 },
            standard: { minMin: 35, maxMin: 45, quitChance: 0.03 },
            extended: { minMin: 62, maxMin: 89, quitChance: 0.05 },
            marathon: { minMin: 100, maxMin: 170, quitChance: 0.08 },
        },
    },
    {
        id: 'bot_elite_02', name: 'Unstoppable_X', rankLevel: 7, avatar: '⚡',
        focusLabels: ['Patent writing', 'Grant proposal', 'Strategic planning'],
        behavior: {
            quick: { minMin: 13, maxMin: 15, quitChance: 0.01 },
            standard: { minMin: 36, maxMin: 45, quitChance: 0.02 },
            extended: { minMin: 65, maxMin: 90, quitChance: 0.04 },
            marathon: { minMin: 110, maxMin: 175, quitChance: 0.06 },
        },
    },
    {
        id: 'bot_elite_03', name: 'FocusLord_99', rankLevel: 8, avatar: '🏆',
        focusLabels: ['Book writing', 'Masterclass prep', 'Research synthesis'],
        behavior: {
            quick: { minMin: 13, maxMin: 15, quitChance: 0.01 },
            standard: { minMin: 38, maxMin: 45, quitChance: 0.02 },
            extended: { minMin: 68, maxMin: 90, quitChance: 0.03 },
            marathon: { minMin: 120, maxMin: 178, quitChance: 0.05 },
        },
    },
    {
        id: 'bot_elite_04', name: 'Apex_Mind', rankLevel: 8, avatar: '🌟',
        focusLabels: ['Quantum physics', 'Advanced mathematics', 'Philosophy thesis'],
        behavior: {
            quick: { minMin: 14, maxMin: 15, quitChance: 0.005 },
            standard: { minMin: 40, maxMin: 45, quitChance: 0.01 },
            extended: { minMin: 72, maxMin: 90, quitChance: 0.02 },
            marathon: { minMin: 130, maxMin: 180, quitChance: 0.03 },
        },
    },

    // --- Tier 5: Legend bots (rank 9-10) — very hard ---
    {
        id: 'bot_legend_01', name: 'GOD_MODE', rankLevel: 9, avatar: '⭐',
        focusLabels: ['World domination plan', 'Singularity research', 'Time travel theory'],
        behavior: {
            quick: { minMin: 14, maxMin: 15, quitChance: 0.001 },
            standard: { minMin: 42, maxMin: 45, quitChance: 0.005 },
            extended: { minMin: 80, maxMin: 90, quitChance: 0.01 },
            marathon: { minMin: 150, maxMin: 180, quitChance: 0.02 },
        },
    },
    {
        id: 'bot_legend_02', name: 'FINAL_BOSS', rankLevel: 10, avatar: '💀',
        focusLabels: ['Transcendence', 'Absolute focus', 'The void'],
        behavior: {
            quick: { minMin: 15, maxMin: 15, quitChance: 0 },
            standard: { minMin: 44, maxMin: 45, quitChance: 0.001 },
            extended: { minMin: 85, maxMin: 90, quitChance: 0.005 },
            marathon: { minMin: 170, maxMin: 180, quitChance: 0.01 },
        },
    },
];

// ============================================
// BOT SELECTION
// ============================================
/**
 * Select a random bot matched to the player's rank level (±1).
 * Falls back to any bot if no good match found.
 */
export function selectBot(playerRank: number): BotConfig {
    // Find bots within ±1 rank
    const matched = BOT_POOL.filter(
        b => Math.abs(b.rankLevel - playerRank) <= 1
    );
    const pool = matched.length > 0 ? matched : BOT_POOL;
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Simulate a bot's focus duration for a given category.
 * Returns the number of minutes the bot will focus.
 * If the bot "quits early," returns a shorter time.
 */
export function simulateBotFocus(bot: BotConfig, category: BattleCategory): number {
    const beh = bot.behavior[category];

    // Check if bot quits early
    if (Math.random() < beh.quitChance) {
        // Bot quits somewhere in the first 40% of their range
        const earlyMax = beh.minMin + (beh.maxMin - beh.minMin) * 0.4;
        return Math.round(beh.minMin + Math.random() * (earlyMax - beh.minMin));
    }

    // Normal focus: random within full range
    return Math.round(beh.minMin + Math.random() * (beh.maxMin - beh.minMin));
}

/**
 * Pick a random focus label from a bot's pool.
 */
export function getBotFocusLabel(bot: BotConfig): string {
    return bot.focusLabels[Math.floor(Math.random() * bot.focusLabels.length)];
}

export default BOT_POOL;
