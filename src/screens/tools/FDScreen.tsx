import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import InputField from '../../components/InputField';
import ResultCard from '../../components/ResultCard';
import BarChart from '../../components/charts/BarChart';
import type { ResultRow } from '../../components/ResultCard';
import { Colors, FontSize, Spacing, Radii } from '../../config/theme';

type Props = { onBack: () => void };
const COLOR = Colors.chart.blue;

const POPULAR_RATES = [{ label: 'SBI', rate: 6.8 }, { label: 'HDFC', rate: 7.1 }, { label: 'ICICI', rate: 7.1 }, { label: 'Post', rate: 7.5 }];

function fmt(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

export default function FDScreen({ onBack }: Props) {
    const [principal, setP] = React.useState('');
    const [rate, setR]      = React.useState('');
    const [years, setY]     = React.useState('');

    const result = React.useMemo(() => {
        const P = parseFloat(principal);
        const r = parseFloat(rate);
        const t = parseFloat(years);
        if (!P || !r || !t || P <= 0 || r <= 0 || t <= 0) return null;
        try {
            // Quarterly compounding (standard FD)
            const n       = 4;
            const maturity = P * Math.pow(1 + r / (100 * n), n * t);
            const interest = maturity - P;
            // TDS: 10% on interest if PAN provided, 20% without (simplified)
            const tds      = interest * 0.10;
            const afterTDS = maturity - tds;

            const rows: ResultRow[] = [
                { label: 'Principal',          value: fmt(P) },
                { label: 'Interest Earned',    value: fmt(interest),  color: COLOR },
                { label: 'Maturity Amount',    value: fmt(maturity),  highlight: true, color: COLOR },
                { label: 'TDS @ 10% (Est.)',   value: fmt(tds),       color: Colors.error },
                { label: 'After TDS',          value: fmt(afterTDS) },
            ];

            // Yearly growth chart
            const chart = Array.from({ length: Math.min(Math.ceil(t), 10) }, (_, i) => {
                const yr = i + 1;
                const val = P * Math.pow(1 + r / (100 * n), n * Math.min(yr, t));
                return { label: `Yr ${yr}`, value: Math.round(val) };
            });

            return { rows, chart };
        } catch { return null; }
    }, [principal, rate, years]);

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Pressable onPress={onBack} style={styles.back}><Text style={[styles.backText, { color: COLOR }]}>‹ Back</Text></Pressable>
                <Text style={styles.title}>FD Calculator</Text>
                <Text style={styles.sub}>Fixed Deposit · Quarterly compounding</Text>

                <Text style={styles.sectionLabel}>Popular Bank Rates</Text>
                <View style={styles.bankRow}>
                    {POPULAR_RATES.map(b => (
                        <Pressable key={b.label} onPress={() => setR(String(b.rate))}
                            style={[styles.bankBtn, rate === String(b.rate) && { backgroundColor: COLOR + '25', borderColor: COLOR }]}>
                            <Text style={[styles.bankName, rate === String(b.rate) && { color: COLOR }]}>{b.label}</Text>
                            <Text style={[styles.bankRate, rate === String(b.rate) && { color: COLOR }]}>{b.rate}%</Text>
                        </Pressable>
                    ))}
                </View>

                <InputField label="Principal (₹)" value={principal} onChangeText={setP} placeholder="100000" />
                <InputField label="Annual Interest Rate" value={rate} onChangeText={setR} placeholder="7" suffix="%" />
                <InputField label="Tenure" value={years} onChangeText={setY} placeholder="3" suffix="years" />

                {result && (
                    <>
                        <ResultCard title="FD Maturity" rows={result.rows} accentColor={COLOR} />
                        {result.chart.length > 1 && (
                            <View style={styles.chartSection}>
                                <Text style={styles.sectionLabel}>Year-wise Growth</Text>
                                <View style={styles.chartBox}>
                                    <BarChart data={result.chart} color={COLOR} height={180} />
                                </View>
                            </View>
                        )}
                        <Text style={styles.note}>TDS estimate assumes PAN is furnished. Actual tax depends on total income bracket.</Text>
                    </>
                )}
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
    sectionLabel: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
    bankRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl, flexWrap: 'wrap' },
    bankBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.inputBorder, alignItems: 'center', minWidth: 64 },
    bankName: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600' },
    bankRate: { color: Colors.text.muted, fontSize: FontSize.xs },
    chartSection: { marginTop: Spacing.md, marginBottom: Spacing.lg },
    chartBox: { backgroundColor: Colors.card, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.cardBorder, padding: Spacing.lg },
    note: { color: Colors.text.muted, fontSize: FontSize.xs, lineHeight: 18, marginTop: Spacing.sm },
});
