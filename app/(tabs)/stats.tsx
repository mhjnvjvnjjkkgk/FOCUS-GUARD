import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Pressable,
    Dimensions,
    TextInput,
    StyleProp,
    TextStyle,
    ViewStyle,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    useDerivedValue,
    runOnJS,
    Easing,
    interpolate,
    withDelay,
    useAnimatedProps,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePointsStore } from '@/store/pointsStore';
import { usePlannerStore } from '@/store/plannerStore';
import { useAlarmStore } from '@/store/alarmStore';

const { width } = Dimensions.get('window');

// ============================================
// NEOBRUTALIST DESIGN SYSTEM
// ============================================
const NEO = {
    colors: {
        background: '#FFFFFF',
        black: '#000000',
        cyan: '#00FFFF',
        orange: '#FF4500',
        yellow: '#FFD700',
        purple: '#8A2BE2',
        green: '#39FF14',
        blue: '#0000FF',
        red: '#FF0000',
        grey: '#C0C0C0',
    },
    border: 3,
    shadowOffset: 6,
    fonts: {
        heavy: '900' as '900',
        bold: '700' as '700',
        mono: 'monospace' as 'monospace',
    },
};

type Period = 'day' | 'week' | 'month';

const getDateString = (daysAgo: number = 0) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
};

const formatMinutes = (mins: number) => {
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
};

// ============================================
// ANIMATED NUMBER COMPONENT
// ============================================
interface AnimatedNumberProps {
    value: number;
    prefix?: string;
    suffix?: string;
    style?: StyleProp<TextStyle>;
    duration?: number;
    formatAsTime?: boolean;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function AnimatedNumber({
    value,
    prefix = '',
    suffix = '',
    style,
    duration = 1200,
    formatAsTime = false
}: AnimatedNumberProps) {
    const animatedValue = useSharedValue(0);
    const inputRef = React.useRef<any>(null);

    useEffect(() => {
        animatedValue.value = 0;
        animatedValue.value = withTiming(value, {
            duration,
            easing: Easing.out(Easing.cubic),
        });
    }, [value, duration]);

    // Use useAnimatedProps for smoother, crash-free updates on UI thread
    const animatedProps = useAnimatedProps(() => {
        const current = Math.round(animatedValue.value);
        let formatted = '';

        if (formatAsTime) {
            const hours = Math.floor(current / 60);
            const minutes = current % 60;
            if (hours > 0) {
                formatted = `${hours}h ${minutes}m`;
            } else {
                formatted = `${minutes}m`;
            }
        } else {
            formatted = current.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        }

        const text = `${prefix}${formatted}${suffix}`;
        return { text } as any;
    });

    return (
        <AnimatedTextInput
            animatedProps={animatedProps}
            underlineColorAndroid="transparent"
            editable={false}
            style={[
                style,
                {
                    padding: 0,
                    margin: 0,
                    includeFontPadding: false,
                    textAlignVertical: 'center',
                    // Safe access to color, fallback to black
                    color: (style as any)?.color || '#000000'
                }
            ]}
        />
    );
}

// ============================================
// ANIMATED BAR COMPONENT
// ============================================
interface AnimatedBarProps {
    targetHeight: number;
    width: number;
    delay: number;
    displayValue: string;
    label: string;
}

function AnimatedBar({ targetHeight, width: barWidth, delay, displayValue, label }: AnimatedBarProps) {
    const height = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        // Reset and animate
        height.value = 0;
        opacity.value = 0;

        const timeout = setTimeout(() => {
            height.value = withSpring(targetHeight, {
                damping: 12,
                stiffness: 80,
                mass: 1,
            });
            opacity.value = withTiming(1, { duration: 300 });
        }, delay);

        return () => clearTimeout(timeout);
    }, [targetHeight, delay]);

    const animatedBarStyle = useAnimatedStyle(() => ({
        height: Math.max(8, height.value),
    }));

    const animatedLabelStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Animated.View style={[styles.neoBarWrapper, animatedLabelStyle]}>
            {/* Value label */}
            <View style={styles.neoBarValueBox}>
                <Text style={styles.neoBarValueText}>{displayValue}</Text>
            </View>

            {/* Animated Bar */}
            <Animated.View style={[
                styles.neoBar,
                { width: barWidth },
                animatedBarStyle,
            ]} />

            {/* Label */}
            <Text style={styles.neoBarLabel}>{label}</Text>
        </Animated.View>
    );
}

// ============================================
// NEOBRUTALIST STAT CARD WITH ANIMATED NUMBER
// ============================================
interface NeoStatCardProps {
    icon: string;
    numericValue: number;
    displaySuffix?: string;
    label: string;
    accentColor: string;
    trend?: { value: number; isPositive: boolean };
    delay?: number;
    isTime?: boolean;
    prefix?: string;
}

function NeoStatCard({
    icon,
    numericValue,
    displaySuffix = '',
    label,
    accentColor,
    trend,
    delay = 0,
    isTime = false,
    prefix = '',
}: NeoStatCardProps) {
    const scale = useSharedValue(1);
    const [triggerAnimation, setTriggerAnimation] = useState(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setTriggerAnimation(prev => prev + 1);
        }, delay);
        return () => clearTimeout(timeout);
    }, [numericValue, delay]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.95);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    return (
        <Animated.View
            entering={FadeInUp.delay(delay).springify()}
            style={[styles.neoStatCard, animatedStyle]}
        >
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.neoStatCardInner}
            >
                <View style={[styles.neoAccentStripe, { backgroundColor: accentColor }]} />

                <View style={styles.neoStatIconContainer}>
                    <Ionicons name={icon as any} size={32} color={NEO.colors.black} />
                </View>

                <View style={styles.neoStatValueContainer}>
                    {isTime ? (
                        <AnimatedNumber
                            key={triggerAnimation}
                            value={numericValue}
                            prefix={prefix}
                            style={styles.neoStatValue}
                            formatAsTime={true}
                            duration={1500}
                        />
                    ) : (
                        <AnimatedNumber
                            key={triggerAnimation}
                            value={numericValue}
                            prefix={prefix}
                            suffix={displaySuffix}
                            style={styles.neoStatValue}
                            duration={1200}
                        />
                    )}
                    {trend && (
                        <View style={[
                            styles.neoTrendBadge,
                            { backgroundColor: trend.isPositive ? NEO.colors.green : NEO.colors.red }
                        ]}>
                            <Ionicons
                                name={trend.isPositive ? 'arrow-up' : 'arrow-down'}
                                size={10}
                                color={NEO.colors.black}
                            />
                            <Text style={styles.neoTrendText}>
                                {trend.isPositive ? '+' : ''}{trend.value}%
                            </Text>
                        </View>
                    )}
                </View>

                <Text style={styles.neoStatLabel}>{label}</Text>
            </Pressable>
        </Animated.View>
    );
}

// ============================================
// NEOBRUTALIST BAR CHART WITH ANIMATIONS
// ============================================
interface NeoBarChartProps {
    data: { label: string; value: number; displayValue: string }[];
    maxValue: number;
}

function NeoBarChart({ data, maxValue }: NeoBarChartProps) {
    const maxHeight = 120;
    const barWidth = (width - 80) / data.length - 8;

    return (
        <View style={styles.neoChartContainer}>
            {/* Animated Grid lines */}
            <Animated.View
                entering={FadeInUp.delay(250).duration(600)}
                style={styles.neoChartGrid}
            >
                {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={styles.neoGridLine} />
                ))}
            </Animated.View>

            {/* Animated Bars */}
            <View style={styles.neoBarsContainer}>
                {data.map((item, index) => {
                    const targetHeight = maxValue > 0 ? (item.value / maxValue) * maxHeight : 8;
                    return (
                        <AnimatedBar
                            key={`${item.label}-${index}`}
                            targetHeight={targetHeight}
                            width={barWidth}
                            delay={300 + index * 100}
                            displayValue={item.displayValue}
                            label={item.label}
                        />
                    );
                })}
            </View>
        </View>
    );
}

// ============================================
// NEOBRUTALIST LEDGER WITH ANIMATED NUMBERS
// ============================================
interface NeoLedgerProps {
    earned: number;
    deducted: number;
    net: number;
}

function NeoLedger({ earned, deducted, net }: NeoLedgerProps) {
    return (
        <Animated.View
            entering={FadeInDown.delay(400).springify()}
            style={styles.neoLedger}
        >
            <Text style={styles.neoLedgerTitle}>POINTS LEDGER</Text>
            <View style={styles.neoLedgerRow}>
                <View style={styles.neoLedgerColumn}>
                    <Text style={styles.neoLedgerHeader}>EARNED</Text>
                    <View style={styles.neoLedgerValueRow}>
                        <View style={[styles.neoLedgerDot, { backgroundColor: NEO.colors.green }]} />
                        <AnimatedNumber
                            value={earned}
                            prefix="+"
                            style={[styles.neoLedgerValue, { color: NEO.colors.green }]}
                            duration={1000}
                        />
                    </View>
                </View>
                <View style={styles.neoLedgerDivider} />
                <View style={styles.neoLedgerColumn}>
                    <Text style={styles.neoLedgerHeader}>DEDUCTED</Text>
                    <View style={styles.neoLedgerValueRow}>
                        <View style={[styles.neoLedgerDot, { backgroundColor: NEO.colors.red }]} />
                        <AnimatedNumber
                            value={deducted}
                            prefix="-"
                            style={[styles.neoLedgerValue, { color: NEO.colors.red }]}
                            duration={1000}
                        />
                    </View>
                </View>
                <View style={styles.neoLedgerDivider} />
                <View style={styles.neoLedgerColumn}>
                    <Text style={styles.neoLedgerHeader}>NET</Text>
                    <View style={styles.neoLedgerValueRow}>
                        <View style={[styles.neoLedgerDot, { backgroundColor: NEO.colors.cyan }]} />
                        <AnimatedNumber
                            value={net}
                            prefix={net >= 0 ? '+' : ''}
                            style={[styles.neoLedgerValue, { color: NEO.colors.cyan }]}
                            duration={1200}
                        />
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

// ============================================
// NEOBRUTALIST ALARM STATUS WITH ANIMATIONS
// ============================================
interface NeoAlarmStatusProps {
    onTime: number;
    snoozed: number;
    netPoints: number;
    total: number;
}

function NeoAlarmStatus({ onTime, snoozed, netPoints, total }: NeoAlarmStatusProps) {
    const blockScale1 = useSharedValue(0);
    const blockScale2 = useSharedValue(0);
    const blockScale3 = useSharedValue(0);

    useEffect(() => {
        blockScale1.value = withDelay(450, withSpring(1, { damping: 12 }));
        blockScale2.value = withDelay(550, withSpring(1, { damping: 12 }));
        blockScale3.value = withDelay(650, withSpring(1, { damping: 12 }));
    }, []);

    const block1Style = useAnimatedStyle(() => ({
        transform: [{ scale: blockScale1.value }],
    }));
    const block2Style = useAnimatedStyle(() => ({
        transform: [{ scale: blockScale2.value }],
    }));
    const block3Style = useAnimatedStyle(() => ({
        transform: [{ scale: blockScale3.value }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(450).springify()}
            style={styles.neoAlarmSection}
        >
            <Text style={styles.neoAlarmTitle}>⏰ ALARM STATUS [{total} TOTAL]</Text>
            <View style={styles.neoAlarmBar}>
                <Animated.View style={[styles.neoAlarmBlock, { backgroundColor: NEO.colors.green }, block1Style]}>
                    <Text style={styles.neoAlarmBlockLabel}>ON TIME</Text>
                    <AnimatedNumber
                        value={onTime}
                        prefix="["
                        suffix="]"
                        style={styles.neoAlarmBlockValue}
                        duration={800}
                    />
                </Animated.View>
                <Animated.View style={[styles.neoAlarmBlock, { backgroundColor: NEO.colors.red }, block2Style]}>
                    <Text style={styles.neoAlarmBlockLabel}>SNOOZED</Text>
                    <AnimatedNumber
                        value={snoozed}
                        prefix="["
                        suffix="]"
                        style={styles.neoAlarmBlockValue}
                        duration={800}
                    />
                </Animated.View>
                <Animated.View style={[styles.neoAlarmBlock, { backgroundColor: NEO.colors.purple }, block3Style]}>
                    <Text style={[styles.neoAlarmBlockLabel, { color: '#FFFFFF' }]}>NET</Text>
                    <AnimatedNumber
                        value={Math.abs(netPoints)}
                        prefix={`[${netPoints >= 0 ? '+' : '-'}`}
                        suffix="]"
                        style={[styles.neoAlarmBlockValue, { color: '#FFFFFF' }]}
                        duration={800}
                    />
                </Animated.View>
            </View>
        </Animated.View>
    );
}

// ============================================
// CAUTION STRIP
// ============================================
interface NeoCautionStripProps {
    emoji: string;
    label: string;
    value: string;
    numericValue?: number;
    delay?: number;
}

function NeoCautionStrip({ emoji, label, value, numericValue, delay = 0 }: NeoCautionStripProps) {
    const glowOpacity = useSharedValue(0.8);
    const slideIn = useSharedValue(-100);

    useEffect(() => {
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1000 }),
                withTiming(0.8, { duration: 1000 })
            ),
            -1,
            true
        );
        slideIn.value = withSpring(0, { damping: 15, stiffness: 100 });
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: glowOpacity.value,
        transform: [{ translateX: slideIn.value }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).springify()}
            style={[styles.neoCautionStrip, animatedStyle]}
        >
            <View style={styles.neoCautionDiagonal} />
            <View style={styles.neoCautionContent}>
                <Text style={styles.neoCautionText}>
                    {emoji} {label}: <Text style={styles.neoCautionValue}>[ {value} ]</Text>
                </Text>
            </View>
            <View style={[styles.neoCautionDiagonal, { bottom: 0 }]} />
        </Animated.View>
    );
}

// ============================================
// ACHIEVEMENT WITH ANIMATED PROGRESS
// ============================================
interface NeoAchievementProps {
    title: string;
    description: string;
    progress: number;
    unlocked: boolean;
    delay?: number;
}

function NeoAchievement({ title, description, progress, unlocked, delay = 0 }: NeoAchievementProps) {
    const progressWidth = useSharedValue(0);
    const checkScale = useSharedValue(0);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (unlocked) {
                checkScale.value = withSpring(1, { damping: 8, stiffness: 150 });
            } else {
                progressWidth.value = withTiming(progress, {
                    duration: 1500,
                    easing: Easing.out(Easing.cubic),
                });
            }
        }, delay + 200);
        return () => clearTimeout(timeout);
    }, [progress, unlocked, delay]);

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const checkStyle = useAnimatedStyle(() => ({
        transform: [{ scale: checkScale.value }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).springify()}
            style={[
                styles.neoAchievement,
                !unlocked && styles.neoAchievementLocked
            ]}
        >
            <View style={[
                styles.neoAchievementHeader,
                { backgroundColor: unlocked ? NEO.colors.cyan : NEO.colors.grey }
            ]}>
                {unlocked ? (
                    <Animated.View style={[styles.neoAchievementCheck, checkStyle]}>
                        <Text style={styles.neoAchievementCheckText}>✓</Text>
                    </Animated.View>
                ) : (
                    <View style={styles.neoAchievementX}>
                        <Text style={styles.neoAchievementXText}>✕</Text>
                    </View>
                )}
                <Text style={styles.neoAchievementTitle}>{title}</Text>
            </View>

            <View style={styles.neoAchievementBody}>
                <Text style={styles.neoAchievementDesc}>{description}</Text>
                {!unlocked && (
                    <View style={styles.neoAchievementProgressBar}>
                        <Animated.View style={[styles.neoAchievementProgressFill, progressStyle]} />
                        <Text style={styles.neoAchievementProgressText}>{Math.round(progress)}%</Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

// ============================================
// FOOTER ANIMATED VALUE
// ============================================
interface FooterAnimatedValueProps {
    value: number;
    label: string;
    labelColor: string;
    isTime?: boolean;
    suffix?: string;
}

function FooterAnimatedValue({ value, label, labelColor, isTime = false, suffix = '' }: FooterAnimatedValueProps) {
    return (
        <View style={styles.neoFooterColumn}>
            <Text style={[styles.neoFooterLabel, { color: labelColor }]}>
                {label}
            </Text>
            {isTime ? (
                <AnimatedNumber
                    value={value}
                    style={styles.neoFooterValue}
                    formatAsTime={true}
                    duration={1800}
                />
            ) : (
                <AnimatedNumber
                    value={value}
                    suffix={suffix}
                    style={styles.neoFooterValue}
                    duration={1800}
                />
            )}
        </View>
    );
}

// ============================================
// MAIN STATISTICS SCREEN
// ============================================
export default function StatsScreen() {
    const [period, setPeriod] = useState<Period>('week');
    const [animationKey, setAnimationKey] = useState(0);

    const pointsStore = usePointsStore();
    const plannerStore = usePlannerStore();
    const alarmStore = useAlarmStore();

    // Trigger re-animation when period changes
    const handlePeriodChange = useCallback((newPeriod: Period) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setPeriod(newPeriod);
        setAnimationKey(prev => prev + 1);
    }, []);

    const periodData = useMemo(() => {
        const days = period === 'day' ? 1 : period === 'week' ? 7 : 30;

        let totalFocusMinutes = 0;
        let totalPoints = 0;
        let totalDeductions = 0;
        let sessionsStarted = 0;
        let sessionsCompleted = 0;
        let alarmsOnTime = 0;
        let alarmsSnoozed = 0;
        let alarmPointsEarned = 0;
        let alarmPointsDeducted = 0;

        const dailyFocus: { label: string; value: number; displayValue: string }[] = [];

        for (let i = days - 1; i >= 0; i--) {
            const dateStr = getDateString(i);
            const dayPoints = pointsStore.history[dateStr];

            let dayFocus = 0;
            if (dayPoints) {
                totalPoints += dayPoints.totalEarned || 0;
                totalDeductions += dayPoints.totalDeducted || 0;
                sessionsStarted += dayPoints.sessionsStarted || 0;
                sessionsCompleted += dayPoints.sessionsCompleted || 0;
                dayFocus = dayPoints.totalFocusMinutes || 0;
                totalFocusMinutes += dayFocus;
                alarmsOnTime += dayPoints.alarmsOnTime || 0;
                alarmsSnoozed += dayPoints.alarmsSnoozed || 0;
                alarmPointsEarned += dayPoints.earned?.alarms || 0;
                alarmPointsDeducted += dayPoints.deducted?.snoozes || 0;
            }

            if (period === 'week') {
                const date = new Date(dateStr);
                const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
                dailyFocus.push({
                    label: dayNames[date.getDay()],
                    value: dayFocus,
                    displayValue: formatMinutes(dayFocus),
                });
            } else if (period === 'day') {
                dailyFocus.push({
                    label: 'TODAY',
                    value: dayFocus,
                    displayValue: formatMinutes(dayFocus),
                });
            }
        }

        if (period === 'month') {
            const weeklyData = [
                { label: 'WK1', value: 0, displayValue: '' },
                { label: 'WK2', value: 0, displayValue: '' },
                { label: 'WK3', value: 0, displayValue: '' },
                { label: 'WK4', value: 0, displayValue: '' },
            ];
            for (let i = 0; i < days; i++) {
                const weekIndex = Math.floor(i / 7);
                if (weekIndex < 4) {
                    const dateStr = getDateString(days - 1 - i);
                    const dayPoints = pointsStore.history[dateStr];
                    weeklyData[weekIndex].value += dayPoints?.totalFocusMinutes || 0;
                }
            }
            weeklyData.forEach(w => w.displayValue = formatMinutes(w.value));
            dailyFocus.length = 0;
            dailyFocus.push(...weeklyData);
        }

        const netPoints = totalPoints - totalDeductions;
        const completionRate = sessionsStarted > 0
            ? Math.round((sessionsCompleted / sessionsStarted) * 100)
            : 0;

        return {
            totalFocusMinutes,
            totalPoints,
            totalDeductions,
            netPoints,
            sessionsStarted,
            sessionsCompleted,
            completionRate,
            alarmsOnTime,
            alarmsSnoozed,
            alarmPointsEarned,
            alarmPointsDeducted,
            alarmNetPoints: alarmPointsEarned - alarmPointsDeducted,
            dailyFocus,
            pointsTrend: 15,
        };
    }, [period, pointsStore]);

    const achievements = useMemo(() => [
        {
            title: 'FOCUS MASTER',
            description: 'REACH 100 HOURS OF FOCUS',
            progress: Math.min(100, (pointsStore.totalFocusMinutes / 6000) * 100),
            unlocked: pointsStore.totalFocusMinutes >= 6000,
        },
        {
            title: 'STREAK CHAMPION',
            description: 'ACHIEVE A 10-DAY STREAK',
            progress: Math.min(100, (pointsStore.currentStreak / 10) * 100),
            unlocked: pointsStore.longestStreak >= 10,
        },
        {
            title: 'POINT COLLECTOR',
            description: 'EARN 5,000 POINTS',
            progress: Math.min(100, (pointsStore.totalPointsEarned / 5000) * 100),
            unlocked: pointsStore.totalPointsEarned >= 5000,
        },
    ], [pointsStore]);

    const maxChartValue = Math.max(...periodData.dailyFocus.map(d => d.value), 60);

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Animated.View
                    entering={FadeInUp.delay(50).springify()}
                    style={styles.neoHeader}
                >
                    <View style={styles.neoAvatarBox}>
                        <Text style={styles.neoAvatarText}>FG</Text>
                    </View>
                    <View style={styles.neoHeaderText}>
                        <Text style={styles.neoTitle}>FOCUSGUARD</Text>
                        <View style={styles.neoSubtitleBox}>
                            <Text style={styles.neoSubtitle}>📊 STATISTICS</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Period Selector */}
                <Animated.View
                    entering={FadeInUp.delay(100).springify()}
                    style={styles.neoPeriodSelector}
                >
                    {(['day', 'week', 'month'] as Period[]).map((p) => (
                        <Pressable
                            key={p}
                            style={[
                                styles.neoPeriodButton,
                                period === p && styles.neoPeriodButtonActive,
                            ]}
                            onPress={() => handlePeriodChange(p)}
                        >
                            <Text style={[
                                styles.neoPeriodText,
                                period === p && styles.neoPeriodTextActive,
                            ]}>
                                {p.toUpperCase()}
                            </Text>
                        </Pressable>
                    ))}
                </Animated.View>

                {/* Main Stats Grid - with animation key to re-trigger animations */}
                <View key={`stats-${animationKey}`} style={styles.neoStatsGrid}>
                    <NeoStatCard
                        icon="timer"
                        numericValue={periodData.totalFocusMinutes}
                        label="FOCUS TIME"
                        accentColor={NEO.colors.orange}
                        delay={150}
                        isTime={true}
                    />
                    <NeoStatCard
                        icon="trophy"
                        numericValue={periodData.netPoints}
                        label="NET POINTS"
                        accentColor={NEO.colors.yellow}
                        trend={{ value: periodData.pointsTrend, isPositive: true }}
                        delay={200}
                    />
                    <NeoStatCard
                        icon="checkmark-circle"
                        numericValue={periodData.completionRate}
                        displaySuffix="%"
                        label={`RATE (${periodData.sessionsCompleted}/${periodData.sessionsStarted} SESSIONS)`}
                        accentColor={NEO.colors.green}
                        delay={250}
                    />
                    <NeoStatCard
                        icon="alarm"
                        numericValue={periodData.alarmsOnTime + periodData.alarmsSnoozed}
                        displaySuffix=" TOTAL"
                        label="ALARMS TRIGGERED"
                        accentColor={NEO.colors.purple}
                        delay={300}
                    />
                </View>

                {/* Focus Distribution Chart */}
                <Animated.View
                    entering={FadeInDown.delay(350).springify()}
                    style={styles.neoChartCard}
                >
                    <View style={styles.neoChartHeader}>
                        <Text style={styles.neoChartTitle}>FOCUS DISTRIBUTION</Text>
                        <View style={styles.neoChartTotal}>
                            <Text style={styles.neoChartTotalText}>
                                TOTAL: {formatMinutes(periodData.totalFocusMinutes)}
                            </Text>
                        </View>
                    </View>
                    <NeoBarChart
                        key={`chart-${animationKey}`}
                        data={periodData.dailyFocus}
                        maxValue={maxChartValue}
                    />
                </Animated.View>

                {/* Points Ledger */}
                <NeoLedger
                    key={`ledger-${animationKey}`}
                    earned={periodData.totalPoints}
                    deducted={periodData.totalDeductions}
                    net={periodData.netPoints}
                />

                {/* Session History */}
                <NeoHistorySection
                    key={`history-${animationKey}`}
                    sessions={pointsStore.getSessionHistory(period === 'week' ? 7 : period === 'month' ? 30 : 1)}
                />

                {/* Alarm Status */}
                <NeoAlarmStatus
                    key={`alarm-${animationKey}`}
                    onTime={periodData.alarmsOnTime}
                    snoozed={periodData.alarmsSnoozed}
                    netPoints={periodData.alarmNetPoints}
                    total={periodData.alarmsOnTime + periodData.alarmsSnoozed}
                />

                {/* Insights */}
                {pointsStore.currentStreak > 0 && (
                    <NeoCautionStrip
                        emoji="🔥"
                        label="STREAK ALERT: YOU HIT A"
                        value={`${pointsStore.currentStreak} DAY`}
                        delay={500}
                    />
                )}
                {periodData.completionRate > 0 && (
                    <NeoCautionStrip
                        emoji="🎯"
                        label="SESSION INSIGHT:"
                        value={`${periodData.completionRate}% COMPLETION RATE`}
                        delay={550}
                    />
                )}

                {/* Achievements */}
                <View style={styles.neoAchievementsSection}>
                    <Text style={styles.neoSectionTitle}>ACHIEVEMENTS</Text>
                    {achievements.map((ach, index) => (
                        <NeoAchievement
                            key={ach.title}
                            title={ach.title}
                            description={ach.description}
                            progress={ach.progress}
                            unlocked={ach.unlocked}
                            delay={600 + index * 50}
                        />
                    ))}
                </View>

                {/* All-Time Stats Footer */}
                <Animated.View
                    entering={FadeInDown.delay(750).springify()}
                    style={styles.neoFooter}
                >
                    <FooterAnimatedValue
                        value={pointsStore.totalFocusMinutes}
                        label="TOTAL FOCUS:"
                        labelColor={NEO.colors.orange}
                        isTime={true}
                    />
                    <View style={styles.neoFooterDivider} />
                    <FooterAnimatedValue
                        value={pointsStore.totalPointsEarned}
                        label="POINTS EARNED:"
                        labelColor={NEO.colors.yellow}
                    />
                    <View style={styles.neoFooterDivider} />
                    <FooterAnimatedValue
                        value={pointsStore.longestStreak}
                        label="BEST STREAK:"
                        labelColor={NEO.colors.cyan}
                        suffix=" DAYS"
                    />
                </Animated.View>

                <View style={{ height: 160 }} />
            </ScrollView>
        </View>
    );
}

// ============================================
// SESSION CARD
// ============================================
interface NeoSessionCardProps {
    session: import('@/store/pointsStore').SessionRecord;
    delay?: number;
}

function NeoSessionCard({ session, delay = 0 }: NeoSessionCardProps) {
    const scale = useSharedValue(1);

    useEffect(() => {
        scale.value = withDelay(delay, withSpring(1, { damping: 12 }));
    }, [delay]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    // Determine color based on completion rate
    const getCompletionColor = (rate: number) => {
        if (rate >= 100) return NEO.colors.green;
        if (rate >= 75) return NEO.colors.cyan;
        if (rate >= 50) return NEO.colors.yellow;
        if (rate >= 25) return NEO.colors.orange;
        return NEO.colors.red;
    };

    // Format timestamp
    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

        const timeStr = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        if (diffDays === 0) return `Today, ${timeStr}`;
        if (diffDays === 1) return `Yesterday, ${timeStr}`;
        return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
    };

    const completionColor = getCompletionColor(session.completionRate);

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).springify()}
            style={[styles.neoSessionCard, animatedStyle]}
        >
            {/* Accent Bar */}
            <View style={[styles.neoSessionAccent, { backgroundColor: completionColor }]} />

            <View style={styles.neoSessionContent}>
                {/* Header */}
                <View style={styles.neoSessionHeader}>
                    <Text style={styles.neoSessionIcon}>⏱️</Text>
                    <Text style={styles.neoSessionTitle} numberOfLines={1}>
                        {session.taskName || 'Focus Session'}
                    </Text>
                    {session.wasAbandoned && (
                        <View style={styles.neoAbandonedBadge}>
                            <Text style={styles.neoAbandonedText}>❌ QUIT</Text>
                        </View>
                    )}
                </View>

                {/* Progress Bar */}
                <View style={styles.neoSessionProgressBg}>
                    <View style={[
                        styles.neoSessionProgressFill,
                        { width: `${session.completionRate}%`, backgroundColor: completionColor }
                    ]} />
                </View>
                <Text style={styles.neoSessionProgress}>{session.completionRate}% COMPLETE</Text>

                {/* Stats Row */}
                <View style={styles.neoSessionStats}>
                    <View style={styles.neoSessionStatItem}>
                        <Text style={styles.neoSessionStatLabel}>⏰ DURATION</Text>
                        <Text style={styles.neoSessionStatValue}>
                            {session.actualDuration}m / {session.plannedDuration}m
                        </Text>
                    </View>
                    <View style={styles.neoSessionStatItem}>
                        <Text style={styles.neoSessionStatLabel}>💎 EARNED</Text>
                        <Text style={[styles.neoSessionStatValue, { color: NEO.colors.purple }]}>
                            +{session.pointsEarned} PTS
                        </Text>
                    </View>
                </View>

                {/* Timestamp */}
                <Text style={styles.neoSessionTimestamp}>
                    🕐 {formatTimestamp(session.timestamp)}
                </Text>
            </View>
        </Animated.View>
    );
}

// ============================================
// SESSION HISTORY SECTION
// ============================================
interface NeoHistoryProps {
    sessions: import('@/store/pointsStore').SessionRecord[];
}

function NeoHistorySection({ sessions }: NeoHistoryProps) {
    const [showAll, setShowAll] = useState(false);
    const displaySessions = showAll ? sessions : sessions.slice(0, 5);

    if (sessions.length === 0) {
        return (
            <Animated.View
                entering={FadeInDown.delay(450).springify()}
                style={styles.neoHistorySection}
            >
                <Text style={styles.neoHistoryTitle}>📜 SESSION HISTORY [0 SESSIONS]</Text>
                <View style={styles.neoHistoryEmpty}>
                    <Text style={styles.neoHistoryEmptyIcon}>⏱️</Text>
                    <Text style={styles.neoHistoryEmptyText}>NO SESSIONS YET</Text>
                    <Text style={styles.neoHistoryEmptyDesc}>
                        Complete focus sessions to see your history here
                    </Text>
                </View>
            </Animated.View>
        );
    }

    return (
        <Animated.View
            entering={FadeInDown.delay(450).springify()}
            style={styles.neoHistorySection}
        >
            <Text style={styles.neoHistoryTitle}>
                📜 SESSION HISTORY [{sessions.length} SESSION{sessions.length !== 1 ? 'S' : ''}]
            </Text>

            {displaySessions.map((session, index) => (
                <NeoSessionCard
                    key={session.id}
                    session={session}
                    delay={460 + index * 50}
                />
            ))}

            {sessions.length > 5 && !showAll && (
                <Pressable
                    onPress={() => setShowAll(true)}
                    style={styles.neoShowMoreButton}
                >
                    <Text style={styles.neoShowMoreText}>
                        SHOW {sessions.length - 5} MORE SESSION{sessions.length - 5 !== 1 ? 'S' : ''} ▼
                    </Text>
                </Pressable>
            )}
        </Animated.View>
    );
}

// ============================================
// ALARM STATUS
// ============================================
const styles: any = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NEO.colors.background,
    },
    scrollContent: {
        padding: 16,
    },

    // Header
    neoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        backgroundColor: NEO.colors.background,
        padding: 12,
    },
    neoAvatarBox: {
        width: 50,
        height: 50,
        backgroundColor: NEO.colors.black,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    neoAvatarText: {
        color: NEO.colors.background,
        fontSize: 18,
        fontWeight: NEO.fonts.heavy,
        fontFamily: NEO.fonts.mono,
    },
    neoHeaderText: {
        flex: 1,
    },
    neoTitle: {
        fontSize: 24,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        letterSpacing: 2,
    },
    neoSubtitleBox: {
        backgroundColor: NEO.colors.background,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginTop: 4,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: NEO.shadowOffset, height: NEO.shadowOffset },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
    },
    neoSubtitle: {
        fontSize: 12,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
    },

    // Period Selector
    neoPeriodSelector: {
        flexDirection: 'row',
        marginBottom: 16,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
    },
    neoPeriodButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: NEO.colors.background,
        borderRightWidth: NEO.border,
        borderRightColor: NEO.colors.black,
    },
    neoPeriodButtonActive: {
        backgroundColor: NEO.colors.cyan,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: NEO.shadowOffset, height: NEO.shadowOffset },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 8,
        zIndex: 10,
    },
    neoPeriodText: {
        fontSize: 14,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
        letterSpacing: 1,
    },
    neoPeriodTextActive: {
        fontWeight: NEO.fonts.heavy,
    },

    // Stats Grid
    neoStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    neoStatCard: {
        width: (width - 44) / 2,
        backgroundColor: NEO.colors.background,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: NEO.shadowOffset, height: NEO.shadowOffset },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
    },
    neoStatCardInner: {
        padding: 12,
    },
    neoAccentStripe: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 8,
    },
    neoStatIconContainer: {
        alignItems: 'center',
        marginBottom: 8,
        marginLeft: 8,
    },
    neoStatValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    neoStatValue: {
        fontSize: 24,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        fontFamily: NEO.fonts.mono,
    },
    neoTrendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 6,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderWidth: 2,
        borderColor: NEO.colors.black,
    },
    neoTrendText: {
        fontSize: 10,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
        marginLeft: 2,
    },
    neoStatLabel: {
        fontSize: 10,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
        textAlign: 'center',
        letterSpacing: 0.5,
    },

    // Chart Card
    neoChartCard: {
        backgroundColor: NEO.colors.background,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        padding: 16,
        marginBottom: 16,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: NEO.shadowOffset, height: NEO.shadowOffset },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
    },
    neoChartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    neoChartTitle: {
        fontSize: 16,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        letterSpacing: 1,
    },
    neoChartTotal: {
        borderWidth: 2,
        borderColor: NEO.colors.black,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    neoChartTotalText: {
        fontSize: 11,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
        fontFamily: NEO.fonts.mono,
    },
    neoChartContainer: {
        height: 180,
        position: 'relative',
    },
    neoChartGrid: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 40,
        justifyContent: 'space-between',
    },
    neoGridLine: {
        height: 1,
        backgroundColor: NEO.colors.black,
        opacity: 0.2,
    },
    neoBarsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 160,
        paddingBottom: 24,
    },
    neoBarWrapper: {
        alignItems: 'center',
    },
    neoBarValueBox: {
        marginBottom: 4,
    },
    neoBarValueText: {
        fontSize: 9,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
        fontFamily: NEO.fonts.mono,
    },
    neoBar: {
        backgroundColor: NEO.colors.orange,
        borderWidth: 2,
        borderColor: NEO.colors.black,
    },
    neoBarLabel: {
        marginTop: 6,
        fontSize: 10,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        fontFamily: NEO.fonts.mono,
    },

    // Ledger
    neoLedger: {
        backgroundColor: NEO.colors.background,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        padding: 12,
        marginBottom: 16,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: NEO.shadowOffset, height: NEO.shadowOffset },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
    },
    neoLedgerTitle: {
        fontSize: 14,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        marginBottom: 12,
        letterSpacing: 1,
    },
    neoLedgerRow: {
        flexDirection: 'row',
    },
    neoLedgerColumn: {
        flex: 1,
        alignItems: 'center',
    },
    neoLedgerHeader: {
        fontSize: 10,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    neoLedgerValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    neoLedgerDot: {
        width: 12,
        height: 12,
        marginRight: 6,
    },
    neoLedgerValue: {
        fontSize: 18,
        fontWeight: NEO.fonts.heavy,
        fontFamily: NEO.fonts.mono,
    },
    neoLedgerDivider: {
        width: NEO.border,
        backgroundColor: NEO.colors.black,
        marginVertical: -12,
        marginHorizontal: 4,
    },

    // Alarm Status
    neoAlarmSection: {
        marginBottom: 16,
    },
    neoAlarmTitle: {
        fontSize: 14,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        marginBottom: 8,
        letterSpacing: 1,
    },
    neoAlarmBar: {
        flexDirection: 'row',
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
    },
    neoAlarmBlock: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRightWidth: NEO.border,
        borderRightColor: NEO.colors.black,
    },
    neoAlarmBlockLabel: {
        fontSize: 10,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
        marginBottom: 4,
    },
    neoAlarmBlockValue: {
        fontSize: 16,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        fontFamily: NEO.fonts.mono,
    },

    // Caution Strip
    neoCautionStrip: {
        backgroundColor: NEO.colors.yellow,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        marginBottom: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    neoCautionDiagonal: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 8,
        backgroundColor: NEO.colors.black,
        opacity: 0.3,
    },
    neoCautionContent: {
        paddingVertical: 16,
        paddingHorizontal: 12,
    },
    neoCautionText: {
        fontSize: 12,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    neoCautionValue: {
        fontWeight: NEO.fonts.heavy,
        fontSize: 14,
    },

    // Achievements
    neoAchievementsSection: {
        marginBottom: 16,
    },
    neoSectionTitle: {
        fontSize: 16,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        marginBottom: 12,
        letterSpacing: 1,
    },
    neoAchievement: {
        backgroundColor: NEO.colors.background,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: NEO.colors.black,
        shadowOffset: { width: NEO.shadowOffset, height: NEO.shadowOffset },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
    },
    neoAchievementLocked: {
        opacity: 0.7,
    },
    neoAchievementHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    neoAchievementCheck: {
        width: 28,
        height: 28,
        backgroundColor: NEO.colors.green,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 2,
        borderColor: NEO.colors.black,
    },
    neoAchievementCheckText: {
        fontSize: 16,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
    },
    neoAchievementX: {
        width: 28,
        height: 28,
        backgroundColor: NEO.colors.black,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    neoAchievementXText: {
        fontSize: 16,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.background,
    },
    neoAchievementTitle: {
        fontSize: 14,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        letterSpacing: 1,
    },
    neoAchievementBody: {
        padding: 12,
        borderTopWidth: NEO.border,
        borderTopColor: NEO.colors.black,
    },
    neoAchievementDesc: {
        fontSize: 11,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
        marginBottom: 8,
    },
    neoAchievementProgressBar: {
        height: 20,
        backgroundColor: NEO.colors.background,
        borderWidth: 2,
        borderColor: NEO.colors.black,
        flexDirection: 'row',
        alignItems: 'center',
    },
    neoAchievementProgressFill: {
        height: '100%',
        backgroundColor: NEO.colors.cyan,
    },
    neoAchievementProgressText: {
        position: 'absolute',
        right: 8,
        fontSize: 10,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
    },

    // Footer
    neoFooter: {
        flexDirection: 'row',
        backgroundColor: NEO.colors.black,
        padding: 16,
        marginTop: 8,
    },
    neoFooterColumn: {
        flex: 1,
        alignItems: 'center',
    },
    neoFooterLabel: {
        fontSize: 9,
        fontWeight: NEO.fonts.bold,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    neoFooterValue: {
        fontSize: 16,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.background,
        fontFamily: NEO.fonts.mono,
    },
    neoFooterDivider: {
        width: 1,
        backgroundColor: NEO.colors.background,
        marginHorizontal: 4,
    },

    // SESSION HISTORY
    neoHistorySection: {
        marginHorizontal: 16,
        marginVertical: 16,
    },
    neoHistoryTitle: {
        fontSize: 18,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        letterSpacing: 1,
        marginBottom: 16,
    },
    neoHistoryEmpty: {
        backgroundColor: '#FFFFFF',
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        padding: 32,
        alignItems: 'center',
    },
    neoHistoryEmptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    neoHistoryEmptyText: {
        fontSize: 18,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        marginBottom: 8,
    },
    neoHistoryEmptyDesc: {
        fontSize: 14,
        color: NEO.colors.black,
        textAlign: 'center',
        opacity: 0.7,
    },

    // SESSION CARD
    neoSessionCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        marginBottom: 12,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 0,
        overflow: 'hidden',
    },
    neoSessionAccent: {
        height: 6,
        width: '100%',
    },
    neoSessionContent: {
        padding: 16,
    },
    neoSessionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    neoSessionIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    neoSessionTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
    },
    neoAbandonedBadge: {
        backgroundColor: NEO.colors.red,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderWidth: 2,
        borderColor: NEO.colors.black,
    },
    neoAbandonedText: {
        fontSize: 10,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
    },
    neoSessionProgressBg: {
        height: 24,
        backgroundColor: '#F0F0F0',
        borderWidth: 3,
        borderColor: NEO.colors.black,
        overflow: 'hidden',
        marginBottom: 4,
    },
    neoSessionProgressFill: {
        height: '100%',
        borderRightWidth: 3,
        borderColor: NEO.colors.black,
    },
    neoSessionProgress: {
        fontSize: 12,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        marginBottom: 12,
    },
    neoSessionStats: {
        flexDirection: 'row',
        marginBottom: 8,
        gap: 12,
    },
    neoSessionStatItem: {
        flex: 1,
    },
    neoSessionStatLabel: {
        fontSize: 10,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
        marginBottom: 2,
        opacity: 0.7,
    },
    neoSessionStatValue: {
        fontSize: 14,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
    },
    neoSessionTimestamp: {
        fontSize: 11,
        color: NEO.colors.black,
        opacity: 0.6,
    },

    // SHOW MORE BUTTON
    neoShowMoreButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        padding: 12,
        alignItems: 'center',
        marginTop: 4,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    neoShowMoreText: {
        fontSize: 12,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        letterSpacing: 1,
    },
});
