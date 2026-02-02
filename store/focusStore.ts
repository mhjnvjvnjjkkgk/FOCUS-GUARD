/**
 * Focus Store - Zustand state management for focus sessions
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export type AmbientSound =
    | 'none'
    | 'rain'
    | 'forest'
    | 'ocean'
    | 'cafe'
    | 'fireplace'
    | 'white_noise'
    | 'brown_noise'
    | 'lofi';

export type SessionStatus = 'idle' | 'active' | 'paused' | 'break' | 'completed' | 'cancelled';

export interface FocusPreset {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    duration: number; // minutes
    breakEnabled: boolean;
    breakDuration: number;
    breakInterval: number;
    isBuiltIn: boolean;
}

export interface FocusSession {
    id: string;
    name: string;
    presetId?: string;

    // Timing
    duration: number; // Total focus time in minutes
    elapsedSeconds: number;

    // Breaks
    breakEnabled: boolean;
    breakDuration: number;
    breakInterval: number;
    breaksTaken: number;

    // Blocked Apps
    blockedApps: string[];
    blockAllApps: boolean;

    // Settings
    customMessage: string;
    ambientSound: AmbientSound;
    strictMode: boolean;

    // Status
    status: SessionStatus;
    startedAt?: string;
    pausedAt?: string;
    completedAt?: string;

    // Stats
    pauseCount: number;
    totalPauseSeconds: number;
    blockedAttempts: number;
}

export interface CompletedSession {
    id: string;
    name: string;
    presetId?: string;
    scheduledDuration: number;
    actualDuration: number;
    startedAt: string;
    completedAt: string;
    status: 'completed' | 'cancelled';
    breaksTaken: number;
    pauseCount: number;
    blockedAttempts: number;
    qualityScore: number;
}

interface FocusState {
    // Presets
    presets: FocusPreset[];

    // Current session
    activeSession: FocusSession | null;

    // History
    sessionHistory: CompletedSession[];

    // Stats
    totalFocusMinutes: number;
    currentStreak: number;
    longestStreak: number;

    // Preset actions
    addPreset: (preset: Omit<FocusPreset, 'id' | 'isBuiltIn'>) => string;
    updatePreset: (id: string, updates: Partial<FocusPreset>) => void;
    deletePreset: (id: string) => void;

    // Session actions
    startSession: (session: Omit<FocusSession, 'id' | 'elapsedSeconds' | 'status' | 'pauseCount' | 'totalPauseSeconds' | 'blockedAttempts' | 'breaksTaken'>) => void;
    pauseSession: () => void;
    resumeSession: () => void;
    stopSession: () => void;
    completeSession: () => void;
    incrementElapsed: (seconds: number) => void;
    incrementBlockedAttempts: () => void;
    startBreak: () => void;
    endBreak: () => void;

    // History actions
    clearHistory: () => void;

    // Getters
    getTodaysFocusMinutes: () => number;
    getWeeklyFocusMinutes: () => number;
}

// Default presets
const DEFAULT_PRESETS: FocusPreset[] = [
    {
        id: 'pomodoro',
        name: 'Pomodoro',
        icon: '🍅',
        color: '#EF4444',
        description: '25 min focus + 5 min break',
        duration: 25,
        breakEnabled: true,
        breakDuration: 5,
        breakInterval: 25,
        isBuiltIn: true,
    },
    {
        id: 'deep_work',
        name: 'Deep Work',
        icon: '🎯',
        color: '#8B5CF6',
        description: '90 min uninterrupted focus',
        duration: 90,
        breakEnabled: false,
        breakDuration: 0,
        breakInterval: 0,
        isBuiltIn: true,
    },
    {
        id: 'study',
        name: 'Study Session',
        icon: '📚',
        color: '#3B82F6',
        description: '50 min study + 10 min break',
        duration: 50,
        breakEnabled: true,
        breakDuration: 10,
        breakInterval: 50,
        isBuiltIn: true,
    },
    {
        id: 'quick',
        name: 'Quick Focus',
        icon: '⚡',
        color: '#F97316',
        description: '15 min burst',
        duration: 15,
        breakEnabled: false,
        breakDuration: 0,
        breakInterval: 0,
        isBuiltIn: true,
    },
];

const generateId = () => `focus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Calculate quality score for a completed session
const calculateQualityScore = (session: FocusSession, actualMinutes: number): number => {
    let score = 100;

    // Deduct for pauses
    score -= session.pauseCount * 5;

    // Deduct for blocked attempts
    score -= Math.min(session.blockedAttempts * 2, 20);

    // Deduct for early completion
    const completionRatio = actualMinutes / session.duration;
    if (completionRatio < 1) {
        score -= (1 - completionRatio) * 30;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
};

export const useFocusStore = create<FocusState>()(
    persist(
        (set, get) => ({
            presets: DEFAULT_PRESETS,
            activeSession: null,
            sessionHistory: [],
            totalFocusMinutes: 0,
            currentStreak: 0,
            longestStreak: 0,

            addPreset: (presetData) => {
                const id = generateId();
                const newPreset: FocusPreset = {
                    ...presetData,
                    id,
                    isBuiltIn: false,
                };

                set((state) => ({
                    presets: [...state.presets, newPreset],
                }));

                return id;
            },

            updatePreset: (id, updates) => {
                set((state) => ({
                    presets: state.presets.map((preset) =>
                        preset.id === id && !preset.isBuiltIn
                            ? { ...preset, ...updates }
                            : preset
                    ),
                }));
            },

            deletePreset: (id) => {
                set((state) => ({
                    presets: state.presets.filter((preset) => preset.id !== id || preset.isBuiltIn),
                }));
            },

            startSession: (sessionData) => {
                const newSession: FocusSession = {
                    ...sessionData,
                    id: generateId(),
                    elapsedSeconds: 0,
                    status: 'active',
                    startedAt: new Date().toISOString(),
                    pauseCount: 0,
                    totalPauseSeconds: 0,
                    blockedAttempts: 0,
                    breaksTaken: 0,
                };

                set({ activeSession: newSession });
            },

            pauseSession: () => {
                set((state) => ({
                    activeSession: state.activeSession
                        ? {
                            ...state.activeSession,
                            status: 'paused',
                            pausedAt: new Date().toISOString(),
                            pauseCount: state.activeSession.pauseCount + 1,
                        }
                        : null,
                }));
            },

            resumeSession: () => {
                set((state) => {
                    if (!state.activeSession || !state.activeSession.pausedAt) return state;

                    const pauseDuration = (Date.now() - new Date(state.activeSession.pausedAt).getTime()) / 1000;

                    return {
                        activeSession: {
                            ...state.activeSession,
                            status: 'active',
                            pausedAt: undefined,
                            totalPauseSeconds: state.activeSession.totalPauseSeconds + pauseDuration,
                        },
                    };
                });
            },

            stopSession: () => {
                const session = get().activeSession;
                if (!session) return;

                const actualMinutes = Math.floor(session.elapsedSeconds / 60);

                const completedSession: CompletedSession = {
                    id: session.id,
                    name: session.name,
                    presetId: session.presetId,
                    scheduledDuration: session.duration,
                    actualDuration: actualMinutes,
                    startedAt: session.startedAt!,
                    completedAt: new Date().toISOString(),
                    status: 'cancelled',
                    breaksTaken: session.breaksTaken,
                    pauseCount: session.pauseCount,
                    blockedAttempts: session.blockedAttempts,
                    qualityScore: calculateQualityScore(session, actualMinutes),
                };

                set((state) => ({
                    activeSession: null,
                    sessionHistory: [completedSession, ...state.sessionHistory].slice(0, 100),
                }));
            },

            completeSession: () => {
                const session = get().activeSession;
                if (!session) return;

                const actualMinutes = Math.floor(session.elapsedSeconds / 60);

                const completedSession: CompletedSession = {
                    id: session.id,
                    name: session.name,
                    presetId: session.presetId,
                    scheduledDuration: session.duration,
                    actualDuration: actualMinutes,
                    startedAt: session.startedAt!,
                    completedAt: new Date().toISOString(),
                    status: 'completed',
                    breaksTaken: session.breaksTaken,
                    pauseCount: session.pauseCount,
                    blockedAttempts: session.blockedAttempts,
                    qualityScore: calculateQualityScore(session, actualMinutes),
                };

                set((state) => ({
                    activeSession: null,
                    sessionHistory: [completedSession, ...state.sessionHistory].slice(0, 100),
                    totalFocusMinutes: state.totalFocusMinutes + actualMinutes,
                    currentStreak: state.currentStreak + 1,
                    longestStreak: Math.max(state.longestStreak, state.currentStreak + 1),
                }));
            },

            incrementElapsed: (seconds) => {
                set((state) => ({
                    activeSession: state.activeSession
                        ? { ...state.activeSession, elapsedSeconds: state.activeSession.elapsedSeconds + seconds }
                        : null,
                }));
            },

            incrementBlockedAttempts: () => {
                set((state) => ({
                    activeSession: state.activeSession
                        ? { ...state.activeSession, blockedAttempts: state.activeSession.blockedAttempts + 1 }
                        : null,
                }));
            },

            startBreak: () => {
                set((state) => ({
                    activeSession: state.activeSession
                        ? { ...state.activeSession, status: 'break', breaksTaken: state.activeSession.breaksTaken + 1 }
                        : null,
                }));
            },

            endBreak: () => {
                set((state) => ({
                    activeSession: state.activeSession
                        ? { ...state.activeSession, status: 'active' }
                        : null,
                }));
            },

            clearHistory: () => {
                set({ sessionHistory: [] });
            },

            getTodaysFocusMinutes: () => {
                const today = new Date().toDateString();
                return get().sessionHistory
                    .filter((session) => new Date(session.completedAt).toDateString() === today)
                    .reduce((sum, session) => sum + session.actualDuration, 0);
            },

            getWeeklyFocusMinutes: () => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);

                return get().sessionHistory
                    .filter((session) => new Date(session.completedAt) >= weekAgo)
                    .reduce((sum, session) => sum + session.actualDuration, 0);
            },
        }),
        {
            name: 'focusguard-focus',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

export default useFocusStore;
