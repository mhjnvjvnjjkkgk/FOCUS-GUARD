/**
 * TimePicker - Premium animated time picker with clock visualization
 * Features spring animations, haptic feedback, and visual polish
 */
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withSequence,
    withTiming,
    FadeIn,
    ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/Theme';

interface TimePickerProps {
    hours: number;
    minutes: number;
    onHoursChange: (hours: number) => void;
    onMinutesChange: (minutes: number) => void;
    use24Hour?: boolean;
}

interface TimeColumnProps {
    value: number;
    max: number;
    min?: number;
    onChange: (value: number) => void;
    label: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function TimeColumn({ value, max, min = 0, onChange, label }: TimeColumnProps) {
    const scale = useSharedValue(1);
    const upButtonScale = useSharedValue(1);
    const downButtonScale = useSharedValue(1);
    const valueRotation = useSharedValue(0);

    const handleIncrement = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        upButtonScale.value = withSequence(
            withTiming(0.8, { duration: 50 }),
            withSpring(1, { damping: 10, stiffness: 400 })
        );
        valueRotation.value = withSequence(
            withTiming(-5, { duration: 50 }),
            withSpring(0, { damping: 10, stiffness: 300 })
        );
        scale.value = withSequence(
            withTiming(1.1, { duration: 80 }),
            withSpring(1, { damping: 12, stiffness: 200 })
        );
        const newValue = value >= max ? min : value + 1;
        onChange(newValue);
    };

    const handleDecrement = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        downButtonScale.value = withSequence(
            withTiming(0.8, { duration: 50 }),
            withSpring(1, { damping: 10, stiffness: 400 })
        );
        valueRotation.value = withSequence(
            withTiming(5, { duration: 50 }),
            withSpring(0, { damping: 10, stiffness: 300 })
        );
        scale.value = withSequence(
            withTiming(1.1, { duration: 80 }),
            withSpring(1, { damping: 12, stiffness: 200 })
        );
        const newValue = value <= min ? max : value - 1;
        onChange(newValue);
    };

    const animatedValueStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: valueRotation.value + 'deg' },
        ],
    }));

    const upButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: upButtonScale.value }],
    }));

    const downButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: downButtonScale.value }],
    }));

    const displayValue = value.toString().padStart(2, '0');

    return (
        <Animated.View
            entering={ZoomIn.springify().damping(15)}
            style={styles.column}
        >
            <Text style={styles.label}>{label}</Text>

            <AnimatedPressable
                onPress={handleIncrement}
                style={[styles.arrowButton, upButtonStyle]}
            >
                <View style={styles.arrowButtonInner}>
                    <Ionicons name="chevron-up" size={28} color={Colors.primary[500]} />
                </View>
            </AnimatedPressable>

            <Animated.View style={[styles.valueContainer, animatedValueStyle]}>
                <Text style={styles.valueText}>{displayValue}</Text>
            </Animated.View>

            <AnimatedPressable
                onPress={handleDecrement}
                style={[styles.arrowButton, downButtonStyle]}
            >
                <View style={styles.arrowButtonInner}>
                    <Ionicons name="chevron-down" size={28} color={Colors.primary[500]} />
                </View>
            </AnimatedPressable>
        </Animated.View>
    );
}

export function TimePicker({
    hours,
    minutes,
    onHoursChange,
    onMinutesChange,
    use24Hour = false,
}: TimePickerProps) {
    const isPM = hours >= 12;
    const displayHour = use24Hour ? hours : (hours % 12 || 12);
    const ampmScale = useSharedValue(1);

    const handleHourChange = (newHour: number) => {
        if (use24Hour) {
            onHoursChange(newHour);
        } else {
            // Convert 12-hour to 24-hour
            if (isPM) {
                onHoursChange(newHour === 12 ? 12 : newHour + 12);
            } else {
                onHoursChange(newHour === 12 ? 0 : newHour);
            }
        }
    };

    const toggleAMPM = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        ampmScale.value = withSequence(
            withTiming(0.9, { duration: 50 }),
            withSpring(1, { damping: 10, stiffness: 400 })
        );
        if (isPM) {
            onHoursChange(hours - 12);
        } else {
            onHoursChange(hours + 12);
        }
    };

    const ampmStyle = useAnimatedStyle(() => ({
        transform: [{ scale: ampmScale.value }],
    }));

    // Calculate clock hand angle for visualization
    const hourAngle = ((displayHour % 12) / 12) * 360 - 90;
    const minuteAngle = (minutes / 60) * 360 - 90;

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.container}
        >
            {/* Clock Visualization */}
            <View style={styles.clockContainer}>
                <View style={styles.clockFace}>
                    {/* Hour markers */}
                    {[...Array(12)].map((_, i) => {
                        const angle = (i / 12) * 360 - 90;
                        const radian = (angle * Math.PI) / 180;
                        const radius = 42;
                        const x = Math.cos(radian) * radius;
                        const y = Math.sin(radian) * radius;
                        return (
                            <View
                                key={i}
                                style={[
                                    styles.hourMarker,
                                    {
                                        left: 50 + x - 2,
                                        top: 50 + y - 2,
                                    },
                                    i % 3 === 0 && styles.hourMarkerMajor,
                                ]}
                            />
                        );
                    })}
                    {/* Hour hand */}
                    <View
                        style={[
                            styles.clockHand,
                            styles.hourHand,
                            { transform: [{ rotate: `${hourAngle}deg` }] },
                        ]}
                    />
                    {/* Minute hand */}
                    <View
                        style={[
                            styles.clockHand,
                            styles.minuteHand,
                            { transform: [{ rotate: `${minuteAngle}deg` }] },
                        ]}
                    />
                    {/* Center dot */}
                    <View style={styles.clockCenter} />
                </View>
            </View>

            {/* Time Picker Controls */}
            <View style={styles.pickerRow}>
                <TimeColumn
                    value={displayHour}
                    max={use24Hour ? 23 : 12}
                    min={use24Hour ? 0 : 1}
                    onChange={handleHourChange}
                    label="HOUR"
                />

                <View style={styles.separatorContainer}>
                    <Text style={styles.separator}>:</Text>
                </View>

                <TimeColumn
                    value={minutes}
                    max={59}
                    min={0}
                    onChange={onMinutesChange}
                    label="MIN"
                />

                {!use24Hour && (
                    <AnimatedPressable style={[styles.ampmContainer, ampmStyle]} onPress={toggleAMPM}>
                        <View style={[styles.ampmButton, !isPM && styles.ampmActive]}>
                            <Text style={[styles.ampmText, !isPM && styles.ampmTextActive]}>AM</Text>
                        </View>
                        <View style={[styles.ampmButton, isPM && styles.ampmActive]}>
                            <Text style={[styles.ampmText, isPM && styles.ampmTextActive]}>PM</Text>
                        </View>
                    </AnimatedPressable>
                )}
            </View>

            {/* Time Display */}
            <View style={styles.displayContainer}>
                <Text style={styles.displayTime}>
                    {displayHour.toString().padStart(2, '0')}:{minutes.toString().padStart(2, '0')}
                    {!use24Hour && <Text style={styles.displayPeriod}> {isPM ? 'PM' : 'AM'}</Text>}
                </Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: Spacing[2],
    },
    clockContainer: {
        marginBottom: Spacing[4],
    },
    clockFace: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.gray[100],
        borderWidth: 3,
        borderColor: Colors.primary[500],
        position: 'relative',
    },
    hourMarker: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.gray[300],
    },
    hourMarkerMajor: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: Colors.primary[400],
    },
    clockHand: {
        position: 'absolute',
        left: 50,
        top: 50,
        transformOrigin: 'left center',
    },
    hourHand: {
        width: 25,
        height: 4,
        backgroundColor: Colors.primary[600],
        borderRadius: 2,
    },
    minuteHand: {
        width: 35,
        height: 2,
        backgroundColor: Colors.primary[400],
        borderRadius: 1,
    },
    clockCenter: {
        position: 'absolute',
        left: 46,
        top: 46,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primary[500],
    },
    pickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    column: {
        alignItems: 'center',
    },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.text.secondary,
        letterSpacing: 1.5,
        marginBottom: Spacing[1],
    },
    arrowButton: {
        padding: Spacing[1],
    },
    arrowButtonInner: {
        width: 40,
        height: 32,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
    },
    valueContainer: {
        width: 72,
        height: 72,
        backgroundColor: Colors.gray[100],
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: Colors.primary[500],
        ...Shadows.lg,
    },
    valueText: {
        fontSize: 38,
        fontWeight: '800',
        color: Colors.text.primary,
    },
    separatorContainer: {
        marginHorizontal: Spacing[1],
        paddingTop: 25,
    },
    separator: {
        fontSize: 42,
        fontWeight: '800',
        color: Colors.primary[500],
    },
    ampmContainer: {
        marginLeft: Spacing[3],
        paddingTop: 25,
    },
    ampmButton: {
        paddingHorizontal: Spacing[3],
        paddingVertical: Spacing[2],
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing[1],
        backgroundColor: Colors.gray[100],
    },
    ampmActive: {
        backgroundColor: Colors.primary[500],
    },
    ampmText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text.secondary,
    },
    ampmTextActive: {
        color: Colors.text.inverse,
    },
    displayContainer: {
        marginTop: Spacing[4],
        paddingHorizontal: Spacing[6],
        paddingVertical: Spacing[2],
        backgroundColor: Colors.primary[50],
        borderRadius: BorderRadius.full,
        borderWidth: 2,
        borderColor: Colors.primary[200],
    },
    displayTime: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.primary[600],
    },
    displayPeriod: {
        fontSize: 16,
        fontWeight: '700',
    },
});

// Time Range Picker for Start/End time selection
interface TimeRangePickerProps {
    startHours: number;
    startMinutes: number;
    endHours: number;
    endMinutes: number;
    onStartChange: (hours: number, minutes: number) => void;
    onEndChange: (hours: number, minutes: number) => void;
}

// Compact Time Display for Range Picker
function CompactTimeDisplay({
    hours,
    minutes,
    label,
    onIncrement,
    onDecrement,
    color
}: {
    hours: number;
    minutes: number;
    label: string;
    onIncrement: () => void;
    onDecrement: () => void;
    color: string;
}) {
    const scale = useSharedValue(1);

    const handleIncrement = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        scale.value = withSequence(
            withTiming(0.95, { duration: 50 }),
            withSpring(1, { damping: 10, stiffness: 400 })
        );
        onIncrement();
    };

    const handleDecrement = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        scale.value = withSequence(
            withTiming(0.95, { duration: 50 }),
            withSpring(1, { damping: 10, stiffness: 400 })
        );
        onDecrement();
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const isPM = hours >= 12;
    const displayHour = hours % 12 || 12;

    return (
        <View style={rangeStyles.timeBlock}>
            <Text style={[rangeStyles.timeLabel, { color }]}>{label}</Text>
            <Animated.View style={[rangeStyles.timeDisplay, animatedStyle, { borderColor: color }]}>
                <Pressable
                    onPress={handleDecrement}
                    style={rangeStyles.timeArrow}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="remove" size={24} color={color} />
                </Pressable>

                <View style={rangeStyles.timeValueContainer}>
                    <Text style={rangeStyles.timeValue}>
                        {displayHour}:{minutes.toString().padStart(2, '0')}
                    </Text>
                    <Text style={[rangeStyles.timePeriod, { color }]}>
                        {isPM ? 'PM' : 'AM'}
                    </Text>
                </View>

                <Pressable
                    onPress={handleIncrement}
                    style={rangeStyles.timeArrow}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Ionicons name="add" size={24} color={color} />
                </Pressable>
            </Animated.View>
        </View>
    );
}

export function TimeRangePicker({
    startHours,
    startMinutes,
    endHours,
    endMinutes,
    onStartChange,
    onEndChange,
}: TimeRangePickerProps) {
    // Calculate duration
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    const duration = endTotal - startTotal;
    const isValid = duration > 0;

    const formatDuration = (mins: number) => {
        if (mins <= 0) return 'Invalid';
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        if (h === 0) return `${m}min`;
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    };

    const handleStartIncrement = () => {
        let newMins = startMinutes + 15;
        let newHours = startHours;
        if (newMins >= 60) {
            newMins = 0;
            newHours = (newHours + 1) % 24;
        }
        onStartChange(newHours, newMins);
    };

    const handleStartDecrement = () => {
        let newMins = startMinutes - 15;
        let newHours = startHours;
        if (newMins < 0) {
            newMins = 45;
            newHours = (newHours - 1 + 24) % 24;
        }
        onStartChange(newHours, newMins);
    };

    const handleEndIncrement = () => {
        let newMins = endMinutes + 15;
        let newHours = endHours;
        if (newMins >= 60) {
            newMins = 0;
            newHours = (newHours + 1) % 24;
        }
        onEndChange(newHours, newMins);
    };

    const handleEndDecrement = () => {
        let newMins = endMinutes - 15;
        let newHours = endHours;
        if (newMins < 0) {
            newMins = 45;
            newHours = (newHours - 1 + 24) % 24;
        }
        onEndChange(newHours, newMins);
    };

    return (
        <View style={rangeStyles.container}>
            <View style={rangeStyles.timesRow}>
                <CompactTimeDisplay
                    hours={startHours}
                    minutes={startMinutes}
                    label="START"
                    onIncrement={handleStartIncrement}
                    onDecrement={handleStartDecrement}
                    color={Colors.accent.green}
                />

                <View style={rangeStyles.arrowContainer}>
                    <Ionicons name="arrow-forward" size={24} color={Colors.gray[400]} />
                </View>

                <CompactTimeDisplay
                    hours={endHours}
                    minutes={endMinutes}
                    label="END"
                    onIncrement={handleEndIncrement}
                    onDecrement={handleEndDecrement}
                    color={Colors.accent.red}
                />
            </View>

            <View style={[
                rangeStyles.durationBadge,
                !isValid && rangeStyles.durationBadgeInvalid
            ]}>
                <Ionicons
                    name={isValid ? "time-outline" : "alert-circle"}
                    size={16}
                    color={isValid ? Colors.primary[600] : Colors.accent.red}
                />
                <Text style={[
                    rangeStyles.durationText,
                    !isValid && rangeStyles.durationTextInvalid
                ]}>
                    {isValid ? `Duration: ${formatDuration(duration)}` : 'End time must be after start'}
                </Text>
            </View>
        </View>
    );
}

const rangeStyles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: Spacing[3],
    },
    timesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing[2],
    },
    timeBlock: {
        alignItems: 'center',
    },
    timeLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: Spacing[2],
    },
    timeDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.gray[50],
        borderRadius: BorderRadius['2xl'],
        borderWidth: 2,
        paddingHorizontal: Spacing[2],
        paddingVertical: Spacing[3],
        gap: Spacing[2],
        ...Shadows.md,
    },
    timeArrow: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.gray[100],
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeValueContainer: {
        alignItems: 'center',
        minWidth: 70,
    },
    timeValue: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text.primary,
    },
    timePeriod: {
        fontSize: 12,
        fontWeight: '600',
    },
    arrowContainer: {
        paddingHorizontal: Spacing[2],
        paddingTop: 20,
    },
    durationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing[2],
        backgroundColor: Colors.primary[50],
        paddingHorizontal: Spacing[4],
        paddingVertical: Spacing[2],
        borderRadius: BorderRadius.full,
        marginTop: Spacing[4],
    },
    durationBadgeInvalid: {
        backgroundColor: Colors.accent.red + '15',
    },
    durationText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary[600],
    },
    durationTextInvalid: {
        color: Colors.accent.red,
    },
});

export default TimePicker;

