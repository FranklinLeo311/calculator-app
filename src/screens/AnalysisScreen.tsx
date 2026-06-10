import React from 'react';
import {
    ScrollView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import GradientBackground from '../components/GradientBackground';
import { Colors, FontSize, Spacing, Radii } from '../config/theme';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    isFinite(n) ? n.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—';

const safe = (s: string) => parseFloat(s) || 0;

// ─── Section wrapper ─────────────────────────────────────────────────────────

type SectionProps = {
    title: string;
    accent: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
};

function Section({ title, accent, expanded, onToggle, children }: SectionProps) {
    return (
        <View style={[styles.section, { borderLeftColor: accent }]}>
            <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
                <Text style={[styles.sectionTitle, { color: accent }]}>{title}</Text>
                <Text style={[styles.chevron, { color: accent }]}>{expanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {expanded && <View style={styles.sectionBody}>{children}</View>}
        </View>
    );
}

// ─── Input row ───────────────────────────────────────────────────────────────

function InputRow({ label, value, onChangeText, placeholder, keyboardType = 'numeric' }: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    keyboardType?: 'numeric' | 'default';
}) {
    return (
        <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>{label}</Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder ?? '0'}
                placeholderTextColor={Colors.text.muted}
                keyboardType={keyboardType}
            />
        </View>
    );
}

// ─── Result row ──────────────────────────────────────────────────────────────

function ResultRow({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>{label}</Text>
            <Text style={[styles.resultValue, { color: color ?? Colors.accent }]}>{value}</Text>
        </View>
    );
}

// ─── EMI Calculator ──────────────────────────────────────────────────────────

function EmiCalc() {
    const [principal, setPrincipal] = React.useState('');
    const [rate, setRate] = React.useState('');
    const [tenure, setTenure] = React.useState('');

    const result = React.useMemo(() => {
        const P = safe(principal);
        const r = safe(rate) / 1200;
        const n = safe(tenure);
        if (P <= 0 || r <= 0 || n <= 0) return null;
        const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        const total = emi * n;
        const interest = total - P;
        return { emi, total, interest };
    }, [principal, rate, tenure]);

    return (
        <>
            <InputRow label="Loan Amount (₹)" value={principal} onChangeText={setPrincipal} placeholder="e.g. 500000" />
            <InputRow label="Annual Interest Rate (%)" value={rate} onChangeText={setRate} placeholder="e.g. 8.5" />
            <InputRow label="Tenure (months)" value={tenure} onChangeText={setTenure} placeholder="e.g. 60" />
            {result && (
                <View style={styles.resultsBox}>
                    <ResultRow label="Monthly EMI" value={`₹ ${fmt(result.emi)}`} color={Colors.tool.emi} />
                    <ResultRow label="Total Amount" value={`₹ ${fmt(result.total)}`} color={Colors.chart.amber} />
                    <ResultRow label="Total Interest" value={`₹ ${fmt(result.interest)}`} color={Colors.error} />
                </View>
            )}
        </>
    );
}

// ─── Compound Interest ───────────────────────────────────────────────────────

const FREQ_OPTIONS: { label: string; value: number }[] = [
    { label: 'Monthly', value: 12 },
    { label: 'Quarterly', value: 4 },
    { label: 'Yearly', value: 1 },
];

function CompoundCalc() {
    const [principal, setPrincipal] = React.useState('');
    const [rate, setRate] = React.useState('');
    const [time, setTime] = React.useState('');
    const [freq, setFreq] = React.useState(12);

    const result = React.useMemo(() => {
        const P = safe(principal);
        const r = safe(rate) / 100;
        const t = safe(time);
        const n = freq;
        if (P <= 0 || r <= 0 || t <= 0) return null;
        const A = P * Math.pow(1 + r / n, n * t);
        const interest = A - P;
        return { A, interest };
    }, [principal, rate, time, freq]);

    return (
        <>
            <InputRow label="Principal (₹)" value={principal} onChangeText={setPrincipal} placeholder="e.g. 100000" />
            <InputRow label="Annual Rate (%)" value={rate} onChangeText={setRate} placeholder="e.g. 12" />
            <InputRow label="Time (years)" value={time} onChangeText={setTime} placeholder="e.g. 5" />
            <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Compounding</Text>
                <View style={styles.freqRow}>
                    {FREQ_OPTIONS.map(o => (
                        <TouchableOpacity
                            key={o.value}
                            style={[styles.freqBtn, freq === o.value && styles.freqBtnActive]}
                            onPress={() => setFreq(o.value)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.freqBtnText, freq === o.value && styles.freqBtnTextActive]}>
                                {o.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            {result && (
                <View style={styles.resultsBox}>
                    <ResultRow label="Final Amount" value={`₹ ${fmt(result.A)}`} color={Colors.chart.green} />
                    <ResultRow label="Interest Earned" value={`₹ ${fmt(result.interest)}`} color={Colors.chart.amber} />
                </View>
            )}
        </>
    );
}

// ─── Percentage Tools ────────────────────────────────────────────────────────

function PercentageTools() {
    const [xOfY_x, setXOfY_x] = React.useState('');
    const [xOfY_y, setXOfY_y] = React.useState('');
    const [chgA, setChgA] = React.useState('');
    const [chgB, setChgB] = React.useState('');
    const [whatX, setWhatX] = React.useState('');
    const [whatY, setWhatY] = React.useState('');

    const r1 = React.useMemo(() => (safe(xOfY_x) / 100) * safe(xOfY_y), [xOfY_x, xOfY_y]);
    const r2 = React.useMemo(() => {
        const a = safe(chgA);
        if (a === 0) return null;
        return ((safe(chgB) - a) / a) * 100;
    }, [chgA, chgB]);
    const r3 = React.useMemo(() => {
        const y = safe(whatY);
        if (y === 0) return null;
        return (safe(whatX) / y) * 100;
    }, [whatX, whatY]);

    return (
        <>
            {/* Tool 1 */}
            <View style={styles.miniCard}>
                <Text style={styles.miniTitle}>X% of Y</Text>
                <View style={styles.miniInputRow}>
                    <TextInput style={[styles.input, styles.miniInput]} value={xOfY_x} onChangeText={setXOfY_x} placeholder="X" placeholderTextColor={Colors.text.muted} keyboardType="numeric" />
                    <Text style={styles.miniOp}>% of</Text>
                    <TextInput style={[styles.input, styles.miniInput]} value={xOfY_y} onChangeText={setXOfY_y} placeholder="Y" placeholderTextColor={Colors.text.muted} keyboardType="numeric" />
                </View>
                <Text style={styles.miniResult}>= {fmt(r1)}</Text>
            </View>

            {/* Tool 2 */}
            <View style={styles.miniCard}>
                <Text style={styles.miniTitle}>% Change A → B</Text>
                <View style={styles.miniInputRow}>
                    <TextInput style={[styles.input, styles.miniInput]} value={chgA} onChangeText={setChgA} placeholder="A" placeholderTextColor={Colors.text.muted} keyboardType="numeric" />
                    <Text style={styles.miniOp}>→</Text>
                    <TextInput style={[styles.input, styles.miniInput]} value={chgB} onChangeText={setChgB} placeholder="B" placeholderTextColor={Colors.text.muted} keyboardType="numeric" />
                </View>
                {r2 !== null && (
                    <Text style={[styles.miniResult, { color: r2 >= 0 ? Colors.accent : Colors.error }]}>
                        = {r2 >= 0 ? '+' : ''}{fmt(r2)}%
                    </Text>
                )}
            </View>

            {/* Tool 3 */}
            <View style={styles.miniCard}>
                <Text style={styles.miniTitle}>X is what % of Y</Text>
                <View style={styles.miniInputRow}>
                    <TextInput style={[styles.input, styles.miniInput]} value={whatX} onChangeText={setWhatX} placeholder="X" placeholderTextColor={Colors.text.muted} keyboardType="numeric" />
                    <Text style={styles.miniOp}>of</Text>
                    <TextInput style={[styles.input, styles.miniInput]} value={whatY} onChangeText={setWhatY} placeholder="Y" placeholderTextColor={Colors.text.muted} keyboardType="numeric" />
                </View>
                {r3 !== null && <Text style={styles.miniResult}>= {fmt(r3)}%</Text>}
            </View>
        </>
    );
}

// ─── GST Calculator ──────────────────────────────────────────────────────────

const GST_RATES = [5, 12, 18, 28];

function GstCalc() {
    const [amount, setAmount] = React.useState('');
    const [gstRate, setGstRate] = React.useState(18);

    const result = React.useMemo(() => {
        const A = safe(amount);
        if (A <= 0) return null;
        const gstAmt = (A * gstRate) / 100;
        const total = A + gstAmt;
        const beforeGst = A / (1 + gstRate / 100);
        const reverseGst = A - beforeGst;
        return { gstAmt, total, beforeGst, reverseGst };
    }, [amount, gstRate]);

    return (
        <>
            <InputRow label="Amount (₹)" value={amount} onChangeText={setAmount} placeholder="e.g. 10000" />
            <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>GST Rate</Text>
                <View style={styles.freqRow}>
                    {GST_RATES.map(r => (
                        <TouchableOpacity
                            key={r}
                            style={[styles.freqBtn, gstRate === r && styles.freqBtnActive]}
                            onPress={() => setGstRate(r)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.freqBtnText, gstRate === r && styles.freqBtnTextActive]}>
                                {r}%
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            {result && (
                <View style={styles.resultsBox}>
                    <ResultRow label="GST Amount" value={`₹ ${fmt(result.gstAmt)}`} color={Colors.tool.gst} />
                    <ResultRow label="Total with GST" value={`₹ ${fmt(result.total)}`} color={Colors.chart.green} />
                    <View style={styles.divider} />
                    <Text style={styles.reverseLabel}>Reverse (amount includes GST)</Text>
                    <ResultRow label="Amount before GST" value={`₹ ${fmt(result.beforeGst)}`} color={Colors.chart.cyan} />
                    <ResultRow label="GST component" value={`₹ ${fmt(result.reverseGst)}`} color={Colors.chart.amber} />
                </View>
            )}
        </>
    );
}

// ─── SIP Calculator ──────────────────────────────────────────────────────────

function SipCalc() {
    const [monthly, setMonthly] = React.useState('');
    const [rate, setRate] = React.useState('');
    const [years, setYears] = React.useState('');

    const result = React.useMemo(() => {
        const P = safe(monthly);
        const r = safe(rate) / 1200;
        const n = safe(years) * 12;
        if (P <= 0 || r <= 0 || n <= 0) return null;
        const fv = P * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
        const invested = P * n;
        const returns = fv - invested;
        return { fv, invested, returns };
    }, [monthly, rate, years]);

    return (
        <>
            <InputRow label="Monthly Investment (₹)" value={monthly} onChangeText={setMonthly} placeholder="e.g. 5000" />
            <InputRow label="Expected Return (%/yr)" value={rate} onChangeText={setRate} placeholder="e.g. 12" />
            <InputRow label="Period (years)" value={years} onChangeText={setYears} placeholder="e.g. 10" />
            {result && (
                <View style={styles.resultsBox}>
                    <ResultRow label="Invested Amount" value={`₹ ${fmt(result.invested)}`} color={Colors.chart.blue} />
                    <ResultRow label="Expected Returns" value={`₹ ${fmt(result.returns)}`} color={Colors.chart.amber} />
                    <ResultRow label="Total Value" value={`₹ ${fmt(result.fv)}`} color={Colors.accent} />
                </View>
            )}
        </>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

type SectionKey = 'emi' | 'compound' | 'percentage' | 'gst' | 'sip';

export default function AnalysisScreen() {
    const [expanded, setExpanded] = React.useState<Record<SectionKey, boolean>>({
        emi: true,
        compound: false,
        percentage: false,
        gst: false,
        sip: false,
    });

    const toggle = (key: SectionKey) =>
        setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <GradientBackground>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.screenTitle}>Financial Analysis</Text>

                <Section title="EMI Calculator" accent={Colors.tool.emi} expanded={expanded.emi} onToggle={() => toggle('emi')}>
                    <EmiCalc />
                </Section>

                <Section title="Compound Interest" accent={Colors.chart.green} expanded={expanded.compound} onToggle={() => toggle('compound')}>
                    <CompoundCalc />
                </Section>

                <Section title="Percentage Tools" accent={Colors.tool.percentage} expanded={expanded.percentage} onToggle={() => toggle('percentage')}>
                    <PercentageTools />
                </Section>

                <Section title="GST Calculator" accent={Colors.tool.gst} expanded={expanded.gst} onToggle={() => toggle('gst')}>
                    <GstCalc />
                </Section>

                <Section title="SIP Calculator" accent={Colors.chart.purple} expanded={expanded.sip} onToggle={() => toggle('sip')}>
                    <SipCalc />
                </Section>
            </ScrollView>
        </GradientBackground>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    scroll: { flex: 1 },
    scrollContent: {
        padding: Spacing.xl,
        paddingBottom: 40,
    },
    screenTitle: {
        fontSize: FontSize.xl,
        fontWeight: '700',
        color: Colors.text.primary,
        marginBottom: Spacing.xl,
    },

    // Section
    section: {
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderLeftWidth: 3,
        marginBottom: Spacing.xl,
        overflow: 'hidden',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    sectionTitle: {
        fontSize: FontSize.body,
        fontWeight: '700',
    },
    chevron: {
        fontSize: FontSize.xs,
    },
    sectionBody: {
        paddingHorizontal: Spacing.xl,
        paddingBottom: Spacing.xl,
    },

    // Inputs
    inputRow: {
        marginBottom: Spacing.lg,
    },
    inputLabel: {
        fontSize: FontSize.sm,
        color: Colors.text.secondary,
        marginBottom: Spacing.xs,
    },
    input: {
        backgroundColor: Colors.input,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        borderRadius: Radii.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        fontSize: FontSize.md,
        color: Colors.text.primary,
    },

    // Freq / Rate buttons
    freqRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        flexWrap: 'wrap',
    },
    freqBtn: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Radii.sm,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        backgroundColor: Colors.input,
    },
    freqBtnActive: {
        backgroundColor: Colors.accentSoft,
        borderColor: Colors.accent,
    },
    freqBtnText: {
        fontSize: FontSize.sm,
        color: Colors.text.secondary,
    },
    freqBtnTextActive: {
        color: Colors.accent,
        fontWeight: '600',
    },

    // Results
    resultsBox: {
        backgroundColor: 'rgba(15,23,42,0.6)',
        borderRadius: Radii.md,
        padding: Spacing.lg,
        marginTop: Spacing.sm,
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
    },
    resultLabel: {
        fontSize: FontSize.sm,
        color: Colors.text.secondary,
    },
    resultValue: {
        fontSize: FontSize.md,
        fontWeight: '700',
    },
    divider: {
        height: 1,
        backgroundColor: Colors.divider,
        marginVertical: Spacing.sm,
    },
    reverseLabel: {
        fontSize: FontSize.xs,
        color: Colors.text.muted,
        marginBottom: Spacing.xs,
        fontStyle: 'italic',
    },

    // Mini percentage cards
    miniCard: {
        backgroundColor: 'rgba(15,23,42,0.5)',
        borderRadius: Radii.md,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
    },
    miniTitle: {
        fontSize: FontSize.sm,
        color: Colors.text.secondary,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    miniInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    miniInput: {
        flex: 1,
        paddingVertical: Spacing.sm,
    },
    miniOp: {
        color: Colors.text.muted,
        fontSize: FontSize.sm,
    },
    miniResult: {
        marginTop: Spacing.sm,
        fontSize: FontSize.md,
        fontWeight: '700',
        color: Colors.tool.percentage,
        textAlign: 'right',
    },
});
