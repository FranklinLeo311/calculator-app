import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as SecureStore from 'expo-secure-store';
import { Colors, FontSize, Radii, Spacing } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import {
    sendMagicLink,
    signInWithGoogle,
    signInWithPhone,
    getApiKey,
} from '../utils/firebaseAuth';
import { FIREBASE_GOOGLE_CLIENT_ID_STORAGE } from '../config/firebase';

WebBrowser.maybeCompleteAuthSession();

type Step = 'home' | 'email' | 'email_sent' | 'phone' | 'phone_verify';

export default function AuthScreen() {
    const { signIn } = useAuth();
    const [step, setStep] = useState<Step>('home');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Google auth (needs client ID configured by admin)
    const [googleClientId, setGoogleClientId] = React.useState('');
    React.useEffect(() => {
        SecureStore.getItemAsync(FIREBASE_GOOGLE_CLIENT_ID_STORAGE).then(id => {
            if (id) setGoogleClientId(id);
        });
    }, []);

    const [, , promptGoogleAsync] = Google.useAuthRequest({
        clientId: googleClientId || undefined,
        webClientId: googleClientId || undefined,
    } as any);

    // ── Google Sign-In ────────────────────────────────────────────────────────

    const handleGoogle = async () => {
        if (!googleClientId) {
            Alert.alert(
                'Google Sign-In Not Set Up',
                'Admin needs to configure the Google Client ID.\nSettings → Admin Panel → Firebase Setup',
            );
            return;
        }
        setLoading(true); setError('');
        try {
            const result = await promptGoogleAsync();
            if (result?.type === 'success') {
                const token = result.authentication?.idToken ?? result.params?.id_token;
                if (!token) throw new Error('No ID token received');
                const user = await signInWithGoogle(token);
                await signIn(user);
            }
        } catch (e: any) {
            setError(e.message === 'FIREBASE_NOT_CONFIGURED'
                ? 'Firebase not set up yet. Admin needs to configure it in Settings.'
                : e.message ?? 'Google sign-in failed');
        }
        setLoading(false);
    };

    // ── Email Magic Link ──────────────────────────────────────────────────────

    const handleSendMagicLink = async () => {
        if (!email.trim() || !email.includes('@')) { setError('Enter a valid email address'); return; }
        setLoading(true); setError('');
        try {
            const apiKey = await getApiKey();
            if (!apiKey) throw new Error('FIREBASE_NOT_CONFIGURED');
            await sendMagicLink(email.trim().toLowerCase(), 'https://my-maths-3bef4.firebaseapp.com/__/auth/action');
            setStep('email_sent');
        } catch (e: any) {
            if (e.message === 'FIREBASE_NOT_CONFIGURED') {
                setError('Firebase not configured yet. Admin needs to add the API key in Settings → Admin Panel.');
            } else {
                setError('Could not send link. Check your email and try again.');
            }
        }
        setLoading(false);
    };

    // ── Phone Login ───────────────────────────────────────────────────────────

    const handlePhoneLogin = async () => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length < 10) { setError('Enter a valid 10-digit mobile number'); return; }
        setLoading(true); setError('');
        try {
            const user = await signInWithPhone(cleaned);
            if (!user) {
                setError('This number is not registered. Contact the admin to get access.');
            } else {
                await signIn(user);
            }
        } catch (e: any) {
            if (e.message === 'FIREBASE_NOT_CONFIGURED') {
                setError('Firebase not configured yet.');
            } else {
                setError('Login failed. Please try again.');
            }
        }
        setLoading(false);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <KeyboardAvoidingView
            style={styles.root}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Hero */}
                <View style={styles.hero}>
                    <Text style={styles.appIcon}>🧮</Text>
                    <Text style={styles.appName}>My Maths</Text>
                    <Text style={styles.tagline}>Your personal maths & productivity hub</Text>
                </View>

                {/* Content card */}
                <View style={styles.card}>

                    {/* HOME STEP */}
                    {step === 'home' && (
                        <>
                            <Text style={styles.heading}>Welcome</Text>
                            <Text style={styles.sub}>Sign in to sync your data across devices</Text>

                            {/* Google */}
                            <TouchableOpacity style={styles.googleBtn} onPress={handleGoogle} disabled={loading} activeOpacity={0.85}>
                                <Text style={styles.googleIcon}>G</Text>
                                <Text style={styles.googleText}>Continue with Google</Text>
                            </TouchableOpacity>

                            <View style={styles.orRow}>
                                <View style={styles.orLine} />
                                <Text style={styles.orText}>or</Text>
                                <View style={styles.orLine} />
                            </View>

                            {/* Email */}
                            <TouchableOpacity style={styles.outlineBtn} onPress={() => { setStep('email'); setError(''); }} disabled={loading} activeOpacity={0.85}>
                                <Text style={styles.outlineIcon}>✉️</Text>
                                <Text style={styles.outlineText}>Continue with Email</Text>
                            </TouchableOpacity>

                            {/* Phone */}
                            <TouchableOpacity style={styles.outlineBtn} onPress={() => { setStep('phone'); setError(''); }} disabled={loading} activeOpacity={0.85}>
                                <Text style={styles.outlineIcon}>📱</Text>
                                <Text style={styles.outlineText}>Continue with Mobile Number</Text>
                            </TouchableOpacity>

                            {error ? <Text style={styles.errorText}>{error}</Text> : null}

                            <Text style={styles.privacyNote}>
                                Your data is stored securely in Firebase and never shared.
                            </Text>
                        </>
                    )}

                    {/* EMAIL STEP */}
                    {step === 'email' && (
                        <>
                            <TouchableOpacity onPress={() => { setStep('home'); setError(''); }} style={styles.back}>
                                <Text style={styles.backText}>← Back</Text>
                            </TouchableOpacity>
                            <Text style={styles.heading}>✉️ Email Sign-In</Text>
                            <Text style={styles.sub}>We'll send a magic link — no password needed</Text>

                            <TextInput
                                style={styles.input}
                                value={email}
                                onChangeText={v => { setEmail(v); setError(''); }}
                                placeholder="your@email.com"
                                placeholderTextColor={Colors.text.muted}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                                returnKeyType="send"
                                onSubmitEditing={handleSendMagicLink}
                            />

                            {error ? <Text style={styles.errorText}>{error}</Text> : null}

                            <TouchableOpacity style={styles.primaryBtn} onPress={handleSendMagicLink} disabled={loading} activeOpacity={0.85}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send Magic Link →</Text>}
                            </TouchableOpacity>
                        </>
                    )}

                    {/* EMAIL SENT STEP */}
                    {step === 'email_sent' && (
                        <>
                            <Text style={styles.successEmoji}>📬</Text>
                            <Text style={styles.heading}>Check Your Email</Text>
                            <Text style={styles.sub}>
                                We sent a sign-in link to{'\n'}
                                <Text style={{ color: Colors.accent, fontWeight: '700' }}>{email}</Text>
                            </Text>
                            <Text style={[styles.sub, { marginTop: 8 }]}>
                                Tap the link in your email to sign in automatically.
                            </Text>
                            <TouchableOpacity style={styles.outlineBtn} onPress={() => setStep('email')} activeOpacity={0.85}>
                                <Text style={styles.outlineText}>Resend or change email</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {/* PHONE STEP */}
                    {step === 'phone' && (
                        <>
                            <TouchableOpacity onPress={() => { setStep('home'); setError(''); }} style={styles.back}>
                                <Text style={styles.backText}>← Back</Text>
                            </TouchableOpacity>
                            <Text style={styles.heading}>📱 Mobile Sign-In</Text>
                            <Text style={styles.sub}>Enter your registered mobile number</Text>

                            <View style={styles.phoneRow}>
                                <View style={styles.countryCode}>
                                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                                </View>
                                <TextInput
                                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                    value={phone}
                                    onChangeText={v => { setPhone(v.replace(/\D/g, '')); setError(''); }}
                                    placeholder="9876543210"
                                    placeholderTextColor={Colors.text.muted}
                                    keyboardType="phone-pad"
                                    maxLength={10}
                                    returnKeyType="go"
                                    onSubmitEditing={handlePhoneLogin}
                                />
                            </View>

                            {error ? <Text style={styles.errorText}>{error}</Text> : null}

                            <TouchableOpacity style={styles.primaryBtn} onPress={handlePhoneLogin} disabled={loading || phone.length < 10} activeOpacity={0.85}>
                                {loading
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={styles.primaryBtnText}>Sign In →</Text>
                                }
                            </TouchableOpacity>

                            <Text style={styles.privacyNote}>
                                Only registered numbers can sign in. Contact admin to get access.
                            </Text>
                        </>
                    )}

                    {loading && step === 'home' && (
                        <ActivityIndicator color={Colors.accent} style={{ marginTop: 12 }} />
                    )}
                </View>

                <Text style={styles.version}>My Maths v1.0 · Powered by Firebase</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
    hero: { alignItems: 'center', marginBottom: 32 },
    appIcon: { fontSize: 64, marginBottom: 8 },
    appName: { fontSize: 32, fontWeight: '800', color: Colors.text.primary, letterSpacing: -1 },
    tagline: { fontSize: FontSize.sm, color: Colors.text.muted, marginTop: 6, textAlign: 'center' },

    card: {
        backgroundColor: '#1e293b', borderRadius: 24,
        padding: Spacing.xxl, borderWidth: 1,
        borderColor: Colors.surfaceBorder,
    },
    successEmoji: { fontSize: 52, textAlign: 'center', marginBottom: 8 },
    heading: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text.primary, marginBottom: 6 },
    sub: { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20, marginBottom: 20 },
    back: { marginBottom: 12 },
    backText: { color: Colors.accent, fontSize: FontSize.sm, fontWeight: '600' },

    googleBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#fff', borderRadius: Radii.md,
        paddingVertical: 14, gap: 10, marginBottom: 12,
    },
    googleIcon: {
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: '#4285F4', color: '#fff',
        textAlign: 'center', lineHeight: 24,
        fontSize: 14, fontWeight: '800',
    },
    googleText: { fontSize: FontSize.body, fontWeight: '700', color: '#1a1a1a' },

    orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10 },
    orLine: { flex: 1, height: 1, backgroundColor: Colors.surfaceBorder },
    orText: { color: Colors.text.muted, fontSize: FontSize.xs },

    outlineBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        borderRadius: Radii.md, paddingVertical: 13,
        borderWidth: 1, borderColor: Colors.surfaceBorder,
        backgroundColor: Colors.surface, marginBottom: 10, gap: 8,
    },
    outlineIcon: { fontSize: 18 },
    outlineText: { fontSize: FontSize.body, color: Colors.text.primary, fontWeight: '600' },

    input: {
        backgroundColor: Colors.input, borderRadius: Radii.md,
        borderWidth: 1, borderColor: Colors.inputBorder,
        color: Colors.text.primary, padding: Spacing.md,
        fontSize: FontSize.body, marginBottom: 14,
    },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    countryCode: {
        backgroundColor: Colors.surface, borderRadius: Radii.md,
        borderWidth: 1, borderColor: Colors.inputBorder,
        padding: Spacing.md,
    },
    countryCodeText: { color: Colors.text.primary, fontWeight: '600' },

    primaryBtn: {
        backgroundColor: Colors.accent, borderRadius: Radii.md,
        paddingVertical: 15, alignItems: 'center', marginTop: 4,
    },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },

    errorText: {
        color: Colors.error, fontSize: FontSize.xs, marginBottom: 10,
        backgroundColor: Colors.errorSoft, padding: 8, borderRadius: Radii.sm,
    },
    privacyNote: {
        fontSize: 11, color: Colors.text.muted, textAlign: 'center',
        marginTop: 16, lineHeight: 16,
    },
    version: { textAlign: 'center', color: Colors.text.muted, fontSize: 11, marginTop: 24 },
});
