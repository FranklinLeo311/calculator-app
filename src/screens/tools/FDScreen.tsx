import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import InputField from '../../components/InputField';
import ResultCard from '../../components/ResultCard';
import BarChart from '../../components/charts/BarChart';
import type { ResultRow } from '../../components/ResultCard';
import { Colors, FontSize, Spacing, Radii } from '../../config/theme';

type Props = { onBack: () => void };
type TenureUnit = 'days' | 'months' | 'years';

const COLOR = Colors.chart.blue;

// Bank rate presets (1-year general rate)
const POPULAR_RATES = [
    { label: 'SBI',   rate: 6.8  },
    { label: 'HDFC',  rate: 7.1  },
    { label: 'ICICI', rate: 7.1  },
    { label: 'Axis',  rate: 6.7  },
    { label: 'Post',  rate: 7.5  },
];

// Axis Bank short-term rates (for quick reference)
const AXIS_SHORT_RATES = [
    { range: '7–14 days',   rate: 3.00 },
    { range: '15–29 days',  rate: 3.00 },
    { range: '30–60 days',  rate: 4.25 },
    { range: '61–89 days',  rate: 4.75 },
    { range: '90d–6m',      rate: 5.75 },
    { range: '6m–1 yr',     rate: 6.70 },
];

function fmt(n: number) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
function fmtDec(n: number) { return '₹' + n.toFixed(2); }

export default function FDScreen({ onBack }: Props) {
    const [principal, setP]           = React.useState('');
    const [rate, setR]                = React.useState('');
    const [tenure, setTenure]         = React.useState('');
    const [unit, setUnit]             = React.useState<TenureUnit>('years');
    const [showAxisRates, setShowAxisRates] = React.useState(false);

    const result = React.useMemo(() => {
        const P = parseFloat(principal);
        const r = parseFloat(rate);
        const t = parseFloat(tenure);
        if (!P || !r || !t || P <= 0 || r <= 0 || t <= 0) return null;

        try {
            let interest = 0;
            let maturity = 0;

            if (unit === 'days') {
                // Simple interest for day-based FDs (standard bank practice for < 90 days)
                interest = P * (r / 100) * (t / 365);
                maturity = P + interest;
            } else if (unit === 'months') {
                if (t <= 2) {
                    // Simple interest for ≤ 2 months
                    interest = P * (r / 100) * (t / 12);
                    maturity = P + interest;
                } else {
                    // Quarterly compounding for ≥ 3 months
                    const n = 4;
                    maturity = P * Math.pow(1 + r / (100 * n), n * (t / 12));
                    interest = maturity - P;
                }
            } else {
                // Years: quarterly compounding
                const n = 4;
                maturity = P * Math.pow(1 + r / (100 * n), n * t);
                interest = maturity - P;
            }

            const tds      = interest * 0.10;
            const afterTDS = maturity - tds;

            // Label for tenure
            const tenureLabel = unit === 'days'
                ? `${t} day${t > 1 ? 's' : ''}`
                : unit === 'months'
                    ? `${t} month${t > 1 ? 's' : ''}`
                    : `${t} year${t > 1 ? 's' : ''}`;

            // Interest formula shown to user
            const formulaNote = unit === 'days'
                ? `Simple Interest: ₹${P.toLocaleString()} × ${r}% × ${t}/365`
                : unit === 'months' && t <= 2
                    ? `Simple Interest: ₹${P.toLocaleString()} × ${r}% × ${t}/12`
                    : `Quarterly Compounding: ₹${P.toLocaleString()} × (1 + ${r}/400)^${unit === 'months' ? `4×${t}/12` : `4×${t}`}`;

            const rows: ResultRow[] = [
                { label: 'Principal',         value: fmt(P) },
                { label: 'Tenure',            value: tenureLabel },
                { label: 'Interest Earned',   value: unit === 'days' ? fmtDec(interest) : fmt(interest),  color: COLOR },
                { label: 'Maturity Amount',   value: unit === 'days' ? fmtDec(maturity) : fmt(maturity),  highlight: true, color: COLOR },
                { label: 'TDS @ 10% (Est.)',  value: unit === 'days' ? fmtDec(tds) : fmt(tds),            color: Colors.error },
                { label: 'After TDS',         value: unit === 'days' ? fmtDec(afterTDS) : fmt(afterTDS) },
            ];

            // Growth chart — only for months (3+) and years
            let chart: { label: string; value: number }[] = [];
            if (unit === 'years' && t >= 1) {
                chart = Array.from({ length: Math.min(Math.ceil(t), 10) }, (_, i) => {
                    const yr  = i + 1;
                    const val = P * Math.pow(1 + r / (100 * 4), 4 * Math.min(yr, t));
                    return { label: `Yr ${yr}`, value: Math.round(val) };
                });
            } else if (unit === 'months' && t >= 3) {
                const step = t <= 12 ? 1 : Math.ceil(t / 12);
                chart = Array.from({ length: Math.min(Math.ceil(t / step), 12) }, (_, i) => {
                    const m   = (i + 1) * step;
                    const val = P * Math.pow(1 + r / (100 * 4), 4 * (m / 12));
                    return { label: `M${m}`, value: Math.round(val) };
                });
            }

            return { rows, chart, formulaNote };
        } catch { return null; }
    }, [principal, rate, tenure, unit]);

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Pressable onPress={onBack} style={styles.back}><Text style={[styles.backText, { color: COLOR }]}>‹ Back</Text></Pressable>
                <Text style={styles.title}>FD Calculator</Text>
                <Text style={styles.sub}>Fixed Deposit · Simple & Compound interest</Text>

                {/* Popular Bank Rates */}
                <Text style={styles.sectionLabel}>Popular Bank Rates (1-year)</Text>
                <View style={styles.bankRow}>
                    {POPULAR_RATES.map(b => (
                        <Pressable key={b.label} onPress={() => setR(String(b.rate))}
                            style={[styles.bankBtn, rate === String(b.rate) && { backgroundColor: COLOR + '25', borderColor: COLOR }]}>
                            <Text style={[styles.bankName, rate === String(b.rate) && { color: COLOR }]}>{b.label}</Text>
                            <Text style={[styles.bankRate, rate === String(b.rate) && { color: COLOR }]}>{b.rate}%</Text>
                        </Pressable>
                    ))}
                </View>

                {/* Axis Bank short-term rates */}
                <Pressable onPress={() => setShowAxisRates(v => !v)} style={styles.axisToggle}>
                    <Text style={styles.axisToggleText}>
                        🏦 Axis Bank Short-term Rates {showAxisRates ? '▲' : '▼'}
                    </Text>
                </Pressable>
                {showAxisRates && (
                    <View style={styles.axisTable}>
                        {AXIS_SHORT_RATES.map((r, i) => (
                            <Pressable key={i} onPress={() => setR(String(r.rate))}
                                style={[styles.axisRow, i % 2 === 1 && styles.axisRowAlt]}>
                                <Text style={styles.axisRange}>{r.range}</Text>
                                <Text style={[styles.axisRate, { color: COLOR }]}>{r.rate}% p.a.</Text>
                            </Pressable>
                        ))}
                        <Text style={styles.axisNote}>Tap a rate to use it in the calculator. Rates are for general public.</Text>
                    </View>
                )}

                <InputField label="Principal (₹)" value={principal} onChangeText={setP} placeholder="40000" />
                <InputField label="Annual Interest Rate" value={rate} onChangeText={setR} placeholder="7" suffix="%" />

                {/* Tenure unit selector */}
                <Text style={styles.sectionLabel}>Tenure Unit</Text>
                <View style={styles.unitRow}>
                    {(['days', 'months', 'years'] as TenureUnit[]).map(u => (
                        <Pressable key={u} onPress={() => setUnit(u)}
                            style={[styles.unitBtn, unit === u && { backgroundColor: COLOR + '25', borderColor: COLOR }]}>
                            <Text style={[styles.unitText, unit === u && { color: COLOR }]}>
                                {u.charAt(0).toUpperCase() + u.slice(1)}
                            </Text>
                        </Pressable>
                    ))}
                </View>
                <InputField
                    label={`Tenure (${unit})`}
                    value={tenure}
                    onChangeText={setTenure}
                    placeholder={unit === 'days' ? '8' : unit === 'months' ? '6' : '3'}
                    suffix={unit}
                />

                {unit === 'days' && (
                    <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                            📌 Formula: Principal × (Rate ÷ 100) × (Days ÷ 365){'\n'}
                            e.g. ₹40,000 × 3% × 8/365 = ₹26.30
                        </Text>
                    </View>
                )}

                {result && (
                    <>
                        <ResultCard title="FD Maturity" rows={result.rows} accentColor={COLOR} />
                        <View style={styles.formulaBox}>
                            <Text style={styles.formulaText}>{result.formulaNote}</Text>
                        </View>
                        {result.chart.length > 1 && (
                            <View style={styles.chartSection}>
                                <Text style={styles.sectionLabel}>
                                    {unit === 'months' ? 'Month-wise Growth' : 'Year-wise Growth'}
                                </Text>
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
    bankRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md, flexWrap: 'wrap' },
    bankBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.inputBorder, alignItems: 'center', minWidth: 56 },
    bankName: { color: Colors.text.secondary, fontSize: FontSize.xs, fontWeight: '600' },
    bankRate: { color: Colors.text.muted, fontSize: FontSize.xs },
    axisToggle: { marginBottom: Spacing.sm },
    axisToggleText: { color: COLOR, fontSize: FontSize.sm, fontWeight: '600' },
    axisTable: { backgroundColor: Colors.card, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.cardBorder, marginBottom: Spacing.lg, overflow: 'hidden' },
    axisRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: 10 },
    axisRowAlt: { backgroundColor: Colors.surface },
    axisRange: { color: Colors.text.secondary, fontSize: FontSize.sm },
    axisRate: { fontWeight: '700', fontSize: FontSize.sm },
    axisNote: { color: Colors.text.muted, fontSize: 10, padding: Spacing.md, lineHeight: 14 },
    unitRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
    unitBtn: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.inputBorder, alignItems: 'center' },
    unitText: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '600' },
    infoBox: { backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
    infoText: { color: Colors.text.secondary, fontSize: FontSize.xs, lineHeight: 18 },
    formulaBox: { backgroundColor: Colors.surface, borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.surfaceBorder },
    formulaText: { color: Colors.text.muted, fontSize: 11, lineHeight: 16, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    chartSection: { marginTop: Spacing.md, marginBottom: Spacing.lg },
    chartBox: { backgroundColor: Colors.card, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.cardBorder, padding: Spacing.lg },
    note: { color: Colors.text.muted, fontSize: FontSize.xs, lineHeight: 18, marginTop: Spacing.sm },
});
