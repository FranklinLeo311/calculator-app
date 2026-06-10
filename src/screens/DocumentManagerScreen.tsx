import React from 'react';
import {
    View, Text, ScrollView, Pressable, Modal, Image,
    StyleSheet, Alert, ActivityIndicator, TextInput,
    FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
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

type AddState = { visible: boolean; name: string; docType: DocType };

export default function DocumentManagerScreen() {
    const [docs,      setDocs]      = React.useState<VaultDocument[]>([]);
    const [loading,   setLoading]   = React.useState(true);
    const [viewer,    setViewer]    = React.useState<VaultDocument | null>(null);
    const [addState,  setAddState]  = React.useState<AddState>({ visible: false, name: '', docType: 'Other' });
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

    // ── MIME → extension lookup ──────────────────────────────────────────────
    const MIME_EXT: Record<string, string> = {
        'application/pdf': 'pdf',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/vnd.ms-excel': 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.ms-powerpoint': 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        'text/plain': 'txt',
        'text/csv': 'csv',
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
    };

    // ── Pick any file (PDF, Excel, Word, etc.) ───────────────────────────────
    async function pickFromFiles() {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });
            // SDK 48 DocumentPicker returns { type: 'cancel' | 'success', uri, name, mimeType }
            const res = result as any;
            if (res.type === 'cancel') return;
            // Support both old API (res.uri) and new API (res.assets[0].uri)
            const asset = res.assets?.[0] ?? res;
            const base64Data = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64,
            });
            const sizeKb = Math.round((base64Data.length * 3) / 4 / 1024);
            if (sizeKb > 10240) {
                Alert.alert('File too large', 'Document must be under 10 MB.');
                return;
            }
            const mime = asset.mimeType ?? 'application/octet-stream';
            const base64Uri = `data:${mime};base64,${base64Data}`;
            const ext = MIME_EXT[mime] ?? mime.split('/')[1]?.split('.').pop() ?? 'bin';
            const autoName = addState.name.trim() || asset.name || `${addState.docType}.${ext}`;

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
        } catch (err: any) {
            Alert.alert('Error', err?.message ?? 'Could not pick file.');
        }
    }

    async function addDocument(asset: ImagePicker.ImagePickerAsset) {
        if (!asset.base64) { Alert.alert('Error', 'Could not read file.'); return; }
        const sizeKb = Math.round((asset.base64.length * 3) / 4 / 1024);
        if (sizeKb > 4096) {
            Alert.alert('File too large', 'Document must be under 4 MB.');
            return;
        }
        const mime = (asset as any).mimeType ?? 'image/jpeg';
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
            const ext        = MIME_EXT[doc.mimeType] ?? doc.mimeType.split('/')[1]?.split('.').pop() ?? 'bin';
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
            { text: '📂 Files', onPress: pickFromFiles },
            { text: 'Cancel', style: 'cancel' },
        ]);
    }

    const filtered = docs;

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
                        {viewer.mimeType.startsWith('image/') ? (
                            <Image
                                source={{ uri: viewer.base64 }}
                                style={styles.viewerImage}
                                resizeMode="contain"
                            />
                        ) : (
                            <View style={styles.viewerFileIcon}>
                                <Text style={styles.viewerFileEmoji}>
                                    {viewer.mimeType.includes('pdf') ? '📄'
                                        : viewer.mimeType.includes('sheet') || viewer.mimeType.includes('excel') || viewer.mimeType.includes('csv') ? '📊'
                                        : viewer.mimeType.includes('word') || viewer.mimeType.includes('document') ? '📝'
                                        : '📁'}
                                </Text>
                                <Text style={styles.viewerFileName}>{viewer.name}</Text>
                                <Text style={styles.viewerFileMime}>{viewer.mimeType}</Text>
                                <Pressable onPress={() => shareDocument(viewer)} style={styles.viewerOpenBtn}>
                                    <Text style={styles.viewerOpenBtnText}>Open / Share</Text>
                                </Pressable>
                            </View>
                        )}
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

                {/* Document list */}
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
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <DocumentCard
                                doc={item}
                                onView={() => setViewer(item)}
                                onShare={() => shareDocument(item)}
                                onDelete={() => deleteDocument(item)}
                            />
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
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeChipRow}>
                            {DOC_TYPES.map(t => {
                                const sel   = addState.docType === t;
                                const color = DOC_COLORS[t];
                                return (
                                    <Pressable
                                        key={t}
                                        onPress={() => setAddState(a => ({ ...a, docType: t, name: a.name || t }))}
                                        style={[styles.typeChip, sel && { backgroundColor: color + '25', borderColor: color }]}
                                    >
                                        <Text style={styles.typeChipIcon}>{DOC_ICONS[t]}</Text>
                                        <Text style={[styles.typeChipLabel, sel && { color }]}>{t}</Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>

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

                        <Pressable
                            onPress={async () => { await pickFromFiles(); }}
                            style={[styles.sourceBtn, styles.sourceBtnFull, { borderColor: Colors.chart.green }]}
                        >
                            <Text style={styles.sourceBtnIcon}>📂</Text>
                            <Text style={[styles.sourceBtnLabel, { color: Colors.chart.green }]}>Files</Text>
                            <Text style={styles.sourceBtnSub}>PDF, Excel, Word, and more</Text>
                        </Pressable>

                        <Text style={styles.hint}>
                            💡 Images: max 4 MB · Files: max 10 MB · Stored securely on your device
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

    list: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },

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
    viewerFileIcon: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
    viewerFileEmoji: { fontSize: 80 },
    viewerFileName: { color: Colors.text.primary, fontSize: FontSize.body, fontWeight: '700', textAlign: 'center', paddingHorizontal: Spacing.xl },
    viewerFileMime: { color: Colors.text.muted, fontSize: FontSize.xs },
    viewerOpenBtn: {
        marginTop: Spacing.md, backgroundColor: Colors.chart.blue,
        borderRadius: Radii.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    },
    viewerOpenBtnText: { color: Colors.text.white, fontWeight: '700', fontSize: FontSize.body },
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
    typeChipRow: { gap: Spacing.sm, paddingBottom: 2 },
    typeChip: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
        borderRadius: Radii.xl, borderWidth: 1, borderColor: Colors.inputBorder,
    },
    typeChipIcon: { fontSize: 14 },
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
    sourceBtnFull: {
        flex: 0, flexDirection: 'row', gap: Spacing.md,
        marginTop: Spacing.md, justifyContent: 'center',
    },
    sourceBtnIcon: { fontSize: 36, marginBottom: Spacing.sm },
    sourceBtnLabel: { fontSize: FontSize.body, fontWeight: '700', marginBottom: 4 },
    sourceBtnSub: { color: Colors.text.muted, fontSize: FontSize.xs },

    hint: { color: Colors.text.muted, fontSize: FontSize.xs, textAlign: 'center', marginTop: Spacing.xl, lineHeight: 18 },
});
