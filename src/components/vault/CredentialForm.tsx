import React from 'react';
import {
    Modal, View, Text, TextInput, Pressable, ScrollView,
    StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Colors, FontSize, Spacing, Radii } from '../../config/theme';
import {
    CATEGORIES, CATEGORY_ICONS, CATEGORY_COLORS,
    encodePassword, decodePassword, genId,
} from '../../utils/vaultUtils';
import type { Category, Credential } from '../../utils/vaultUtils';

type Props = {
    visible: boolean;
    initial?: Credential | null;
    onSave: (c: Credential) => void;
    onClose: () => void;
};

const EMPTY: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'> = {
    category: 'Other',
    siteName: '',
    siteUrl: '',
    username: '',
    password: '',
    notes: '',
};

export default function CredentialForm({ visible, initial, onSave, onClose }: Props) {
    const [form,     setForm]     = React.useState({ ...EMPTY });
    const [showPass, setShowPass] = React.useState(false);
    const [errors,   setErrors]   = React.useState<Record<string, string>>({});

    React.useEffect(() => {
        if (visible) {
            setShowPass(false);
            setErrors({});
            if (initial) {
                setForm({
                    category: initial.category,
                    siteName: initial.siteName,
                    siteUrl:  initial.siteUrl,
                    username: initial.username,
                    password: decodePassword(initial.password),
                    notes:    initial.notes,
                });
            } else {
                setForm({ ...EMPTY });
            }
        }
    }, [visible, initial]);

    function set(field: string, value: string) {
        setForm(f => ({ ...f, [field]: value }));
        setErrors(e => ({ ...e, [field]: '' }));
    }

    function validate(): boolean {
        const e: Record<string, string> = {};
        if (!form.siteName.trim()) e.siteName = 'Site name is required';
        if (!form.username.trim()) e.username  = 'Username is required';
        if (!form.password.trim()) e.password  = 'Password is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    function handleSave() {
        if (!validate()) return;
        const now = Date.now();
        const credential: Credential = {
            id:        initial?.id ?? genId(),
            category:  form.category as Category,
            siteName:  form.siteName.trim(),
            siteUrl:   form.siteUrl.trim(),
            username:  form.username.trim(),
            password:  encodePassword(form.password),
            notes:     form.notes.trim(),
            createdAt: initial?.createdAt ?? now,
            updatedAt: now,
        };
        onSave(credential);
    }

    const accentColor = CATEGORY_COLORS[form.category as Category];

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.container}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Pressable onPress={onClose} style={styles.cancelBtn}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                        <Text style={styles.title}>{initial ? 'Edit Credential' : 'New Credential'}</Text>
                        <Pressable onPress={handleSave} style={[styles.saveBtn, { backgroundColor: accentColor }]}>
                            <Text style={styles.saveText}>Save</Text>
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                        {/* Category picker */}
                        <Text style={styles.label}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                            {CATEGORIES.map(cat => {
                                const c = CATEGORY_COLORS[cat];
                                const sel = form.category === cat;
                                return (
                                    <Pressable
                                        key={cat}
                                        onPress={() => set('category', cat)}
                                        style={[styles.catChip, sel && { backgroundColor: c + '25', borderColor: c }]}
                                    >
                                        <Text style={styles.catIcon}>{CATEGORY_ICONS[cat]}</Text>
                                        <Text style={[styles.catLabel, sel && { color: c }]}>{cat}</Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

                        <Field label="Site / App Name" value={form.siteName} onChangeText={v => set('siteName', v)}
                            placeholder="e.g. Gmail" error={errors.siteName} />
                        <Field label="Website URL (optional)" value={form.siteUrl} onChangeText={v => set('siteUrl', v)}
                            placeholder="https://mail.google.com" keyboardType="url" />
                        <Field label="Username / Email" value={form.username} onChangeText={v => set('username', v)}
                            placeholder="you@example.com" autoCapitalize="none" error={errors.username} />

                        {/* Password with show/hide */}
                        <Text style={styles.label}>Password</Text>
                        <View style={[styles.passRow, errors.password && { borderColor: Colors.error }]}>
                            <TextInput
                                style={styles.passInput}
                                value={form.password}
                                onChangeText={v => set('password', v)}
                                placeholder="Enter password"
                                placeholderTextColor={Colors.text.muted}
                                secureTextEntry={!showPass}
                                autoCapitalize="none"
                            />
                            <Pressable onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                                <Text style={styles.eyeIcon}>{showPass ? '🙈' : '👁'}</Text>
                            </Pressable>
                        </View>
                        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

                        <Field label="Notes (optional)" value={form.notes} onChangeText={v => set('notes', v)}
                            placeholder="Any extra info…" multiline numberOfLines={3} />
                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

type FieldProps = {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    error?: string;
    keyboardType?: any;
    autoCapitalize?: any;
    multiline?: boolean;
    numberOfLines?: number;
};

function Field({ label, value, onChangeText, placeholder, error, keyboardType, autoCapitalize, multiline, numberOfLines }: FieldProps) {
    return (
        <View style={{ marginBottom: Spacing.lg }}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[styles.input, multiline && styles.inputMulti, error && { borderColor: Colors.error }]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={Colors.text.muted}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize ?? 'sentences'}
                multiline={multiline}
                numberOfLines={numberOfLines}
                textAlignVertical={multiline ? 'top' : 'center'}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.divider,
    },
    cancelBtn: { padding: 4 },
    cancelText: { color: Colors.text.muted, fontSize: FontSize.body },
    title: { color: Colors.text.primary, fontSize: FontSize.body, fontWeight: '700' },
    saveBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radii.md },
    saveText: { color: Colors.text.white, fontSize: FontSize.sm, fontWeight: '700' },
    content: { padding: Spacing.xl, paddingBottom: 60 },

    label: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
    input: {
        backgroundColor: Colors.input, borderRadius: Radii.md,
        borderWidth: 1, borderColor: Colors.inputBorder,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        color: Colors.text.primary, fontSize: FontSize.body,
    },
    inputMulti: { minHeight: 80, paddingTop: Spacing.md },
    errorText: { color: Colors.error, fontSize: FontSize.xs, marginTop: 4 },

    categoryRow: { gap: Spacing.sm, marginBottom: Spacing.xl, paddingBottom: 2 },
    catChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderRadius: Radii.xl, borderWidth: 1, borderColor: Colors.inputBorder,
    },
    catIcon: { fontSize: 14 },
    catLabel: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600' },

    passRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.input, borderRadius: Radii.md,
        borderWidth: 1, borderColor: Colors.inputBorder,
        marginBottom: Spacing.lg,
    },
    passInput: { flex: 1, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, color: Colors.text.primary, fontSize: FontSize.body },
    eyeBtn: { padding: Spacing.md },
    eyeIcon: { fontSize: 18 },
});
