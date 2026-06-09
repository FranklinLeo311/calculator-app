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
import BarChart from '../../components/charts/BarChart';
import type { ResultRow } from '../../components/ResultCard';
import { Colors, FontSize, Spacing, Radii } from '../../config/theme';

type Props = { onBack: () => void };

function computeEMI(principal: number, annualRate: number, tenureMonths: number) {
    const r = annualRate / 12 / 100;
    let emi: number;
    if (r === 0) {
        emi = principal / tenureMonths;
    } else {
        const factor = Math.pow(1 + r, tenureMonths);
        emi = (principal * r * factor) / (factor - 1);
    }
    const total    = emi * tenureMonths;
    const interest = total - principal;
    return { emi, total, interest };
}

export default function EMIScreen({ onBack }: Props) {
    const [principal, setPrincipal] = React.useState('');
    const [rate, setRate]           = React.useState('');
    const [tenure, setTenure]       = React.useState('');

    const result = React.useMemo(() => {
        const p = parseFloat(principal);
        const r = parseFloat(rate);
        const t = parseFloat(tenure);
        if (!p || !r || !t || p <= 0 || r <= 0 || t <= 0) return null;
        return computeEMI(p, r, Math.round(t));
    }, [principal, rate, tenure]);

    const fmt = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

    const rows: ResultRow[] = result ? [
        { label: 'Monthly EMI',     value: fmt(result.emi),      highlight: true, color: Colors.tool.emi },
        { label: 'Principal',       value: fmt(parseFloat(principal)) },
        { label: 'Total Interest',  value: fmt(result.interest),  color: Colors.error },
        { label: 'Total Amount',    value: fmt(result.total),     highlight: true },
    ] : [];

    // Yearly breakdown for chart (up to 10 years)
    const chartData = React.useMemo(() => {
        const p = parseFloat(principal);
        const r = parseFloat(rate);
        const t = parseFloat(tenure);
        if (!result || !p || !r || !t) return [];

        const monthlyR = r / 12 / 100;
        const months   = Math.round(t);
        const data: { label: string; value: number }[] = [];
        let balance = p;

        const MAX_YEARS = 10;
        const step = Math.max(1, Math.ceil(months / 12 / MAX_YEARS)) * 12;

        for (let m = step; m <= months; m += step) {
            const end = Math.min(m, months);
            const yr  = Math.ceil(end / 12);
            // Remaining principal after `end` months
            const remaining = p * Math.pow(1 + monthlyR, end) - result.emi * ((Math.pow(1 + monthlyR, end) - 1) / monthlyR);
            const interestPaid = result.emi * end - (p - Math.max(0, remaining));
            data.push({ label: `Yr ${yr}`, value: Math.round(interestPaid) });
            if (end >= months) break;
        }
        return data;
    }, [result, principal, rate, tenure]);

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
                <Text style={styles.title}>EMI Calculator</Text>
                <Text style={styles.subtitle}>Loan · Home · Car · Personal</Text>

                <InputField label="Loan Amount (₹)" value={principal} onChangeText={setPrincipal} placeholder="e.g. 2000000" />
                <InputField label="Annual Interest Rate" value={rate} onChangeText={setRate} placeholder="e.g. 8.5" suffix="%" />
                <InputField label="Tenure" value={tenure} onChangeText={setTenure} placeholder="e.g. 240" suffix="months" />

                {result && (
                    <>
                        <ResultCard title="EMI Breakdown" rows={rows} accentColor={Colors.tool.emi} />
                        {chartData.length > 0 && (
                            <View style={styles.chartSection}>
                                <Text style={styles.chartTitle}>Cumulative Interest Paid</Text>
                                <View style={styles.chartBox}>
                                    <BarChart data={chartData} color={Colors.tool.emi} height={180} />
                                </View>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    content: { padding: Spacing.xl, paddingBottom: 40 },
    backRow: { marginBottom: Spacing.lg },
    backBtn: { alignSelf: 'flex-start' },
    backText: { color: Colors.tool.emi, fontSize: FontSize.body, fontWeight: '600' },
    title: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.xs },
    subtitle: { color: Colors.text.muted, fontSize: FontSize.xs, marginBottom: Spacing.xl },
    chartSection: { marginTop: Spacing.md },
    chartTitle: { color: Colors.text.primary, fontSize: FontSize.body, fontWeight: '700', marginBottom: Spacing.md },
    chartBox: {
        backgroundColor: Colors.card,
        borderRadius: Radii.lg,
        borderWidth: 1,
        borderColor: Colors.cardBorder,
        padding: Spacing.lg,
    },
});
