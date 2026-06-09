import React from 'react';
import {
    View, Text, ScrollView, Pressable, TextInput,
    StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import GradientBackground from '../components/GradientBackground';
import PinGate from '../components/vault/PinGate';
import CredentialCard from '../components/vault/CredentialCard';
import CredentialForm from '../components/vault/CredentialForm';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';
import {
    loadCredentials, saveCredentials, loadPin, savePin,
    CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS,
} from '../utils/vaultUtils';
import type { Credential, Category } from '../utils/vaultUtils';

type PinState = 'loading' | 'setup' | 'confirm' | 'locked' | 'unlocked';

export default function PasswordManagerScreen() {
    const [pinState,      setPinState]      = React.useState<PinState>('loading');
    const [storedPin,     setStoredPin]     = React.useState<string | null>(null);
    const [pendingPin,    setPendingPin]    = React.useState('');
    const [credentials,   setCredentials]   = React.useState<Credential[]>([]);
    const [search,        setSearch]        = React.useState('');
    const [filterCat,     setFilterCat]     = React.useState<Category | 'All'>('All');
    const [formVisible,   setFormVisible]   = React.useState(false);
    const [editTarget,    setEditTarget]    = React.useState<Credential | null>(null);

    // ── Boot: check if PIN is set ──────────────────────────────────────────────
    React.useEffect(() => {
        (async () => {
            const pin = await loadPin();
            if (pin) { setStoredPin(pin); setPinState('locked'); }
            else      { setPinState('setup'); }
        })();
    }, []);

    // ── Load credentials once unlocked ─────────────────────────────────────────
    React.useEffect(() => {
        if (pinState === 'unlocked') {
            loadCredentials().then(setCredentials);
        }
    }, [pinState]);

    // ── PIN flow ───────────────────────────────────────────────────────────────
    function onSetupPin(pin: string) {
        setPendingPin(pin);
        setPinState('confirm');
    }
    async function onConfirmPin(pin: string) {
        await savePin(pin);
        setStoredPin(pin);
        setPinState('unlocked');
    }
    function onVerifyPin() {
        setPinState('unlocked');
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────
    async function handleSave(c: Credential) {
        const updated = credentials.some(x => x.id === c.id)
            ? credentials.map(x => x.id === c.id ? c : x)
            : [c, ...credentials];
        setCredentials(updated);
        await saveCredentials(updated);
        setFormVisible(false);
        setEditTarget(null);
    }

    function handleEdit(c: Credential) {
        setEditTarget(c);
        setFormVisible(true);
    }

    function handleDelete(c: Credential) {
        Alert.alert('Delete Credential', `Remove "${c.siteName}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                const updated = credentials.filter(x => x.id !== c.id);
                setCredentials(updated);
                await saveCredentials(updated);
            }},
        ]);
    }

    // ── Filter ────────────────────────────────────────────────────────────────
    const filtered = credentials.filter(c => {
        const q = search.toLowerCase();
        const matchSearch = !q || c.siteName.toLowerCase().includes(q) || c.username.toLowerCase().includes(q);
        const matchCat    = filterCat === 'All' || c.category === filterCat;
        return matchSearch && matchCat;
    });

    // ── PIN screens ────────────────────────────────────────────────────────────
    if (pinState === 'loading') {
        return (
            <GradientBackground>
                <View style={styles.center}>
                    <ActivityIndicator color={Colors.accent} size="large" />
                </View>
            </GradientBackground>
        );
    }

    if (pinState === 'setup') {
        return (
            <GradientBackground>
                <PinGate
                    mode="setup"
                    onSuccess={onSetupPin}
                    title="Create Your PIN"
                    subtitle="This PIN protects your saved passwords"
                />
            </GradientBackground>
        );
    }

    if (pinState === 'confirm') {
        return (
            <GradientBackground>
                <PinGate
                    mode="confirm"
                    setupPin={pendingPin}
                    onSuccess={onConfirmPin}
                    title="Confirm PIN"
                    subtitle="Re-enter the same 4-digit PIN"
                />
            </GradientBackground>
        );
    }

    if (pinState === 'locked') {
        return (
            <GradientBackground>
                <PinGate
                    mode="verify"
                    storedPin={storedPin ?? ''}
                    onSuccess={onVerifyPin}
                    title="Enter PIN"
                    subtitle="Unlock your password vault"
                />
            </GradientBackground>
        );
    }

    // ── Main vault UI ─────────────────────────────────────────────────────────
    return (
        <GradientBackground>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>🔐 Password Vault</Text>
                        <Text style={styles.headerSub}>{credentials.length} credential{credentials.length !== 1 ? 's' : ''} stored</Text>
                    </View>
                    <Pressable
                        onPress={() => { setEditTarget(null); setFormVisible(true); }}
                        style={styles.addBtn}
                    >
                        <Text style={styles.addBtnText}>＋ Add New</Text>
                    </Pressable>
                </View>

                {/* Stats row */}
                {credentials.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
                        {CATEGORIES.map(cat => {
                            const count = credentials.filter(c => c.category === cat).length;
                            if (!count) return null;
                            const color = CATEGORY_COLORS[cat];
                            return (
                                <Pressable key={cat} onPress={() => setFilterCat(cat)} style={[styles.statCard, { borderColor: color + '50' }]}>
                                    <Text style={styles.statIcon}>{CATEGORY_ICONS[cat]}</Text>
                                    <Text style={[styles.statCount, { color }]}>{count}</Text>
                                    <Text style={styles.statLabel}>{cat}</Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                )}

                {/* Search */}
                <View style={styles.searchRow}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        value={search}
                        onChangeText={setSearch}
                        placeholder="Search site or username…"
                        placeholderTextColor={Colors.text.muted}
                        autoCapitalize="none"
                    />
                    {search ? (
                        <Pressable onPress={() => setSearch('')}>
                            <Text style={styles.clearSearch}>✕</Text>
                        </Pressable>
                    ) : null}
                </View>

                {/* Category filter */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.catFilterRow}
                >
                    {(['All', ...CATEGORIES] as const).map(cat => {
                        const sel = filterCat === cat;
                        const color = cat === 'All' ? Colors.accent : CATEGORY_COLORS[cat];
                        return (
                            <Pressable
                                key={cat}
                                onPress={() => setFilterCat(cat)}
                                style={[styles.catFilter, sel && { backgroundColor: color + '25', borderColor: color }]}
                            >
                                {cat !== 'All' && <Text>{CATEGORY_ICONS[cat]}</Text>}
                                <Text style={[styles.catFilterLabel, sel && { color }]}>{cat}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                {/* Credential list */}
                <ScrollView
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {filtered.length === 0 ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyIcon}>🔑</Text>
                            <Text style={styles.emptyTitle}>
                                {credentials.length === 0 ? 'No passwords saved yet' : 'No results found'}
                            </Text>
                            <Text style={styles.emptySubtitle}>
                                {credentials.length === 0 ? 'Tap + Add to save your first credential' : 'Try a different search or category'}
                            </Text>
                        </View>
                    ) : (
                        filtered.map(c => (
                            <CredentialCard
                                key={c.id}
                                credential={c}
                                onEdit={() => handleEdit(c)}
                                onDelete={() => handleDelete(c)}
                            />
                        ))
                    )}
                </ScrollView>

                {/* Lock button */}
                <Pressable onPress={() => setPinState('locked')} style={styles.lockBtn}>
                    <Text style={styles.lockBtnText}>🔒 Lock Vault</Text>
                </Pressable>
            </View>

            <CredentialForm
                visible={formVisible}
                initial={editTarget}
                onSave={handleSave}
                onClose={() => { setFormVisible(false); setEditTarget(null); }}
            />
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1, paddingTop: Spacing.xl },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    },
    headerTitle: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '700' },
    headerSub: { color: Colors.text.muted, fontSize: FontSize.xs, marginTop: 2 },
    addBtn: {
        backgroundColor: Colors.accent, borderRadius: Radii.md,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    },
    addBtnText: { color: Colors.text.white, fontWeight: '700', fontSize: FontSize.sm },

    statsRow: { gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, paddingBottom: 2 },
    statCard: {
        alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        backgroundColor: Colors.card, borderRadius: Radii.lg,
        borderWidth: 1, minWidth: 68,
    },
    statIcon:  { fontSize: 18, marginBottom: 2 },
    statCount: { fontSize: FontSize.lg, fontWeight: '800' },
    statLabel: { color: Colors.text.muted, fontSize: FontSize.xs },

    searchRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.input,
        borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.inputBorder,
        marginHorizontal: Spacing.xl, marginBottom: Spacing.md,
        paddingHorizontal: Spacing.md,
    },
    searchIcon: { fontSize: 16, marginRight: Spacing.sm },
    searchInput: { flex: 1, paddingVertical: Spacing.md, color: Colors.text.primary, fontSize: FontSize.body },
    clearSearch: { color: Colors.text.muted, fontSize: FontSize.body, padding: 4 },

    catFilterRow: { gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md, paddingBottom: 2 },
    catFilter: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderRadius: Radii.xl, borderWidth: 1, borderColor: Colors.inputBorder,
    },
    catFilterLabel: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600' },

    list: { paddingHorizontal: Spacing.xl, paddingBottom: 80 },

    empty: { alignItems: 'center', paddingTop: 60 },
    emptyIcon: { fontSize: 48, marginBottom: Spacing.lg },
    emptyTitle: { color: Colors.text.primary, fontSize: FontSize.body, fontWeight: '600', marginBottom: Spacing.sm },
    emptySubtitle: { color: Colors.text.muted, fontSize: FontSize.sm, textAlign: 'center' },

    lockBtn: {
        position: 'absolute', bottom: 20, alignSelf: 'center',
        backgroundColor: Colors.card, borderRadius: Radii.xl,
        borderWidth: 1, borderColor: Colors.cardBorder,
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm,
    },
    lockBtnText: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600' },
});
