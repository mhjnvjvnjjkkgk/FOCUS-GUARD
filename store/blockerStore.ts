/**
 * Blocker Store - Zustand state management for app blocking
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export type UnlockTaskType = 'none' | 'shake' | 'typing' | 'math' | 'breathing' | 'wait' | 'walk';

export interface UnlockTask {
    type: UnlockTaskType;
    // Shake
    shakeIntensity?: 'light' | 'medium' | 'vigorous';
    shakeDuration?: number;
    // Typing
    typingText?: string;
    // Math
    mathDifficulty?: 'easy' | 'medium' | 'hard';
    mathCount?: number;
    // Breathing
    breathingCycles?: number;
    // Wait
    waitSeconds?: number;
    // Walk
    walkSteps?: number;
}

export interface BlockedApp {
    id: string;
    packageName: string;
    appName: string;
    appIcon: string;
    category: 'social' | 'entertainment' | 'games' | 'communication' | 'shopping' | 'news' | 'other';

    // Tracking
    trackingEnabled: boolean;

    // Daily Limit
    dailyLimitEnabled: boolean;
    dailyLimitMinutes: number;

    // Usage Reminders
    reminderEnabled: boolean;
    reminderIntervalMinutes: number;
    reminderMessage: string;
    reminderImageUri?: string;

    // Blocking
    blockAfterLimit: boolean;
    blockMessage: string;
    blockImageUri?: string;
    unlockTask: UnlockTask;

    // Schedule
    scheduleEnabled: boolean;
    schedules: BlockSchedule[];

    // Stats
    todayUsageMinutes: number;
    weeklyUsageMinutes: number[];
    openCount: number;
    lastUsed?: string;

    createdAt: string;
    updatedAt: string;
}

export interface BlockSchedule {
    id: string;
    name: string;
    days: number[];
    startTime: { hour: number; minute: number };
    endTime: { hour: number; minute: number };
}

export interface DailyUsage {
    date: string;
    apps: { [packageName: string]: number }; // minutes per app
    totalMinutes: number;
    pickups: number;
    blockedAttempts: number;
}

interface BlockerState {
    // Blocked apps
    blockedApps: BlockedApp[];

    // Usage history
    usageHistory: DailyUsage[];

    // Settings
    trackingEnabled: boolean;
    strictMode: boolean;
    dailyScreenTimeGoal: number;

    // Stats
    currentStreak: number;
    longestStreak: number;

    // App actions
    addBlockedApp: (app: Omit<BlockedApp, 'id' | 'createdAt' | 'updatedAt' | 'todayUsageMinutes' | 'weeklyUsageMinutes' | 'openCount'>) => string;
    updateBlockedApp: (id: string, updates: Partial<BlockedApp>) => void;
    removeBlockedApp: (id: string) => void;
    toggleAppBlocking: (id: string) => void;

    // Usage tracking
    addUsageTime: (packageName: string, minutes: number) => void;
    recordAppOpen: (packageName: string) => void;
    resetDailyUsage: () => void;

    // Daily usage
    recordDailyUsage: (usage: Omit<DailyUsage, 'date'>) => void;

    // Settings
    setTrackingEnabled: (enabled: boolean) => void;
    setStrictMode: (enabled: boolean) => void;
    setDailyScreenTimeGoal: (minutes: number) => void;

    // Getters
    getBlockedApp: (id: string) => BlockedApp | undefined;
    getAppByPackage: (packageName: string) => BlockedApp | undefined;
    getTodayTotalUsage: () => number;
    isAppBlocked: (packageName: string) => boolean;
    isAppOverLimit: (packageName: string) => boolean;
}

const generateId = () => `blocker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useBlockerStore = create<BlockerState>()(
    persist(
        (set, get) => ({
            blockedApps: [],
            usageHistory: [],
            trackingEnabled: true,
            strictMode: false,
            dailyScreenTimeGoal: 120, // 2 hours default
            currentStreak: 0,
            longestStreak: 0,

            addBlockedApp: (appData) => {
                const id = generateId();
                const now = new Date().toISOString();

                const newApp: BlockedApp = {
                    ...appData,
                    id,
                    createdAt: now,
                    updatedAt: now,
                    todayUsageMinutes: 0,
                    weeklyUsageMinutes: [0, 0, 0, 0, 0, 0, 0],
                    openCount: 0,
                };

                set((state) => ({
                    blockedApps: [...state.blockedApps, newApp],
                }));

                return id;
            },

            updateBlockedApp: (id, updates) => {
                set((state) => ({
                    blockedApps: state.blockedApps.map((app) =>
                        app.id === id
                            ? { ...app, ...updates, updatedAt: new Date().toISOString() }
                            : app
                    ),
                }));
            },

            removeBlockedApp: (id) => {
                set((state) => ({
                    blockedApps: state.blockedApps.filter((app) => app.id !== id),
                }));
            },

            toggleAppBlocking: (id) => {
                set((state) => ({
                    blockedApps: state.blockedApps.map((app) =>
                        app.id === id
                            ? { ...app, trackingEnabled: !app.trackingEnabled }
                            : app
                    ),
                }));
            },

            addUsageTime: (packageName, minutes) => {
                set((state) => ({
                    blockedApps: state.blockedApps.map((app) =>
                        app.packageName === packageName
                            ? { ...app, todayUsageMinutes: app.todayUsageMinutes + minutes }
                            : app
                    ),
                }));
            },

            recordAppOpen: (packageName) => {
                set((state) => ({
                    blockedApps: state.blockedApps.map((app) =>
                        app.packageName === packageName
                            ? { ...app, openCount: app.openCount + 1, lastUsed: new Date().toISOString() }
                            : app
                    ),
                }));
            },

            resetDailyUsage: () => {
                set((state) => ({
                    blockedApps: state.blockedApps.map((app) => ({
                        ...app,
                        weeklyUsageMinutes: [app.todayUsageMinutes, ...app.weeklyUsageMinutes.slice(0, 6)],
                        todayUsageMinutes: 0,
                        openCount: 0,
                    })),
                }));
            },

            recordDailyUsage: (usage) => {
                const today = new Date().toISOString().split('T')[0];
                set((state) => ({
                    usageHistory: [
                        { ...usage, date: today },
                        ...state.usageHistory.filter((u) => u.date !== today),
                    ].slice(0, 30), // Keep 30 days
                }));
            },

            setTrackingEnabled: (enabled) => {
                set({ trackingEnabled: enabled });
            },

            setStrictMode: (enabled) => {
                set({ strictMode: enabled });
            },

            setDailyScreenTimeGoal: (minutes) => {
                set({ dailyScreenTimeGoal: minutes });
            },

            getBlockedApp: (id) => {
                return get().blockedApps.find((app) => app.id === id);
            },

            getAppByPackage: (packageName) => {
                return get().blockedApps.find((app) => app.packageName === packageName);
            },

            getTodayTotalUsage: () => {
                return get().blockedApps.reduce((sum, app) => sum + app.todayUsageMinutes, 0);
            },

            isAppBlocked: (packageName) => {
                const app = get().getAppByPackage(packageName);
                if (!app) return false;

                // Check if over daily limit
                if (app.dailyLimitEnabled && app.todayUsageMinutes >= app.dailyLimitMinutes) {
                    return true;
                }

                // Check if blocked by schedule
                if (app.scheduleEnabled && app.schedules.length > 0) {
                    const now = new Date();
                    const currentDay = now.getDay();
                    const currentMinutes = now.getHours() * 60 + now.getMinutes();

                    for (const schedule of app.schedules) {
                        if (schedule.days.includes(currentDay)) {
                            const startMinutes = schedule.startTime.hour * 60 + schedule.startTime.minute;
                            const endMinutes = schedule.endTime.hour * 60 + schedule.endTime.minute;

                            if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
                                return true;
                            }
                        }
                    }
                }

                return false;
            },

            isAppOverLimit: (packageName) => {
                const app = get().getAppByPackage(packageName);
                if (!app) return false;
                return app.dailyLimitEnabled && app.todayUsageMinutes >= app.dailyLimitMinutes;
            },
        }),
        {
            name: 'focusguard-blocker',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

export default useBlockerStore;
