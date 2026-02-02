import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Switch,
    Alert,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';

import { Colors, Spacing, BorderRadius, Shadows, FeatureColors } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useReminderStore, type ReminderCategory } from '@/store';
import { TimePicker } from '@/components/ui/WheelPicker';

// Categories matching store types
const CATEGORIES: { id: ReminderCategory; name: string; icon: string; color: string }[] = [
    { id: 'health', name: 'Health', icon: '💊', color: Colors.accent.green },
    { id: 'productivity', name: 'Productivity', icon: '💼', color: Colors.accent.cyan },
    { id: 'study', name: 'Study', icon: '📚', color: Colors.accent.purple },
    { id: 'motivation', name: 'Motivation', icon: '🔥', color: Colors.accent.orange },
    { id: 'positivity', name: 'Positivity', icon: '⭐', color: Colors.accent.amber },
    { id: 'custom', name: 'Other', icon: '📌', color: Colors.gray[500] },
];

// Days of week
const DAYS = [
    { id: 0, short: 'S', full: 'Sun' },
    { id: 1, short: 'M', full: 'Mon' },
    { id: 2, short: 'T', full: 'Tue' },
    { id: 3, short: 'W', full: 'Wed' },
    { id: 4, short: 'T', full: 'Thu' },
    { id: 5, short: 'F', full: 'Fri' },
    { id: 6, short: 'S', full: 'Sat' },
];

export default function EditReminderScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { id } = useLocalSearchParams<{ id: string }>();

    const reminder = useReminderStore((state) => state.reminders.find(r => r.id === id));
    const updateReminder = useReminderStore((state) => state.updateReminder);
    const deleteReminder = useReminderStore((state) => state.deleteReminder);

    // Form state - initialized from existing reminder
    const [title, setTitle] = useState(reminder?.title || '');
    const [message, setMessage] = useState(reminder?.message || '');
    const [hour, setHour] = useState(reminder?.schedule?.time?.hour || 9);
    const [minute, setMinute] = useState(reminder?.schedule?.time?.minute || 0);
    const [selectedDays, setSelectedDays] = useState<number[]>(reminder?.schedule?.days || [1, 2, 3, 4, 5]);
    const [selectedCategory, setSelectedCategory] = useState(
        CATEGORIES.find(c => c.id === reminder?.category) || CATEGORIES[0]
    );
    const [isFavorite, setIsFavorite] = useState(reminder?.isFavorite || false);

    const toggleDay = (dayId: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedDays(prev =>
            prev.includes(dayId)
                ? prev.filter(d => d !== dayId)
                : [...prev, dayId].sort()
        );
    };

    const handleSave = () => {
        if (!id || !title.trim()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Error', 'Please enter a title for your reminder');
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        updateReminder(id, {
            title: title.trim(),
            message: message.trim() || title.trim(),
            category: selectedCategory.id,
            isFavorite,
            icon: selectedCategory.icon,
            color: selectedCategory.color,
            schedule: {
                type: selectedDays.length === 7 ? 'daily' : selectedDays.length > 0 ? 'weekly' : 'once',
                time: { hour, minute },
                days: selectedDays,
            },
        });

        router.back();
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Reminder',
            'Are you sure you want to delete this reminder?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        if (id) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            deleteReminder(id);
                            router.back();
                        }
                    }
                },
            ]
        );
    };

    if (!reminder) {
        return (
            <View style={[styles.container, styles.centered]}>
                <Text style={styles.errorText}>Reminder not found</Text>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Go Back</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Edit Reminder',
                    headerStyle: { backgroundColor: isDark ? Colors.gray[900] : Colors.background.primary },
                    headerTintColor: isDark ? Colors.text.inverse : Colors.text.primary,
                    headerRight: () => (
                        <Pressable onPress={handleSave} style={styles.saveButton}>
                            <Text style={styles.saveButtonText}>Save</Text>
                        </Pressable>
                    ),
                }}
            />

            <ScrollView
                style={[styles.container, isDark && styles.containerDark]}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Title Input */}
                <Animated.View
                    entering={FadeInUp.delay(100).springify()}
                    style={[styles.section, isDark && styles.sectionDark]}
                >
                    <Text style={[styles.sectionLabel, isDark && styles.textSecondaryDark]}>Title</Text>
                    <TextInput
                        style={[styles.textInput, isDark && styles.textInputDark]}
                        placeholder="Reminder title"
                        placeholderTextColor={Colors.gray[400]}
                        value={title}
                        onChangeText={setTitle}
                    />
                </Animated.View>

                {/* Message */}
                <Animated.View
                    entering={FadeInDown.delay(150).springify()}
                    style={[styles.section, isDark && styles.sectionDark]}
                >
                    <Text style={[styles.sectionLabel, isDark && styles.textSecondaryDark]}>Message (Optional)</Text>
                    <TextInput
                        style={[styles.textInput, styles.textArea, isDark && styles.textInputDark]}
                        placeholder="Add notes..."
                        placeholderTextColor={Colors.gray[400]}
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        numberOfLines={3}
                    />
                </Animated.View>

                {/* Time Picker */}
                <Animated.View
                    entering={FadeInDown.delay(200).springify()}
                    style={[styles.section, isDark && styles.sectionDark]}
                >
                    <Text style={[styles.sectionLabel, isDark && styles.textSecondaryDark]}>Time</Text>
                    <TimePicker
                        hours={hour}
                        minutes={minute}
                        onHoursChange={setHour}
                        onMinutesChange={setMinute}
                        use24Hour={false}
                    />
                </Animated.View>

                {/* Repeat Days */}
                <Animated.View
                    entering={FadeInDown.delay(250).springify()}
                    style={[styles.section, isDark && styles.sectionDark]}
                >
                    <Text style={[styles.sectionLabel, isDark && styles.textSecondaryDark]}>Repeat</Text>
                    <View style={styles.daysRow}>
                        {DAYS.map(day => (
                            <Pressable
                                key={day.id}
                                style={[
                                    styles.dayButton,
                                    selectedDays.includes(day.id) && styles.dayButtonActive,
                                ]}
                                onPress={() => toggleDay(day.id)}
                            >
                                <Text style={[
                                    styles.dayButtonText,
                                    selectedDays.includes(day.id) && styles.dayButtonTextActive,
                                ]}>
                                    {day.short}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </Animated.View>

                {/* Category */}
                <Animated.View
                    entering={FadeInDown.delay(300).springify()}
                    style={[styles.section, isDark && styles.sectionDark]}
                >
                    <Text style={[styles.sectionLabel, isDark && styles.textSecondaryDark]}>Category</Text>
                    <View style={styles.categoriesGrid}>
                        {CATEGORIES.map(category => (
                            <Pressable
                                key={category.id}
                                style={[
                                    styles.categoryCard,
                                    selectedCategory.id === category.id && { borderColor: category.color },
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setSelectedCategory(category);
                                }}
                            >
                                <Text style={styles.categoryIcon}>{category.icon}</Text>
                                <Text style={[
                                    styles.categoryName,
                                    selectedCategory.id === category.id && { color: category.color },
                                ]}>
                                    {category.name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </Animated.View>

                {/* Favorite Toggle */}
                <Animated.View
                    entering={FadeInDown.delay(350).springify()}
                    style={[styles.section, isDark && styles.sectionDark]}
                >
                    <View style={styles.optionRow}>
                        <View style={styles.optionInfo}>
                            <Ionicons name="star" size={20} color={Colors.accent.amber} />
                            <Text style={[styles.optionLabel, isDark && styles.textDark]}>Mark as Favorite</Text>
                        </View>
                        <Switch
                            value={isFavorite}
                            onValueChange={setIsFavorite}
                            trackColor={{ false: Colors.gray[300], true: Colors.accent.amber + '60' }}
                            thumbColor={isFavorite ? Colors.accent.amber : Colors.gray[100]}
                        />
                    </View>
                </Animated.View>

                {/* Delete Button */}
                <Animated.View entering={FadeInDown.delay(400).springify()}>
                    <Pressable style={styles.deleteButton} onPress={handleDelete}>
                        <Ionicons name="trash-outline" size={20} color={Colors.accent.red} />
                        <Text style={styles.deleteButtonText}>Delete Reminder</Text>
                    </Pressable>
                </Animated.View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background.secondary,
    },
    containerDark: {
        backgroundColor: Colors.gray[900],
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: Spacing[4],
    },
    saveButton: {
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing[1],
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: FeatureColors.reminder.primary,
    },
    errorText: {
        fontSize: 18,
        color: Colors.text.secondary,
        marginBottom: Spacing[4],
    },
    backButton: {
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[2],
        backgroundColor: Colors.primary[500],
        borderRadius: BorderRadius.lg,
    },
    backButtonText: {
        color: Colors.text.inverse,
        fontWeight: '600',
    },

    // Sections
    section: {
        backgroundColor: Colors.background.primary,
        borderRadius: BorderRadius.xl,
        padding: Spacing[4],
        marginBottom: Spacing[3],
        ...Shadows.md,
    },
    sectionDark: {
        backgroundColor: Colors.gray[800],
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text.secondary,
        marginBottom: Spacing[3],
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Text Input
    textInput: {
        backgroundColor: '#FFFFFF',
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        borderColor: Colors.gray[300],
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[4],
        fontSize: 18,
        fontWeight: '500',
        color: '#1a1a2e',
    },
    textInputDark: {
        backgroundColor: '#2a2a3e',
        borderColor: Colors.gray[500],
        color: '#FFFFFF',
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },

    // Days
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dayButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.gray[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayButtonActive: {
        backgroundColor: FeatureColors.reminder.primary,
    },
    dayButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text.secondary,
    },
    dayButtonTextActive: {
        color: Colors.text.inverse,
    },

    // Categories
    categoriesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing[2],
    },
    categoryCard: {
        width: '31%',
        backgroundColor: Colors.gray[100],
        borderRadius: BorderRadius.lg,
        padding: Spacing[3],
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    categoryIcon: {
        fontSize: 24,
        marginBottom: Spacing[1],
    },
    categoryName: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.text.primary,
        textAlign: 'center',
    },

    // Options
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing[2],
    },
    optionInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[2],
    },
    optionLabel: {
        fontSize: 15,
        color: Colors.text.primary,
    },
    textDark: {
        color: Colors.text.inverse,
    },
    textSecondaryDark: {
        color: Colors.gray[400],
    },

    // Delete Button
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.accent.red + '10',
        borderRadius: BorderRadius.xl,
        paddingVertical: Spacing[4],
        gap: Spacing[2],
        borderWidth: 1,
        borderColor: Colors.accent.red + '30',
    },
    deleteButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.accent.red,
    },
});
