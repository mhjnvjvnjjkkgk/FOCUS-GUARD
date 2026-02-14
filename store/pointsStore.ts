/**
 * Points Store - Gamification system for tracking user performance
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '@/configs/firebaseConfig';
import { doc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { ALL_ACHIEVEMENTS } from '@/data/achievements';

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
    category: 'focus' | 'alarm' | 'streak' | 'points' | 'tasks' | 'sessions' | 'milestone' | 'legendary';
    bonusPoints: number;
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
    addPoints: (date: string, category: keyof PointsEarned, amount: number) => Promise<void>;
    deductPoints: (date: string, category: keyof PointsDeducted, amount: number) => Promise<void>;

    // Actions - Metrics
    recordAlarmTriggered: (date: string, snoozed: boolean) => void;
    recordWakeUpWithSnooze: (date: string) => void;
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

    // Cloud Sync
    syncWithFirestore: () => void;
    stopSync: () => void;
}

// Achievements are imported from data/achievements.ts
// ALL_ACHIEVEMENTS contains 100 achievements across 8 categories

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

let unsubscribeFirestore: (() => void) | null = null;

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
            achievements: ALL_ACHIEVEMENTS,
            dailyGoal: 200, // Default 200 per master prompt (adjustable 100-500)

            addPoints: async (date, category, amount) => {
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

                const user = auth.currentUser;
                if (user) {
                    const state = get();
                    const daily = state.history[date];
                    try {
                        // Sync Day
                        await setDoc(doc(db, 'users', user.uid, 'history', date), daily, { merge: true });
                        // Sync Globals
                        await setDoc(doc(db, 'users', user.uid), {
                            totalPointsEarned: state.totalPointsEarned,
                            totalPointsDeducted: state.totalPointsDeducted,
                            totalFocusMinutes: state.totalFocusMinutes,
                            totalTasksCompleted: state.totalTasksCompleted,
                            totalSessionsCompleted: state.totalSessionsCompleted,
                            currentStreak: state.currentStreak,
                            longestStreak: state.longestStreak
                        }, { merge: true });
                    } catch (e) {
                        console.error('Firestore Sync Error:', e);
                    }
                }
            },

            deductPoints: async (date, category, amount) => {
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

                const user = auth.currentUser;
                if (user) {
                    const state = get();
                    const daily = state.history[date];
                    try {
                        await setDoc(doc(db, 'users', user.uid, 'history', date), daily, { merge: true });
                        await setDoc(doc(db, 'users', user.uid), {
                            totalPointsEarned: state.totalPointsEarned,
                            totalPointsDeducted: state.totalPointsDeducted,
                            totalFocusMinutes: state.totalFocusMinutes,
                            totalTasksCompleted: state.totalTasksCompleted,
                            totalSessionsCompleted: state.totalSessionsCompleted,
                            currentStreak: state.currentStreak,
                            longestStreak: state.longestStreak
                        }, { merge: true });
                    } catch (e) {
                        console.error('Firestore Sync Error:', e);
                    }
                }
            },

            recordAlarmTriggered: (date, snoozed) => {
                set((state) => {
                    const dailyPoints = state.history[date] || createEmptyDailyPoints(date, state.dailyGoal);

                    // Create history record for the alarm event
                    const points = snoozed ? -10 : POINTS_CONFIG.alarm.wakeNoSnooze;
                    const alarmRecord: SessionRecord = {
                        id: `alarm-${Date.now()}`,
                        date,
                        timestamp: Date.now(),
                        taskName: snoozed ? 'Alarm Snoozed 💤' : 'Wake Up Goal ☀️',
                        plannedDuration: 0,
                        actualDuration: 0,
                        completionRate: snoozed ? 0 : 100,
                        pointsEarned: points,
                        wasAbandoned: false,
                    };

                    return {
                        history: {
                            ...state.history,
                            [date]: {
                                ...dailyPoints,
                                alarmsTriggered: dailyPoints.alarmsTriggered + 1,
                                alarmsSnoozed: dailyPoints.alarmsSnoozed + (snoozed ? 1 : 0),
                                alarmsOnTime: dailyPoints.alarmsOnTime + (snoozed ? 0 : 1),
                                // Add to sessions list so it shows in history
                                sessions: [alarmRecord, ...(dailyPoints.sessions || [])],
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

            recordWakeUpWithSnooze: (date) => {
                set((state) => {
                    const dailyPoints = state.history[date] || createEmptyDailyPoints(date, state.dailyGoal);

                    const wakeRecord: SessionRecord = {
                        id: `alarm-wake-${Date.now()}`,
                        date,
                        timestamp: Date.now(),
                        taskName: 'Wake Up (Snoozed) 🌤️',
                        plannedDuration: 0,
                        actualDuration: 0,
                        completionRate: 50,
                        pointsEarned: POINTS_CONFIG.alarm.wakeWithSnooze,
                        wasAbandoned: false,
                    };

                    return {
                        history: {
                            ...state.history,
                            [date]: {
                                ...dailyPoints,
                                alarmsTriggered: dailyPoints.alarmsTriggered + 1,
                                sessions: [wakeRecord, ...(dailyPoints.sessions || [])],
                            },
                        },
                    };
                });
                get().addPoints(date, 'alarms', POINTS_CONFIG.alarm.wakeWithSnooze);
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
                                sessions: [...(dailyPoints.sessions || []), sessionRecord],
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
                let bonusToAward = 0;

                const updatedAchievements = state.achievements.map((ach) => {
                    if (ach.unlockedAt) return ach;

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
                        case 'sessions':
                            unlocked = state.totalSessionsCompleted >= ach.requirement;
                            break;
                        case 'alarm': {
                            let totalOnTime = 0;
                            Object.values(state.history).forEach(day => {
                                totalOnTime += day.alarmsOnTime || 0;
                            });
                            unlocked = totalOnTime >= ach.requirement;
                            break;
                        }
                        case 'milestone':
                            if (ach.id === 'm10') {
                                const cnt = state.achievements.filter(a => a.unlockedAt && a.id !== 'm10').length;
                                unlocked = cnt >= ach.requirement;
                            }
                            break;
                        case 'legendary':
                            if (ach.id === 'l10') {
                                const cnt = state.achievements.filter(a => a.unlockedAt && a.id !== 'l10').length;
                                unlocked = cnt >= 99;
                            }
                            break;
                    }

                    if (unlocked) {
                        bonusToAward += ach.bonusPoints || 0;
                        return { ...ach, unlockedAt: new Date().toISOString() };
                    }
                    return ach;
                });

                set({
                    achievements: updatedAchievements,
                    totalPointsEarned: state.totalPointsEarned + bonusToAward,
                });
            },

            syncWithFirestore: () => {
                const user = auth.currentUser;
                if (!user) return;

                if (unsubscribeFirestore) unsubscribeFirestore();

                // 1. Listen to User Globals
                const unsubGlobals = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        set((state) => ({
                            totalPointsEarned: data.totalPointsEarned ?? state.totalPointsEarned,
                            totalPointsDeducted: data.totalPointsDeducted ?? state.totalPointsDeducted,
                            currentStreak: data.currentStreak ?? state.currentStreak,
                            longestStreak: data.longestStreak ?? state.longestStreak,
                            totalFocusMinutes: data.totalFocusMinutes ?? state.totalFocusMinutes,
                            totalTasksCompleted: data.totalTasksCompleted ?? state.totalTasksCompleted,
                            totalSessionsCompleted: data.totalSessionsCompleted ?? state.totalSessionsCompleted,
                        }));
                    }
                });

                // 2. Listen to History
                const unsubHistory = onSnapshot(collection(db, 'users', user.uid, 'history'), (snapshot) => {
                    const updates: PointsHistory = {};
                    snapshot.forEach(docSnap => {
                        updates[docSnap.id] = docSnap.data() as DailyPoints;
                    });

                    if (Object.keys(updates).length > 0) {
                        set(state => ({
                            history: { ...state.history, ...updates }
                        }));
                    }
                });

                unsubscribeFirestore = () => {
                    unsubGlobals();
                    unsubHistory();
                };
            },

            stopSync: () => {
                if (unsubscribeFirestore) {
                    unsubscribeFirestore();
                    unsubscribeFirestore = null;
                }
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
