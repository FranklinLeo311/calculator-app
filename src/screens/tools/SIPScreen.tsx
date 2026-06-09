import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import InputField from '../../components/InputField';
import ResultCard from '../../components/ResultCard';
import LineChart from '../../components/charts/LineChart';
import type { ResultRow } from '../../components/ResultCard';
import { Colors, FontSize, Spacing, Radii } from '../../config/theme';

type Props = { onBack: () => void };
const COLOR = Colors.chart.purple;

function fmt(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

const PRESETS = [{ label: 'Conservative', rate: '10' }, { label: 'Moderate', rate: '12' }, { label: 'Aggressive', rate: '15' }];

export default function SIPScreen({ onBack }: Props) {
    const [monthly, setMonthly] = React.useState('');
    const [rate, setRate]       = React.useState('12');
    const [years, setYears]     = React.useState('');

    const result = React.useMemo(() => {
        const m = parseFloat(monthly);
        const r = parseFloat(rate);
        const y = parseFloat(years);
        if (!m || !r || !y || m <= 0 || r <= 0 || y <= 0) return null;
        try {
            const n       = Math.round(y * 12);       // total months
            const monthR  = r / 12 / 100;
            const maturity = m * ((Math.pow(1 + monthR, n) - 1) / monthR) * (1 + monthR);
            const invested = m * n;
            const gains    = maturity - invested;
            const xirr     = Math.pow(maturity / invested, 1 / y) - 1; // approximate CAGR

            const rows: ResultRow[] = [
                { label: 'Monthly SIP',        value: fmt(m) },
                { label: 'Total Invested',     value: fmt(invested) },
                { label: 'Estimated Returns',  value: fmt(gains),    color: Colors.accent },
                { label: 'Maturity Value',     value: fmt(maturity), highlight: true, color: COLOR },
                { label: 'Approx. CAGR',       value: (xirr * 100).toFixed(1) + '%' },
            ];

            // Yearly corpus growth
            const chart = Array.from({ length: Math.min(Math.ceil(y), 30) }, (_, i) => {
                const yr  = i + 1;
                const nm  = Math.min(yr * 12, n);
                const val = m * ((Math.pow(1 + monthR, nm) - 1) / monthR) * (1 + monthR);
                return { label: `Y${yr}`, value: Math.round(val) };
            });

            return { rows, chart };
        } catch { return null; }
    }, [monthly, rate, years]);

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Pressable onPress={onBack} style={styles.back}><Text style={[styles.backText, { color: COLOR }]}>‹ Back</Text></Pressable>
                <Text style={styles.title}>SIP Calculator</Text>
                <Text style={styles.sub}>Systematic Investment Plan · Mutual Fund returns</Text>

                <InputField label="Monthly Investment (₹)" value={monthly} onChangeText={setMonthly} placeholder="5000" />

                <Text style={styles.sectionLabel}>Expected Return Rate</Text>
                <View style={styles.presetRow}>
                    {PRESETS.map(p => (
                        <Pressable key={p.label} onPress={() => setRate(p.rate)}
                            style={[styles.presetBtn, rate === p.rate && { backgroundColor: COLOR + '25', borderColor: COLOR }]}>
                            <Text style={[styles.presetLabel, rate === p.rate && { color: COLOR }]}>{p.label}</Text>
                            <Text style={[styles.presetRate, rate === p.rate && { color: COLOR }]}>{p.rate}% p.a.</Text>
                        </Pressable>
                    ))}
                </View>
                <InputField label="Annual Return Rate" value={rate} onChangeText={setRate} placeholder="12" suffix="%" />
                <InputField label="Investment Period" value={years} onChangeText={setYears} placeholder="10" suffix="years" />

                {result && (
                    <>
                        <ResultCard title="SIP Returns" rows={result.rows} accentColor={COLOR} />
                        {result.chart.length > 1 && (
                            <View style={styles.chartSection}>
                                <Text style={styles.sectionLabel}>Corpus Growth</Text>
                                <View style={styles.chartBox}>
                                    <LineChart data={result.chart} color={COLOR} height={180} />
                                </View>
                            </View>
                        )}
                        <Text style={styles.note}>Returns are estimated based on constant rate. Actual mutual fund returns vary with market conditions. Past performance does not guarantee future results.</Text>
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
    presetRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
    presetBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.inputBorder, alignItems: 'center' },
    presetLabel: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600' },
    presetRate: { color: Colors.text.muted, fontSize: FontSize.xs },
    chartSection: { marginTop: Spacing.md, marginBottom: Spacing.lg },
    chartBox: { backgroundColor: Colors.card, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.cardBorder, padding: Spacing.lg },
    note: { color: Colors.text.muted, fontSize: FontSize.xs, lineHeight: 18, marginTop: Spacing.sm },
});
