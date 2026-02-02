import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Pressable,
    FlatList,
    ViewToken,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    interpolate,
    Extrapolation,
    FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { Colors, Spacing, BorderRadius, Shadows, FeatureColors } from '@/constants/Theme';

const { width, height } = Dimensions.get('window');

// Onboarding slides data
const SLIDES = [
    {
        id: '1',
        icon: '⏰',
        title: 'Smart Alarms',
        subtitle: 'Wake up with purpose',
        description: 'Set alarms with unique dismiss tasks like math problems, shaking, or breathing exercises to ensure you\'re fully awake.',
        color: FeatureColors.alarm.primary,
        features: ['10+ dismiss task types', 'Custom ringtones', 'Smart snooze limits'],
    },
    {
        id: '2',
        icon: '💭',
        title: 'Daily Reminders',
        subtitle: 'Stay motivated all day',
        description: 'Schedule inspiring quotes, affirmations, and custom messages with images to keep you focused on your goals.',
        color: FeatureColors.reminder.primary,
        features: ['Custom images', 'Quote templates', 'Flexible schedules'],
    },
    {
        id: '3',
        icon: '🎯',
        title: 'Focus Mode',
        subtitle: 'Deep work made easy',
        description: 'Block distracting apps and stay focused with timed sessions, ambient sounds, and break reminders.',
        color: FeatureColors.focus.primary,
        features: ['Preset modes', 'Ambient sounds', 'Session history'],
    },
    {
        id: '4',
        icon: '🛡️',
        title: 'App Blocker',
        subtitle: 'Take control of your time',
        description: 'Set daily limits for distracting apps, track your usage, and unlock with mindful tasks.',
        color: FeatureColors.blocker.primary,
        features: ['Real usage tracking', 'Custom limits', 'Unlock challenges'],
    },
    {
        id: '5',
        icon: '📊',
        title: 'Track Progress',
        subtitle: 'See your growth',
        description: 'View detailed statistics, earn achievements, and build productive streaks over time.',
        color: FeatureColors.stats.primary,
        features: ['Daily analytics', 'Achievement badges', 'Weekly reports'],
    },
];

// Slide Component
interface SlideProps {
    item: typeof SLIDES[0];
    index: number;
    scrollX: Animated.SharedValue<number>;
}

function Slide({ item, index, scrollX }: SlideProps) {
    const animatedStyle = useAnimatedStyle(() => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

        const scale = interpolate(
            scrollX.value,
            inputRange,
            [0.8, 1, 0.8],
            Extrapolation.CLAMP
        );

        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.5, 1, 0.5],
            Extrapolation.CLAMP
        );

        return {
            transform: [{ scale }],
            opacity,
        };
    });

    return (
        <View style={styles.slide}>
            <Animated.View style={[styles.slideContent, animatedStyle]}>
                {/* Icon */}
                <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
                    <Text style={styles.iconEmoji}>{item.icon}</Text>
                </View>

                {/* Title */}
                <Text style={styles.title}>{item.title}</Text>
                <Text style={[styles.subtitle, { color: item.color }]}>{item.subtitle}</Text>

                {/* Description */}
                <Text style={styles.description}>{item.description}</Text>

                {/* Features */}
                <View style={styles.featuresContainer}>
                    {item.features.map((feature, idx) => (
                        <View key={idx} style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={18} color={item.color} />
                            <Text style={styles.featureText}>{feature}</Text>
                        </View>
                    ))}
                </View>
            </Animated.View>
        </View>
    );
}

// Pagination Dot
interface DotProps {
    index: number;
    scrollX: Animated.SharedValue<number>;
    color: string;
}

function Dot({ index, scrollX, color }: DotProps) {
    const animatedStyle = useAnimatedStyle(() => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

        const dotWidth = interpolate(
            scrollX.value,
            inputRange,
            [8, 24, 8],
            Extrapolation.CLAMP
        );

        const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.4, 1, 0.4],
            Extrapolation.CLAMP
        );

        return {
            width: dotWidth,
            opacity,
            backgroundColor: color,
        };
    });

    return <Animated.View style={[styles.dot, animatedStyle]} />;
}

// Main Onboarding Screen
export default function OnboardingScreen() {
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useSharedValue(0);
    const flatListRef = useRef<FlatList>(null);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({
                index: currentIndex + 1,
                animated: true,
            });
        }
    };

    const handleSkip = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.replace('/(tabs)');
    };

    const handleGetStarted = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
    };

    const isLastSlide = currentIndex === SLIDES.length - 1;
    const currentColor = SLIDES[currentIndex].color;

    return (
        <View style={styles.container}>
            {/* Skip Button */}
            {!isLastSlide && (
                <Animated.View entering={FadeIn.delay(500)} style={styles.skipButton}>
                    <Pressable onPress={handleSkip}>
                        <Text style={styles.skipText}>Skip</Text>
                    </Pressable>
                </Animated.View>
            )}

            {/* Slides */}
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                keyExtractor={item => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(event) => {
                    scrollX.value = event.nativeEvent.contentOffset.x;
                }}
                scrollEventThrottle={16}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                renderItem={({ item, index }) => (
                    <Slide item={item} index={index} scrollX={scrollX} />
                )}
            />

            {/* Bottom Controls */}
            <View style={styles.bottomContainer}>
                {/* Pagination */}
                <View style={styles.pagination}>
                    {SLIDES.map((slide, index) => (
                        <Dot key={index} index={index} scrollX={scrollX} color={slide.color} />
                    ))}
                </View>

                {/* Action Button */}
                {isLastSlide ? (
                    <Pressable
                        style={[styles.getStartedButton, { backgroundColor: currentColor }]}
                        onPress={handleGetStarted}
                    >
                        <Text style={styles.getStartedText}>Get Started</Text>
                        <Ionicons name="arrow-forward" size={20} color={Colors.text.inverse} />
                    </Pressable>
                ) : (
                    <Pressable
                        style={[styles.nextButton, { backgroundColor: currentColor }]}
                        onPress={handleNext}
                    >
                        <Ionicons name="arrow-forward" size={24} color={Colors.text.inverse} />
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.gray[900],
    },

    // Skip
    skipButton: {
        position: 'absolute',
        top: 60,
        right: Spacing[6],
        zIndex: 100,
    },
    skipText: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.gray[400],
    },

    // Slide
    slide: {
        width,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing[6],
        paddingTop: 100,
        paddingBottom: 200,
    },
    slideContent: {
        alignItems: 'center',
        maxWidth: 340,
    },

    // Icon
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing[6],
    },
    iconEmoji: {
        fontSize: 56,
    },

    // Text
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: Colors.text.inverse,
        textAlign: 'center',
        marginBottom: Spacing[2],
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: Spacing[4],
    },
    description: {
        fontSize: 16,
        color: Colors.gray[400],
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: Spacing[6],
    },

    // Features
    featuresContainer: {
        alignSelf: 'stretch',
        gap: Spacing[3],
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[2],
    },
    featureText: {
        fontSize: 15,
        color: Colors.gray[300],
    },

    // Bottom
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: Spacing[6],
        paddingBottom: 50,
        alignItems: 'center',
        gap: Spacing[6],
    },

    // Pagination
    pagination: {
        flexDirection: 'row',
        gap: Spacing[2],
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },

    // Buttons
    nextButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.lg,
    },
    getStartedButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing[8],
        paddingVertical: Spacing[4],
        borderRadius: BorderRadius.xl,
        gap: Spacing[2],
        ...Shadows.lg,
    },
    getStartedText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.text.inverse,
    },
});
