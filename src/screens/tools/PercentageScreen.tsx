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
type Mode = 'xPercentOfY' | 'xIsWhatPctOfY' | 'percentChange';

const MODES: { id: Mode; label: string }[] = [
    { id: 'xPercentOfY',   label: 'X% of Y' },
    { id: 'xIsWhatPctOfY', label: 'X is what % of Y' },
    { id: 'percentChange', label: '% Change' },
];

function fmt(n: number): string {
    return n.toLocaleString('en-IN', { maximumFractionDigits: 4 });
}

export default function PercentageScreen({ onBack }: Props) {
    const [mode, setMode] = React.useState<Mode>('xPercentOfY');
    const [a, setA] = React.useState('');
    const [b, setB] = React.useState('');

    const result = React.useMemo(() => {
        const va = parseFloat(a);
        const vb = parseFloat(b);
        if (isNaN(va) || isNaN(vb)) return null;

        try {
            if (mode === 'xPercentOfY') {
                // va% of vb
                const res = (va / 100) * vb;
                return [
                    { label: `${va}% of ${vb}`, value: fmt(res), highlight: true, color: Colors.tool.percentage },
                    { label: 'Remainder', value: fmt(vb - res) },
                ];
            } else if (mode === 'xIsWhatPctOfY') {
                if (vb === 0) return null;
                const pct = (va / vb) * 100;
                return [
                    { label: `${va} / ${vb} × 100`, value: `${fmt(pct)}%`, highlight: true, color: Colors.tool.percentage },
                ];
            } else {
                // percent change from va to vb
                if (va === 0) return null;
                const change = ((vb - va) / Math.abs(va)) * 100;
                const isIncrease = change >= 0;
                return [
                    {
                        label: `${va} → ${vb}`,
                        value: `${isIncrease ? '+' : ''}${fmt(change)}%`,
                        highlight: true,
                        color: isIncrease ? Colors.accent : Colors.error,
                    },
                    { label: 'Absolute change', value: fmt(vb - va) },
                ];
            }
        } catch {
            return null;
        }
    }, [mode, a, b]) as ResultRow[] | null;

    const labels: Record<Mode, [string, string]> = {
        xPercentOfY:   ['Percentage (%)', 'Value (Y)'],
        xIsWhatPctOfY: ['Value (X)', 'Total (Y)'],
        percentChange: ['From value', 'To value'],
    };

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
                <Text style={styles.title}>Percentage Tools</Text>
                <Text style={styles.subtitle}>Quick % calculations</Text>

                <Text style={styles.sectionLabel}>Mode</Text>
                <View style={styles.modeRow}>
                    {MODES.map(m => (
                        <Pressable
                            key={m.id}
                            onPress={() => { setMode(m.id); setA(''); setB(''); }}
                            style={[
                                styles.modeBtn,
                                mode === m.id && { backgroundColor: Colors.tool.percentage + '25', borderColor: Colors.tool.percentage },
                            ]}
                        >
                            <Text style={[styles.modeBtnText, mode === m.id && { color: Colors.tool.percentage }]}>
                                {m.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <InputField label={labels[mode][0]} value={a} onChangeText={setA} placeholder="0" />
                <InputField label={labels[mode][1]} value={b} onChangeText={setB} placeholder="0" />

                {result && result.length > 0 && (
                    <ResultCard title="Result" rows={result} accentColor={Colors.tool.percentage} />
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    content: { padding: Spacing.xl, paddingBottom: 40 },
    backRow: { marginBottom: Spacing.lg },
    backBtn: { alignSelf: 'flex-start' },
    backText: { color: Colors.tool.percentage, fontSize: FontSize.body, fontWeight: '600' },
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
    modeRow: { gap: Spacing.sm, marginBottom: Spacing.xl },
    modeBtn: {
        paddingVertical: Spacing.md,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        alignItems: 'center',
    },
    modeBtnText: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600' },
});
