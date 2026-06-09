import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Colors, FontSize, Spacing, Radii } from '../../config/theme';
import { CATEGORY_ICONS, CATEGORY_COLORS, decodePassword } from '../../utils/vaultUtils';
import type { Credential } from '../../utils/vaultUtils';

type Props = {
    credential: Credential;
    onEdit: () => void;
    onDelete: () => void;
};

export default function CredentialCard({ credential, onEdit, onDelete }: Props) {
    const [expanded,    setExpanded]    = React.useState(false);
    const [showPass,    setShowPass]    = React.useState(false);
    const [copiedField, setCopiedField] = React.useState<'user' | 'pass' | null>(null);

    const color       = CATEGORY_COLORS[credential.category];
    const rawPassword = decodePassword(credential.password);

    async function copy(text: string, field: 'user' | 'pass') {
        await Clipboard.setStringAsync(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    }

    function confirmDelete() {
        Alert.alert('Delete', `Remove "${credential.siteName}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
        ]);
    }

    function toggle() {
        setExpanded(e => !e);
        if (expanded) setShowPass(false);
    }

    return (
        <View style={[styles.card, { borderLeftColor: color }]}>
            {/* ── Collapsed row (always visible) ── */}
            <Pressable onPress={toggle} style={styles.row}>
                <View style={[styles.iconCircle, { backgroundColor: color + '22' }]}>
                    <Text style={styles.iconText}>{CATEGORY_ICONS[credential.category]}</Text>
                </View>
                <View style={styles.rowInfo}>
                    <Text style={styles.siteName} numberOfLines={1}>{credential.siteName}</Text>
                    <Text style={styles.username} numberOfLines={1}>{credential.username}</Text>
                </View>
                <View style={[styles.catBadge, { backgroundColor: color + '18' }]}>
                    <Text style={[styles.catText, { color }]}>{credential.category}</Text>
                </View>
                <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
            </Pressable>

            {/* ── Expanded content ── */}
            {expanded && (
                <View style={styles.expanded}>
                    <View style={styles.divider} />

                    {/* Password field */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>🔑</Text>
                        <Text style={[styles.fieldVal, !showPass && styles.dots]} numberOfLines={1}>
                            {showPass ? rawPassword : '●'.repeat(Math.min(rawPassword.length, 14))}
                        </Text>
                        <Pressable onPress={() => setShowPass(v => !v)} style={styles.chip}>
                            <Text style={styles.chipText}>{showPass ? 'Hide' : 'Show'}</Text>
                        </Pressable>
                        <Pressable onPress={() => copy(rawPassword, 'pass')} style={styles.chip}>
                            <Text style={[styles.chipText, copiedField === 'pass' && { color: Colors.accent }]}>
                                {copiedField === 'pass' ? '✓' : '📋'}
                            </Text>
                        </Pressable>
                    </View>

                    {/* Username field */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>👤</Text>
                        <Text style={styles.fieldVal} numberOfLines={1}>{credential.username}</Text>
                        <Pressable onPress={() => copy(credential.username, 'user')} style={styles.chip}>
                            <Text style={[styles.chipText, copiedField === 'user' && { color: Colors.accent }]}>
                                {copiedField === 'user' ? '✓ Copied' : '📋 Copy'}
                            </Text>
                        </Pressable>
                    </View>

                    {/* Notes */}
                    {credential.notes ? (
                        <Text style={styles.notes} numberOfLines={2}>📝 {credential.notes}</Text>
                    ) : null}

                    {/* Actions */}
                    <View style={styles.actions}>
                        <Pressable onPress={onEdit} style={[styles.actionBtn, { borderColor: color }]}>
                            <Text style={[styles.actionText, { color }]}>✏️ Edit</Text>
                        </Pressable>
                        <Pressable onPress={confirmDelete} style={[styles.actionBtn, { borderColor: Colors.error }]}>
                            <Text style={[styles.actionText, { color: Colors.error }]}>🗑 Delete</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        borderLeftWidth: 3,
        marginBottom: Spacing.sm,
        overflow: 'hidden',
    },

    // Collapsed row
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    iconCircle: {
        width: 34, height: 34, borderRadius: 17,
        alignItems: 'center', justifyContent: 'center',
    },
    iconText: { fontSize: 16 },
    rowInfo: { flex: 1 },
    siteName: { color: Colors.text.primary, fontSize: FontSize.sm, fontWeight: '700' },
    username: { color: Colors.text.muted, fontSize: FontSize.xs, marginTop: 1 },
    catBadge: { borderRadius: Radii.sm, paddingHorizontal: 6, paddingVertical: 2 },
    catText:  { fontSize: FontSize.xs, fontWeight: '600' },
    chevron:  { color: Colors.text.muted, fontSize: 10, marginLeft: 2 },

    // Expanded
    expanded: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
    divider:  { height: 1, backgroundColor: Colors.divider, marginBottom: Spacing.sm },

    fieldRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.input, borderRadius: Radii.md,
        paddingHorizontal: Spacing.sm, paddingVertical: 6,
        gap: Spacing.sm, marginBottom: Spacing.sm,
    },
    fieldLabel: { fontSize: 13, width: 20, textAlign: 'center' },
    fieldVal:   { flex: 1, color: Colors.text.primary, fontSize: FontSize.xs },
    dots:       { letterSpacing: 2, color: Colors.text.secondary },
    chip: {
        backgroundColor: Colors.surface, borderRadius: Radii.sm,
        paddingHorizontal: 6, paddingVertical: 2,
    },
    chipText: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600' },

    notes: { color: Colors.text.muted, fontSize: FontSize.xs, lineHeight: 16, marginBottom: Spacing.sm },

    actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: 2 },
    actionBtn: {
        flex: 1, borderWidth: 1, borderRadius: Radii.md,
        paddingVertical: 6, alignItems: 'center',
    },
    actionText: { fontSize: FontSize.xs, fontWeight: '700' },
});
