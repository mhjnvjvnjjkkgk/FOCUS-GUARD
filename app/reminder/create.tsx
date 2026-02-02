import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Image,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack } from 'expo-router';

import { useReminderStore, ReminderCategory } from '@/store';

// ============================================
// NEO-BRUTALIST DESIGN SYSTEM
// ============================================
const NEO = {
    colors: {
        white: '#FFFFFF',
        black: '#000000',
        magenta: '#FF00FF',
        red: '#EF4444',
        orange: '#F97316',
        yellow: '#F59E0B',
        teal: '#14B8A6',
        cyan: '#06B6D4',
        blue: '#3B82F6',
        purple: '#8B5CF6',
        gray: '#64748B',
        lightGray: '#F5F5F5',
    },
    border: 4,
    shadow: 6,
};

// Categories
const CATEGORIES = [
    { id: 'motivation', icon: '💪', label: 'MOTIVATION', color: NEO.colors.orange },
    { id: 'study', icon: '📚', label: 'Study', color: NEO.colors.purple },
    { id: 'health', icon: '🧘', label: 'Health', color: NEO.colors.teal },
];

// Schedule types
const SCHEDULE_TYPES = [
    { id: 'once', label: 'ONCE' },
    { id: 'daily', label: 'DAILY' },
    { id: 'weekly', label: 'WEEKLY' },
    { id: 'interval', label: 'INTERVAL' },
];

// Icons for reminders
const REMINDER_ICONS = ['💪', '📚', '🧘', '⏰', '😊', '🎯'];

// Accent colors
const ACCENT_COLORS = [
    NEO.colors.red,
    NEO.colors.orange,
    NEO.colors.yellow,
    NEO.colors.teal,
    NEO.colors.cyan,
    NEO.colors.blue,
    NEO.colors.purple,
    NEO.colors.gray,
];

// Quote templates
const QUOTE_TEMPLATES = [
    {
        category: 'motivation', quotes: [
            "Success is not final, failure is not fatal: it is the courage to continue that counts.",
            "The only way to do great work is to love what you do.",
            "Believe you can and you're halfway there.",
        ]
    },
    {
        category: 'study', quotes: [
            "The beautiful thing about learning is that nobody can take it away from you.",
            "Education is the most powerful weapon which you can use to change the world.",
        ]
    },
    {
        category: 'health', quotes: [
            "Take care of your body. It's the only place you have to live.",
            "Health is a state of complete harmony of the body, mind and spirit.",
        ]
    },
];

export default function CreateReminderScreen() {
    const addReminder = useReminderStore((state) => state.addReminder);

    // Form state
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [icon, setIcon] = useState('💪');
    const [color, setColor] = useState(ACCENT_COLORS[0]);
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [imageUri, setImageUri] = useState<string | null>(null);

    // Schedule state
    const [scheduleType, setScheduleType] = useState('daily');
    const [hour, setHour] = useState(8);
    const [minute, setMinute] = useState(0);
    const [isPM, setIsPM] = useState(false);

    // UI state
    const [showQuotes, setShowQuotes] = useState(false);

    // Image picker functions
    const pickImage = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });
        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const takePhoto = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return;

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });
        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const selectQuote = (quote: string) => {
        setMessage(quote);
        setShowQuotes(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleSave = () => {
        const actualHour = isPM ? (hour % 12) + 12 : hour % 12;
        const schedule: any = {
            type: scheduleType as any,
            time: { hour: actualHour, minute },
        };

        addReminder({
            title: title || 'Reminder',
            message: message || 'Time for your reminder!',
            icon,
            color,
            imageUri: imageUri || undefined,
            schedule,
            category: category.id as ReminderCategory,
            isFavorite: false,
            enabled: true,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: false,
                }}
            />

            <View style={styles.container}>
                {/* HEADER */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>NEW REMINDER</Text>
                    <Pressable
                        onPress={handleSave}
                        style={({ pressed }) => [
                            styles.saveButton,
                            pressed && styles.saveButtonPressed
                        ]}
                    >
                        <Text style={styles.saveButtonText}>SAVE</Text>
                    </Pressable>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* TITLE SECTION */}
                    <Animated.View entering={FadeInUp.delay(50)} style={styles.section}>
                        <Text style={styles.sectionLabel}>TITLE</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Reminder title"
                            placeholderTextColor="#999"
                            value={title}
                            onChangeText={setTitle}
                            maxLength={50}
                        />
                    </Animated.View>

                    {/* MESSAGE SECTION */}
                    <Animated.View entering={FadeInUp.delay(100)} style={styles.section}>
                        <View style={styles.labelRow}>
                            <Text style={styles.sectionLabel}>MESSAGE</Text>
                            <Pressable
                                onPress={() => setShowQuotes(!showQuotes)}
                                style={styles.browseQuotesBtn}
                            >
                                <Text style={styles.browseQuotesText}>Browse Quotes</Text>
                            </Pressable>
                        </View>
                        <TextInput
                            style={styles.textarea}
                            placeholder="Your motivational message or quote"
                            placeholderTextColor="#999"
                            value={message}
                            onChangeText={setMessage}
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                            textAlignVertical="top"
                        />
                        <Text style={styles.charCount}>{message.length}/500</Text>

                        {/* Quote Templates */}
                        {showQuotes && (
                            <Animated.View entering={FadeInDown} style={styles.quotesContainer}>
                                {QUOTE_TEMPLATES.map((cat) => (
                                    <View key={cat.category}>
                                        <Text style={styles.quoteCategory}>
                                            {CATEGORIES.find(c => c.id === cat.category)?.icon} {cat.category}
                                        </Text>
                                        {cat.quotes.map((quote, idx) => (
                                            <Pressable
                                                key={idx}
                                                style={styles.quoteItem}
                                                onPress={() => selectQuote(quote)}
                                            >
                                                <Text style={styles.quoteText} numberOfLines={2}>"{quote}"</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                ))}
                            </Animated.View>
                        )}
                    </Animated.View>

                    {/* IMAGE SECTION */}
                    <Animated.View entering={FadeInUp.delay(150)} style={styles.section}>
                        <Text style={styles.sectionLabel}>IMAGE (OPTIONAL)</Text>
                        <View style={styles.imageActions}>
                            <Pressable style={styles.imageButton} onPress={pickImage}>
                                <Ionicons name="image-outline" size={20} color={NEO.colors.black} />
                                <Text style={styles.imageButtonText}>GALLERY</Text>
                            </Pressable>
                            <Pressable style={styles.imageButton} onPress={takePhoto}>
                                <Ionicons name="camera-outline" size={20} color={NEO.colors.black} />
                                <Text style={styles.imageButtonText}>CAMERA</Text>
                            </Pressable>
                        </View>
                    </Animated.View>

                    {/* ICON & COLOR SECTION */}
                    <Animated.View entering={FadeInUp.delay(200)} style={styles.section}>
                        <Text style={styles.sectionLabel}>ICON</Text>
                        <View style={styles.iconsRow}>
                            {REMINDER_ICONS.map((iconItem, idx) => (
                                <Pressable
                                    key={idx}
                                    style={[
                                        styles.iconButton,
                                        icon === iconItem && styles.iconButtonSelected,
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setIcon(iconItem);
                                    }}
                                >
                                    <Text style={styles.iconEmoji}>{iconItem}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>COLOR</Text>
                        <View style={styles.colorsRow}>
                            {ACCENT_COLORS.map((colorItem) => (
                                <Pressable
                                    key={colorItem}
                                    style={[
                                        styles.colorButton,
                                        { backgroundColor: colorItem },
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setColor(colorItem);
                                    }}
                                >
                                    {color === colorItem && (
                                        <Text style={styles.colorCheckmark}>✓</Text>
                                    )}
                                </Pressable>
                            ))}
                        </View>
                    </Animated.View>

                    {/* CATEGORY SECTION */}
                    <Animated.View entering={FadeInUp.delay(250)} style={styles.section}>
                        <Text style={styles.sectionLabel}>CATEGORY</Text>
                        <View style={styles.categoriesRow}>
                            {CATEGORIES.map((cat) => (
                                <Pressable
                                    key={cat.id}
                                    style={[
                                        styles.categoryChip,
                                        category.id === cat.id && { backgroundColor: cat.color },
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setCategory(cat);
                                        setColor(cat.color);
                                    }}
                                >
                                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                                    <Text style={[
                                        styles.categoryLabel,
                                        category.id === cat.id && styles.categoryLabelActive,
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </Animated.View>

                    {/* SCHEDULE SECTION */}
                    <Animated.View entering={FadeInUp.delay(300)} style={styles.section}>
                        <Text style={styles.sectionLabel}>SCHEDULE</Text>

                        {/* Schedule Type */}
                        <View style={styles.scheduleTypes}>
                            {SCHEDULE_TYPES.map((type) => (
                                <Pressable
                                    key={type.id}
                                    style={[
                                        styles.scheduleTypeButton,
                                        scheduleType === type.id && styles.scheduleTypeButtonActive,
                                    ]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setScheduleType(type.id);
                                    }}
                                >
                                    <Text style={[
                                        styles.scheduleTypeLabel,
                                        scheduleType === type.id && styles.scheduleTypeLabelActive,
                                    ]}>
                                        {type.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Time Picker */}
                        {scheduleType !== 'interval' && (
                            <View style={styles.timeRow}>
                                <Text style={styles.timeLabel}>Time:</Text>

                                {/* Hour */}
                                <View style={styles.timePicker}>
                                    <Pressable
                                        style={styles.timeArrow}
                                        onPress={() => setHour((h) => (h % 12) + 1)}
                                    >
                                        <Ionicons name="chevron-up" size={16} color={NEO.colors.black} />
                                    </Pressable>
                                    <Text style={styles.timeValue}>
                                        {hour.toString().padStart(2, '0')}
                                    </Text>
                                    <Pressable
                                        style={styles.timeArrow}
                                        onPress={() => setHour((h) => h === 1 ? 12 : h - 1)}
                                    >
                                        <Ionicons name="chevron-down" size={16} color={NEO.colors.black} />
                                    </Pressable>
                                </View>

                                <Text style={styles.timeSeparator}>:</Text>

                                {/* Minute */}
                                <View style={styles.timePicker}>
                                    <Pressable
                                        style={styles.timeArrow}
                                        onPress={() => setMinute((m) => (m + 5) % 60)}
                                    >
                                        <Ionicons name="chevron-up" size={16} color={NEO.colors.black} />
                                    </Pressable>
                                    <Text style={styles.timeValue}>
                                        {minute.toString().padStart(2, '0')}
                                    </Text>
                                    <Pressable
                                        style={styles.timeArrow}
                                        onPress={() => setMinute((m) => (m - 5 + 60) % 60)}
                                    >
                                        <Ionicons name="chevron-down" size={16} color={NEO.colors.black} />
                                    </Pressable>
                                </View>

                                {/* AM/PM */}
                                <Pressable
                                    style={styles.periodBadge}
                                    onPress={() => setIsPM(!isPM)}
                                >
                                    <Text style={styles.periodText}>{isPM ? 'PM' : 'AM'}</Text>
                                </Pressable>
                            </View>
                        )}
                    </Animated.View>

                    {/* PREVIEW SECTION */}
                    <Animated.View entering={FadeInUp.delay(350)} style={styles.section}>
                        <Text style={styles.sectionLabel}>PREVIEW</Text>
                        <View style={styles.previewCard}>
                            <View style={[styles.previewAccent, { backgroundColor: color }]} />
                            <View style={styles.previewContent}>
                                <View style={[styles.previewIcon, { backgroundColor: color + '40' }]}>
                                    <Text style={styles.previewIconEmoji}>{icon}</Text>
                                </View>
                                <View style={styles.previewText}>
                                    <Text style={styles.previewTitle}>
                                        {title || 'Reminder Title'}
                                    </Text>
                                    <Text style={styles.previewMessage} numberOfLines={2}>
                                        {message || 'Your message will appear here...'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </Animated.View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NEO.colors.white,
        paddingTop: 60,
    },

    // HEADER
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: NEO.border,
        borderBottomColor: NEO.colors.black,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: NEO.colors.black,
        letterSpacing: -0.5,
    },
    saveButton: {
        backgroundColor: NEO.colors.magenta,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        paddingHorizontal: 20,
        paddingVertical: 10,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: NEO.shadow, height: NEO.shadow },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    saveButtonPressed: {
        transform: [{ translateX: NEO.shadow }, { translateY: NEO.shadow }],
        shadowOpacity: 0,
    },
    saveButtonText: {
        fontSize: 14,
        fontWeight: '900',
        color: NEO.colors.white,
        letterSpacing: 0.5,
    },

    scrollContent: {
        padding: 20,
    },

    // SECTIONS
    section: {
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        padding: 16,
        marginBottom: 16,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: NEO.shadow, height: NEO.shadow },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '900',
        color: NEO.colors.black,
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },

    // INPUTS
    input: {
        fontSize: 16,
        fontWeight: '500',
        color: NEO.colors.black,
        backgroundColor: NEO.colors.white,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
    },
    textarea: {
        fontSize: 16,
        fontWeight: '500',
        color: NEO.colors.black,
        backgroundColor: NEO.colors.white,
        paddingVertical: 12,
        paddingHorizontal: 12,
        minHeight: 100,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 10,
        color: '#666',
        textAlign: 'right',
        marginTop: 4,
    },

    // BROWSE QUOTES
    browseQuotesBtn: {
        backgroundColor: NEO.colors.white,
        borderWidth: 3,
        borderColor: NEO.colors.black,
        paddingHorizontal: 12,
        paddingVertical: 6,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    browseQuotesText: {
        fontSize: 10,
        fontWeight: '900',
        color: NEO.colors.black,
    },

    // QUOTES
    quotesContainer: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 2,
        borderTopColor: NEO.colors.black,
    },
    quoteCategory: {
        fontSize: 11,
        fontWeight: '900',
        color: NEO.colors.black,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    quoteItem: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 8,
        backgroundColor: NEO.colors.lightGray,
        borderWidth: 2,
        borderColor: NEO.colors.black,
    },
    quoteText: {
        fontSize: 12,
        color: '#333',
        fontStyle: 'italic',
    },

    // IMAGE
    imageActions: {
        flexDirection: 'row',
        gap: 12,
    },
    imageButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    imageButtonText: {
        fontSize: 12,
        fontWeight: '900',
        color: NEO.colors.black,
    },

    // ICONS
    iconsRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    iconButton: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: NEO.colors.white,
        borderWidth: 3,
        borderColor: NEO.colors.black,
    },
    iconButtonSelected: {
        borderColor: NEO.colors.red,
        borderWidth: 4,
    },
    iconEmoji: {
        fontSize: 24,
    },

    // COLORS
    colorsRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    colorButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
    },
    colorCheckmark: {
        fontSize: 20,
        fontWeight: '900',
        color: NEO.colors.black,
    },

    // CATEGORIES
    categoriesRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 6,
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    categoryIcon: {
        fontSize: 16,
    },
    categoryLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: NEO.colors.black,
    },
    categoryLabelActive: {
        color: NEO.colors.black,
        fontWeight: '900',
    },

    // SCHEDULE
    scheduleTypes: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    scheduleTypeButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
    },
    scheduleTypeButtonActive: {
        backgroundColor: NEO.colors.magenta,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    scheduleTypeLabel: {
        fontSize: 11,
        fontWeight: '900',
        color: NEO.colors.black,
    },
    scheduleTypeLabelActive: {
        color: NEO.colors.white,
    },

    // TIME
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timeLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: NEO.colors.black,
        marginRight: 8,
    },
    timePicker: {
        alignItems: 'center',
    },
    timeArrow: {
        width: 32,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: NEO.colors.white,
        borderWidth: 3,
        borderColor: NEO.colors.black,
    },
    timeValue: {
        fontSize: 28,
        fontWeight: '900',
        fontFamily: 'monospace',
        color: NEO.colors.black,
        marginVertical: 4,
    },
    timeSeparator: {
        fontSize: 28,
        fontWeight: '900',
        color: NEO.colors.black,
    },
    periodBadge: {
        marginLeft: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
    },
    periodText: {
        fontSize: 14,
        fontWeight: '900',
        color: NEO.colors.black,
    },

    // PREVIEW
    previewCard: {
        backgroundColor: NEO.colors.lightGray,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        overflow: 'hidden',
    },
    previewAccent: {
        height: 6,
    },
    previewContent: {
        flexDirection: 'row',
        padding: 12,
    },
    previewIcon: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: NEO.colors.black,
    },
    previewIconEmoji: {
        fontSize: 20,
    },
    previewText: {
        flex: 1,
    },
    previewTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: NEO.colors.black,
        marginBottom: 4,
    },
    previewMessage: {
        fontSize: 12,
        color: '#666',
        lineHeight: 16,
    },
});
