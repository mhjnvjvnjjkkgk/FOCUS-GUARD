/**
 * Alarm Store - Zustand state management for alarms
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, collection, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/configs/firebaseConfig';

// Types
export interface DismissTask {
    type: 'none' | 'math' | 'shake' | 'scan' | 'typing' | 'walk' | 'breathing' | 'puzzle' | 'qr' | 'memory' | 'squat' | 'step';
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
    // Squat config
    squatCount?: number;
    squatDifficulty?: 'easy' | 'medium' | 'hard';
    // Step config
    stepTarget?: number;
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
    dismissPhrase?: string;

    // Dismiss
    dismissTask?: DismissTask;

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

    // Firebase Sync
    syncWithFirestore: () => Promise<void>;
    stopSync: () => void;
}

let unsubscribeFirestore: (() => void) | null = null;

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

                // Sync to Firestore
                if (auth.currentUser && db) {
                    setDoc(doc(db, `users/${auth.currentUser.uid}/alarms`, id), newAlarm);
                }

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

                // Sync to Firestore
                if (auth.currentUser && db) {
                    const updatedAlarm = get().getAlarm(id);
                    if (updatedAlarm) {
                        setDoc(doc(db, `users/${auth.currentUser.uid}/alarms`, id), updatedAlarm, { merge: true });
                    }
                }
            },

            deleteAlarm: (id) => {
                set((state) => ({
                    alarms: state.alarms.filter((alarm) => alarm.id !== id),
                }));

                // Sync to Firestore
                if (auth.currentUser && db) {
                    deleteDoc(doc(db, `users/${auth.currentUser.uid}/alarms`, id));
                }
            },

            toggleAlarm: (id) => {
                set((state) => ({
                    alarms: state.alarms.map((alarm) =>
                        alarm.id === id
                            ? { ...alarm, enabled: !alarm.enabled, updatedAt: new Date().toISOString() }
                            : alarm
                    ),
                }));

                // Sync to Firestore
                if (auth.currentUser && db) {
                    const updatedAlarm = get().getAlarm(id);
                    if (updatedAlarm) {
                        setDoc(doc(db, `users/${auth.currentUser.uid}/alarms`, id), updatedAlarm, { merge: true });
                    }
                }
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

            syncWithFirestore: async () => {
                const currentUser = auth.currentUser;
                if (!currentUser || !db) return;

                const uid = currentUser.uid;
                const alarmsCollectionRef = collection(db, `users/${uid}/alarms`);

                // Unsubscribe previous listener
                if (unsubscribeFirestore) {
                    unsubscribeFirestore();
                }

                unsubscribeFirestore = onSnapshot(alarmsCollectionRef, (snapshot) => {
                    const remoteAlarms: Alarm[] = [];
                    snapshot.forEach((doc) => {
                        remoteAlarms.push(doc.data() as Alarm);
                    });

                    // Simple merge strategy: if remote has data, override local?
                    // Or merge by ID?
                    // For simplicity, let's merge by ID, preferring remote if valid

                    set((state) => {
                        // Build a map of existing alarms
                        const localMap = new Map(state.alarms.map(a => [a.id, a]));

                        remoteAlarms.forEach(ra => {
                            localMap.set(ra.id, ra);
                        });

                        // Note: This doesn't handle deletions from another device well if we just merge.
                        // But for now, let's trust the snapshot represents the 'truth' if we treat it as a collection.
                        // Actually, onSnapshot returns the whole collection. So `remoteAlarms` IS the state.

                        // However, we might have local pending changes? 
                        // Let's just set alarms to remoteAlarms if it's not empty?
                        // But if we start with empty remote, we don't want to wipe local.

                        if (remoteAlarms.length > 0) {
                            return { alarms: remoteAlarms };
                        }
                        return state;
                    });
                });
            },

            stopSync: () => {
                if (unsubscribeFirestore) {
                    unsubscribeFirestore();
                    unsubscribeFirestore = null;
                }
            },
        }),
        {
            name: 'focusguard-alarms',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

export default useAlarmStore;
