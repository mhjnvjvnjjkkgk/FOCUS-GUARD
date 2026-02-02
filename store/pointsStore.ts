/**
 * Points Store - Gamification system for tracking user performance
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Points configuration - MATCHES MASTER PROMPT SPEC
export const POINTS_CONFIG = {
    // Earning Points
    alarm: {
        wakeNoSnooze: 50,        // Wake up without snoozing
        wakeWithSnooze: 25,      // Wake up with 1-2 snoozes (reduced reward)
        snoozeOnce: 10,          // Legacy - kept for compatibility
    },
    task: {
        startTask: 15,           // Start a task (begin working on planned task)
        startedOnTime: 15,       // Within 5 min of scheduled - same as startTask
        startedLate: 10,         // Started but late (reduced)
        fullCompletion: 100,     // Complete task (all sessions)
        partialCompletion: 50,   // Partial task completion (50%+)
    },
    session: {
        completion100: 40,       // Complete focus session
        completion75: 30,        // 75% of session
        completion50: 20,        // 50% of session
        completion25: 10,        // 25% of session
        noDistraction: 25,       // No distractions bonus
        focusStreak: 15,         // Consecutive sessions without break
    },
    bonus: {
        dailyGoalReached: 75,    // Daily goal reached
        streakDayMultiplier: 10, // Streak day bonus = 10 × n (n = current streak)
        readReminder: 5,         // Read/engage with reminder
        stayUnderAppLimit: 20,   // Stay under app limit for the day
        perfectDay: 200,         // All tasks completed 100%
        earlyBird: 50,           // All morning alarms on time
        nightOwl: 50,            // Completed evening tasks
        weekStreak: 500,         // 7 day streak bonus
    },

    // Deducting Points
    deductions: {
        snooze: -10,             // Per snooze
        endSessionEarly: -30,    // End session early / cancel before completion
        skipPlannedTask: -25,    // Skip planned task / mark as skipped
        exceedAppLimit: -15,     // Exceed app limit / go over daily usage limit
        missReminder: -5,        // Miss/ignore scheduled reminder
        missedTask: -25,         // Didn't start planned task (same as skip)
        skippedSession: -30,     // Skipped a focus session (same as end early)
        bannedAppPerMinute: -5,  // Per minute using blocked app (legacy)
        taskAbandoned: -30,      // Started but didn't finish (same as end early)
        lateTo: -15,             // Started task more than 15 min late
    },
};


// Types
export interface PointsEarned {
    alarms: number;
    tasksStarted: number;
    sessionsCompleted: number;
    completionBonus: number;
    noDistractionBonus: number;
    streakBonus: number;
    specialBonuses: number;
}

export interface PointsDeducted {
    snoozes: number;
    missedTasks: number;
    skippedSessions: number;
    bannedAppUsage: number;
    abandoned: number;
    lateStarts: number;
}

export interface SessionRecord {
    id: string;
    date: string;
    timestamp: number;
    taskName: string;
    plannedDuration: number; // minutes
    actualDuration: number; // minutes
    completionRate: number; // 0, 25, 50, 75, 100
    pointsEarned: number;
    wasAbandoned: boolean;
}

export interface DailyPoints {
    date: string;
    earned: PointsEarned;
    deducted: PointsDeducted;
    totalEarned: number;
    totalDeducted: number;
    netPoints: number;
    goalPoints: number;
    goalReached: boolean;

    // Performance metrics
    alarmsTriggered: number;
    alarmsSnoozed: number;
    alarmsOnTime: number;
    tasksPlanned: number;
    tasksStarted: number;
    tasksCompleted: number;
    sessionsCompleted: number;
    sessionsStarted: number;
    totalFocusMinutes: number;
    avgCompletionRate: number;
    blockingViolations: number;

    // Session history
    sessions: SessionRecord[];
}

export interface PointsHistory {
    [date: string]: DailyPoints;
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    requirement: number;
    category: 'focus' | 'alarm' | 'streak' | 'points' | 'tasks';
    unlockedAt?: string;
}

interface PointsState {
    // History
    history: PointsHistory;

    // Current streak
    currentStreak: number;
    longestStreak: number;

    // All-time stats
    totalPointsEarned: number;
    totalPointsDeducted: number;
    totalFocusMinutes: number;
    totalTasksCompleted: number;
    totalSessionsCompleted: number;

    // Achievements
    achievements: Achievement[];

    // Daily goal
    dailyGoal: number;

    // Actions - Points
    addPoints: (date: string, category: keyof PointsEarned, amount: number) => void;
    deductPoints: (date: string, category: keyof PointsDeducted, amount: number) => void;

    // Actions - Metrics
    recordAlarmTriggered: (date: string, snoozed: boolean) => void;
    recordTaskStarted: (date: string, onTime: boolean) => void;
    recordTaskCompleted: (date: string) => void;
    recordSessionStarted: (date: string) => void;
    recordSessionCompleted: (date: string, rating: number, focusMinutes: number, taskName: string, plannedDuration: number) => void;
    recordBlockingViolation: (date: string) => void;
    getSessionHistory: (days?: number) => SessionRecord[];

    // Actions - Streaks
    updateStreak: () => void;

    // Actions - Goals
    setDailyGoal: (goal: number) => void;
    checkDailyGoal: (date: string) => boolean;

    // Actions - Achievements
    checkAchievements: () => void;

    // Getters
    getTodaysPoints: () => DailyPoints | undefined;
    getPointsForDate: (date: string) => DailyPoints | undefined;
    getWeeklyPoints: () => number;
    getMonthlyPoints: () => number;
    getUnlockedAchievements: () => Achievement[];
    getLockedAchievements: () => Achievement[];

    // Analytics
    getPointsTrend: (days: number) => { date: string; points: number }[];
    getAverageDaily: () => number;
    getBestDay: () => { date: string; points: number } | undefined;
}

// Default achievements
const DEFAULT_ACHIEVEMENTS: Achievement[] = [
    // Focus achievements
    { id: 'focus_1h', name: 'First Hour', description: 'Focus for 1 hour total', icon: '⏱️', requirement: 60, category: 'focus' },
    { id: 'focus_10h', name: 'Focus Master', description: 'Focus for 10 hours total', icon: '🎯', requirement: 600, category: 'focus' },
    { id: 'focus_50h', name: 'Focus Legend', description: 'Focus for 50 hours total', icon: '🏆', requirement: 3000, category: 'focus' },

    // Alarm achievements
    { id: 'alarm_nosnooze_5', name: 'Early Riser', description: 'Wake without snoozing 5 times', icon: '🌅', requirement: 5, category: 'alarm' },
    { id: 'alarm_nosnooze_30', name: 'Morning Champion', description: 'Wake without snoozing 30 times', icon: '☀️', requirement: 30, category: 'alarm' },

    // Streak achievements
    { id: 'streak_3', name: 'Getting Started', description: '3 day streak', icon: '🔥', requirement: 3, category: 'streak' },
    { id: 'streak_7', name: 'Week Warrior', description: '7 day streak', icon: '💪', requirement: 7, category: 'streak' },
    { id: 'streak_30', name: 'Monthly Master', description: '30 day streak', icon: '👑', requirement: 30, category: 'streak' },

    // Points achievements
    { id: 'points_1000', name: 'Point Collector', description: 'Earn 1,000 total points', icon: '⭐', requirement: 1000, category: 'points' },
    { id: 'points_10000', name: 'Point Hoarder', description: 'Earn 10,000 total points', icon: '🌟', requirement: 10000, category: 'points' },
    { id: 'points_50000', name: 'Point Tycoon', description: 'Earn 50,000 total points', icon: '💎', requirement: 50000, category: 'points' },

    // Task achievements
    { id: 'tasks_10', name: 'Task Starter', description: 'Complete 10 tasks', icon: '✅', requirement: 10, category: 'tasks' },
    { id: 'tasks_50', name: 'Task Master', description: 'Complete 50 tasks', icon: '📋', requirement: 50, category: 'tasks' },
    { id: 'tasks_100', name: 'Task Legend', description: 'Complete 100 tasks', icon: '🎖️', requirement: 100, category: 'tasks' },
];

// Helpers
const getTodayString = () => new Date().toISOString().split('T')[0];

const createEmptyDailyPoints = (date: string, goalPoints: number): DailyPoints => ({
    date,
    earned: {
        alarms: 0,
        tasksStarted: 0,
        sessionsCompleted: 0,
        completionBonus: 0,
        noDistractionBonus: 0,
        streakBonus: 0,
        specialBonuses: 0,
    },
    deducted: {
        snoozes: 0,
        missedTasks: 0,
        skippedSessions: 0,
        bannedAppUsage: 0,
        abandoned: 0,
        lateStarts: 0,
    },
    totalEarned: 0,
    totalDeducted: 0,
    netPoints: 0,
    goalPoints,
    goalReached: false,
    alarmsTriggered: 0,
    alarmsSnoozed: 0,
    alarmsOnTime: 0,
    tasksPlanned: 0,
    tasksStarted: 0,
    tasksCompleted: 0,
    sessionsCompleted: 0,
    sessionsStarted: 0,
    totalFocusMinutes: 0,
    avgCompletionRate: 0,
    blockingViolations: 0,
    sessions: [],
});

export const usePointsStore = create<PointsState>()(
    persist(
        (set, get) => ({
            history: {},
            currentStreak: 0,
            longestStreak: 0,
            totalPointsEarned: 0,
            totalPointsDeducted: 0,
            totalFocusMinutes: 0,
            totalTasksCompleted: 0,
            totalSessionsCompleted: 0,
            achievements: DEFAULT_ACHIEVEMENTS,
            dailyGoal: 200, // Default 200 per master prompt (adjustable 100-500)

            addPoints: (date, category, amount) => {
                set((state) => {
                    const dailyPoints = state.history[date] || createEmptyDailyPoints(date, state.dailyGoal);

                    const updatedEarned = {
                        ...dailyPoints.earned,
                        [category]: (dailyPoints.earned[category] || 0) + amount,
                    };

                    const totalEarned = Object.values(updatedEarned).reduce((sum, val) => sum + val, 0);
                    const netPoints = totalEarned - dailyPoints.totalDeducted;

                    return {
                        history: {
                            ...state.history,
                            [date]: {
                                ...dailyPoints,
                                earned: updatedEarned,
                                totalEarned,
                                netPoints,
                                goalReached: netPoints >= dailyPoints.goalPoints,
                            },
                        },
                        totalPointsEarned: state.totalPointsEarned + amount,
                    };
                });
            },

            deductPoints: (date, category, amount) => {
                set((state) => {
                    const dailyPoints = state.history[date] || createEmptyDailyPoints(date, state.dailyGoal);

                    const updatedDeducted = {
                        ...dailyPoints.deducted,
                        [category]: dailyPoints.deducted[category] + Math.abs(amount),
                    };

                    const totalDeducted = Object.values(updatedDeducted).reduce((sum, val) => sum + val, 0);
                    const netPoints = dailyPoints.totalEarned - totalDeducted;

                    return {
                        history: {
                            ...state.history,
                            [date]: {
                                ...dailyPoints,
                                deducted: updatedDeducted,
                                totalDeducted,
                                netPoints,
                                goalReached: netPoints >= dailyPoints.goalPoints,
                            },
                        },
                        totalPointsDeducted: state.totalPointsDeducted + Math.abs(amount),
                    };
                });
            },

            recordAlarmTriggered: (date, snoozed) => {
                set((state) => {
                    const dailyPoints = state.history[date] || createEmptyDailyPoints(date, state.dailyGoal);

                    return {
                        history: {
                            ...state.history,
                            [date]: {
                                ...dailyPoints,
                                alarmsTriggered: dailyPoints.alarmsTriggered + 1,
                                alarmsSnoozed: dailyPoints.alarmsSnoozed + (snoozed ? 1 : 0),
                                alarmsOnTime: dailyPoints.alarmsOnTime + (snoozed ? 0 : 1),
                            },
                        },
                    };
                });

                // Add/deduct points
                if (snoozed) {
                    get().deductPoints(date, 'snoozes', 10);
                } else {
                    get().addPoints(date, 'alarms', POINTS_CONFIG.alarm.wakeNoSnooze);
                }
            },

            recordTaskStarted: (date, onTime) => {
                set((state) => {
                    const dailyPoints = state.history[date] || createEmptyDailyPoints(date, state.dailyGoal);

                    return {
                        history: {
                            ...state.history,
                            [date]: {
                                ...dailyPoints,
                                tasksStarted: dailyPoints.tasksStarted + 1,
                            },
                        },
                    };
                });

                const points = onTime ? POINTS_CONFIG.task.startedOnTime : POINTS_CONFIG.task.startedLate;
                get().addPoints(date, 'tasksStarted', points);

                if (!onTime) {
                    get().deductPoints(date, 'lateStarts', 15);
                }
            },

            recordTaskCompleted: (date) => {
                set((state) => {
                    const dailyPoints = state.history[date] || createEmptyDailyPoints(date, state.dailyGoal);

                    return {
                        history: {
                            ...state.history,
                            [date]: {
                                ...dailyPoints,
                                tasksCompleted: dailyPoints.tasksCompleted + 1,
                            },
                        },
                        totalTasksCompleted: state.totalTasksCompleted + 1,
                    };
                });

                get().addPoints(date, 'completionBonus', POINTS_CONFIG.task.fullCompletion);
                get().checkAchievements();
            },

            recordSessionStarted: (date) => {
                set((state) => {
                    const dailyPoints = state.history[date] || createEmptyDailyPoints(date, state.dailyGoal);

                    return {
                        history: {
                            ...state.history,
                            [date]: {
                                ...dailyPoints,
                                sessionsStarted: dailyPoints.sessionsStarted + 1,
                            },
                        },
                    };
                });
            },

            recordSessionCompleted: (date, rating, focusMinutes, taskName, plannedDuration) => {
                set((state) => {
                    const dailyPoints = state.history[date] || createEmptyDailyPoints(date, state.dailyGoal);

                    // Calculate points based on rating
                    let sessionPoints = 0;
                    if (rating >= 100) sessionPoints = POINTS_CONFIG.session.completion100;
                    else if (rating >= 75) sessionPoints = POINTS_CONFIG.session.completion75;
                    else if (rating >= 50) sessionPoints = POINTS_CONFIG.session.completion50;
                    else if (rating >= 25) sessionPoints = POINTS_CONFIG.session.completion25;
                    else sessionPoints = 0; // 0% completion

                    // Create session record
                    const sessionRecord: SessionRecord = {
                        id: `${date}-${Date.now()}`,
                        date,
                        timestamp: Date.now(),
                        taskName: taskName || 'Focus Session',
                        plannedDuration,
                        actualDuration: focusMinutes,
                        completionRate: rating,
                        pointsEarned: sessionPoints,
                        wasAbandoned: rating === 0,
                    };

                    // Calculate avg completion rate
                    const totalRating = dailyPoints.avgCompletionRate * dailyPoints.sessionsCompleted + rating;
                    const newSessionCount = dailyPoints.sessionsCompleted + 1;
                    const avgCompletion = totalRating / newSessionCount;

                    return {
                        history: {
                            ...state.history,
                            [date]: {
                                ...dailyPoints,
                                sessionsCompleted: newSessionCount,
                                totalFocusMinutes: dailyPoints.totalFocusMinutes + focusMinutes,
                                avgCompletionRate: avgCompletion,
                                sessions: [...dailyPoints.sessions, sessionRecord],
                            },
                        },
                        totalSessionsCompleted: state.totalSessionsCompleted + 1,
                        totalFocusMinutes: state.totalFocusMinutes + focusMinutes,
                    };
                });

                // Note: Points are added separately via addPoints/deductPoints in focus.tsx
            },

            recordBlockingViolation: (date) => {
                set((state) => {
                    const dailyPoints = state.history[date] || createEmptyDailyPoints(date, state.dailyGoal);

                    return {
                        history: {
                            ...state.history,
                            [date]: {
                                ...dailyPoints,
                                blockingViolations: dailyPoints.blockingViolations + 1,
                            },
                        },
                    };
                });

                get().deductPoints(date, 'bannedAppUsage', 5);
            },

            getSessionHistory: (days = 30) => {
                const state = get();
                const sessions: SessionRecord[] = [];
                const today = new Date();

                // Get sessions from last N days
                for (let i = 0; i < days; i++) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const dateString = date.toISOString().split('T')[0];

                    const dailyPoints = state.history[dateString];
                    if (dailyPoints && dailyPoints.sessions) {
                        sessions.push(...dailyPoints.sessions);
                    }
                }

                // Sort by timestamp (newest first)
                return sessions.sort((a, b) => b.timestamp - a.timestamp);
            },

            updateStreak: () => {
                const today = getTodayString();
                const history = get().history;

                let streak = 0;
                const checkDate = new Date();

                while (true) {
                    const dateStr = checkDate.toISOString().split('T')[0];
                    const dayPoints = history[dateStr];

                    if (dayPoints && dayPoints.goalReached) {
                        streak++;
                        checkDate.setDate(checkDate.getDate() - 1);
                    } else {
                        break;
                    }
                }

                set((state) => ({
                    currentStreak: streak,
                    longestStreak: Math.max(state.longestStreak, streak),
                }));

                // Add streak day bonus (10 × n per master prompt)
                if (streak > 0) {
                    const streakBonus = POINTS_CONFIG.bonus.streakDayMultiplier * streak;
                    get().addPoints(today, 'streakBonus', streakBonus);
                }

                // Add week streak bonus at 7-day milestones
                if (streak > 0 && streak % 7 === 0) {
                    get().addPoints(today, 'specialBonuses', POINTS_CONFIG.bonus.weekStreak);
                }

                get().checkAchievements();
            },

            setDailyGoal: (goal) => {
                set({ dailyGoal: goal });
            },

            checkDailyGoal: (date) => {
                const dayPoints = get().history[date];
                return dayPoints ? dayPoints.goalReached : false;
            },

            checkAchievements: () => {
                const state = get();

                set((prev) => ({
                    achievements: prev.achievements.map((ach) => {
                        if (ach.unlockedAt) return ach; // Already unlocked

                        let unlocked = false;

                        switch (ach.category) {
                            case 'focus':
                                unlocked = state.totalFocusMinutes >= ach.requirement;
                                break;
                            case 'streak':
                                unlocked = state.longestStreak >= ach.requirement;
                                break;
                            case 'points':
                                unlocked = state.totalPointsEarned >= ach.requirement;
                                break;
                            case 'tasks':
                                unlocked = state.totalTasksCompleted >= ach.requirement;
                                break;
                        }

                        if (unlocked) {
                            return { ...ach, unlockedAt: new Date().toISOString() };
                        }

                        return ach;
                    }),
                }));
            },

            getTodaysPoints: () => {
                return get().history[getTodayString()];
            },

            getPointsForDate: (date) => {
                return get().history[date];
            },

            getWeeklyPoints: () => {
                const history = get().history;
                let total = 0;

                for (let i = 0; i < 7; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    total += history[dateStr]?.netPoints || 0;
                }

                return total;
            },

            getMonthlyPoints: () => {
                const history = get().history;
                let total = 0;

                for (let i = 0; i < 30; i++) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    total += history[dateStr]?.netPoints || 0;
                }

                return total;
            },

            getUnlockedAchievements: () => {
                return get().achievements.filter((ach) => ach.unlockedAt);
            },

            getLockedAchievements: () => {
                return get().achievements.filter((ach) => !ach.unlockedAt);
            },

            getPointsTrend: (days) => {
                const history = get().history;
                const trend: { date: string; points: number }[] = [];

                for (let i = days - 1; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    trend.push({
                        date: dateStr,
                        points: history[dateStr]?.netPoints || 0,
                    });
                }

                return trend;
            },

            getAverageDaily: () => {
                const history = get().history;
                const dates = Object.keys(history);
                if (dates.length === 0) return 0;

                const total = dates.reduce((sum, date) => sum + (history[date]?.netPoints || 0), 0);
                return Math.round(total / dates.length);
            },

            getBestDay: () => {
                const history = get().history;
                const dates = Object.keys(history);
                if (dates.length === 0) return undefined;

                let best = { date: dates[0], points: history[dates[0]]?.netPoints || 0 };

                dates.forEach((date) => {
                    const points = history[date]?.netPoints || 0;
                    if (points > best.points) {
                        best = { date, points };
                    }
                });

                return best;
            },
        }),
        {
            name: 'focusguard-points',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

export default usePointsStore;
