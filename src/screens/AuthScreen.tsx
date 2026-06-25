import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Colors, FontSize, Radii, Spacing } from '../config/theme';
import { useAuth } from '../contexts/AuthContext';
import {
    signInWithGoogle,
    sendMagicLink,
    generateAndStoreOtp,
    verifyOtp,
    getApiKey,
} from '../utils/firebaseAuth';
import { secureStorage } from '../utils/secureStorage';
import { FIREBASE_GOOGLE_CLIENT_ID_STORAGE } from '../config/firebase';

try { WebBrowser.maybeCompleteAuthSession(); } catch {}

type Step =
    | 'home'
    | 'email_input' | 'email_otp' | 'email_sent'
    | 'phone_input' | 'phone_otp';

export default function AuthScreen() {
    const { signIn } = useAuth();
    const [step, setStep] = useState<Step>('home');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [generatedOtp, setGeneratedOtp] = useState(''); // shown in UI (no SMS service)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);
    const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const otpInputRef = useRef<TextInput>(null);

    const [googleClientId, setGoogleClientId] = useState('');
    useEffect(() => {
        secureStorage.getItem(FIREBASE_GOOGLE_CLIENT_ID_STORAGE).then(id => {
            if (id) setGoogleClientId(id);
        });
    }, []);

    const PLACEHOLDER_ID = 'not-configured.apps.googleusercontent.com';
    const [, , promptGoogleAsync] = Google.useAuthRequest({
        clientId: googleClientId || PLACEHOLDER_ID,
        webClientId: googleClientId || PLACEHOLDER_ID,
    } as any);

    // Countdown timer for resend
    const startCooldown = (secs = 60) => {
        setResendCooldown(secs);
        cooldownRef.current = setInterval(() => {
            setResendCooldown(prev => {
                if (prev <= 1) { clearInterval(cooldownRef.current!); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    // ── Google ────────────────────────────────────────────────────────────────

    const handleGoogle = async () => {
        if (!googleClientId) {
            Alert.alert('Google Sign-In Not Ready',
                'Admin needs to configure the Google Client ID in Admin Panel → Firebase Setup first.');
            return;
        }
        setLoading(true); setError('');
        try {
            const result = await promptGoogleAsync();
            if (result?.type === 'success') {
                const token = (result as any).authentication?.idToken ?? (result as any).params?.id_token;
                if (!token) throw new Error('No ID token received from Google');
                const user = await signInWithGoogle(token);
                await signIn(user);
            }
        } catch (e: any) {
            setError(e.message === 'FIREBASE_NOT_CONFIGURED'
                ? 'Firebase not set up yet. Admin needs to configure it.'
                : 'Google sign-in failed. Try email or phone instead.');
        }
        setLoading(false);
    };

    // ── Email ─────────────────────────────────────────────────────────────────

    const handleSendEmailOtp = async () => {
        if (!email.trim() || !email.includes('@')) { setError('Enter a valid email address'); return; }
        setLoading(true); setError('');
        try {
            const apiKey = await getApiKey();
            if (!apiKey) throw new Error('FIREBASE_NOT_CONFIGURED');
            // Store OTP in Firebase, get the code back to show in UI
            const code = await generateAndStoreOtp(`email:${email.trim().toLowerCase()}`);
            setGeneratedOtp(code);
            // Also send Firebase magic link as backup
            sendMagicLink(email.trim().toLowerCase(),
                'https://my-maths-3bef4.firebaseapp.com/__/auth/action').catch(() => {});
            setStep('email_otp');
            startCooldown(60);
            setTimeout(() => otpInputRef.current?.focus(), 300);
        } catch (e: any) {
            setError(e.message === 'FIREBASE_NOT_CONFIGURED'
                ? 'Firebase not configured. Admin needs to add the API key in Settings → Admin Panel.'
                : 'Failed to send OTP. Please try again.');
        }
        setLoading(false);
    };

    const handleVerifyEmailOtp = async () => {
        if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
        setLoading(true); setError('');
        try {
            const user = await verifyOtp(`email:${email.trim().toLowerCase()}`, otp, email.trim().toLowerCase(), undefined);
            await signIn(user);
        } catch (e: any) {
            setError(e.message === 'OTP_EXPIRED' ? 'OTP expired. Please request a new one.'
                : e.message === 'OTP_INVALID' ? 'Incorrect OTP. Please check and try again.'
                : 'Verification failed. Try again.');
        }
        setLoading(false);
    };

    // ── Phone ─────────────────────────────────────────────────────────────────

    const handleSendPhoneOtp = async () => {
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length !== 10) { setError('Enter a valid 10-digit mobile number'); return; }
        setLoading(true); setError('');
        try {
            const apiKey = await getApiKey();
            if (!apiKey) throw new Error('FIREBASE_NOT_CONFIGURED');
            const code = await generateAndStoreOtp(`phone:${cleaned}`);
            setGeneratedOtp(code);
            setStep('phone_otp');
            startCooldown(60);
            setTimeout(() => otpInputRef.current?.focus(), 300);
        } catch (e: any) {
            setError(e.message === 'FIREBASE_NOT_CONFIGURED'
                ? 'Firebase not configured. Admin needs to set it up first.'
                : 'Failed to send OTP. Try again.');
        }
        setLoading(false);
    };

    const handleVerifyPhoneOtp = async () => {
        if (otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
        setLoading(true); setError('');
        try {
            const cleaned = phone.replace(/\D/g, '');
            const user = await verifyOtp(`phone:${cleaned}`, otp, undefined, cleaned);
            await signIn(user);
        } catch (e: any) {
            setError(e.message === 'OTP_EXPIRED' ? 'OTP expired. Request a new one.'
                : e.message === 'OTP_INVALID' ? 'Incorrect OTP. Check and try again.'
                : 'Verification failed. Try again.');
        }
        setLoading(false);
    };

    const err = (msg: string) => { setError(msg); setLoading(false); };
    const goHome = () => { setStep('home'); setError(''); setOtp(''); setGeneratedOtp(''); };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

                {/* Hero */}
                <View style={styles.hero}>
                    <Text style={styles.appIcon}>🧮</Text>
                    <Text style={styles.appName}>My Maths</Text>
                    <Text style={styles.tagline}>Your personal maths & productivity hub</Text>
                </View>

                <View style={styles.card}>

                    {/* ── HOME ── */}
                    {step === 'home' && <>
                        <Text style={styles.heading}>Welcome</Text>
                        <Text style={styles.sub}>Sign in or create an account to sync your data across devices</Text>

                        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogle} disabled={loading} activeOpacity={0.85}>
                            <View style={styles.googleIcon}><Text style={styles.googleIconText}>G</Text></View>
                            <Text style={styles.googleText}>Continue with Google</Text>
                        </TouchableOpacity>

                        <View style={styles.orRow}>
                            <View style={styles.orLine} /><Text style={styles.orText}>or</Text><View style={styles.orLine} />
                        </View>

                        <TouchableOpacity style={styles.outlineBtn} onPress={() => { setStep('email_input'); setError(''); }} disabled={loading} activeOpacity={0.85}>
                            <Text style={styles.outlineIcon}>✉️</Text>
                            <Text style={styles.outlineText}>Continue with Email</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.outlineBtn} onPress={() => { setStep('phone_input'); setError(''); }} disabled={loading} activeOpacity={0.85}>
                            <Text style={styles.outlineIcon}>📱</Text>
                            <Text style={styles.outlineText}>Continue with Mobile Number</Text>
                        </TouchableOpacity>

                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                        {loading && <ActivityIndicator color={Colors.accent} style={{ marginTop: 12 }} />}

                        <Text style={styles.privacyNote}>New user? Just sign in — your account is created automatically.</Text>
                    </>}

                    {/* ── EMAIL INPUT ── */}
                    {step === 'email_input' && <>
                        <BackBtn onPress={goHome} />
                        <Text style={styles.heading}>✉️ Email Sign-In</Text>
                        <Text style={styles.sub}>Enter your email — we'll send you an OTP</Text>
                        <TextInput
                            style={styles.input} value={email} onChangeText={v => { setEmail(v); setError(''); }}
                            placeholder="your@email.com" placeholderTextColor={Colors.text.muted}
                            keyboardType="email-address" autoCapitalize="none" autoComplete="email"
                            returnKeyType="send" onSubmitEditing={handleSendEmailOtp}
                        />
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                        <TouchableOpacity style={styles.primaryBtn} onPress={handleSendEmailOtp} disabled={loading} activeOpacity={0.85}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send OTP →</Text>}
                        </TouchableOpacity>
                    </>}

                    {/* ── EMAIL OTP ── */}
                    {step === 'email_otp' && <>
                        <BackBtn onPress={() => { setStep('email_input'); setError(''); setOtp(''); }} />
                        <Text style={styles.heading}>Enter OTP</Text>
                        <Text style={styles.sub}>Sent to <Text style={{ color: Colors.accent, fontWeight: '700' }}>{email}</Text></Text>

                        {generatedOtp ? (
                            <View style={styles.otpDisplay}>
                                <Text style={styles.otpDisplayLabel}>Your OTP</Text>
                                <Text style={styles.otpDisplayCode}>{generatedOtp}</Text>
                                <Text style={styles.otpDisplayNote}>Note: SMS integration not yet configured — code shown here</Text>
                            </View>
                        ) : null}

                        <OtpInput value={otp} onChange={v => { setOtp(v); setError(''); }} inputRef={otpInputRef} />
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                        <TouchableOpacity style={[styles.primaryBtn, otp.length < 6 && { opacity: 0.5 }]} onPress={handleVerifyEmailOtp} disabled={loading || otp.length < 6} activeOpacity={0.85}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & Sign In →</Text>}
                        </TouchableOpacity>
                        <ResendBtn cooldown={resendCooldown} onPress={() => { setOtp(''); handleSendEmailOtp(); }} />
                    </>}

                    {/* ── PHONE INPUT ── */}
                    {step === 'phone_input' && <>
                        <BackBtn onPress={goHome} />
                        <Text style={styles.heading}>📱 Mobile Sign-In</Text>
                        <Text style={styles.sub}>Enter your mobile number — we'll send you an OTP</Text>
                        <View style={styles.phoneRow}>
                            <View style={styles.countryCode}><Text style={styles.countryCodeText}>🇮🇳 +91</Text></View>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                value={phone} onChangeText={v => { setPhone(v.replace(/\D/g, '')); setError(''); }}
                                placeholder="9876543210" placeholderTextColor={Colors.text.muted}
                                keyboardType="phone-pad" maxLength={10}
                                returnKeyType="go" onSubmitEditing={handleSendPhoneOtp}
                            />
                        </View>
                        {error ? <Text style={[styles.errorText, { marginTop: 8 }]}>{error}</Text> : null}
                        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 14 }, phone.length < 10 && { opacity: 0.5 }]} onPress={handleSendPhoneOtp} disabled={loading || phone.length < 10} activeOpacity={0.85}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Send OTP →</Text>}
                        </TouchableOpacity>
                    </>}

                    {/* ── PHONE OTP ── */}
                    {step === 'phone_otp' && <>
                        <BackBtn onPress={() => { setStep('phone_input'); setError(''); setOtp(''); }} />
                        <Text style={styles.heading}>Enter OTP</Text>
                        <Text style={styles.sub}>Sent to <Text style={{ color: Colors.accent, fontWeight: '700' }}>+91 {phone}</Text></Text>

                        {generatedOtp ? (
                            <View style={styles.otpDisplay}>
                                <Text style={styles.otpDisplayLabel}>Your OTP</Text>
                                <Text style={styles.otpDisplayCode}>{generatedOtp}</Text>
                                <Text style={styles.otpDisplayNote}>Note: SMS integration not yet configured — code shown here</Text>
                            </View>
                        ) : null}

                        <OtpInput value={otp} onChange={v => { setOtp(v); setError(''); }} inputRef={otpInputRef} />
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                        <TouchableOpacity style={[styles.primaryBtn, otp.length < 6 && { opacity: 0.5 }]} onPress={handleVerifyPhoneOtp} disabled={loading || otp.length < 6} activeOpacity={0.85}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Verify & Sign In →</Text>}
                        </TouchableOpacity>
                        <ResendBtn cooldown={resendCooldown} onPress={() => { setOtp(''); handleSendPhoneOtp(); }} />
                    </>}

                </View>

                <Text style={styles.version}>My Maths · Secured by Firebase</Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BackBtn({ onPress }: { onPress: () => void }) {
    return (
        <TouchableOpacity onPress={onPress} style={{ marginBottom: 12 }}>
            <Text style={{ color: Colors.accent, fontSize: FontSize.sm, fontWeight: '600' }}>← Back</Text>
        </TouchableOpacity>
    );
}

function OtpInput({ value, onChange, inputRef }: { value: string; onChange: (v: string) => void; inputRef: React.RefObject<TextInput> }) {
    return (
        <View style={otpStyles.container}>
            {[0,1,2,3,4,5].map(i => (
                <View key={i} style={[otpStyles.box, value.length === i && otpStyles.boxActive, value.length > i && otpStyles.boxFilled]}>
                    <Text style={otpStyles.digit}>{value[i] ?? ''}</Text>
                </View>
            ))}
            <TextInput
                ref={inputRef}
                style={otpStyles.hidden}
                value={value}
                onChangeText={v => onChange(v.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                caretHidden
            />
        </View>
    );
}

function ResendBtn({ cooldown, onPress }: { cooldown: number; onPress: () => void }) {
    return (
        <TouchableOpacity onPress={onPress} disabled={cooldown > 0} style={{ marginTop: 14, alignItems: 'center' }}>
            <Text style={{ color: cooldown > 0 ? Colors.text.muted : Colors.accent, fontSize: FontSize.sm }}>
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
            </Text>
        </TouchableOpacity>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
    hero: { alignItems: 'center', marginBottom: 28 },
    appIcon: { fontSize: 60, marginBottom: 8 },
    appName: { fontSize: 30, fontWeight: '800', color: Colors.text.primary, letterSpacing: -1 },
    tagline: { fontSize: FontSize.sm, color: Colors.text.muted, marginTop: 6, textAlign: 'center' },
    card: { backgroundColor: '#1e293b', borderRadius: 24, padding: Spacing.xxl, borderWidth: 1, borderColor: Colors.surfaceBorder },
    heading: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text.primary, marginBottom: 6 },
    sub: { fontSize: FontSize.sm, color: Colors.text.secondary, lineHeight: 20, marginBottom: 20 },
    googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: Radii.md, paddingVertical: 14, gap: 10, marginBottom: 12 },
    googleIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#4285F4', justifyContent: 'center', alignItems: 'center' },
    googleIconText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    googleText: { fontSize: FontSize.body, fontWeight: '700', color: '#1a1a1a' },
    orRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, gap: 10 },
    orLine: { flex: 1, height: 1, backgroundColor: Colors.surfaceBorder },
    orText: { color: Colors.text.muted, fontSize: FontSize.xs },
    outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: Radii.md, paddingVertical: 13, borderWidth: 1, borderColor: Colors.surfaceBorder, backgroundColor: Colors.surface, marginBottom: 10, gap: 8 },
    outlineIcon: { fontSize: 18 },
    outlineText: { fontSize: FontSize.body, color: Colors.text.primary, fontWeight: '600' },
    input: { backgroundColor: Colors.input, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text.primary, padding: Spacing.md, fontSize: FontSize.body, marginBottom: 12 },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    countryCode: { backgroundColor: Colors.surface, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.inputBorder, padding: Spacing.md },
    countryCodeText: { color: Colors.text.primary, fontWeight: '600' },
    primaryBtn: { backgroundColor: Colors.accent, borderRadius: Radii.md, paddingVertical: 15, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },
    errorText: { color: Colors.error, fontSize: FontSize.xs, marginBottom: 10, backgroundColor: Colors.errorSoft, padding: 8, borderRadius: Radii.sm },
    privacyNote: { fontSize: 11, color: Colors.text.muted, textAlign: 'center', marginTop: 16, lineHeight: 16 },
    version: { textAlign: 'center', color: Colors.text.muted, fontSize: 11, marginTop: 20 },
    otpDisplay: { backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.accent, padding: Spacing.lg, alignItems: 'center', marginBottom: 16 },
    otpDisplayLabel: { fontSize: FontSize.xs, color: Colors.text.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    otpDisplayCode: { fontSize: 36, fontWeight: '800', color: Colors.accent, letterSpacing: 8, marginVertical: 6 },
    otpDisplayNote: { fontSize: 10, color: Colors.text.muted, textAlign: 'center' },
});

const otpStyles = StyleSheet.create({
    container: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, position: 'relative' },
    box: { width: 44, height: 52, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.surfaceBorder, backgroundColor: Colors.input, justifyContent: 'center', alignItems: 'center' },
    boxActive: { borderColor: Colors.accent },
    boxFilled: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
    digit: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text.primary },
    hidden: { position: 'absolute', width: '100%', height: '100%', opacity: 0 },
});
