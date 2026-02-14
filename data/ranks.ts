/**
 * Ranks & Levels System
 * XP thresholds, rank definitions, streak badges, and helper functions
 */

export interface Rank {
    level: number;
    title: string;
    badge: string;
    xpRequired: number;
    color: string;        // Primary color for rank
    gradientStart: string;
    gradientEnd: string;
}

export interface StreakBadge {
    id: string;
    name: string;
    icon: string;
    streakRequired: number;
    color: string;
}

// ============================================
// 20 RANKS — XP = totalPointsEarned
// ============================================
export const RANKS: Rank[] = [
    { level: 1, title: 'Sleepy Starter', badge: '😴', xpRequired: 0, color: '#9E9E9E', gradientStart: '#BDBDBD', gradientEnd: '#757575' },
    { level: 2, title: 'Drowsy Doer', badge: '🥱', xpRequired: 100, color: '#8D6E63', gradientStart: '#A1887F', gradientEnd: '#6D4C41' },
    { level: 3, title: 'Alarm Apprentice', badge: '⏰', xpRequired: 300, color: '#FF8A65', gradientStart: '#FFAB91', gradientEnd: '#E64A19' },
    { level: 4, title: 'Focus Rookie', badge: '🔰', xpRequired: 600, color: '#66BB6A', gradientStart: '#81C784', gradientEnd: '#388E3C' },
    { level: 5, title: 'Task Tackler', badge: '📋', xpRequired: 1000, color: '#42A5F5', gradientStart: '#64B5F6', gradientEnd: '#1E88E5' },
    { level: 6, title: 'Habit Builder', badge: '🧱', xpRequired: 1500, color: '#AB47BC', gradientStart: '#CE93D8', gradientEnd: '#7B1FA2' },
    { level: 7, title: 'Rhythm Keeper', badge: '🎵', xpRequired: 2500, color: '#26C6DA', gradientStart: '#4DD0E1', gradientEnd: '#00838F' },
    { level: 8, title: 'Deep Worker', badge: '🔬', xpRequired: 4000, color: '#5C6BC0', gradientStart: '#7986CB', gradientEnd: '#303F9F' },
    { level: 9, title: 'Flow Finder', badge: '🌊', xpRequired: 6000, color: '#29B6F6', gradientStart: '#4FC3F7', gradientEnd: '#0277BD' },
    { level: 10, title: 'Discipline Knight', badge: '⚔️', xpRequired: 8500, color: '#EF5350', gradientStart: '#EF9A9A', gradientEnd: '#C62828' },
    { level: 11, title: 'Streak Warrior', badge: '🔥', xpRequired: 12000, color: '#FF7043', gradientStart: '#FF8A65', gradientEnd: '#D84315' },
    { level: 12, title: 'Productivity Pro', badge: '💼', xpRequired: 16000, color: '#78909C', gradientStart: '#90A4AE', gradientEnd: '#37474F' },
    { level: 13, title: 'Time Lord', badge: '⏳', xpRequired: 21000, color: '#FFA726', gradientStart: '#FFB74D', gradientEnd: '#EF6C00' },
    { level: 14, title: 'Zen Master', badge: '🧘', xpRequired: 27000, color: '#9CCC65', gradientStart: '#AED581', gradientEnd: '#558B2F' },
    { level: 15, title: 'Focus Overlord', badge: '👁️', xpRequired: 35000, color: '#EC407A', gradientStart: '#F48FB1', gradientEnd: '#AD1457' },
    { level: 16, title: 'Golden Guardian', badge: '🛡️', xpRequired: 45000, color: '#FFD54F', gradientStart: '#FFE082', gradientEnd: '#F9A825' },
    { level: 17, title: 'Diamond Mind', badge: '💎', xpRequired: 60000, color: '#4DD0E1', gradientStart: '#80DEEA', gradientEnd: '#00838F' },
    { level: 18, title: 'Legendary Focuser', badge: '🏆', xpRequired: 80000, color: '#FFB300', gradientStart: '#FFCA28', gradientEnd: '#FF8F00' },
    { level: 19, title: 'Mythic Achiever', badge: '🌟', xpRequired: 100000, color: '#E040FB', gradientStart: '#EA80FC', gradientEnd: '#AA00FF' },
    { level: 20, title: 'FocusGuard God', badge: '⚡', xpRequired: 150000, color: '#FF1744', gradientStart: '#FF5252', gradientEnd: '#D50000' },
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
 * Get the current rank for given XP
 */
export function getRankForXP(xp: number): Rank {
    let current = RANKS[0];
    for (const rank of RANKS) {
        if (xp >= rank.xpRequired) {
            current = rank;
        } else {
            break;
        }
    }
    return current;
}

/**
 * Get next rank info (or null if max rank)
 */
export function getNextRank(xp: number): { rank: Rank; xpNeeded: number; progress: number } | null {
    const currentRank = getRankForXP(xp);
    const nextIndex = RANKS.findIndex(r => r.level === currentRank.level + 1);
    if (nextIndex === -1) return null; // Max rank

    const nextRank = RANKS[nextIndex];
    const xpNeeded = nextRank.xpRequired - xp;
    const totalRange = nextRank.xpRequired - currentRank.xpRequired;
    const progress = totalRange > 0 ? Math.min((xp - currentRank.xpRequired) / totalRange, 1) : 1;

    return { rank: nextRank, xpNeeded, progress };
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
