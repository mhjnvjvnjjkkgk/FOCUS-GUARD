/**
 * Planner Store - Zustand state management for day planning
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface FocusConfig {
    enabled: boolean;
    sessionCount: number;          // e.g., 4
    sessionDuration: number;       // minutes, e.g., 25
    breakDuration: number;         // minutes, e.g., 5
}

export interface BlockingConfig {
    enabled: boolean;
    blockedApps: string[];         // Package names
    blockAllSocial: boolean;
    blockAllEntertainment: boolean;
}

export interface SkipTaskConfig {
    enabled: boolean;
    typingPhrase: string;          // "I will reschedule this task"
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'partial';
export type SessionStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type CompletionRating = 25 | 50 | 75 | 100;

export interface PlannedTaskSession {
    id: string;
    taskId: string;
    sessionNumber: number;           // 1, 2, 3, 4
    status: SessionStatus;
    startedAt?: string;
    completedAt?: string;
    completionRating?: CompletionRating;
    actualDuration?: number;         // Actual minutes
    hadBlockingViolation?: boolean;
}

export interface TaskMetrics {
    startedAt?: string;
    completedAt?: string;
    totalFocusTime: number;          // Actual minutes focused
    completionPercentage: number;    // 0-100
    averageCompletion: number;       // Average of all session completion rates (0-100)
    pointsEarned: number;
    pointsDeducted: number;
}

export interface PlannedTask {
    id: string;
    name: string;
    description?: string;
    emoji: string;                   // Task icon emoji
    color: string;                   // Accent color
    date: string;                    // "2024-12-29"

    // Time Range
    startTime: { hour: number; minute: number };
    endTime: { hour: number; minute: number };

    // Configurations
    focusConfig: FocusConfig;
    blockingConfig: BlockingConfig;
    skipTaskConfig: SkipTaskConfig;

    // Reminder & Alarm
    reminderMinutesBefore: number;
    alarmEnabled: boolean;

    // Status & Progress
    status: TaskStatus;
    currentSessionIndex: number;     // 0-based, which session is active/next

    // Session Tracking
    sessions: PlannedTaskSession[];

    // Metrics
    metrics: TaskMetrics;

    createdAt: string;
    updatedAt: string;
}

export interface DailyPlan {
    date: string;
    tasks: PlannedTask[];
    isComplete: boolean;
    summary?: {
        tasksPlanned: number;
        tasksStarted: number;
        tasksCompleted: number;
        totalFocusMinutes: number;
        pointsEarned: number;
    };
}

interface PlannerState {
    // Plans by date
    dailyPlans: { [date: string]: DailyPlan };

    // Active session tracking
    activeTaskId: string | null;
    activeSessionId: string | null;
    isSessionActive: boolean;
    isOnBreak: boolean;
    breakEndsAt?: string;

    // App blocking presets
    socialApps: string[];
    entertainmentApps: string[];

    // Actions - Plans
    createTask: (task: Omit<PlannedTask, 'id' | 'createdAt' | 'updatedAt' | 'sessions' | 'metrics' | 'status' | 'currentSessionIndex'>) => string;
    updateTask: (id: string, date: string, updates: Partial<PlannedTask>) => void;
    deleteTask: (id: string, date: string) => void;
    duplicateTask: (id: string, date: string, newDate: string) => void;

    // Actions - Sessions
    startTask: (taskId: string, date: string) => void;
    startSession: (taskId: string, date: string, sessionIndex: number) => void;
    completeSession: (taskId: string, date: string, sessionIndex: number, rating: CompletionRating) => void;
    skipSession: (taskId: string, date: string, sessionIndex: number) => void;
    skipTask: (taskId: string, date: string) => void;
    completeTask: (taskId: string, date: string) => void;

    // Actions - Breaks
    startBreak: (durationMinutes: number) => void;
    endBreak: () => void;

    // Actions - Blocking violations
    recordBlockingViolation: (taskId: string, date: string, sessionIndex: number) => void;

    // Actions - Session History
    recordTaskSession: (taskId: string, date: string, sessionIndex: number, completionRate: number, focusMinutes: number) => void;

    // Getters
    getTodaysPlan: () => DailyPlan | undefined;
    getPlanForDate: (date: string) => DailyPlan | undefined;
    getTask: (taskId: string, date: string) => PlannedTask | undefined;
    getActiveTask: () => PlannedTask | undefined;
    getActiveSession: () => PlannedTaskSession | undefined;
    getUpcomingTasks: (date: string) => PlannedTask[];
    getCompletedTasks: (date: string) => PlannedTask[];

    // Utilities
    getDailyStats: (date: string) => DailyPlan['summary'] | undefined;
    clearOldPlans: (daysToKeep: number) => void;
}

// Helpers
const generateId = () => `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const getTodayString = () => new Date().toISOString().split('T')[0];

// Create sessions based on focus config
function createSessions(taskId: string, focusConfig: FocusConfig): PlannedTaskSession[] {
    if (!focusConfig.enabled) {
        // Single session for non-focus tasks
        return [{
            id: generateSessionId(),
            taskId,
            sessionNumber: 1,
            status: 'pending',
        }];
    }

    return Array.from({ length: focusConfig.sessionCount }, (_, i) => ({
        id: generateSessionId(),
        taskId,
        sessionNumber: i + 1,
        status: 'pending' as SessionStatus,
    }));
}

// Default app presets
const DEFAULT_SOCIAL_APPS = [
    'com.instagram.android',
    'com.twitter.android',
    'com.facebook.katana',
    'com.snapchat.android',
    'com.pinterest',
    'com.reddit.frontpage',
    'com.linkedin.android',
];

const DEFAULT_ENTERTAINMENT_APPS = [
    'com.google.android.youtube',
    'com.netflix.mediaclient',
    'com.zhiliaoapp.musically',
    'com.spotify.music',
];

export const usePlannerStore = create<PlannerState>()(
    persist(
        (set, get) => ({
            dailyPlans: {},
            activeTaskId: null,
            activeSessionId: null,
            isSessionActive: false,
            isOnBreak: false,
            socialApps: DEFAULT_SOCIAL_APPS,
            entertainmentApps: DEFAULT_ENTERTAINMENT_APPS,

            createTask: (taskData) => {
                const id = generateId();
                const now = new Date().toISOString();

                const newTask: PlannedTask = {
                    ...taskData,
                    id,
                    status: 'pending',
                    currentSessionIndex: 0,
                    sessions: createSessions(id, taskData.focusConfig),
                    metrics: {
                        totalFocusTime: 0,
                        completionPercentage: 0,
                        averageCompletion: 0,
                        pointsEarned: 0,
                        pointsDeducted: 0,
                    },
                    createdAt: now,
                    updatedAt: now,
                };

                set((state) => {
                    const date = taskData.date;
                    const existingPlan = state.dailyPlans[date] || { date, tasks: [], isComplete: false };

                    // Insert task in chronological order
                    const tasks = [...existingPlan.tasks, newTask].sort((a, b) => {
                        const aTime = a.startTime.hour * 60 + a.startTime.minute;
                        const bTime = b.startTime.hour * 60 + b.startTime.minute;
                        return aTime - bTime;
                    });

                    return {
                        dailyPlans: {
                            ...state.dailyPlans,
                            [date]: { ...existingPlan, tasks },
                        },
                    };
                });

                return id;
            },

            updateTask: (id, date, updates) => {
                set((state) => {
                    const plan = state.dailyPlans[date];
                    if (!plan) return state;

                    const tasks = plan.tasks.map((task) =>
                        task.id === id
                            ? { ...task, ...updates, updatedAt: new Date().toISOString() }
                            : task
                    );

                    return {
                        dailyPlans: {
                            ...state.dailyPlans,
                            [date]: { ...plan, tasks },
                        },
                    };
                });
            },

            deleteTask: (id, date) => {
                set((state) => {
                    const plan = state.dailyPlans[date];
                    if (!plan) return state;

                    return {
                        dailyPlans: {
                            ...state.dailyPlans,
                            [date]: {
                                ...plan,
                                tasks: plan.tasks.filter((task) => task.id !== id),
                            },
                        },
                    };
                });
            },

            duplicateTask: (id, fromDate, toDate) => {
                const task = get().getTask(id, fromDate);
                if (!task) return;

                const { id: _, createdAt, updatedAt, status, currentSessionIndex, sessions, metrics, ...taskData } = task;
                get().createTask({ ...taskData, date: toDate });
            },

            startTask: (taskId, date) => {
                set((state) => {
                    const plan = state.dailyPlans[date];
                    if (!plan) return state;

                    const now = new Date().toISOString();
                    const tasks = plan.tasks.map((task) =>
                        task.id === taskId
                            ? {
                                ...task,
                                status: 'in_progress' as TaskStatus,
                                metrics: { ...task.metrics, startedAt: now },
                                updatedAt: now,
                            }
                            : task
                    );

                    return {
                        dailyPlans: {
                            ...state.dailyPlans,
                            [date]: { ...plan, tasks },
                        },
                        activeTaskId: taskId,
                    };
                });
            },

            startSession: (taskId, date, sessionIndex) => {
                set((state) => {
                    const plan = state.dailyPlans[date];
                    if (!plan) return state;

                    const now = new Date().toISOString();
                    const tasks = plan.tasks.map((task) => {
                        if (task.id !== taskId) return task;

                        const sessions = task.sessions.map((session, idx) =>
                            idx === sessionIndex
                                ? { ...session, status: 'in_progress' as SessionStatus, startedAt: now }
                                : session
                        );

                        return {
                            ...task,
                            status: 'in_progress' as TaskStatus,
                            currentSessionIndex: sessionIndex,
                            sessions,
                            updatedAt: now,
                        };
                    });

                    const activeSession = tasks.find(t => t.id === taskId)?.sessions[sessionIndex];

                    return {
                        dailyPlans: {
                            ...state.dailyPlans,
                            [date]: { ...plan, tasks },
                        },
                        activeTaskId: taskId,
                        activeSessionId: activeSession?.id || null,
                        isSessionActive: true,
                        isOnBreak: false,
                    };
                });
            },

            completeSession: (taskId, date, sessionIndex, rating) => {
                set((state) => {
                    const plan = state.dailyPlans[date];
                    if (!plan) return state;

                    const now = new Date().toISOString();
                    const tasks = plan.tasks.map((task) => {
                        if (task.id !== taskId) return task;

                        const sessions = task.sessions.map((session, idx) => {
                            if (idx !== sessionIndex) return session;

                            const startedAt = session.startedAt ? new Date(session.startedAt) : new Date();
                            const actualDuration = Math.floor((Date.now() - startedAt.getTime()) / 60000);

                            return {
                                ...session,
                                status: 'completed' as SessionStatus,
                                completedAt: now,
                                completionRating: rating,
                                actualDuration,
                            };
                        });

                        // Calculate points for this session
                        let sessionPoints = 0;
                        switch (rating) {
                            case 100: sessionPoints = 40; break;
                            case 75: sessionPoints = 30; break;
                            case 50: sessionPoints = 20; break;
                            case 25: sessionPoints = 10; break;
                        }

                        // Calculate new completion percentage
                        const completedSessions = sessions.filter(s => s.status === 'completed');
                        const totalRating = completedSessions.reduce((sum, s) => sum + (s.completionRating || 0), 0);
                        const avgCompletion = completedSessions.length > 0 ? totalRating / completedSessions.length : 0;

                        // Calculate total focus time
                        const totalFocusTime = sessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0);

                        return {
                            ...task,
                            currentSessionIndex: sessionIndex + 1,
                            sessions,
                            metrics: {
                                ...task.metrics,
                                totalFocusTime,
                                completionPercentage: avgCompletion,
                                pointsEarned: task.metrics.pointsEarned + sessionPoints,
                            },
                            updatedAt: now,
                        };
                    });

                    return {
                        dailyPlans: {
                            ...state.dailyPlans,
                            [date]: { ...plan, tasks },
                        },
                        isSessionActive: false,
                        activeSessionId: null,
                    };
                });
            },

            skipSession: (taskId, date, sessionIndex) => {
                set((state) => {
                    const plan = state.dailyPlans[date];
                    if (!plan) return state;

                    const now = new Date().toISOString();
                    const tasks = plan.tasks.map((task) => {
                        if (task.id !== taskId) return task;

                        const sessions = task.sessions.map((session, idx) =>
                            idx === sessionIndex
                                ? { ...session, status: 'skipped' as SessionStatus }
                                : session
                        );

                        return {
                            ...task,
                            currentSessionIndex: sessionIndex + 1,
                            sessions,
                            metrics: {
                                ...task.metrics,
                                pointsDeducted: task.metrics.pointsDeducted + 20,
                            },
                            updatedAt: now,
                        };
                    });

                    return {
                        dailyPlans: {
                            ...state.dailyPlans,
                            [date]: { ...plan, tasks },
                        },
                        isSessionActive: false,
                        activeSessionId: null,
                    };
                });
            },

            skipTask: (taskId, date) => {
                set((state) => {
                    const plan = state.dailyPlans[date];
                    if (!plan) return state;

                    const now = new Date().toISOString();
                    const tasks = plan.tasks.map((task) =>
                        task.id === taskId
                            ? {
                                ...task,
                                status: 'skipped' as TaskStatus,
                                metrics: {
                                    ...task.metrics,
                                    pointsDeducted: task.metrics.pointsDeducted + 50,
                                },
                                updatedAt: now,
                            }
                            : task
                    );

                    return {
                        dailyPlans: {
                            ...state.dailyPlans,
                            [date]: { ...plan, tasks },
                        },
                        activeTaskId: null,
                        activeSessionId: null,
                        isSessionActive: false,
                    };
                });
            },

            completeTask: (taskId, date) => {
                set((state) => {
                    const plan = state.dailyPlans[date];
                    if (!plan) return state;

                    const now = new Date().toISOString();
                    const tasks = plan.tasks.map((task) => {
                        if (task.id !== taskId) return task;

                        // Add completion bonus
                        const allCompleted = task.sessions.every(s => s.status === 'completed');
                        const completionBonus = allCompleted ? 100 : 0;

                        return {
                            ...task,
                            status: 'completed' as TaskStatus,
                            metrics: {
                                ...task.metrics,
                                completedAt: now,
                                pointsEarned: task.metrics.pointsEarned + completionBonus,
                            },
                            updatedAt: now,
                        };
                    });

                    return {
                        dailyPlans: {
                            ...state.dailyPlans,
                            [date]: { ...plan, tasks },
                        },
                        activeTaskId: null,
                        activeSessionId: null,
                        isSessionActive: false,
                    };
                });
            },

            startBreak: (durationMinutes) => {
                const breakEndsAt = new Date(Date.now() + durationMinutes * 60000).toISOString();
                set({ isOnBreak: true, breakEndsAt, isSessionActive: false });
            },

            endBreak: () => {
                set({ isOnBreak: false, breakEndsAt: undefined });
            },

            recordBlockingViolation: (taskId, date, sessionIndex) => {
                set((state) => {
                    const plan = state.dailyPlans[date];
                    if (!plan) return state;

                    const tasks = plan.tasks.map((task) => {
                        if (task.id !== taskId) return task;

                        const sessions = task.sessions.map((session, idx) =>
                            idx === sessionIndex
                                ? { ...session, hadBlockingViolation: true }
                                : session
                        );

                        return {
                            ...task,
                            sessions,
                            metrics: {
                                ...task.metrics,
                                pointsDeducted: task.metrics.pointsDeducted + 5,
                            },
                        };
                    });

                    return {
                        dailyPlans: {
                            ...state.dailyPlans,
                            [date]: { ...plan, tasks },
                        },
                    };
                });
            },

            recordTaskSession: (taskId, date, sessionIndex, completionRate, focusMinutes) => {
                set((state) => {
                    const plan = state.dailyPlans[date];
                    if (!plan) return state;

                    const now = new Date().toISOString();
                    const tasks = plan.tasks.map((task) => {
                        if (task.id !== taskId) return task;

                        // Update the specific session with completion data
                        const sessions = task.sessions.map((session, idx) =>
                            idx === sessionIndex
                                ? {
                                    ...session,
                                    completionRating: completionRate as CompletionRating,
                                    actualDuration: focusMinutes,
                                }
                                : session
                        );

                        // Calculate average completion from all completed sessions
                        const completedSessions = sessions.filter(s => s.completionRating !== undefined);
                        const averageCompletion = completedSessions.length > 0
                            ? completedSessions.reduce((sum, s) => sum + (s.completionRating || 0), 0) / completedSessions.length
                            : 0;

                        return {
                            ...task,
                            sessions,
                            metrics: {
                                ...task.metrics,
                                averageCompletion,
                                totalFocusTime: task.metrics.totalFocusTime + focusMinutes,
                            },
                            updatedAt: now,
                        };
                    });

                    return {
                        dailyPlans: {
                            ...state.dailyPlans,
                            [date]: { ...plan, tasks },
                        },
                    };
                });
            },

            getTodaysPlan: () => {
                return get().dailyPlans[getTodayString()];
            },

            getPlanForDate: (date) => {
                return get().dailyPlans[date];
            },

            getTask: (taskId, date) => {
                const plan = get().dailyPlans[date];
                return plan?.tasks.find((task) => task.id === taskId);
            },

            getActiveTask: () => {
                const { activeTaskId, dailyPlans } = get();
                if (!activeTaskId) return undefined;

                const today = getTodayString();
                return get().getTask(activeTaskId, today);
            },

            getActiveSession: () => {
                const task = get().getActiveTask();
                if (!task) return undefined;

                return task.sessions[task.currentSessionIndex];
            },

            getUpcomingTasks: (date) => {
                const plan = get().dailyPlans[date];
                if (!plan) return [];

                const now = new Date();
                const currentMinutes = now.getHours() * 60 + now.getMinutes();

                return plan.tasks.filter((task) => {
                    const taskMinutes = task.startTime.hour * 60 + task.startTime.minute;
                    return taskMinutes > currentMinutes && task.status === 'pending';
                });
            },

            getCompletedTasks: (date) => {
                const plan = get().dailyPlans[date];
                if (!plan) return [];

                return plan.tasks.filter((task) =>
                    task.status === 'completed' || task.status === 'partial'
                );
            },

            getDailyStats: (date) => {
                const plan = get().dailyPlans[date];
                if (!plan) return undefined;

                const tasksPlanned = plan.tasks.length;
                const tasksStarted = plan.tasks.filter(t => t.metrics.startedAt).length;
                const tasksCompleted = plan.tasks.filter(t => t.status === 'completed').length;
                const totalFocusMinutes = plan.tasks.reduce((sum, t) => sum + t.metrics.totalFocusTime, 0);
                const pointsEarned = plan.tasks.reduce((sum, t) =>
                    sum + t.metrics.pointsEarned - t.metrics.pointsDeducted, 0);

                return {
                    tasksPlanned,
                    tasksStarted,
                    tasksCompleted,
                    totalFocusMinutes,
                    pointsEarned,
                };
            },

            clearOldPlans: (daysToKeep) => {
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
                const cutoffString = cutoffDate.toISOString().split('T')[0];

                set((state) => {
                    const dailyPlans = Object.fromEntries(
                        Object.entries(state.dailyPlans).filter(([date]) => date >= cutoffString)
                    );
                    return { dailyPlans };
                });
            },
        }),
        {
            name: 'focusguard-planner',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

export default usePlannerStore;
