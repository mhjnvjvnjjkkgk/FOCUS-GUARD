/**
 * Social Tab — Friends list & social features (Phase 9C placeholder)
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Image } from 'expo-image';

const { width } = Dimensions.get('window');

const NEO = {
    border: 3,
    shadow: 5,
    colors: { black: '#000', white: '#FFF', bg: '#FFFDF0', blue: '#4A9EFF', cyan: '#00BCD4', green: '#4CAF50' },
    fonts: { heavy: '900' as const, mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as string },
};

export default function SocialScreen() {
    return (
        <View style={styles.container}>
            {/* Header */}
            <Animated.View entering={FadeInUp.springify()} style={styles.header}>
                <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/account' as any); }}
                    style={styles.avatarBtn}
                >
                    <Image source={require('@/assets/images/fg-avatar.png')} style={{ width: 32, height: 32 }} />
                </Pressable>
                <Text style={styles.headerTitle}>👥 SOCIAL</Text>
                <View style={{ width: 40 }} />
            </Animated.View>

            {/* Coming Soon Content */}
            <View style={styles.content}>
                <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.comingSoonCard}>
                    <Text style={styles.comingSoonEmoji}>👥</Text>
                    <Text style={styles.comingSoonTitle}>FRIENDS</Text>
                    <Text style={styles.comingSoonSubtitle}>COMING SOON</Text>
                    <View style={styles.divider} />
                    <Text style={styles.featureText}>🔗 Add friends via FocusGuard ID</Text>
                    <Text style={styles.featureText}>🟢 See who's currently focusing</Text>
                    <Text style={styles.featureText}>📊 Compare stats & ranks</Text>
                    <Text style={styles.featureText}>⚔️ Challenge friends to battle</Text>
                    <Text style={styles.featureText}>🏆 View friend achievements</Text>
                </Animated.View>

                {/* Friend Count Preview */}
                <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.statsPreview}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>FRIENDS</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: NEO.colors.blue }]} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>FOCUSING</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: NEO.colors.green }]} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>ONLINE</Text>
                    </View>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: NEO.colors.bg },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 44, paddingBottom: 12,
        borderBottomWidth: NEO.border, borderBottomColor: NEO.colors.black, backgroundColor: NEO.colors.white,
    },
    avatarBtn: {
        width: 40, height: 40, borderWidth: 3, borderColor: '#000',
        justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5',
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#000', letterSpacing: 3 },
    content: { flex: 1, justifyContent: 'center', padding: 20 },
    comingSoonCard: {
        borderWidth: NEO.border, borderColor: '#000', padding: 24, backgroundColor: NEO.colors.white,
        shadowColor: '#000', shadowOffset: { width: NEO.shadow, height: NEO.shadow }, shadowOpacity: 1, shadowRadius: 0,
        alignItems: 'center',
    },
    comingSoonEmoji: { fontSize: 56, marginBottom: 12 },
    comingSoonTitle: { fontSize: 28, fontWeight: '900', color: '#000', letterSpacing: 3 },
    comingSoonSubtitle: { fontSize: 14, fontWeight: '900', color: NEO.colors.blue, letterSpacing: 4, marginTop: 4 },
    divider: { height: 3, width: '60%', backgroundColor: '#000', marginVertical: 16 },
    featureText: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 8, alignSelf: 'flex-start' },
    statsPreview: {
        flexDirection: 'row', marginTop: 20,
        borderWidth: NEO.border, borderColor: '#000', backgroundColor: NEO.colors.white,
        shadowColor: '#000', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
    },
    statBox: { flex: 1, alignItems: 'center', padding: 16 },
    statValue: {
        fontSize: 24, fontWeight: '900', color: '#000',
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    statLabel: { fontSize: 9, fontWeight: '900', color: '#888', letterSpacing: 1.5, marginTop: 4 },
    statDivider: { width: 3, height: '100%' },
});
