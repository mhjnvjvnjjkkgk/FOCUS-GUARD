import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    Dimensions,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import Animated, {
    FadeInDown,
    FadeInUp,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withRepeat,
    withSequence,
    withTiming,
    withDelay,
    Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Svg, Line, Rect } from 'react-native-svg';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/configs/firebaseConfig';
import { useAuthStore } from '@/store/authStore';

const { width, height } = Dimensions.get('window');

// ============================================
// NEOBRUTALIST CONSTANTS
// ============================================
const NEO = {
    colors: {
        background: '#FAF9F6',
        black: '#000000',
        white: '#FFFFFF',
        red: '#FF4444',
        blue: '#4444FF',
        green: '#44FF44',
        yellow: '#FFDD44',
        darkRed: '#8B0000',
        grey: '#E0E0E0',
        tapeRed: 'rgba(255, 68, 68, 0.8)',
        tapeBlue: 'rgba(68, 68, 255, 0.8)',
    },
    border: 3,
    shadowOffset: 6,
    fonts: {
        heavy: '900' as '900',
        bold: '700' as '700',
        mono: 'monospace' as 'monospace',
    },
};

// ============================================
// Grid Background
// ============================================
const GridBackground = () => {
    const spacing = 40;
    const numLinesX = Math.ceil(width / spacing);
    const numLinesY = Math.ceil(height / spacing);

    return (
        <View style={StyleSheet.absoluteFill}>
            <Svg height="100%" width="100%">
                <Rect x="0" y="0" width="100%" height="100%" fill={NEO.colors.background} />
                {Array.from({ length: numLinesX }).map((_, i) => (
                    <Line key={`v-${i}`} x1={i * spacing} y1="0" x2={i * spacing} y2="100%" stroke="#E0E0E0" strokeWidth="1" />
                ))}
                {Array.from({ length: numLinesY }).map((_, i) => (
                    <Line key={`h-${i}`} x1="0" y1={i * spacing} x2="100%" y2={i * spacing} stroke="#E0E0E0" strokeWidth="1" />
                ))}
            </Svg>
        </View>
    );
};

// ============================================
// Paper Tape Decoration
// ============================================
interface TapeProps {
    color: string;
    style?: any;
    rotation?: string;
}
const PaperTape = ({ color, style, rotation = '45deg' }: TapeProps) => (
    <View style={[styles.tape, { backgroundColor: color, transform: [{ rotate: rotation }] }, style]} />
);

// ============================================
// Wiggly Neobrutalist Button
// ============================================
interface NeoButtonProps {
    text: string;
    onPress: () => void;
    color?: string;
    textColor?: string;
    icon?: string;
    isLoading?: boolean;
    style?: any;
}

const NeoButton = ({ text, onPress, color = NEO.colors.black, textColor = NEO.colors.white, icon, isLoading, style }: NeoButtonProps) => {
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);

    useEffect(() => {
        const startDelay = Math.random() * 1000;
        rotation.value = withDelay(
            startDelay,
            withRepeat(
                withSequence(
                    withTiming(-2, { duration: 150 }),
                    withTiming(2, { duration: 150 }),
                    withTiming(-1.5, { duration: 150 }),
                    withTiming(1.5, { duration: 150 }),
                    withTiming(0, { duration: 150 }),
                    withDelay(2000, withTiming(0, { duration: 0 }))
                ),
                -1,
                false
            )
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` }
        ],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.93);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handlePressOut = () => {
        scale.value = withSpring(1);
    };

    return (
        <Animated.View style={[animatedStyle, style]}>
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isLoading}
                style={[styles.neoButton, { backgroundColor: color }, isLoading && { opacity: 0.8 }]}
            >
                {isLoading ? (
                    <ActivityIndicator color={textColor} />
                ) : (
                    <View style={styles.buttonContent}>
                        {icon === 'google' ? (
                            <View style={styles.googleIconBox}>
                                <Text style={styles.googleG}>G</Text>
                            </View>
                        ) : icon ? (
                            <Ionicons name={icon as any} size={24} color={textColor} style={{ marginRight: 10 }} />
                        ) : null}
                        <Text style={[styles.neoButtonText, { color: textColor }]}>{text}</Text>
                    </View>
                )}
            </Pressable>
        </Animated.View>
    );
};

// ============================================
// MAIN LOGIN SCREEN
// ============================================
export default function LoginScreen() {
    const router = useRouter();
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { user } = useAuthStore();

    // Floating Header Animation
    const headerY = useSharedValue(0);
    useEffect(() => {
        headerY.value = withRepeat(
            withSequence(
                withTiming(-6, { duration: 2000, easing: Easing.inOut(Easing.quad) }),
                withTiming(6, { duration: 2000, easing: Easing.inOut(Easing.quad) })
            ),
            -1,
            true
        );
    }, []);
    const headerFloat = useAnimatedStyle(() => ({
        transform: [{ translateY: headerY.value }],
    }));

    // Google Auth
    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        clientId: '77805130574-ofoq2k0q2u3vibi5cn6amfceauchulo3.apps.googleusercontent.com',
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            const credential = GoogleAuthProvider.credential(id_token);
            setLoading(true);
            signInWithCredential(auth, credential)
                .catch((error: any) => {
                    Alert.alert('Google Sign-In Failed', error.message);
                    setLoading(false);
                });
        }
    }, [response]);

    const getFriendlyError = (code: string) => {
        switch (code) {
            case 'auth/email-already-in-use': return 'This email is already registered. Try logging in instead!';
            case 'auth/invalid-email': return 'Please enter a valid email address.';
            case 'auth/weak-password': return 'Password must be at least 6 characters.';
            case 'auth/user-not-found': return 'No account found with this email. Try signing up!';
            case 'auth/wrong-password': return 'Incorrect password. Please try again.';
            case 'auth/too-many-requests': return 'Too many attempts. Please wait a minute and try again.';
            case 'auth/invalid-credential': return 'Invalid email or password. Please check and try again.';
            default: return 'Something went wrong. Please try again.';
        }
    };

    const handleAuth = async () => {
        if (!email.trim()) {
            Alert.alert('Missing Email', 'Please enter your email address.');
            return;
        }
        if (!password) {
            Alert.alert('Missing Password', 'Please enter a password.');
            return;
        }
        if (mode === 'signup') {
            if (password.length < 6) {
                Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
                return;
            }
            if (password !== confirmPassword) {
                Alert.alert('Password Mismatch', 'Passwords do not match. Please try again.');
                return;
            }
        }

        setLoading(true);
        try {
            if (mode === 'login') {
                await signInWithEmailAndPassword(auth, email.trim(), password);
            } else {
                await createUserWithEmailAndPassword(auth, email.trim(), password);
            }
        } catch (error: any) {
            const friendlyMsg = getFriendlyError(error.code);
            Alert.alert(mode === 'login' ? 'Login Failed' : 'Sign Up Failed', friendlyMsg);
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setMode(prev => prev === 'login' ? 'signup' : 'login');
        setConfirmPassword('');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    return (
        <View style={styles.container}>
            <GridBackground />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Header - Paper Cutout (Floating) */}
                    <Animated.View
                        entering={FadeInDown.delay(100).springify()}
                        style={[styles.headerContainer, headerFloat]}
                    >
                        <View style={styles.paperHeader}>
                            <PaperTape color={NEO.colors.tapeRed} style={{ top: -10, left: '20%' }} rotation="-3deg" />
                            <PaperTape color={NEO.colors.tapeBlue} style={{ bottom: -10, right: '20%' }} rotation="2deg" />
                            <Text style={styles.headerText}>
                                {mode === 'login' ? 'LOG IN' : 'SIGN UP'}
                            </Text>
                        </View>
                    </Animated.View>

                    {/* Form */}
                    <View style={styles.formContainer}>

                        {/* Email Input */}
                        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.inputWrapper}>
                            <View style={styles.inputLabelBox}>
                                <Text style={styles.inputLabel}>EMAIL</Text>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="YOUR@EMAIL.COM"
                                placeholderTextColor="#999"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="email-address"
                                textContentType="emailAddress"
                            />
                        </Animated.View>

                        {/* Password Input */}
                        <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.inputWrapper}>
                            <View style={styles.inputLabelBox}>
                                <Text style={styles.inputLabel}>PASSWORD</Text>
                            </View>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.input, { flex: 1, borderWidth: 0, shadowOpacity: 0, elevation: 0 }]}
                                    placeholder="ENTER PASSWORD..."
                                    placeholderTextColor="#999"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />
                                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={22} color={NEO.colors.black} />
                                </Pressable>
                            </View>
                        </Animated.View>

                        {/* Confirm Password Input — only in sign-up mode */}
                        {mode === 'signup' && (
                            <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.inputWrapper}>
                                <View style={styles.inputLabelBox}>
                                    <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                                </View>
                                <View style={styles.passwordContainer}>
                                    <TextInput
                                        style={[styles.input, { flex: 1, borderWidth: 0, shadowOpacity: 0, elevation: 0 }]}
                                        placeholder="RE-ENTER PASSWORD..."
                                        placeholderTextColor="#999"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirmPassword}
                                    />
                                    <Pressable onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeButton}>
                                        <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={22} color={NEO.colors.black} />
                                    </Pressable>
                                </View>
                            </Animated.View>
                        )}

                        {/* Decoration Pieces */}
                        <View style={[styles.decorSquare, { top: -20, left: -10, backgroundColor: NEO.colors.red, transform: [{ rotate: '-10deg' }] }]} />
                        <View style={[styles.decorSquare, { bottom: -20, right: -10, backgroundColor: NEO.colors.blue, transform: [{ rotate: '15deg' }] }]} />
                    </View>

                    {/* Buttons */}
                    <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.buttonContainer}>

                        <NeoButton
                            text={mode === 'login' ? 'LOG IN' : 'CREATE ACCOUNT'}
                            onPress={handleAuth}
                            isLoading={loading}
                            style={{ marginBottom: 20 }}
                        />

                        <NeoButton
                            text="LOGIN WITH GOOGLE"
                            onPress={() => promptAsync()}
                            icon="google"
                            style={{ marginBottom: 30 }}
                        />

                        {/* Toggle Mode */}
                        <View style={styles.signupContainer}>
                            <Text style={styles.toggleHintText}>
                                {mode === 'login' ? "DON'T HAVE AN ACCOUNT?" : 'ALREADY HAVE AN ACCOUNT?'}
                            </Text>
                            <Pressable onPress={toggleMode} style={styles.signupButton}>
                                <Text style={styles.signupText}>
                                    {mode === 'login' ? '→ SIGN UP HERE ←' : '→ LOG IN HERE ←'}
                                </Text>
                            </Pressable>
                        </View>

                    </Animated.View>

                    {/* Footer */}
                    <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.footerContainer}>
                        <View style={styles.paperFooter}>
                            <Text style={styles.footerText}>FOCUSGUARD</Text>
                            <PaperTape color={NEO.colors.tapeRed} style={{ top: -15, left: '35%' }} rotation="1deg" />
                        </View>
                    </Animated.View>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: NEO.colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },

    // Header
    headerContainer: {
        alignItems: 'center',
        marginBottom: 50,
    },
    paperHeader: {
        backgroundColor: NEO.colors.background,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        paddingHorizontal: 40,
        paddingVertical: 15,
        transform: [{ rotate: '-2deg' }],
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 5,
    },
    headerText: {
        fontSize: 42,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        fontFamily: NEO.fonts.mono,
        letterSpacing: 2,
    },

    // Form
    formContainer: {
        marginBottom: 40,
        position: 'relative',
    },
    inputWrapper: {
        marginBottom: 24,
    },
    inputLabelBox: {
        alignSelf: 'flex-start',
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        backgroundColor: NEO.colors.white,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginBottom: -NEO.border,
        marginLeft: 10,
        zIndex: 1,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
    },
    input: {
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        paddingHorizontal: 16,
        paddingVertical: 16,
        fontSize: 18,
        fontWeight: NEO.fonts.bold,
        color: NEO.colors.black,
        fontFamily: NEO.fonts.mono,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 5,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: NEO.colors.white,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 5,
    },
    eyeButton: {
        paddingHorizontal: 14,
        paddingVertical: 16,
    },

    // Decorations
    tape: {
        position: 'absolute',
        width: 40,
        height: 15,
        opacity: 0.9,
    },
    decorSquare: {
        position: 'absolute',
        width: 30,
        height: 30,
        borderWidth: 2,
        borderColor: NEO.colors.black,
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 0,
        zIndex: -1,
    },

    // Buttons
    buttonContainer: {
        alignItems: 'stretch',
    },
    neoButton: {
        height: 60,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 8,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    neoButtonText: {
        fontSize: 20,
        fontWeight: NEO.fonts.heavy,
        letterSpacing: 1,
    },
    googleIconBox: {
        width: 24,
        height: 24,
        backgroundColor: NEO.colors.white,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    googleG: {
        color: NEO.colors.black,
        fontWeight: 'bold',
        fontSize: 18,
    },

    // Signup Toggle
    signupContainer: {
        alignItems: 'center',
        marginTop: 10,
    },
    toggleHintText: {
        fontSize: 14,
        fontWeight: NEO.fonts.bold,
        color: '#666',
        marginBottom: 8,
        letterSpacing: 1,
    },
    signupButton: {
        backgroundColor: NEO.colors.red,
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderWidth: NEO.border,
        borderColor: NEO.colors.black,
        transform: [{ rotate: '2deg' }],
        shadowColor: NEO.colors.black,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 5,
    },
    signupText: {
        color: NEO.colors.black,
        fontWeight: NEO.fonts.heavy,
        fontSize: 16,
    },

    // Footer
    footerContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    paperFooter: {
        backgroundColor: '#DDD',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderWidth: 2,
        borderColor: NEO.colors.black,
        transform: [{ rotate: '1deg' }],
        borderStyle: 'dashed',
    },
    footerText: {
        fontSize: 18,
        fontWeight: NEO.fonts.heavy,
        color: NEO.colors.black,
        fontFamily: NEO.fonts.mono,
    },
});
