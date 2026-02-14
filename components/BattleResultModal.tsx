/**
 * BattleResultModal — Victory / Defeat / Tie result screen
 * Shows after a battle ends with XP change, times, and action buttons
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import Animated, {
    useSharedValue, useAnimatedStyle, withSpring, withSequence,
    withTiming, withDelay, FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ActiveBattle } from '@/store/battleStore';

const { width: SW } = Dimensions.get('window');

interface Props {
    battle: ActiveBattle;
    onClose: () => void;
    onPlayAgain: () => void;
}

export default function BattleResultModal({ battle, onClose, onPlayAgain }: Props) {
    const titleScale = useSharedValue(0);
    const xpScale = useSharedValue(0);
    const buttonsOpacity = useSharedValue(0);

    const result = battle.result;
    const isWin = result === 'win';
    const isTie = result === 'tie';
    const xpEarned = battle.xpEarned;

    useEffect(() => {
        // Title slam
        titleScale.value = withSequence(
            withTiming(0, { duration: 0 }),
            withSpring(1.2, { damping: 6, stiffness: 200 }),
            withSpring(1, { damping: 10 })
        );

        // XP display
        xpScale.value = withDelay(600, withSpring(1, { damping: 8 }));

        // Buttons fade in
        buttonsOpacity.value = withDelay(1000, withTiming(1, { duration: 400 }));

        // Haptic
        if (isWin) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else if (isTie) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    }, []);

    const titleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: titleScale.value }],
    }));

    const xpStyle = useAnimatedStyle(() => ({
        transform: [{ scale: xpScale.value }],
    }));

    const buttonsStyle = useAnimatedStyle(() => ({
        opacity: buttonsOpacity.value,
    }));

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const bgColor = isWin ? '#1A3A1A' : isTie ? '#2A2A1A' : '#3A1A1A';
    const accentColor = isWin ? '#4CAF50' : isTie ? '#FFB300' : '#FF4444';
    const titleEmoji = isWin ? '🎉' : isTie ? '🤝' : '💀';
    const titleText = isWin ? 'VICTORY!' : isTie ? 'TIE!' : 'DEFEATED';

    return (
        <Animated.View entering={FadeIn.duration(300)} style={[styles.overlay, { backgroundColor: bgColor + 'F5' }]}>
            {/* Result Title */}
            <Animated.View style={[styles.titleContainer, titleStyle]}>
                <Text style={styles.resultEmoji}>{titleEmoji}</Text>
                <Text style={[styles.resultTitle, { color: accentColor }]}>{titleText}</Text>
                <Text style={styles.resultEmoji}>{titleEmoji}</Text>
            </Animated.View>

            {/* Times Comparison */}
            <View style={styles.timesRow}>
                <View style={styles.timeBox}>
                    <Text style={styles.timeLabel}>YOU</Text>
                    <Text style={[styles.timeValue, { color: '#4CAF50' }]}>
                        {formatTime(battle.myFocusSeconds)}
                    </Text>
                </View>
                <Text style={styles.vsSmall}>VS</Text>
                <View style={styles.timeBox}>
                    <Text style={styles.timeLabel}>{battle.opponent.name}</Text>
                    <Text style={[styles.timeValue, { color: '#FF4444' }]}>
                        {formatTime(battle.opponentTargetSeconds)}
                    </Text>
                </View>
            </View>

            {/* XP Earned — Always positive */}
            <Animated.View style={[styles.xpContainer, xpStyle]}>
                <Text style={[styles.xpText, { color: '#4CAF50' }]}>
                    +{xpEarned} XP
                </Text>
                {isWin && <Text style={styles.xpSubtext}>🔥 Dominant focus!</Text>}
                {isTie && <Text style={styles.xpSubtext}>⚡ So close — keep pushing!</Text>}
                {!isWin && !isTie && <Text style={styles.xpSubtext}>💪 You still earned XP for focusing</Text>}
            </Animated.View>

            {/* Action Buttons */}
            <Animated.View style={[styles.buttonsContainer, buttonsStyle]}>
                <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPlayAgain(); }}
                    style={[styles.actionBtn, { backgroundColor: accentColor }]}
                >
                    <Text style={styles.actionBtnText}>
                        {isWin ? '⚔️ PLAY AGAIN' : '🔄 REMATCH'}
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onClose(); }}
                    style={styles.backBtn}
                >
                    <Text style={styles.backBtnText}>BACK TO HUB</Text>
                </Pressable>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 24, zIndex: 10000,
    },

    titleContainer: {
        flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 40,
    },
    resultEmoji: { fontSize: 40 },
    resultTitle: { fontSize: 36, fontWeight: '900', letterSpacing: 4 },

    timesRow: {
        flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 30,
    },
    timeBox: {
        alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 20, paddingVertical: 14, backgroundColor: 'rgba(0,0,0,0.3)',
        minWidth: SW * 0.32,
    },
    timeLabel: { fontSize: 10, fontWeight: '800', color: '#AAA', letterSpacing: 1, marginBottom: 4 },
    timeValue: {
        fontSize: 28, fontWeight: '900', letterSpacing: 3,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    vsSmall: { fontSize: 16, fontWeight: '900', color: '#666' },

    xpContainer: { alignItems: 'center', marginBottom: 40 },
    xpText: {
        fontSize: 40, fontWeight: '900', letterSpacing: 2,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    xpSubtext: { fontSize: 13, fontWeight: '700', color: '#AAA', marginTop: 6 },

    buttonsContainer: { width: '100%', gap: 10 },
    actionBtn: {
        borderWidth: 3, borderColor: '#000', paddingVertical: 16, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0,
    },
    actionBtnText: { fontSize: 18, fontWeight: '900', color: '#FFF', letterSpacing: 2 },
    backBtn: {
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', paddingVertical: 12, alignItems: 'center',
    },
    backBtnText: { fontSize: 14, fontWeight: '800', color: '#AAA', letterSpacing: 1 },
});
