/**
 * Alarm Store - Zustand state management for alarms
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface DismissTask {
    type: 'none' | 'math' | 'shake' | 'scan' | 'typing' | 'walk' | 'breathing' | 'puzzle' | 'qr' | 'memory';
    // Math config
    mathDifficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
    mathCount?: number;
    // Shake config
    shakeIntensity?: 'light' | 'medium' | 'vigorous';
    shakeDuration?: number;
    // Scan config
    scanMode?: 'any' | 'specific';
    scanReferenceUri?: string;
    // Typing config
    typingMode?: 'custom' | 'random' | 'intent';
    typingText?: string;
    typingWordCount?: number;
    // Walk config
    walkSteps?: number;
    // Breathing config
    breathingCycles?: number;
    breathingInhale?: number;
    breathingHold?: number;
    breathingExhale?: number;
    // Puzzle config
    puzzleDifficulty?: '3x3' | '4x4' | '5x5';
    // QR config
    qrLocation?: string;
    qrData?: string;
    // Memory config
    memoryPairs?: number;
}

export interface Alarm {
    id: string;
    time: { hour: number; minute: number };
    label: string;
    repeatDays: number[]; // 0-6 (Sun-Sat)
    enabled: boolean;

    // Sound
    ringtoneId: string;
    ringtoneName: string;
    volume: number;
    vibrate: boolean;
    gradualVolume: boolean;

    // Snooze
    snoozeEnabled: boolean;
    snoozeDuration: number; // minutes
    snoozeLimit: number;
    snoozesUsed: number;

    // Dismiss
    dismissTask: DismissTask;

    // Meta
    createdAt: string;
    updatedAt: string;
    lastTriggered?: string;
    notificationId?: string;
}

interface AlarmState {
    alarms: Alarm[];

    // Actions
    addAlarm: (alarm: Omit<Alarm, 'id' | 'createdAt' | 'updatedAt'>) => string;
    updateAlarm: (id: string, updates: Partial<Alarm>) => void;
    deleteAlarm: (id: string) => void;
    toggleAlarm: (id: string) => void;
    incrementSnooze: (id: string) => void;
    resetSnooze: (id: string) => void;

    // Getters
    getAlarm: (id: string) => Alarm | undefined;
    getActiveAlarms: () => Alarm[];
    getNextAlarm: () => Alarm | undefined;
}

// Generate unique ID
const generateId = () => `alarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useAlarmStore = create<AlarmState>()(
    persist(
        (set, get) => ({
            alarms: [],

            addAlarm: (alarmData) => {
                const id = generateId();
                const now = new Date().toISOString();

                const newAlarm: Alarm = {
                    ...alarmData,
                    id,
                    createdAt: now,
                    updatedAt: now,
                    snoozesUsed: 0,
                };

                set((state) => ({
                    alarms: [...state.alarms, newAlarm],
                }));

                return id;
            },

            updateAlarm: (id, updates) => {
                set((state) => ({
                    alarms: state.alarms.map((alarm) =>
                        alarm.id === id
                            ? { ...alarm, ...updates, updatedAt: new Date().toISOString() }
                            : alarm
                    ),
                }));
            },

            deleteAlarm: (id) => {
                set((state) => ({
                    alarms: state.alarms.filter((alarm) => alarm.id !== id),
                }));
            },

            toggleAlarm: (id) => {
                set((state) => ({
                    alarms: state.alarms.map((alarm) =>
                        alarm.id === id
                            ? { ...alarm, enabled: !alarm.enabled, updatedAt: new Date().toISOString() }
                            : alarm
                    ),
                }));
            },

            incrementSnooze: (id) => {
                set((state) => ({
                    alarms: state.alarms.map((alarm) =>
                        alarm.id === id
                            ? { ...alarm, snoozesUsed: alarm.snoozesUsed + 1 }
                            : alarm
                    ),
                }));
            },

            resetSnooze: (id) => {
                set((state) => ({
                    alarms: state.alarms.map((alarm) =>
                        alarm.id === id
                            ? { ...alarm, snoozesUsed: 0 }
                            : alarm
                    ),
                }));
            },

            getAlarm: (id) => {
                return get().alarms.find((alarm) => alarm.id === id);
            },

            getActiveAlarms: () => {
                return get().alarms.filter((alarm) => alarm.enabled);
            },

            getNextAlarm: () => {
                const now = new Date();
                const activeAlarms = get().getActiveAlarms();

                if (activeAlarms.length === 0) return undefined;

                // Calculate next trigger time for each alarm
                const alarmsWithNextTime = activeAlarms.map((alarm) => {
                    const alarmDate = new Date();
                    alarmDate.setHours(alarm.time.hour, alarm.time.minute, 0, 0);

                    // If alarm time has passed today, check next valid day
                    if (alarmDate <= now) {
                        alarmDate.setDate(alarmDate.getDate() + 1);
                    }

                    // If alarm has repeat days, find the next valid day
                    if (alarm.repeatDays.length > 0) {
                        while (!alarm.repeatDays.includes(alarmDate.getDay())) {
                            alarmDate.setDate(alarmDate.getDate() + 1);
                        }
                    }

                    return { alarm, nextTime: alarmDate.getTime() };
                });

                // Sort by next trigger time and return the soonest
                alarmsWithNextTime.sort((a, b) => a.nextTime - b.nextTime);
                return alarmsWithNextTime[0]?.alarm;
            },
        }),
        {
            name: 'focusguard-alarms',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

export default useAlarmStore;
