import React from 'react';
import { View, Text, Pressable, StyleSheet, Image, Alert } from 'react-native';
import { Colors, FontSize, Spacing, Radii } from '../../config/theme';
import { DOC_ICONS, DOC_COLORS } from '../../utils/vaultUtils';
import type { VaultDocument } from '../../utils/vaultUtils';

type Props = {
    doc: VaultDocument;
    onView: () => void;
    onShare: () => void;
    onDelete: () => void;
};

export default function DocumentCard({ doc, onView, onShare, onDelete }: Props) {
    const [expanded, setExpanded] = React.useState(false);

    const color   = DOC_COLORS[doc.docType];
    const isImage = doc.mimeType.startsWith('image/');

    const addedDate = new Date(doc.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
    });

    function confirmDelete() {
        Alert.alert('Delete', `Remove "${doc.name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
        ]);
    }

    return (
        <View style={[styles.card, { borderLeftColor: color }]}>
            {/* ── Collapsed row (always visible) ── */}
            <Pressable onPress={() => setExpanded(e => !e)} style={styles.row}>
                {/* Thumbnail */}
                <View style={[styles.thumb, { backgroundColor: color + '20' }]}>
                    {isImage ? (
                        <Image source={{ uri: doc.base64 }} style={styles.thumbImg} resizeMode="cover" />
                    ) : (
                        <Text style={styles.thumbIcon}>{DOC_ICONS[doc.docType]}</Text>
                    )}
                </View>

                {/* Info */}
                <View style={styles.rowInfo}>
                    <View style={[styles.typeBadge, { backgroundColor: color + '18' }]}>
                        <Text style={[styles.typeText, { color }]}>{doc.docType}</Text>
                    </View>
                    <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                    <Text style={styles.docMeta}>{doc.sizeKb} KB</Text>
                </View>

                <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
            </Pressable>

            {/* ── Expanded content ── */}
            {expanded && (
                <View style={styles.expanded}>
                    <View style={styles.divider} />

                    <Text style={styles.metaLine}>📅 Added {addedDate}</Text>
                    <Text style={styles.metaLine}>📦 Size: {doc.sizeKb} KB · {doc.mimeType}</Text>

                    <View style={styles.actions}>
                        <Pressable onPress={onView} style={[styles.actionBtn, { backgroundColor: color + '18', borderColor: color }]}>
                            <Text style={[styles.actionText, { color }]}>👁 View</Text>
                        </Pressable>
                        <Pressable onPress={onShare} style={[styles.actionBtn, { backgroundColor: Colors.chart.green + '18', borderColor: Colors.chart.green }]}>
                            <Text style={[styles.actionText, { color: Colors.chart.green }]}>⬇️ Save</Text>
                        </Pressable>
                        <Pressable onPress={confirmDelete} style={[styles.actionBtn, { backgroundColor: Colors.errorSoft, borderColor: Colors.error }]}>
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
        gap: Spacing.md,
    },
    thumb: {
        width: 44, height: 44,
        borderRadius: Radii.md,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    thumbImg:  { width: '100%', height: '100%' },
    thumbIcon: { fontSize: 22 },

    rowInfo:  { flex: 1 },
    typeBadge: {
        alignSelf: 'flex-start',
        borderRadius: Radii.sm,
        paddingHorizontal: 5, paddingVertical: 1,
        marginBottom: 2,
    },
    typeText: { fontSize: FontSize.xs, fontWeight: '700' },
    docName:  { color: Colors.text.primary, fontSize: FontSize.sm, fontWeight: '600' },
    docMeta:  { color: Colors.text.muted, fontSize: FontSize.xs, marginTop: 1 },
    chevron:  { color: Colors.text.muted, fontSize: 10 },

    // Expanded
    expanded: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
    divider:  { height: 1, backgroundColor: Colors.divider, marginBottom: Spacing.sm },
    metaLine: { color: Colors.text.muted, fontSize: FontSize.xs, marginBottom: 4 },

    actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
    actionBtn: {
        flex: 1, borderWidth: 1, borderRadius: Radii.md,
        paddingVertical: 6, alignItems: 'center',
    },
    actionText: { fontSize: FontSize.xs, fontWeight: '700' },
});
