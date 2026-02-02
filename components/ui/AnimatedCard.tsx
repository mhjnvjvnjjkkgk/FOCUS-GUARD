import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, BorderRadius, Shadows, Animations } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AnimatedCardProps {
    children: React.ReactNode;
    onPress?: () => void;
    index?: number;
    style?: ViewStyle;
    variant?: 'default' | 'elevated' | 'outlined' | 'flat';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    enableHaptics?: boolean;
    animateEntry?: boolean;
    entryDelay?: number;
}

export function AnimatedCard({
    children,
    onPress,
    index = 0,
    style,
    variant = 'default',
    padding = 'md',
    enableHaptics = true,
    animateEntry = true,
    entryDelay = 50,
}: AnimatedCardProps) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const scale = useSharedValue(1);

    const handlePressIn = () => {
        if (onPress) {
            scale.value = withSpring(0.98, Animations.spring.snappy);
        }
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, Animations.spring.bouncy);
    };

    const handlePress = () => {
        if (onPress) {
            if (enableHaptics) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            onPress();
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Padding styles
    const paddingStyles = {
        none: 0,
        sm: Spacing[2],
        md: Spacing[4],
        lg: Spacing[6],
    };

    // Variant styles
    const getVariantStyles = () => {
        switch (variant) {
            case 'elevated':
                return {
                    backgroundColor: isDark ? Colors.gray[800] : Colors.background.primary,
                    ...Shadows.lg,
                };
            case 'outlined':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 1,
                    borderColor: isDark ? Colors.gray[700] : Colors.gray[200],
                };
            case 'flat':
                return {
                    backgroundColor: isDark ? Colors.gray[800] : Colors.gray[50],
                };
            default:
                return {
                    backgroundColor: isDark ? Colors.gray[800] : Colors.background.primary,
                    ...Shadows.sm,
                };
        }
    };

    const cardContent = (
        <Animated.View
            style={[
                styles.card,
                getVariantStyles(),
                { padding: paddingStyles[padding] },
                animatedStyle,
                style,
            ]}
        >
            {children}
        </Animated.View>
    );

    const wrappedContent = animateEntry ? (
        <Animated.View entering={FadeInDown.delay(index * entryDelay).springify()}>
            {cardContent}
        </Animated.View>
    ) : (
        cardContent
    );

    if (onPress) {
        return (
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handlePress}
            >
                {wrappedContent}
            </Pressable>
        );
    }

    return wrappedContent;
}

const styles = StyleSheet.create({
    card: {
        borderRadius: BorderRadius.xl,
    },
});

export default AnimatedCard;
