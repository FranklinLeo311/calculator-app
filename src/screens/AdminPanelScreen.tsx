import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, ScrollView, StyleSheet,
    Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { secureStorage } from '../utils/secureStorage';
import GradientBackground from '../components/GradientBackground';
import { Colors, FontSize, Radii, Spacing } from '../config/theme';
import { FIREBASE_API_KEY_STORAGE, FIREBASE_GOOGLE_CLIENT_ID_STORAGE, FIREBASE_DB_URL, ADMIN_EMAIL, ADMIN_PHONE } from '../config/firebase';
import { getAdminConfig, saveAdminConfig, setApiKey, getApiKey, listUsers, promoteToAdmin, revokeAdmin } from '../utils/firebaseAuth';
import { useAuth } from '../contexts/AuthContext';

type Tab = 'firebase' | 'users';

export default function AdminPanelScreen() {
    const { user } = useAuth();
    const [tab, setTab] = useState<Tab>('firebase');
    const [apiKey, setApiKeyState] = useState('');
    const [googleClientId, setGoogleClientId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Users tab
    const [users, setUsers] = useState<Array<{ uid: string; email?: string; phone?: string; role?: string }>>([]);
    const [usersLoading, setUsersLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const [key, gId] = await Promise.all([
            getApiKey(),
            secureStorage.getItem(FIREBASE_GOOGLE_CLIENT_ID_STORAGE),
        ]);
        setApiKeyState(key ?? '');
        setGoogleClientId(gId ?? '');
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const loadUsers = useCallback(async () => {
        setUsersLoading(true);
        const list = await listUsers();
        setUsers(list as any);
        setUsersLoading(false);
    }, []);

    useEffect(() => { if (tab === 'users') loadUsers(); }, [tab, loadUsers]);

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

    const handlePromote = (uid: string, name: string) => {
        Alert.alert('Promote to Admin', `Grant admin access to ${name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Promote', onPress: async () => {
                    await promoteToAdmin(uid);
                    await loadUsers();
                },
            },
        ]);
    };

    const handleRevoke = (uid: string, name: string) => {
        Alert.alert('Revoke Admin', `Remove admin access from ${name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Revoke', style: 'destructive', onPress: async () => {
                    await revokeAdmin(uid);
                    await loadUsers();
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
                <Text style={styles.adminBadge}>
                    {user?.email ?? (user?.phone ? `+91 ${user.phone}` : 'Admin')}
                </Text>

                {/* Tab bar */}
                <View style={styles.tabBar}>
                    <TouchableOpacity style={[styles.tabBtn, tab === 'firebase' && styles.tabBtnActive]} onPress={() => setTab('firebase')}>
                        <Text style={[styles.tabBtnText, tab === 'firebase' && styles.tabBtnTextActive]}>🔥 Firebase</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tabBtn, tab === 'users' && styles.tabBtnActive]} onPress={() => setTab('users')}>
                        <Text style={[styles.tabBtnText, tab === 'users' && styles.tabBtnTextActive]}>👥 Users</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Firebase Tab ── */}
                {tab === 'firebase' && <>
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

                        <Text style={styles.label}>Google OAuth Client ID <Text style={styles.optional}>(optional)</Text></Text>
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
                            📍 DB: {FIREBASE_DB_URL}
                        </Text>

                        <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveFirebase} disabled={saving}>
                            {saving ? <ActivityIndicator color="#fff" size="small" /> :
                                <Text style={styles.primaryBtnText}>{saved ? '✓ Saved!' : 'Save Firebase Config'}</Text>}
                        </TouchableOpacity>
                    </View>

                    {/* Default admins info */}
                    <View style={styles.infoCard}>
                        <Text style={styles.infoTitle}>🔒 Default Admins (Hardcoded)</Text>
                        <Text style={styles.infoBody}>
                            These identities always have admin access regardless of Firebase setup:{'\n\n'}
                            📧 {ADMIN_EMAIL}{'\n'}
                            📱 +91 {ADMIN_PHONE}
                        </Text>
                    </View>

                    {/* Firebase rules reminder */}
                    <View style={styles.noteCard}>
                        <Text style={styles.noteTitle}>⚠️ Firebase Rules Required</Text>
                        <Text style={styles.noteBody}>
                            {`{\n  "rules": {\n    ".read": true,\n    ".write": true\n  }\n}`}
                        </Text>
                    </View>
                </>}

                {/* ── Users Tab ── */}
                {tab === 'users' && <>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>👥 Registered Users</Text>
                            <TouchableOpacity onPress={loadUsers} style={styles.refreshBtn}>
                                <Text style={styles.refreshBtnText}>↻ Refresh</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.helperText}>
                            Promote users to admin. Default admins cannot be revoked via this screen.
                        </Text>

                        {usersLoading && <ActivityIndicator color={Colors.accent} style={{ marginVertical: 20 }} />}

                        {!usersLoading && users.length === 0 && (
                            <Text style={styles.emptyText}>No users registered yet</Text>
                        )}

                        {!usersLoading && users.map(u => {
                            const isDefaultAdmin = u.email === ADMIN_EMAIL || u.phone === ADMIN_PHONE;
                            const label = u.email ?? (u.phone ? `+91 ${u.phone}` : u.uid.slice(0, 12) + '…');
                            const isAdmin = u.role === 'admin';
                            return (
                                <View key={u.uid} style={styles.userRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.userName}>{label}</Text>
                                        <View style={styles.roleBadgeRow}>
                                            <View style={[styles.roleBadge, isAdmin && styles.roleBadgeAdmin]}>
                                                <Text style={[styles.roleBadgeText, isAdmin && styles.roleBadgeTextAdmin]}>
                                                    {isAdmin ? '🛡️ Admin' : '👤 User'}
                                                </Text>
                                            </View>
                                            {isDefaultAdmin && (
                                                <View style={styles.defaultBadge}>
                                                    <Text style={styles.defaultBadgeText}>Default</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    {!isDefaultAdmin && (
                                        <TouchableOpacity
                                            style={[styles.actionBtn, isAdmin && styles.actionBtnRevoke]}
                                            onPress={() => isAdmin ? handleRevoke(u.uid, label) : handlePromote(u.uid, label)}
                                        >
                                            <Text style={[styles.actionBtnText, isAdmin && styles.actionBtnTextRevoke]}>
                                                {isAdmin ? 'Revoke' : 'Promote'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </>}
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
        borderRadius: 20, alignSelf: 'flex-start', marginBottom: 16,
    },
    tabBar: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radii.md, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: Colors.surfaceBorder },
    tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: Radii.sm },
    tabBtnActive: { backgroundColor: Colors.accent },
    tabBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.muted },
    tabBtnTextActive: { color: '#fff' },
    section: { backgroundColor: '#1e293b', borderRadius: 16, padding: Spacing.xl, marginBottom: 16, borderWidth: 1, borderColor: Colors.surfaceBorder },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text.primary },
    helperText: { fontSize: FontSize.xs, color: Colors.text.muted, lineHeight: 16, marginBottom: 12 },
    label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text.secondary, marginBottom: 6 },
    optional: { fontWeight: '400', color: Colors.text.muted },
    input: { backgroundColor: Colors.input, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.inputBorder, color: Colors.text.primary, padding: Spacing.md, fontSize: FontSize.sm, marginBottom: 12 },
    primaryBtn: { backgroundColor: Colors.accent, borderRadius: Radii.md, paddingVertical: 13, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.body },
    infoCard: { backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 12, padding: Spacing.lg, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
    infoTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.accent, marginBottom: 8 },
    infoBody: { fontSize: FontSize.xs, color: Colors.text.secondary, lineHeight: 18 },
    noteCard: { backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 12, padding: Spacing.lg, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
    noteTitle: { fontSize: FontSize.sm, fontWeight: '700', color: '#F59E0B', marginBottom: 8 },
    noteBody: { fontSize: FontSize.xs, color: Colors.text.secondary, lineHeight: 18, fontFamily: 'monospace' },
    emptyText: { color: Colors.text.muted, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: 20 },
    refreshBtn: { backgroundColor: Colors.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radii.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
    refreshBtnText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '600' },
    userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radii.md, padding: Spacing.md, marginBottom: 8, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: 10 },
    userName: { color: Colors.text.primary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 4 },
    roleBadgeRow: { flexDirection: 'row', gap: 6 },
    roleBadge: { backgroundColor: Colors.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 1, borderColor: Colors.surfaceBorder },
    roleBadgeAdmin: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
    roleBadgeText: { fontSize: 10, color: Colors.text.muted, fontWeight: '600' },
    roleBadgeTextAdmin: { color: Colors.accent },
    defaultBadge: { backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)' },
    defaultBadgeText: { fontSize: 10, color: '#F59E0B', fontWeight: '600' },
    actionBtn: { backgroundColor: Colors.accentSoft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radii.sm, borderWidth: 1, borderColor: Colors.accent },
    actionBtnRevoke: { backgroundColor: Colors.errorSoft, borderColor: Colors.error },
    actionBtnText: { color: Colors.accent, fontSize: FontSize.xs, fontWeight: '700' },
    actionBtnTextRevoke: { color: Colors.error },
});
