import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import InputField from '../../components/InputField';
import ResultCard from '../../components/ResultCard';
import type { ResultRow } from '../../components/ResultCard';
import { Colors, FontSize, Spacing, Radii } from '../../config/theme';

type Props = { onBack: () => void };
type Mode = 'si' | 'ci';

const COLOR = Colors.chart.cyan;

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 }); }

export default function InterestScreen({ onBack }: Props) {
    const [mode, setMode]       = React.useState<Mode>('si');
    const [principal, setP]     = React.useState('');
    const [rate, setR]          = React.useState('');
    const [years, setY]         = React.useState('');
    const [freq, setFreq]       = React.useState('12'); // compounding per year

    const result = React.useMemo<ResultRow[] | null>(() => {
        const P = parseFloat(principal);
        const r = parseFloat(rate);
        const t = parseFloat(years);
        if (!P || !r || !t || P <= 0 || r <= 0 || t <= 0) return null;
        try {
            if (mode === 'si') {
                const interest = (P * r * t) / 100;
                const total    = P + interest;
                return [
                    { label: 'Principal',       value: fmt(P) },
                    { label: 'Simple Interest', value: fmt(interest), color: COLOR },
                    { label: 'Total Amount',    value: fmt(total), highlight: true, color: COLOR },
                ];
            } else {
                const n = parseFloat(freq) || 12;
                const total    = P * Math.pow(1 + r / (100 * n), n * t);
                const interest = total - P;
                return [
                    { label: 'Principal',          value: fmt(P) },
                    { label: 'Compound Interest',  value: fmt(interest), color: COLOR },
                    { label: 'Total Amount',       value: fmt(total), highlight: true, color: COLOR },
                    { label: 'Effective Annual Rate', value: (Math.pow(1 + r / (100 * n), n) - 1).toLocaleString('en-IN', { style: 'percent', maximumFractionDigits: 2 }) },
                ];
            }
        } catch { return null; }
    }, [mode, principal, rate, years, freq]);

    const FREQ_OPTIONS = [{ label: 'Yearly', value: '1' }, { label: 'Quarterly', value: '4' }, { label: 'Monthly', value: '12' }, { label: 'Daily', value: '365' }];

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Pressable onPress={onBack} style={styles.back}><Text style={[styles.backText, { color: COLOR }]}>‹ Back</Text></Pressable>
                <Text style={styles.title}>Interest Calculator</Text>
                <Text style={styles.sub}>Simple & Compound Interest</Text>

                <View style={styles.toggleRow}>
                    {(['si', 'ci'] as Mode[]).map(m => (
                        <Pressable key={m} onPress={() => setMode(m)}
                            style={[styles.toggleBtn, mode === m && { backgroundColor: COLOR + '25', borderColor: COLOR }]}>
                            <Text style={[styles.toggleText, mode === m && { color: COLOR }]}>
                                {m === 'si' ? 'Simple Interest' : 'Compound Interest'}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <InputField label="Principal (₹)" value={principal} onChangeText={setP} placeholder="10000" />
                <InputField label="Annual Rate" value={rate} onChangeText={setR} placeholder="8" suffix="%" />
                <InputField label="Time Period" value={years} onChangeText={setY} placeholder="5" suffix="years" />

                {mode === 'ci' && (
                    <>
                        <Text style={styles.sectionLabel}>Compounding Frequency</Text>
                        <View style={styles.freqRow}>
                            {FREQ_OPTIONS.map(f => (
                                <Pressable key={f.value} onPress={() => setFreq(f.value)}
                                    style={[styles.freqBtn, freq === f.value && { backgroundColor: COLOR + '25', borderColor: COLOR }]}>
                                    <Text style={[styles.freqText, freq === f.value && { color: COLOR }]}>{f.label}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </>
                )}

                {result && <ResultCard title="Result" rows={result} accentColor={COLOR} />}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    content: { padding: Spacing.xl, paddingBottom: 40 },
    back: { alignSelf: 'flex-start', marginBottom: Spacing.lg },
    backText: { fontSize: FontSize.body, fontWeight: '600' },
    title: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.xs },
    sub: { color: Colors.text.muted, fontSize: FontSize.xs, marginBottom: Spacing.xl },
    toggleRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
    toggleBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.inputBorder, alignItems: 'center' },
    toggleText: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600' },
    sectionLabel: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
    freqRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl, flexWrap: 'wrap' },
    freqBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.inputBorder },
    freqText: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600' },
});
