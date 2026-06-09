import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
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
    const [copiedField, setCopiedField] = React.useState<string | null>(null);

    const color = CATEGORY_COLORS[credential.category];

    async function copyText(text: string, field: string) {
        await Clipboard.setStringAsync(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    }

    const rawPassword = decodePassword(credential.password);

    return (
        <Pressable
            onPress={() => { setExpanded(e => !e); setShowPass(false); }}
            style={({ pressed }) => [styles.card, { borderLeftColor: color }, pressed && { opacity: 0.9 }]}
        >
            {/* Header row */}
            <View style={styles.header}>
                <View style={[styles.iconBadge, { backgroundColor: color + '25' }]}>
                    <Text style={styles.icon}>{CATEGORY_ICONS[credential.category]}</Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.siteName} numberOfLines={1}>{credential.siteName}</Text>
                    <Text style={styles.username} numberOfLines={1}>{credential.username}</Text>
                </View>
                <View style={[styles.categoryTag, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.categoryLabel, { color }]}>{credential.category}</Text>
                </View>
                <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
            </View>

            {/* Expanded content */}
            {expanded && (
                <View style={styles.expanded}>
                    <View style={styles.divider} />

                    {/* Password row */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>Password</Text>
                        <View style={styles.fieldRight}>
                            <Text style={styles.fieldValue} numberOfLines={1}>
                                {showPass ? rawPassword : '●'.repeat(Math.min(rawPassword.length, 12))}
                            </Text>
                            <Pressable onPress={() => setShowPass(v => !v)} style={styles.actionBtn}>
                                <Text style={styles.actionBtnText}>{showPass ? '🙈' : '👁'}</Text>
                            </Pressable>
                            <Pressable onPress={() => copyText(rawPassword, 'password')} style={styles.actionBtn}>
                                <Text style={styles.actionBtnText}>{copiedField === 'password' ? '✓' : '📋'}</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Username row */}
                    <View style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>Username</Text>
                        <View style={styles.fieldRight}>
                            <Text style={styles.fieldValue} numberOfLines={1}>{credential.username}</Text>
                            <Pressable onPress={() => copyText(credential.username, 'username')} style={styles.actionBtn}>
                                <Text style={styles.actionBtnText}>{copiedField === 'username' ? '✓' : '📋'}</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* URL row */}
                    {credential.siteUrl ? (
                        <View style={styles.fieldRow}>
                            <Text style={styles.fieldLabel}>URL</Text>
                            <Text style={[styles.fieldValue, styles.url]} numberOfLines={1}>{credential.siteUrl}</Text>
                        </View>
                    ) : null}

                    {/* Notes */}
                    {credential.notes ? (
                        <View style={styles.notesRow}>
                            <Text style={styles.fieldLabel}>Notes</Text>
                            <Text style={styles.notesText}>{credential.notes}</Text>
                        </View>
                    ) : null}

                    {/* Actions */}
                    <View style={styles.actionsRow}>
                        <Pressable onPress={onEdit} style={[styles.btn, { backgroundColor: color + '20', borderColor: color }]}>
                            <Text style={[styles.btnText, { color }]}>✏️ Edit</Text>
                        </Pressable>
                        <Pressable onPress={onDelete} style={[styles.btn, { backgroundColor: Colors.errorSoft, borderColor: Colors.error }]}>
                            <Text style={[styles.btnText, { color: Colors.error }]}>🗑 Delete</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        borderLeftWidth: 4,
        marginBottom: Spacing.md,
        overflow: 'hidden',
    },
    header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
    iconBadge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    icon: { fontSize: 20 },
    info: { flex: 1 },
    siteName: { color: Colors.text.primary, fontSize: FontSize.sm, fontWeight: '700' },
    username: { color: Colors.text.muted, fontSize: FontSize.xs, marginTop: 2 },
    categoryTag: { borderRadius: Radii.sm, paddingHorizontal: 8, paddingVertical: 3 },
    categoryLabel: { fontSize: FontSize.xs, fontWeight: '600' },
    chevron: { color: Colors.text.muted, fontSize: FontSize.xs, marginLeft: 4 },

    expanded: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
    divider: { height: 1, backgroundColor: Colors.divider, marginBottom: Spacing.md },

    fieldRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
    fieldLabel: { color: Colors.text.muted, fontSize: FontSize.xs, width: 72 },
    fieldRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    fieldValue: { flex: 1, color: Colors.text.primary, fontSize: FontSize.sm, fontFamily: 'monospace' },
    url: { color: Colors.chart.blue },
    actionBtn: { padding: 4 },
    actionBtnText: { fontSize: 16 },

    notesRow: { marginBottom: Spacing.md },
    notesText: { color: Colors.text.secondary, fontSize: FontSize.xs, lineHeight: 18, marginTop: 4 },

    actionsRow: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
    btn: {
        flex: 1, paddingVertical: Spacing.sm,
        borderRadius: Radii.md, borderWidth: 1,
        alignItems: 'center',
    },
    btnText: { fontSize: FontSize.sm, fontWeight: '600' },
});
