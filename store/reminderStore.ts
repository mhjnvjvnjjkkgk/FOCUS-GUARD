/**
 * Reminder Store - Zustand state management for reminders
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export type ReminderCategory =
    | 'motivation'
    | 'study'
    | 'health'
    | 'productivity'
    | 'positivity'
    | 'goals'
    | 'habits'
    | 'custom';

export interface ReminderSchedule {
    type: 'once' | 'daily' | 'weekly' | 'interval' | 'random';
    // For once
    date?: string; // ISO date string
    // For daily/weekly
    time?: { hour: number; minute: number };
    // For weekly
    days?: number[]; // 0-6
    // For interval
    intervalMinutes?: number;
    // For interval/random
    activeHours?: {
        start: { hour: number; minute: number };
        end: { hour: number; minute: number };
    };
    // For random
    timesPerDay?: number;
}

export interface Reminder {
    id: string;
    title: string;
    message: string;
    subtitle?: string;

    // Visual
    icon: string;
    color: string;
    imageUri?: string;

    // Schedule
    schedule: ReminderSchedule;

    // Meta
    category: ReminderCategory;
    isFavorite: boolean;
    enabled: boolean;
    notificationId?: string;

    // Statistics
    timesDelivered: number;
    lastDelivered?: string;

    createdAt: string;
    updatedAt: string;
}

interface ReminderState {
    reminders: Reminder[];
    favoriteQuotes: string[];

    // Actions
    addReminder: (reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt' | 'timesDelivered'>) => string;
    updateReminder: (id: string, updates: Partial<Reminder>) => void;
    deleteReminder: (id: string) => void;
    toggleReminder: (id: string) => void;
    toggleFavorite: (id: string) => void;
    markDelivered: (id: string) => void;

    // Quote management
    addFavoriteQuote: (quote: string) => void;
    removeFavoriteQuote: (quote: string) => void;

    // Getters
    getReminder: (id: string) => Reminder | undefined;
    getActiveReminders: () => Reminder[];
    getRemindersByCategory: (category: ReminderCategory) => Reminder[];
    getFavoriteReminders: () => Reminder[];
}

// Generate unique ID
const generateId = () => `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const useReminderStore = create<ReminderState>()(
    persist(
        (set, get) => ({
            reminders: [],
            favoriteQuotes: [],

            addReminder: (reminderData) => {
                const id = generateId();
                const now = new Date().toISOString();

                const newReminder: Reminder = {
                    ...reminderData,
                    id,
                    createdAt: now,
                    updatedAt: now,
                    timesDelivered: 0,
                };

                set((state) => ({
                    reminders: [...state.reminders, newReminder],
                }));

                return id;
            },

            updateReminder: (id, updates) => {
                set((state) => ({
                    reminders: state.reminders.map((reminder) =>
                        reminder.id === id
                            ? { ...reminder, ...updates, updatedAt: new Date().toISOString() }
                            : reminder
                    ),
                }));
            },

            deleteReminder: (id) => {
                set((state) => ({
                    reminders: state.reminders.filter((reminder) => reminder.id !== id),
                }));
            },

            toggleReminder: (id) => {
                set((state) => ({
                    reminders: state.reminders.map((reminder) =>
                        reminder.id === id
                            ? { ...reminder, enabled: !reminder.enabled, updatedAt: new Date().toISOString() }
                            : reminder
                    ),
                }));
            },

            toggleFavorite: (id) => {
                set((state) => ({
                    reminders: state.reminders.map((reminder) =>
                        reminder.id === id
                            ? { ...reminder, isFavorite: !reminder.isFavorite }
                            : reminder
                    ),
                }));
            },

            markDelivered: (id) => {
                set((state) => ({
                    reminders: state.reminders.map((reminder) =>
                        reminder.id === id
                            ? {
                                ...reminder,
                                timesDelivered: reminder.timesDelivered + 1,
                                lastDelivered: new Date().toISOString(),
                            }
                            : reminder
                    ),
                }));
            },

            addFavoriteQuote: (quote) => {
                set((state) => ({
                    favoriteQuotes: [...state.favoriteQuotes, quote],
                }));
            },

            removeFavoriteQuote: (quote) => {
                set((state) => ({
                    favoriteQuotes: state.favoriteQuotes.filter((q) => q !== quote),
                }));
            },

            getReminder: (id) => {
                return get().reminders.find((reminder) => reminder.id === id);
            },

            getActiveReminders: () => {
                return get().reminders.filter((reminder) => reminder.enabled);
            },

            getRemindersByCategory: (category) => {
                return get().reminders.filter((reminder) => reminder.category === category);
            },

            getFavoriteReminders: () => {
                return get().reminders.filter((reminder) => reminder.isFavorite);
            },
        }),
        {
            name: 'focusguard-reminders',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

export default useReminderStore;
