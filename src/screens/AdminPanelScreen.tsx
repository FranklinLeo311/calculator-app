import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { secureStorage } from '../utils/secureStorage';
import GradientBackground from '../components/GradientBackground';
import { Colors, FontSize, Radii, Spacing } from '../config/theme';
import { FIREBASE_API_KEY_STORAGE, FIREBASE_GOOGLE_CLIENT_ID_STORAGE, FIREBASE_DB_URL } from '../config/firebase';
import { getAdminConfig, saveAdminConfig, setApiKey, getApiKey } from '../utils/firebaseAuth';
import { useAuth } from '../contexts/AuthContext';

type AdminConfig = {
    allowedPhones: string[];
    notifyTime: string;
    appVersion: string;
};

export default function AdminPanelScreen() {
    const { user } = useAuth();
    const [apiKey, setApiKeyState] = useState('');
    const [googleClientId, setGoogleClientId] = useState('');
    const [allowedPhones, setAllowedPhones] = useState<string[]>([]);
    const [newPhone, setNewPhone] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const [key, gId, config] = await Promise.all([
            getApiKey(),
            secureStorage.getItem(FIREBASE_GOOGLE_CLIENT_ID_STORAGE),
            getAdminConfig(),
        ]);
        setApiKeyState(key ?? '');
        setGoogleClientId(gId ?? '');
        if (Array.isArray(config?.allowedPhones)) setAllowedPhones(config.allowedPhones);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSaveFirebase = async () => {
        if (!apiKey.trim()) { Alert.alert('Required', 'Firebase Web API Key is required.'); return; }
        setSaving(true);
        await setApiKey(apiKey.trim());
        if (googleClientId.trim()) {
            await secureStorage.setItem(FIREBASE_GOOGLE_CLIENT_ID_STORAGE, googleClientId.trim());
        }
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleAddPhone = async () => {
        const cleaned = newPhone.replace(/\D/g, '');
        if (cleaned.length < 10) { Alert.alert('Invalid', 'Enter a valid 10-digit number.'); return; }
        if (allowedPhones.includes(cleaned)) { Alert.alert('Already added', 'This number is already registered.'); return; }
        const updated = [...allowedPhones, cleaned];
        setAllowedPhones(updated);
        setNewPhone('');
        await saveAdminConfig({ allowedPhones: updated });
    };

    const handleRemovePhone = (phone: string) => {
        Alert.alert('Remove Access', `Remove ${phone} from the allowed list?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive',
                onPress: async () => {
                    const updated = allowedPhones.filter(p => p !== phone);
                    setAllowedPhones(updated);
                    await saveAdminConfig({ allowedPhones: updated });
                },
            },
        ]);
    };

    if (loading) return (
        <GradientBackground>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={Colors.accent} />
            </View>
        </GradientBackground>
    );

    return (
        <GradientBackground>
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                <Text style={styles.pageTitle}>🛡️ Admin Panel</Text>
                <Text style={styles.adminBadge}>Logged in as: {user?.email ?? user?.phone}</Text>

                {/* Firebase Setup */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔥 Firebase Setup</Text>
                    <Text style={styles.helperText}>
                        Firebase Console → Project Settings → General → Web API Key
                    </Text>

                    <Text style={styles.label}>Web API Key</Text>
                    <TextInput
                        style={styles.input}
                        value={apiKey}
                        onChangeText={setApiKeyState}
                        placeholder="AIzaSy..."
                        placeholderTextColor={Colors.text.muted}
                        autoCapitalize="none"
                        secureTextEntry
                    />

                    <Text style={styles.label}>Google OAuth Client ID <Text style={styles.optional}>(optional — for Google Sign-In)</Text></Text>
                    <Text style={[styles.helperText, { marginBottom: 4 }]}>
                        Firebase Console → Authentication → Sign-in method → Google → Web client ID
                    </Text>
                    <TextInput
                        style={styles.input}
                        value={googleClientId}
                        onChangeText={setGoogleClientId}
                        placeholder="xxx.apps.googleusercontent.com"
                        placeholderTextColor={Colors.text.muted}
                        autoCapitalize="none"
                    />

                    <Text style={[styles.helperText, { marginBottom: 8 }]}>
                        📍 DB URL: {FIREBASE_DB_URL}
                    </Text>

                    <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveFirebase} disabled={saving}>
                        {saving ? <ActivityIndicator color="#fff" size="small" /> :
                            <Text style={styles.primaryBtnText}>{saved ? '✓ Saved!' : 'Save Firebase Config'}</Text>}
                    </TouchableOpacity>
                </View>

                {/* Phone Access List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📱 Phone Access List</Text>
                    <Text style={styles.helperText}>
                        Users with these numbers can sign in without Google or email.
                    </Text>

                    {allowedPhones.length === 0 ? (
                        <Text style={styles.emptyText}>No phone numbers added yet</Text>
                    ) : (
                        allowedPhones.map(phone => (
                            <View key={phone} style={styles.phoneRow}>
                                <Text style={styles.phoneText}>📱 +91 {phone}</Text>
                                <TouchableOpacity onPress={() => handleRemovePhone(phone)} style={styles.removeBtn}>
                                    <Text style={styles.removeBtnText}>Remove</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}

                    <View style={styles.addPhoneRow}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            value={newPhone}
                            onChangeText={v => setNewPhone(v.replace(/\D/g, ''))}
                            placeholder="10-digit number"
                            placeholderTextColor={Colors.text.muted}
                            keyboardType="phone-pad"
                            maxLength={10}
                        />
                        <TouchableOpacity style={styles.addBtn} onPress={handleAddPhone}>
                            <Text style={styles.addBtnText}>+ Add</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Firebase rules reminder */}
                <View style={styles.noteCard}>
                    <Text style={styles.noteTitle}>⚠️ Firebase Rules</Text>
                    <Text style={styles.noteBody}>
                        Make sure your Firebase Realtime Database is in <Text style={{ color: Colors.accent }}>Test Mode</Text> or has these rules:
                        {'\n\n'}
                        {`{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}`}
                    </Text>
                </View>
            </ScrollView>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: { padding: Spacing.xl, paddingBottom: 40 },
    pageTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.text.primary, marginBottom: 4 },
    adminBadge: {
        fontSize: FontSize.xs, color: Colors.accent, fontWeight: '600',
        backgroundColor: Colors.accentSoft, paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 20, alignSelf: 'flex-start', marginBottom: 20,
    },
    section: {
        backgroundColor: '#1e293b', borderRadius: 16,
        padding: Spacing.xl, marginBottom: 16,
        borderWidth: 1, borderColor: Colors.surfaceBorder,
    },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary, marginBottom: 8 },
    helperText: { fontSize: FontSize.xs, color: Colors.text.muted, lineHeight: 16, marginBottom: 12 },
    label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary, marginBottom: 6 },
    optional: { fontWeight: '400', color: Colors.text.muted },
    input: {
        backgroundColor: Colors.input, borderRadius: Radii.md, borderWidth: 1,
        borderColor: Colors.inputBorder, color: Colors.text.primary,
        padding: Spacing.md, fontSize: FontSize.sm, marginBottom: 12,
    },
    primaryBtn: {
        backgroundColor: Colors.accent, borderRadius: Radii.md,
        paddingVertical: 13, alignItems: 'center',
    },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },
    emptyText: { color: Colors.text.muted, fontSize: FontSize.sm, marginBottom: 12 },
    phoneRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.surface, borderRadius: Radii.md, padding: Spacing.md, marginBottom: 8,
        borderWidth: 1, borderColor: Colors.surfaceBorder,
    },
    phoneText: { color: Colors.text.primary, fontSize: FontSize.sm, fontWeight: '600' },
    removeBtn: {
        backgroundColor: Colors.errorSoft, borderRadius: Radii.sm,
        paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.error,
    },
    removeBtnText: { color: Colors.error, fontSize: FontSize.xs, fontWeight: '600' },
    addPhoneRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
    addBtn: {
        backgroundColor: Colors.accent, borderRadius: Radii.md,
        paddingHorizontal: Spacing.lg, paddingVertical: 13,
    },
    addBtnText: { color: '#fff', fontWeight: '700' },
    noteCard: {
        backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 12,
        padding: Spacing.lg, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    },
    noteTitle: { fontSize: FontSize.sm, fontWeight: '700', color: '#F59E0B', marginBottom: 8 },
    noteBody: { fontSize: FontSize.xs, color: Colors.text.secondary, lineHeight: 18, fontFamily: 'monospace' },
});
