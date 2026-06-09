import React from 'react';
import {
    View, Text, ScrollView, Pressable, Modal, Image,
    StyleSheet, Alert, ActivityIndicator, TextInput,
    FlatList, Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import GradientBackground from '../components/GradientBackground';
import DocumentCard from '../components/vault/DocumentCard';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';
import {
    loadDocuments, saveDocuments, genId,
    DOC_TYPES, DOC_ICONS, DOC_COLORS,
} from '../utils/vaultUtils';
import type { VaultDocument, DocType } from '../utils/vaultUtils';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - Spacing.xl * 2 - Spacing.md) / 2;

type AddState = { visible: boolean; name: string; docType: DocType };

export default function DocumentManagerScreen() {
    const [docs,      setDocs]      = React.useState<VaultDocument[]>([]);
    const [loading,   setLoading]   = React.useState(true);
    const [viewer,    setViewer]    = React.useState<VaultDocument | null>(null);
    const [addState,  setAddState]  = React.useState<AddState>({ visible: false, name: '', docType: 'Other' });
    const [filterType, setFilterType] = React.useState<DocType | 'All'>('All');
    const [picking,   setPicking]   = React.useState(false);

    React.useEffect(() => {
        loadDocuments().then(d => { setDocs(d); setLoading(false); });
    }, []);

    // ── Pick from gallery ────────────────────────────────────────────────────
    async function pickFromGallery() {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow gallery access to upload documents.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            base64: true,
            quality: 0.65,
            allowsEditing: false,
        });
        if (!result.canceled && result.assets[0]) {
            await addDocument(result.assets[0]);
        }
    }

    // ── Pick from camera ─────────────────────────────────────────────────────
    async function pickFromCamera() {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Allow camera access to capture documents.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({
            base64: true,
            quality: 0.65,
        });
        if (!result.canceled && result.assets[0]) {
            await addDocument(result.assets[0]);
        }
    }

    async function addDocument(asset: ImagePicker.ImagePickerAsset) {
        if (!asset.base64) { Alert.alert('Error', 'Could not read file.'); return; }
        const sizeKb = Math.round((asset.base64.length * 3) / 4 / 1024);
        if (sizeKb > 4096) {
            Alert.alert('File too large', 'Document must be under 4 MB.');
            return;
        }
        const ext  = asset.mimeType?.split('/')[1] ?? 'jpeg';
        const mime = asset.mimeType ?? 'image/jpeg';
        const base64Uri = `data:${mime};base64,${asset.base64}`;
        const autoName  = addState.name.trim() || addState.docType;

        const doc: VaultDocument = {
            id:        genId(),
            name:      autoName,
            docType:   addState.docType,
            base64:    base64Uri,
            mimeType:  mime,
            sizeKb,
            createdAt: Date.now(),
        };

        const updated = [doc, ...docs];
        setDocs(updated);
        await saveDocuments(updated);
        setAddState({ visible: false, name: '', docType: 'Other' });
    }

    // ── Share / download ─────────────────────────────────────────────────────
    async function shareDocument(doc: VaultDocument) {
        try {
            const base64Data = doc.base64.split(',')[1];
            const ext        = doc.mimeType.split('/')[1] ?? 'jpg';
            const path       = `${FileSystem.cacheDirectory}${doc.name.replace(/\s/g, '_')}.${ext}`;
            await FileSystem.writeAsStringAsync(path, base64Data, { encoding: FileSystem.EncodingType.Base64 });
            await Sharing.shareAsync(path, { mimeType: doc.mimeType });
        } catch {
            Alert.alert('Error', 'Could not share the document.');
        }
    }

    // ── Delete ───────────────────────────────────────────────────────────────
    async function deleteDocument(doc: VaultDocument) {
        const updated = docs.filter(d => d.id !== doc.id);
        setDocs(updated);
        await saveDocuments(updated);
        if (viewer?.id === doc.id) setViewer(null);
    }

    // ── Source picker alert ──────────────────────────────────────────────────
    function showAddSheet() {
        Alert.alert('Add Document', 'Choose source', [
            { text: '📷 Camera',  onPress: () => { setAddState(a => ({ ...a, visible: true })); setPicking('camera' as any); } },
            { text: '🖼 Gallery', onPress: () => { setAddState(a => ({ ...a, visible: true })); setPicking('gallery' as any); } },
            { text: 'Cancel', style: 'cancel' },
        ]);
    }

    const filtered = docs.filter(d => filterType === 'All' || d.docType === filterType);

    // ── Full-screen viewer ───────────────────────────────────────────────────
    if (viewer) {
        return (
            <GradientBackground>
                <View style={styles.viewerContainer}>
                    <View style={styles.viewerHeader}>
                        <Pressable onPress={() => setViewer(null)} style={styles.viewerBack}>
                            <Text style={styles.viewerBackText}>‹ Back</Text>
                        </Pressable>
                        <Text style={styles.viewerTitle} numberOfLines={1}>{viewer.name}</Text>
                        <Pressable onPress={() => shareDocument(viewer)} style={styles.viewerShare}>
                            <Text style={styles.viewerShareText}>⬇️ Save</Text>
                        </Pressable>
                    </View>
                    <View style={styles.viewerImageArea}>
                        <Image
                            source={{ uri: viewer.base64 }}
                            style={styles.viewerImage}
                            resizeMode="contain"
                        />
                    </View>
                    <View style={styles.viewerMeta}>
                        <Text style={styles.viewerMetaText}>
                            {DOC_ICONS[viewer.docType]} {viewer.docType} · {viewer.sizeKb} KB
                        </Text>
                        <Text style={styles.viewerMetaText}>
                            Added {new Date(viewer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </Text>
                    </View>
                </View>
            </GradientBackground>
        );
    }

    return (
        <GradientBackground>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>📁 My Documents</Text>
                        <Text style={styles.headerSub}>{docs.length} document{docs.length !== 1 ? 's' : ''} stored</Text>
                    </View>
                    <Pressable onPress={showAddSheet} style={styles.addBtn}>
                        <Text style={styles.addBtnText}>＋ Add</Text>
                    </Pressable>
                </View>

                {/* Type filter */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterRow}
                >
                    {(['All', ...DOC_TYPES] as const).map(t => {
                        const sel   = filterType === t;
                        const color = t === 'All' ? Colors.chart.blue : DOC_COLORS[t];
                        return (
                            <Pressable
                                key={t}
                                onPress={() => setFilterType(t)}
                                style={[styles.filterChip, sel && { backgroundColor: color + '25', borderColor: color }]}
                            >
                                {t !== 'All' && <Text style={styles.filterIcon}>{DOC_ICONS[t]}</Text>}
                                <Text style={[styles.filterLabel, sel && { color }]}>{t}</Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                {/* Document grid */}
                {loading ? (
                    <View style={styles.center}><ActivityIndicator color={Colors.chart.blue} size="large" /></View>
                ) : filtered.length === 0 ? (
                    <View style={styles.empty}>
                        <Text style={styles.emptyIcon}>📂</Text>
                        <Text style={styles.emptyTitle}>
                            {docs.length === 0 ? 'No documents yet' : 'No documents here'}
                        </Text>
                        <Text style={styles.emptySubtitle}>
                            {docs.length === 0
                                ? 'Tap + Add to upload your first document'
                                : 'Try a different document type filter'}
                        </Text>
                        {docs.length === 0 && (
                            <Pressable onPress={showAddSheet} style={styles.emptyAddBtn}>
                                <Text style={styles.emptyAddText}>＋ Upload Document</Text>
                            </Pressable>
                        )}
                    </View>
                ) : (
                    <FlatList
                        data={filtered}
                        keyExtractor={d => d.id}
                        numColumns={2}
                        contentContainerStyle={styles.grid}
                        columnWrapperStyle={styles.gridRow}
                        renderItem={({ item }) => (
                            <View style={{ width: CARD_W }}>
                                <DocumentCard
                                    doc={item}
                                    onView={() => setViewer(item)}
                                    onShare={() => shareDocument(item)}
                                    onDelete={() => deleteDocument(item)}
                                />
                            </View>
                        )}
                    />
                )}
            </View>

            {/* Add document modal: choose type & name before picking */}
            <Modal
                visible={addState.visible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setAddState(a => ({ ...a, visible: false }))}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Pressable onPress={() => setAddState(a => ({ ...a, visible: false }))}>
                            <Text style={styles.modalCancel}>Cancel</Text>
                        </Pressable>
                        <Text style={styles.modalTitle}>Document Details</Text>
                        <View style={{ width: 60 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.modalContent}>
                        <Text style={styles.fieldLabel}>Document Type</Text>
                        <View style={styles.typeGrid}>
                            {DOC_TYPES.map(t => {
                                const sel   = addState.docType === t;
                                const color = DOC_COLORS[t];
                                return (
                                    <Pressable
                                        key={t}
                                        onPress={() => setAddState(a => ({
                                            ...a,
                                            docType: t,
                                            name: a.name || t,
                                        }))}
                                        style={[styles.typeChip, sel && { backgroundColor: color + '25', borderColor: color }]}
                                    >
                                        <Text style={styles.typeChipIcon}>{DOC_ICONS[t]}</Text>
                                        <Text style={[styles.typeChipLabel, sel && { color }]}>{t}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>Custom Name (optional)</Text>
                        <TextInput
                            style={styles.nameInput}
                            value={addState.name}
                            onChangeText={v => setAddState(a => ({ ...a, name: v }))}
                            placeholder={addState.docType}
                            placeholderTextColor={Colors.text.muted}
                        />

                        <Text style={styles.sourceSectionLabel}>Choose Source</Text>
                        <View style={styles.sourceRow}>
                            <Pressable
                                onPress={async () => { await pickFromCamera(); }}
                                style={[styles.sourceBtn, { borderColor: Colors.chart.amber }]}
                            >
                                <Text style={styles.sourceBtnIcon}>📷</Text>
                                <Text style={[styles.sourceBtnLabel, { color: Colors.chart.amber }]}>Camera</Text>
                                <Text style={styles.sourceBtnSub}>Capture now</Text>
                            </Pressable>
                            <Pressable
                                onPress={async () => { await pickFromGallery(); }}
                                style={[styles.sourceBtn, { borderColor: Colors.chart.blue }]}
                            >
                                <Text style={styles.sourceBtnIcon}>🖼</Text>
                                <Text style={[styles.sourceBtnLabel, { color: Colors.chart.blue }]}>Gallery</Text>
                                <Text style={styles.sourceBtnSub}>From photos</Text>
                            </Pressable>
                        </View>

                        <Text style={styles.hint}>
                            💡 Max file size: 4 MB · Stored securely on your device
                        </Text>
                    </ScrollView>
                </View>
            </Modal>
        </GradientBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: Spacing.xl },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    },
    headerTitle: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '700' },
    headerSub: { color: Colors.text.muted, fontSize: FontSize.xs, marginTop: 2 },
    addBtn: {
        backgroundColor: Colors.chart.blue, borderRadius: Radii.md,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
    },
    addBtnText: { color: Colors.text.white, fontWeight: '700', fontSize: FontSize.sm },

    filterRow: { gap: Spacing.sm, paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg, paddingBottom: 2 },
    filterChip: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderRadius: Radii.xl, borderWidth: 1, borderColor: Colors.inputBorder,
    },
    filterIcon: { fontSize: 13 },
    filterLabel: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600' },

    grid: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
    gridRow: { gap: Spacing.md, justifyContent: 'flex-start' },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    emptyIcon: { fontSize: 56, marginBottom: Spacing.lg },
    emptyTitle: { color: Colors.text.primary, fontSize: FontSize.body, fontWeight: '700', marginBottom: Spacing.sm },
    emptySubtitle: { color: Colors.text.muted, fontSize: FontSize.sm, textAlign: 'center', marginBottom: Spacing.xl },
    emptyAddBtn: {
        backgroundColor: Colors.chart.blue, borderRadius: Radii.lg,
        paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    },
    emptyAddText: { color: Colors.text.white, fontWeight: '700', fontSize: FontSize.body },

    // Viewer
    viewerContainer: { flex: 1 },
    viewerHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: Spacing.xl,
    },
    viewerBack: { padding: 4 },
    viewerBackText: { color: Colors.chart.blue, fontSize: FontSize.body, fontWeight: '600' },
    viewerTitle: { flex: 1, color: Colors.text.primary, fontSize: FontSize.sm, fontWeight: '700', textAlign: 'center', marginHorizontal: Spacing.sm },
    viewerShare: { padding: 4 },
    viewerShareText: { color: Colors.chart.green, fontSize: FontSize.sm, fontWeight: '600' },
    viewerImageArea: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', margin: Spacing.md, borderRadius: Radii.xl },
    viewerImage: { flex: 1, borderRadius: Radii.xl },
    viewerMeta: { padding: Spacing.xl, gap: 4, alignItems: 'center' },
    viewerMetaText: { color: Colors.text.muted, fontSize: FontSize.sm },

    // Add modal
    modalContainer: { flex: 1, backgroundColor: Colors.background },
    modalHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.divider,
    },
    modalCancel: { color: Colors.text.muted, fontSize: FontSize.body },
    modalTitle: { color: Colors.text.primary, fontSize: FontSize.body, fontWeight: '700' },
    modalContent: { padding: Spacing.xl, paddingBottom: 60 },

    fieldLabel: {
        color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600',
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md,
    },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    typeChip: {
        alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.inputBorder, minWidth: 80,
    },
    typeChipIcon: { fontSize: 22, marginBottom: 4 },
    typeChipLabel: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600' },

    nameInput: {
        backgroundColor: Colors.input, borderRadius: Radii.md,
        borderWidth: 1, borderColor: Colors.inputBorder,
        paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        color: Colors.text.primary, fontSize: FontSize.body,
    },

    sourceSectionLabel: {
        color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600',
        textTransform: 'uppercase', letterSpacing: 0.8,
        marginTop: Spacing.xl, marginBottom: Spacing.md,
    },
    sourceRow: { flexDirection: 'row', gap: Spacing.md },
    sourceBtn: {
        flex: 1, alignItems: 'center', padding: Spacing.xl,
        backgroundColor: Colors.card, borderRadius: Radii.xl,
        borderWidth: 2,
    },
    sourceBtnIcon: { fontSize: 36, marginBottom: Spacing.sm },
    sourceBtnLabel: { fontSize: FontSize.body, fontWeight: '700', marginBottom: 4 },
    sourceBtnSub: { color: Colors.text.muted, fontSize: FontSize.xs },

    hint: { color: Colors.text.muted, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.xl, lineHeight: 18 },
});
