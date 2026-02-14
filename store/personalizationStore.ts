/**
 * Personalization Store — Makes the App Feel "Alive"
 * 
 * What billion-dollar apps do that makes you think "this app KNOWS me":
 * 
 * 1. CONTEXTUAL GREETINGS: "Good morning! Your 7-day streak is strong 💪" (not just "Hello")
 * 2. BEHAVIORAL PATTERNS: Knows your best focus times, favorite categories, habits
 * 3. SMART NUDGES: "You usually focus around 3 PM — ready to go?" (appointment creation)
 * 4. PROGRESS NARRATIVES: "You focused 23% more this week!" (makes progress feel real)
 * 5. MOOD-AWARE UI: Different energy at 6 AM vs 11 PM
 * 6. PERSONALIZED RECOMMENDATIONS: "Based on your wins, try Extended battles"
 * 
 * Sources: Spotify Wrapped, Duolingo daily messages, Netflix "Because you watched",
 *          Apple Health trends, TikTok FYP algorithm
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// CONTEXTUAL GREETINGS — Time + Behavior + Streak aware
// ============================================
interface GreetingContext {
    userName: string;
    hour: number;
    focusStreak: number;
    winStreak: number;
    totalBattles: number;
    totalFocusMinutes: number;
    dayOfWeek: number; // 0=Sun
    lastBattleResult: 'win' | 'loss' | 'tie' | null;
    isComingBack: boolean; // Returned after 2+ days
    rankTitle: string;
}

function generateGreeting(ctx: GreetingContext): { greeting: string; subtitle: string; emoji: string } {
    const name = ctx.userName || 'Warrior';
    const hour = ctx.hour;

    // Time-based prefix
    let timeGreeting = '';
    let timeEmoji = '';
    if (hour >= 5 && hour < 12) {
        timeGreeting = 'Good morning';
        timeEmoji = '🌅';
    } else if (hour >= 12 && hour < 17) {
        timeGreeting = 'Good afternoon';
        timeEmoji = '☀️';
    } else if (hour >= 17 && hour < 21) {
        timeGreeting = 'Good evening';
        timeEmoji = '🌆';
    } else {
        timeGreeting = 'Late night grind'; // After 9 PM — make them feel dedicated
        timeEmoji = '🌙';
    }

    // COMEBACK GREETING (highest priority)
    if (ctx.isComingBack) {
        return {
            greeting: `Welcome back, ${name}!`,
            subtitle: 'We missed you. Your comeback XP bonus is active! 🎁',
            emoji: '🎉',
        };
    }

    // STREAK-BASED (high engagement users)
    if (ctx.focusStreak >= 30) {
        return {
            greeting: `${timeGreeting}, Legend!`,
            subtitle: `${ctx.focusStreak}-day streak! You're in the top 1% 🏆`,
            emoji: '👑',
        };
    }

    if (ctx.focusStreak >= 14) {
        return {
            greeting: `${timeGreeting}, ${name}!`,
            subtitle: `${ctx.focusStreak} days of pure focus. Unstoppable 🔥`,
            emoji: timeEmoji,
        };
    }

    if (ctx.focusStreak >= 7) {
        return {
            greeting: `${timeGreeting}, ${name}!`,
            subtitle: `Week-long streak! Keep the momentum going 💪`,
            emoji: timeEmoji,
        };
    }

    // WIN STREAK
    if (ctx.winStreak >= 5) {
        return {
            greeting: `${timeGreeting}, ${ctx.rankTitle}!`,
            subtitle: `${ctx.winStreak} wins in a row! Who can stop you? ⚡`,
            emoji: '🔥',
        };
    }

    // POST-BATTLE
    if (ctx.lastBattleResult === 'loss') {
        return {
            greeting: `${timeGreeting}, ${name}`,
            subtitle: 'Ready for a comeback? Your next battle awaits 💪',
            emoji: '⚔️',
        };
    }

    if (ctx.lastBattleResult === 'win') {
        return {
            greeting: `${timeGreeting}, ${name}!`,
            subtitle: 'Your last win was 🔥 — keep the streak alive!',
            emoji: '🏆',
        };
    }

    // DAY-OF-WEEK specific
    if (ctx.dayOfWeek === 1) { // Monday
        return {
            greeting: `${timeGreeting}, ${name}!`,
            subtitle: 'New week, fresh goals. Let\'s crush it 🚀',
            emoji: timeEmoji,
        };
    }

    if (ctx.dayOfWeek === 5) { // Friday
        return {
            greeting: `${timeGreeting}, ${name}!`,
            subtitle: 'Friday focus = weekend freedom 🎯',
            emoji: timeEmoji,
        };
    }

    // MILESTONE-BASED
    if (ctx.totalBattles > 0 && ctx.totalBattles % 50 === 0) {
        return {
            greeting: `${timeGreeting}, ${name}!`,
            subtitle: `${ctx.totalBattles} battles completed. You're a veteran! 🏅`,
            emoji: '🎖️',
        };
    }

    if (ctx.totalFocusMinutes >= 1000) {
        return {
            greeting: `${timeGreeting}, ${name}!`,
            subtitle: `${Math.round(ctx.totalFocusMinutes / 60)}h+ of deep focus. Extraordinary 🌟`,
            emoji: timeEmoji,
        };
    }

    // DEFAULT (still personalized with name + time)
    const defaultSubtitles = [
        'Ready to focus and dominate? ⚡',
        'Your future self will thank you 🎯',
        'Every second of focus counts 💎',
        'What will you conquer today? 🗡️',
        'Your focus is your superpower 🧠',
    ];
    const idx = (ctx.hour + ctx.dayOfWeek) % defaultSubtitles.length;

    return {
        greeting: `${timeGreeting}, ${name}!`,
        subtitle: defaultSubtitles[idx],
        emoji: timeEmoji,
    };
}

// ============================================
// SMART FOCUS RECOMMENDATIONS
// ============================================
interface FocusPattern {
    hour: number;
    dayOfWeek: number;
    category: string;
    durationMinutes: number;
    won: boolean;
}

function generateRecommendation(patterns: FocusPattern[]): {
    suggestedCategory: string | null;
    suggestedDuration: number;
    reason: string;
} {
    if (patterns.length < 3) {
        return { suggestedCategory: null, suggestedDuration: 25, reason: 'Try a Quick battle to get started!' };
    }

    // Find most successful category
    const categoryWins: Record<string, { wins: number; total: number }> = {};
    patterns.forEach(p => {
        if (!categoryWins[p.category]) categoryWins[p.category] = { wins: 0, total: 0 };
        categoryWins[p.category].total++;
        if (p.won) categoryWins[p.category].wins++;
    });

    let bestCategory = '';
    let bestWinRate = 0;
    Object.entries(categoryWins).forEach(([cat, data]) => {
        const rate = data.total >= 2 ? data.wins / data.total : 0;
        if (rate > bestWinRate) {
            bestWinRate = rate;
            bestCategory = cat;
        }
    });

    // Find optimal time (most wins hour)
    const hourWins: Record<number, number> = {};
    patterns.filter(p => p.won).forEach(p => {
        hourWins[p.hour] = (hourWins[p.hour] || 0) + 1;
    });

    const avgDuration = Math.round(patterns.reduce((a, p) => a + p.durationMinutes, 0) / patterns.length);

    if (bestCategory && bestWinRate > 0.5) {
        return {
            suggestedCategory: bestCategory,
            suggestedDuration: avgDuration,
            reason: `You win ${Math.round(bestWinRate * 100)}% of ${bestCategory} battles!`,
        };
    }

    return {
        suggestedCategory: null,
        suggestedDuration: avgDuration,
        reason: `You focus best for ${avgDuration} minutes on average`,
    };
}

// ============================================
// WEEKLY INSIGHT (Spotify Wrapped-style)
// ============================================
function generateWeeklyInsight(
    thisWeekMinutes: number,
    lastWeekMinutes: number,
    thisWeekBattles: number,
    thisWeekWins: number,
): { headline: string; detail: string; emoji: string; trend: 'up' | 'down' | 'same' } {
    const diff = thisWeekMinutes - lastWeekMinutes;
    const percentChange = lastWeekMinutes > 0 ? Math.round((diff / lastWeekMinutes) * 100) : 0;
    const winRate = thisWeekBattles > 0 ? Math.round((thisWeekWins / thisWeekBattles) * 100) : 0;

    if (diff > 0) {
        return {
            headline: `${Math.abs(percentChange)}% more focus this week!`,
            detail: `${thisWeekMinutes}m vs ${lastWeekMinutes}m last week. ${winRate}% battle win rate.`,
            emoji: '📈',
            trend: 'up',
        };
    } else if (diff < 0) {
        return {
            headline: `Let's get back on track`,
            detail: `${Math.abs(percentChange)}% less than last week. You can bounce back! 💪`,
            emoji: '📉',
            trend: 'down',
        };
    }

    return {
        headline: 'Consistent as always!',
        detail: `${thisWeekMinutes}m focus time. ${winRate}% win rate. Keep it up!`,
        emoji: '💎',
        trend: 'same',
    };
}

// ============================================
// STORE
// ============================================
interface PersonalizationState {
    // Behavior tracking
    focusPatterns: FocusPattern[];
    lastBattleResult: 'win' | 'loss' | 'tie' | null;
    appOpenCount: number;
    lastAppOpenDate: string;

    // Weekly tracking
    thisWeekFocusMinutes: number;
    lastWeekFocusMinutes: number;
    thisWeekBattles: number;
    thisWeekWins: number;
    weekStartDate: string;

    // Actions
    getGreeting: (userName: string, focusStreak: number, winStreak: number, totalBattles: number, totalFocusMinutes: number, rankTitle: string) => ReturnType<typeof generateGreeting>;
    getRecommendation: () => ReturnType<typeof generateRecommendation>;
    getWeeklyInsight: () => ReturnType<typeof generateWeeklyInsight>;
    recordFocusPattern: (pattern: FocusPattern) => void;
    recordBattleResult: (result: 'win' | 'loss' | 'tie') => void;
    recordAppOpen: () => void;
    updateWeeklyStats: (focusMin: number, isBattle: boolean, isWin: boolean) => void;
    getTimeOfDay: () => 'morning' | 'afternoon' | 'evening' | 'night';
    getMotivationalQuote: () => string;
}

const getToday = () => new Date().toISOString().split('T')[0];

export const usePersonalizationStore = create<PersonalizationState>()(
    persist(
        (set, get) => ({
            focusPatterns: [],
            lastBattleResult: null,
            appOpenCount: 0,
            lastAppOpenDate: '',
            thisWeekFocusMinutes: 0,
            lastWeekFocusMinutes: 0,
            thisWeekBattles: 0,
            thisWeekWins: 0,
            weekStartDate: '',

            getGreeting: (userName, focusStreak, winStreak, totalBattles, totalFocusMinutes, rankTitle) => {
                const now = new Date();
                const { lastAppOpenDate, lastBattleResult } = get();
                const lastDate = lastAppOpenDate ? new Date(lastAppOpenDate) : now;
                const daysSinceOpen = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

                return generateGreeting({
                    userName,
                    hour: now.getHours(),
                    focusStreak,
                    winStreak,
                    totalBattles,
                    totalFocusMinutes,
                    dayOfWeek: now.getDay(),
                    lastBattleResult,
                    isComingBack: daysSinceOpen >= 3,
                    rankTitle,
                });
            },

            getRecommendation: () => generateRecommendation(get().focusPatterns),

            getWeeklyInsight: () => {
                const { thisWeekFocusMinutes, lastWeekFocusMinutes, thisWeekBattles, thisWeekWins } = get();
                return generateWeeklyInsight(thisWeekFocusMinutes, lastWeekFocusMinutes, thisWeekBattles, thisWeekWins);
            },

            recordFocusPattern: (pattern) => {
                set({ focusPatterns: [...get().focusPatterns.slice(-100), pattern] }); // Keep last 100
            },

            recordBattleResult: (result) => {
                set({ lastBattleResult: result });
            },

            recordAppOpen: () => {
                const today = getToday();
                set({
                    appOpenCount: get().appOpenCount + 1,
                    lastAppOpenDate: today,
                });
            },

            updateWeeklyStats: (focusMin, isBattle, isWin) => {
                const now = new Date();
                const mondayDate = new Date(now);
                mondayDate.setDate(now.getDate() - now.getDay() + 1);
                const weekStart = mondayDate.toISOString().split('T')[0];

                if (get().weekStartDate !== weekStart) {
                    // New week — rotate stats
                    set({
                        lastWeekFocusMinutes: get().thisWeekFocusMinutes,
                        thisWeekFocusMinutes: focusMin,
                        thisWeekBattles: isBattle ? 1 : 0,
                        thisWeekWins: isWin ? 1 : 0,
                        weekStartDate: weekStart,
                    });
                } else {
                    set({
                        thisWeekFocusMinutes: get().thisWeekFocusMinutes + focusMin,
                        thisWeekBattles: get().thisWeekBattles + (isBattle ? 1 : 0),
                        thisWeekWins: get().thisWeekWins + (isWin ? 1 : 0),
                    });
                }
            },

            getTimeOfDay: () => {
                const h = new Date().getHours();
                if (h >= 5 && h < 12) return 'morning';
                if (h >= 12 && h < 17) return 'afternoon';
                if (h >= 17 && h < 21) return 'evening';
                return 'night';
            },

            getMotivationalQuote: () => {
                const quotes = [
                    "Your focus determines your reality. — George Lucas",
                    "The successful warrior is the average man, with laser-like focus. — Bruce Lee",
                    "Concentrate all your thoughts upon the work in hand. — Alexander Graham Bell",
                    "It is during our darkest moments that we must focus to see the light. — Aristotle",
                    "Where focus goes, energy flows. — Tony Robbins",
                    "The secret of change is to focus all of your energy not on fighting the old, but on building the new. — Socrates",
                    "Starve your distractions, feed your focus.",
                    "Focus on being productive instead of busy. — Tim Ferriss",
                    "The main thing is to keep the main thing the main thing. — Stephen Covey",
                    "You will never reach your destination if you stop and throw stones at every dog that barks. — Winston Churchill",
                ];
                const day = new Date().getDate();
                return quotes[day % quotes.length];
            },
        }),
        {
            name: 'focusguard-personalization',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                focusPatterns: state.focusPatterns,
                lastBattleResult: state.lastBattleResult,
                appOpenCount: state.appOpenCount,
                lastAppOpenDate: state.lastAppOpenDate,
                thisWeekFocusMinutes: state.thisWeekFocusMinutes,
                lastWeekFocusMinutes: state.lastWeekFocusMinutes,
                thisWeekBattles: state.thisWeekBattles,
                thisWeekWins: state.thisWeekWins,
                weekStartDate: state.weekStartDate,
            }),
        }
    )
);

export default usePersonalizationStore;
