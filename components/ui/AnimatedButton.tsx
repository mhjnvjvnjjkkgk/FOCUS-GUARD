import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, BorderRadius, Shadows, Animations } from '@/constants/Theme';

interface AnimatedButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    icon?: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    color?: string;
    style?: ViewStyle;
    textStyle?: TextStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AnimatedButton({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    icon,
    disabled = false,
    loading = false,
    fullWidth = false,
    color,
    style,
    textStyle,
}: AnimatedButtonProps) {
    const scale = useSharedValue(1);

    const handlePressIn = () => {
        scale.value = withSpring(0.96, Animations.spring.snappy);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, Animations.spring.bouncy);
    };

    const handlePress = () => {
        if (!disabled && !loading) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPress();
        }
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Size styles
    const sizeStyles = {
        sm: { height: 36, paddingHorizontal: 12, fontSize: 14 },
        md: { height: 44, paddingHorizontal: 20, fontSize: 16 },
        lg: { height: 52, paddingHorizontal: 24, fontSize: 18 },
        xl: { height: 60, paddingHorizontal: 32, fontSize: 20 },
    };

    // Variant styles
    const getVariantStyles = () => {
        const baseColor = color || Colors.primary[500];

        switch (variant) {
            case 'primary':
                return {
                    container: { backgroundColor: baseColor },
                    text: { color: Colors.text.inverse },
                };
            case 'secondary':
                return {
                    container: { backgroundColor: Colors.gray[100] },
                    text: { color: Colors.text.primary },
                };
            case 'outline':
                return {
                    container: { backgroundColor: 'transparent', borderWidth: 2, borderColor: baseColor },
                    text: { color: baseColor },
                };
            case 'ghost':
                return {
                    container: { backgroundColor: 'transparent' },
                    text: { color: baseColor },
                };
            case 'danger':
                return {
                    container: { backgroundColor: Colors.accent.red },
                    text: { color: Colors.text.inverse },
                };
            default:
                return {
                    container: { backgroundColor: baseColor },
                    text: { color: Colors.text.inverse },
                };
        }
    };

    const variantStyles = getVariantStyles();
    const currentSize = sizeStyles[size];

    return (
        <AnimatedPressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handlePress}
            disabled={disabled || loading}
            style={[
                styles.button,
                {
                    height: currentSize.height,
                    paddingHorizontal: currentSize.paddingHorizontal,
                },
                variantStyles.container,
                fullWidth && styles.fullWidth,
                disabled && styles.disabled,
                animatedStyle,
                style,
            ]}
        >
            {icon && <>{icon}</>}
            <Text
                style={[
                    styles.text,
                    { fontSize: currentSize.fontSize },
                    variantStyles.text,
                    icon && styles.textWithIcon,
                    textStyle,
                ]}
            >
                {loading ? 'Loading...' : title}
            </Text>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: BorderRadius.xl,
        ...Shadows.sm,
    },
    fullWidth: {
        width: '100%',
    },
    disabled: {
        opacity: 0.5,
    },
    text: {
        fontWeight: '600',
    },
    textWithIcon: {
        marginLeft: Spacing[2],
    },
});

export default AnimatedButton;
