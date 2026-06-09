import React from 'react';
import {
    View,
    Text,
    ScrollView,
    Pressable,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import InputField from '../../components/InputField';
import ResultCard from '../../components/ResultCard';
import type { ResultRow } from '../../components/ResultCard';
import { Colors, FontSize, Spacing, Radii } from '../../config/theme';

type Props = { onBack: () => void };
type Mode = 'exclusive' | 'inclusive';

const GST_RATES = [5, 12, 18, 28];

function fmt(n: number): string {
    return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
}

export default function GSTScreen({ onBack }: Props) {
    const [amount, setAmount] = React.useState('');
    const [gstRate, setGstRate] = React.useState(18);
    const [mode, setMode] = React.useState<Mode>('exclusive');

    const result = React.useMemo(() => {
        const a = parseFloat(amount);
        if (!amount || isNaN(a) || a <= 0) return null;

        if (mode === 'exclusive') {
            const gstAmt = a * (gstRate / 100);
            return { base: a, gst: gstAmt, total: a + gstAmt };
        } else {
            const base   = a / (1 + gstRate / 100);
            const gstAmt = a - base;
            return { base, gst: gstAmt, total: a };
        }
    }, [amount, gstRate, mode]);

    const rows: ResultRow[] = result ? [
        { label: 'Base Amount',   value: fmt(result.base) },
        { label: `CGST (${gstRate / 2}%)`,  value: fmt(result.gst / 2) },
        { label: `SGST (${gstRate / 2}%)`,  value: fmt(result.gst / 2) },
        { label: `Total GST (${gstRate}%)`, value: fmt(result.gst), color: Colors.error },
        { label: 'Total Amount',  value: fmt(result.total), highlight: true, color: Colors.tool.gst },
    ] : [];

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.backRow}>
                    <Pressable onPress={onBack} style={styles.backBtn}>
                        <Text style={styles.backText}>‹ Back</Text>
                    </Pressable>
                </View>
                <Text style={styles.title}>GST Calculator</Text>
                <Text style={styles.subtitle}>Indian Goods & Services Tax</Text>

                {/* Mode toggle */}
                <Text style={styles.sectionLabel}>Amount Type</Text>
                <View style={styles.modeRow}>
                    {(['exclusive', 'inclusive'] as Mode[]).map(m => (
                        <Pressable
                            key={m}
                            onPress={() => setMode(m)}
                            style={[
                                styles.modeBtn,
                                mode === m && { backgroundColor: Colors.tool.gst + '25', borderColor: Colors.tool.gst },
                            ]}
                        >
                            <Text style={[styles.modeBtnText, mode === m && { color: Colors.tool.gst }]}>
                                {m === 'exclusive' ? 'Ex-GST' : 'Inc-GST'}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <InputField
                    label="Amount (₹)"
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="Enter amount"
                />

                {/* GST rate selector */}
                <Text style={styles.sectionLabel}>GST Rate</Text>
                <View style={styles.rateRow}>
                    {GST_RATES.map(r => (
                        <Pressable
                            key={r}
                            onPress={() => setGstRate(r)}
                            style={[
                                styles.rateBtn,
                                gstRate === r && { backgroundColor: Colors.tool.gst + '25', borderColor: Colors.tool.gst },
                            ]}
                        >
                            <Text style={[styles.rateBtnText, gstRate === r && { color: Colors.tool.gst }]}>
                                {r}%
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {result && (
                    <ResultCard title="GST Breakdown" rows={rows} accentColor={Colors.tool.gst} />
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    content: { padding: Spacing.xl, paddingBottom: 40 },
    backRow: { marginBottom: Spacing.lg },
    backBtn: { alignSelf: 'flex-start' },
    backText: { color: Colors.tool.gst, fontSize: FontSize.body, fontWeight: '600' },
    title: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.xs },
    subtitle: { color: Colors.text.muted, fontSize: FontSize.xs, marginBottom: Spacing.xl },
    sectionLabel: {
        color: Colors.text.secondary,
        fontSize: FontSize.xs,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: Spacing.sm,
    },
    modeRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    modeBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        alignItems: 'center',
    },
    modeBtnText: {
        color: Colors.text.secondary,
        fontSize: FontSize.sm,
        fontWeight: '600',
    },
    rateRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    rateBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        alignItems: 'center',
    },
    rateBtnText: {
        color: Colors.text.secondary,
        fontSize: FontSize.body,
        fontWeight: '700',
    },
});
