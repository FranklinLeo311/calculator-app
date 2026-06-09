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
    const color = DOC_COLORS[doc.docType];
    const isImage = doc.mimeType.startsWith('image/');

    function confirmDelete() {
        Alert.alert(
            'Delete Document',
            `Remove "${doc.name}" permanently?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: onDelete },
            ]
        );
    }

    return (
        <View style={[styles.card, { borderTopColor: color }]}>
            {/* Thumbnail */}
            <Pressable onPress={onView} style={styles.thumbArea}>
                {isImage ? (
                    <Image source={{ uri: doc.base64 }} style={styles.thumb} resizeMode="cover" />
                ) : (
                    <View style={[styles.thumbPlaceholder, { backgroundColor: color + '20' }]}>
                        <Text style={styles.docIcon}>{DOC_ICONS[doc.docType]}</Text>
                    </View>
                )}
                <View style={[styles.typeBadge, { backgroundColor: color }]}>
                    <Text style={styles.typeBadgeText}>{doc.docType}</Text>
                </View>
            </Pressable>

            {/* Info */}
            <View style={styles.info}>
                <Text style={styles.docName} numberOfLines={2}>{doc.name}</Text>
                <Text style={styles.docMeta}>{doc.sizeKb} KB · {new Date(doc.createdAt).toLocaleDateString('en-IN')}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
                <Pressable onPress={onView}  style={styles.actionBtn}><Text style={styles.actionIcon}>👁</Text></Pressable>
                <Pressable onPress={onShare} style={styles.actionBtn}><Text style={styles.actionIcon}>⬇️</Text></Pressable>
                <Pressable onPress={confirmDelete} style={[styles.actionBtn, styles.deleteBtn]}>
                    <Text style={styles.actionIcon}>🗑</Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        borderTopWidth: 3,
        marginBottom: Spacing.md,
        overflow: 'hidden',
    },
    thumbArea: { width: '100%', height: 140, position: 'relative' },
    thumb: { width: '100%', height: '100%' },
    thumbPlaceholder: {
        width: '100%', height: '100%',
        alignItems: 'center', justifyContent: 'center',
    },
    docIcon: { fontSize: 48 },
    typeBadge: {
        position: 'absolute', bottom: 8, left: 8,
        borderRadius: Radii.sm,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    typeBadgeText: { color: Colors.text.white, fontSize: FontSize.xs, fontWeight: '700' },
    info: { padding: Spacing.md },
    docName: { color: Colors.text.primary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 4 },
    docMeta: { color: Colors.text.muted, fontSize: FontSize.xs },
    actions: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: Colors.divider,
    },
    actionBtn: {
        flex: 1, alignItems: 'center', paddingVertical: Spacing.md,
        borderRightWidth: 1, borderRightColor: Colors.divider,
    },
    deleteBtn: { borderRightWidth: 0 },
    actionIcon: { fontSize: 18 },
});
