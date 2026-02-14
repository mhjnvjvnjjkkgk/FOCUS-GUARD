/**
 * Settings Store - User preferences with Firestore sync
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '@/configs/firebaseConfig';

let unsubscribeFirestore: (() => void) | null = null;

export interface SettingsState {
    // Profile
    displayName: string;

    // Goals
    dailyPointsGoal: number;
    dailyTasksGoal: number;
    dailyFocusGoal: number; // minutes

    // Phrases
    alarmDismissPhrase: string;
    focusDismissPhrase: string;

    // Alarm defaults
    alarmSnoozeLimit: number;
    alarmSoundEnabled: boolean;
    alarmVibrationEnabled: boolean;

    // Focus defaults
    focusStrictMode: boolean;
    defaultFocusDuration: number; // minutes
    defaultBreakDuration: number; // minutes
    focusSoundEnabled: boolean;

    // Appearance
    darkMode: boolean;

    // Notifications
    dailyReminderEnabled: boolean;
    streakReminderEnabled: boolean;

    // Sidebar (non-persisted)
    sidebarOpen: boolean;

    // Actions
    setDisplayName: (name: string) => void;
    setDailyPointsGoal: (goal: number) => void;
    setDailyTasksGoal: (goal: number) => void;
    setDailyFocusGoal: (goal: number) => void;
    setAlarmDismissPhrase: (phrase: string) => void;
    setFocusDismissPhrase: (phrase: string) => void;
    setAlarmSnoozeLimit: (limit: number) => void;
    setAlarmSoundEnabled: (enabled: boolean) => void;
    setAlarmVibrationEnabled: (enabled: boolean) => void;
    setFocusStrictMode: (strict: boolean) => void;
    setDefaultFocusDuration: (mins: number) => void;
    setDefaultBreakDuration: (mins: number) => void;
    setFocusSoundEnabled: (enabled: boolean) => void;
    setDarkMode: (dark: boolean) => void;
    setDailyReminderEnabled: (enabled: boolean) => void;
    setStreakReminderEnabled: (enabled: boolean) => void;
    openSidebar: () => void;
    closeSidebar: () => void;
    resetAllData: () => void;

    // Sync
    syncWithFirestore: () => void;
    stopSync: () => void;
    saveToFirestore: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            // Defaults
            displayName: '',
            dailyPointsGoal: 500,
            dailyTasksGoal: 5,
            dailyFocusGoal: 60,
            alarmDismissPhrase: 'I AM AWAKE',
            focusDismissPhrase: 'I GIVE UP',
            alarmSnoozeLimit: 3,
            alarmSoundEnabled: true,
            alarmVibrationEnabled: true,
            focusStrictMode: false,
            defaultFocusDuration: 25,
            defaultBreakDuration: 5,
            focusSoundEnabled: true,
            darkMode: false,
            dailyReminderEnabled: true,
            streakReminderEnabled: true,
            sidebarOpen: false,

            // Sidebar toggles (not persisted)
            openSidebar: () => set({ sidebarOpen: true }),
            closeSidebar: () => set({ sidebarOpen: false }),

            // Setters — each saves to Firestore
            setDisplayName: (name) => { set({ displayName: name }); get().saveToFirestore(); },
            setDailyPointsGoal: (goal) => { set({ dailyPointsGoal: goal }); get().saveToFirestore(); },
            setDailyTasksGoal: (goal) => { set({ dailyTasksGoal: goal }); get().saveToFirestore(); },
            setDailyFocusGoal: (goal) => { set({ dailyFocusGoal: goal }); get().saveToFirestore(); },
            setAlarmDismissPhrase: (phrase) => { set({ alarmDismissPhrase: phrase }); get().saveToFirestore(); },
            setFocusDismissPhrase: (phrase) => { set({ focusDismissPhrase: phrase }); get().saveToFirestore(); },
            setAlarmSnoozeLimit: (limit) => { set({ alarmSnoozeLimit: limit }); get().saveToFirestore(); },
            setAlarmSoundEnabled: (enabled) => { set({ alarmSoundEnabled: enabled }); get().saveToFirestore(); },
            setAlarmVibrationEnabled: (enabled) => { set({ alarmVibrationEnabled: enabled }); get().saveToFirestore(); },
            setFocusStrictMode: (strict) => { set({ focusStrictMode: strict }); get().saveToFirestore(); },
            setDefaultFocusDuration: (mins) => { set({ defaultFocusDuration: mins }); get().saveToFirestore(); },
            setDefaultBreakDuration: (mins) => { set({ defaultBreakDuration: mins }); get().saveToFirestore(); },
            setFocusSoundEnabled: (enabled) => { set({ focusSoundEnabled: enabled }); get().saveToFirestore(); },
            setDarkMode: (dark) => { set({ darkMode: dark }); get().saveToFirestore(); },
            setDailyReminderEnabled: (enabled) => { set({ dailyReminderEnabled: enabled }); get().saveToFirestore(); },
            setStreakReminderEnabled: (enabled) => { set({ streakReminderEnabled: enabled }); get().saveToFirestore(); },

            // Reset all data
            resetAllData: () => {
                set({
                    displayName: '',
                    dailyPointsGoal: 500,
                    dailyTasksGoal: 5,
                    dailyFocusGoal: 60,
                    alarmDismissPhrase: 'I AM AWAKE',
                    focusDismissPhrase: 'I GIVE UP',
                    alarmSnoozeLimit: 3,
                    alarmSoundEnabled: true,
                    alarmVibrationEnabled: true,
                    focusStrictMode: false,
                    defaultFocusDuration: 25,
                    defaultBreakDuration: 5,
                    focusSoundEnabled: true,
                    darkMode: false,
                    dailyReminderEnabled: true,
                    streakReminderEnabled: true,
                });
                get().saveToFirestore();
            },

            // Save to Firestore
            saveToFirestore: async () => {
                const user = auth.currentUser;
                if (!user || !db) return;

                const state = get();
                try {
                    await setDoc(doc(db, 'users', user.uid, 'settings', 'preferences'), {
                        displayName: state.displayName,
                        dailyPointsGoal: state.dailyPointsGoal,
                        dailyTasksGoal: state.dailyTasksGoal,
                        dailyFocusGoal: state.dailyFocusGoal,
                        alarmDismissPhrase: state.alarmDismissPhrase,
                        focusDismissPhrase: state.focusDismissPhrase,
                        alarmSnoozeLimit: state.alarmSnoozeLimit,
                        alarmSoundEnabled: state.alarmSoundEnabled,
                        alarmVibrationEnabled: state.alarmVibrationEnabled,
                        focusStrictMode: state.focusStrictMode,
                        defaultFocusDuration: state.defaultFocusDuration,
                        defaultBreakDuration: state.defaultBreakDuration,
                        focusSoundEnabled: state.focusSoundEnabled,
                        darkMode: state.darkMode,
                        dailyReminderEnabled: state.dailyReminderEnabled,
                        streakReminderEnabled: state.streakReminderEnabled,
                    });
                } catch (e) {
                    console.error('Failed to save settings to Firestore:', e);
                }
            },

            // Sync with Firestore
            syncWithFirestore: () => {
                const user = auth.currentUser;
                if (!user || !db) return;

                if (unsubscribeFirestore) unsubscribeFirestore();

                unsubscribeFirestore = onSnapshot(
                    doc(db, 'users', user.uid, 'settings', 'preferences'),
                    (docSnap) => {
                        if (docSnap.exists()) {
                            const data = docSnap.data();
                            const s = get();
                            set({
                                displayName: data.displayName ?? s.displayName,
                                dailyPointsGoal: data.dailyPointsGoal ?? s.dailyPointsGoal,
                                dailyTasksGoal: data.dailyTasksGoal ?? s.dailyTasksGoal,
                                dailyFocusGoal: data.dailyFocusGoal ?? s.dailyFocusGoal,
                                alarmDismissPhrase: data.alarmDismissPhrase ?? s.alarmDismissPhrase,
                                focusDismissPhrase: data.focusDismissPhrase ?? s.focusDismissPhrase,
                                alarmSnoozeLimit: data.alarmSnoozeLimit ?? s.alarmSnoozeLimit,
                                alarmSoundEnabled: data.alarmSoundEnabled ?? s.alarmSoundEnabled,
                                alarmVibrationEnabled: data.alarmVibrationEnabled ?? s.alarmVibrationEnabled,
                                focusStrictMode: data.focusStrictMode ?? s.focusStrictMode,
                                defaultFocusDuration: data.defaultFocusDuration ?? s.defaultFocusDuration,
                                defaultBreakDuration: data.defaultBreakDuration ?? s.defaultBreakDuration,
                                focusSoundEnabled: data.focusSoundEnabled ?? s.focusSoundEnabled,
                                darkMode: data.darkMode ?? s.darkMode,
                                dailyReminderEnabled: data.dailyReminderEnabled ?? s.dailyReminderEnabled,
                                streakReminderEnabled: data.streakReminderEnabled ?? s.streakReminderEnabled,
                            });
                        }
                    }
                );
            },

            stopSync: () => {
                if (unsubscribeFirestore) {
                    unsubscribeFirestore();
                    unsubscribeFirestore = null;
                }
            },
        }),
        {
            name: 'focusguard-settings',
            storage: createJSONStorage(() => AsyncStorage),
            partialize: (state) => ({
                displayName: state.displayName,
                dailyPointsGoal: state.dailyPointsGoal,
                dailyTasksGoal: state.dailyTasksGoal,
                dailyFocusGoal: state.dailyFocusGoal,
                alarmDismissPhrase: state.alarmDismissPhrase,
                focusDismissPhrase: state.focusDismissPhrase,
                alarmSnoozeLimit: state.alarmSnoozeLimit,
                alarmSoundEnabled: state.alarmSoundEnabled,
                alarmVibrationEnabled: state.alarmVibrationEnabled,
                focusStrictMode: state.focusStrictMode,
                defaultFocusDuration: state.defaultFocusDuration,
                defaultBreakDuration: state.defaultBreakDuration,
                focusSoundEnabled: state.focusSoundEnabled,
                darkMode: state.darkMode,
                dailyReminderEnabled: state.dailyReminderEnabled,
                streakReminderEnabled: state.streakReminderEnabled,
            }),
        }
    )
);

export default useSettingsStore;
