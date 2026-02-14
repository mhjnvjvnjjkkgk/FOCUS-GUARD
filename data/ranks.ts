/**
 * Ranks & Levels System — 10 Ranks with Milestone-Based Unlock Goals
 * Each rank requires BOTH XP threshold AND specific achievement milestones.
 */

export interface RankRequirement {
    xpRequired: number;
    focusMinutes?: number;        // Total focus time in minutes
    sessionsCompleted?: number;   // Total completed focus sessions
    tasksCompleted?: number;      // Total completed tasks
    streakDays?: number;          // Longest streak (days)
    achievementsUnlocked?: number;// Total achievements unlocked
    battlesWon?: number;          // Focus battles won (future)
}

export interface Rank {
    level: number;
    title: string;
    badge: string;
    requirements: RankRequirement;
    color: string;
    gradientStart: string;
    gradientEnd: string;
    description: string;          // Flavor text for the rank
}

export interface StreakBadge {
    id: string;
    name: string;
    icon: string;
    streakRequired: number;
    color: string;
}

// ============================================
// 10 RANKS — Each requires XP + milestones
// ============================================
export const RANKS: Rank[] = [
    {
        level: 1,
        title: 'Rookie',
        badge: '🐣',
        requirements: { xpRequired: 0 },
        color: '#9E9E9E',
        gradientStart: '#BDBDBD',
        gradientEnd: '#757575',
        description: 'Every legend starts somewhere. Welcome to FocusGuard.',
    },
    {
        level: 2,
        title: 'Apprentice',
        badge: '🔰',
        requirements: {
            xpRequired: 500,
            sessionsCompleted: 5,
        },
        color: '#8D6E63',
        gradientStart: '#A1887F',
        gradientEnd: '#6D4C41',
        description: 'You\'ve proven you can show up. Now prove you can stay.',
    },
    {
        level: 3,
        title: 'Grinder',
        badge: '⚒️',
        requirements: {
            xpRequired: 2000,
            sessionsCompleted: 20,
            streakDays: 3,
            tasksCompleted: 5,
        },
        color: '#FF8A65',
        gradientStart: '#FFAB91',
        gradientEnd: '#E64A19',
        description: 'Consistency is your weapon. The grind never stops.',
    },
    {
        level: 4,
        title: 'Warrior',
        badge: '⚔️',
        requirements: {
            xpRequired: 5000,
            focusMinutes: 60,
            streakDays: 7,
        },
        color: '#42A5F5',
        gradientStart: '#64B5F6',
        gradientEnd: '#1E88E5',
        description: 'Discipline is choosing between what you want now and what you want most.',
    },
    {
        level: 5,
        title: 'Veteran',
        badge: '🛡️',
        requirements: {
            xpRequired: 10000,
            focusMinutes: 300,
            achievementsUnlocked: 10,
            tasksCompleted: 25,
        },
        color: '#66BB6A',
        gradientStart: '#81C784',
        gradientEnd: '#388E3C',
        description: 'Battle-tested and unbreakable. You\'ve seen it all.',
    },
    {
        level: 6,
        title: 'Elite',
        badge: '💎',
        requirements: {
            xpRequired: 20000,
            focusMinutes: 900,
            streakDays: 14,
            tasksCompleted: 50,
        },
        color: '#AB47BC',
        gradientStart: '#CE93D8',
        gradientEnd: '#7B1FA2',
        description: 'Top 1%. Your focus cuts through everything.',
    },
    {
        level: 7,
        title: 'Master',
        badge: '🔥',
        requirements: {
            xpRequired: 40000,
            focusMinutes: 2400,
            achievementsUnlocked: 30,
            tasksCompleted: 100,
        },
        color: '#EF5350',
        gradientStart: '#EF9A9A',
        gradientEnd: '#C62828',
        description: 'Others dream about it. You do it. Every. Single. Day.',
    },
    {
        level: 8,
        title: 'Champion',
        badge: '👑',
        requirements: {
            xpRequired: 70000,
            focusMinutes: 4800,
            streakDays: 30,
            tasksCompleted: 200,
        },
        color: '#FFB300',
        gradientStart: '#FFCA28',
        gradientEnd: '#FF8F00',
        description: 'Crowned by performance, not promises. Long live the king.',
    },
    {
        level: 9,
        title: 'Legend',
        badge: '⭐',
        requirements: {
            xpRequired: 120000,
            focusMinutes: 9000,
            achievementsUnlocked: 60,
            tasksCompleted: 500,
        },
        color: '#E040FB',
        gradientStart: '#EA80FC',
        gradientEnd: '#AA00FF',
        description: 'Your name echoes through the halls. Legends never die.',
    },
    {
        level: 10,
        title: 'FocusGuard God',
        badge: '⚡',
        requirements: {
            xpRequired: 200000,
            focusMinutes: 18000,
            achievementsUnlocked: 90,
            streakDays: 100,
        },
        color: '#FF1744',
        gradientStart: '#FF5252',
        gradientEnd: '#D50000',
        description: 'Mortal focus was never enough. You transcended.',
    },
];

// ============================================
// STREAK BADGES
// ============================================
export const STREAK_BADGES: StreakBadge[] = [
    { id: 'sb1', name: 'On Fire', icon: '🔥', streakRequired: 3, color: '#FF5722' },
    { id: 'sb2', name: 'Consistent', icon: '⭐', streakRequired: 7, color: '#FFC107' },
    { id: 'sb3', name: 'Unstoppable', icon: '💪', streakRequired: 14, color: '#4CAF50' },
    { id: 'sb4', name: 'Monthly King', icon: '👑', streakRequired: 30, color: '#FFD700' },
    { id: 'sb5', name: 'Legend', icon: '🏆', streakRequired: 100, color: '#E040FB' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if all rank requirements are met
 */
export function meetsRankRequirements(
    rank: Rank,
    stats: {
        xp: number;
        focusMinutes: number;
        sessionsCompleted: number;
        tasksCompleted: number;
        streakDays: number;
        achievementsUnlocked: number;
        battlesWon: number;
    }
): boolean {
    const req = rank.requirements;
    if (stats.xp < req.xpRequired) return false;
    if (req.focusMinutes && stats.focusMinutes < req.focusMinutes) return false;
    if (req.sessionsCompleted && stats.sessionsCompleted < req.sessionsCompleted) return false;
    if (req.tasksCompleted && stats.tasksCompleted < req.tasksCompleted) return false;
    if (req.streakDays && stats.streakDays < req.streakDays) return false;
    if (req.achievementsUnlocked && stats.achievementsUnlocked < req.achievementsUnlocked) return false;
    if (req.battlesWon && stats.battlesWon < req.battlesWon) return false;
    return true;
}

/**
 * Get the current rank for given stats
 */
export function getRankForStats(stats: {
    xp: number;
    focusMinutes: number;
    sessionsCompleted: number;
    tasksCompleted: number;
    streakDays: number;
    achievementsUnlocked: number;
    battlesWon: number;
}): Rank {
    let current = RANKS[0];
    for (const rank of RANKS) {
        if (meetsRankRequirements(rank, stats)) {
            current = rank;
        } else {
            break;
        }
    }
    return current;
}

/**
 * Legacy compatibility: Get rank by XP only (for simple lookups)
 */
export function getRankForXP(xp: number): Rank {
    let current = RANKS[0];
    for (const rank of RANKS) {
        if (xp >= rank.requirements.xpRequired) {
            current = rank;
        } else {
            break;
        }
    }
    return current;
}

/**
 * Get next rank info with per-requirement progress
 */
export function getNextRank(xp: number): { rank: Rank; xpNeeded: number; progress: number } | null {
    const currentRank = getRankForXP(xp);
    const nextIndex = RANKS.findIndex(r => r.level === currentRank.level + 1);
    if (nextIndex === -1) return null;

    const nextRank = RANKS[nextIndex];
    const xpNeeded = nextRank.requirements.xpRequired - xp;
    const totalRange = nextRank.requirements.xpRequired - currentRank.requirements.xpRequired;
    const progress = totalRange > 0 ? Math.min((xp - currentRank.requirements.xpRequired) / totalRange, 1) : 1;

    return { rank: nextRank, xpNeeded, progress };
}

/**
 * Get detailed progress toward next rank (all requirements)
 */
export function getNextRankProgress(stats: {
    xp: number;
    focusMinutes: number;
    sessionsCompleted: number;
    tasksCompleted: number;
    streakDays: number;
    achievementsUnlocked: number;
    battlesWon: number;
}): {
    nextRank: Rank;
    requirements: { label: string; current: number; required: number; met: boolean; icon: string }[];
    overallProgress: number;
} | null {
    const currentRank = getRankForStats(stats);
    const nextIndex = RANKS.findIndex(r => r.level === currentRank.level + 1);
    if (nextIndex === -1) return null;

    const nextRank = RANKS[nextIndex];
    const req = nextRank.requirements;

    const requirements: { label: string; current: number; required: number; met: boolean; icon: string }[] = [];

    // Always show XP
    requirements.push({
        label: 'Total XP',
        current: stats.xp,
        required: req.xpRequired,
        met: stats.xp >= req.xpRequired,
        icon: '⚡',
    });

    if (req.focusMinutes) {
        requirements.push({
            label: 'Focus Time',
            current: stats.focusMinutes,
            required: req.focusMinutes,
            met: stats.focusMinutes >= req.focusMinutes,
            icon: '⏱️',
        });
    }

    if (req.sessionsCompleted) {
        requirements.push({
            label: 'Sessions',
            current: stats.sessionsCompleted,
            required: req.sessionsCompleted,
            met: stats.sessionsCompleted >= req.sessionsCompleted,
            icon: '🎯',
        });
    }

    if (req.tasksCompleted) {
        requirements.push({
            label: 'Tasks Done',
            current: stats.tasksCompleted,
            required: req.tasksCompleted,
            met: stats.tasksCompleted >= req.tasksCompleted,
            icon: '✅',
        });
    }

    if (req.streakDays) {
        requirements.push({
            label: 'Streak Days',
            current: stats.streakDays,
            required: req.streakDays,
            met: stats.streakDays >= req.streakDays,
            icon: '🔥',
        });
    }

    if (req.achievementsUnlocked) {
        requirements.push({
            label: 'Achievements',
            current: stats.achievementsUnlocked,
            required: req.achievementsUnlocked,
            met: stats.achievementsUnlocked >= req.achievementsUnlocked,
            icon: '🏆',
        });
    }

    if (req.battlesWon) {
        requirements.push({
            label: 'Battles Won',
            current: stats.battlesWon,
            required: req.battlesWon,
            met: stats.battlesWon >= req.battlesWon,
            icon: '⚔️',
        });
    }

    const metCount = requirements.filter(r => r.met).length;
    const overallProgress = requirements.length > 0 ? metCount / requirements.length : 0;

    return { nextRank, requirements, overallProgress };
}

/**
 * Get the highest streak badge earned
 */
export function getStreakBadge(streak: number): StreakBadge | null {
    let best: StreakBadge | null = null;
    for (const badge of STREAK_BADGES) {
        if (streak >= badge.streakRequired) {
            best = badge;
        }
    }
    return best;
}

/**
 * Get all earned streak badges
 */
export function getEarnedStreakBadges(streak: number): StreakBadge[] {
    return STREAK_BADGES.filter(b => streak >= b.streakRequired);
}

export default RANKS;
