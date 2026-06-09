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
type Mode = 'ctc' | 'monthly';

function fmt(n: number): string {
    return '₹' + Math.round(n).toLocaleString('en-IN');
}

function computeCTC(annualCTC: number) {
    const basic         = annualCTC * 0.40;
    const hra           = basic * 0.50;
    const conveyance    = 19200;
    const medical       = 15000;
    const employerPF    = basic * 0.12;
    const gratuity      = basic * 0.0481;
    const specialAllow  = annualCTC - basic - hra - conveyance - medical - employerPF - gratuity;
    const annualGross   = annualCTC - employerPF - gratuity;
    const monthlyGross  = annualGross / 12;
    const employeePF    = basic * 0.12;
    const professionalTax = 2500;
    const taxableIncome = annualGross - employeePF - professionalTax;

    let incomeTax = 0;
    if (taxableIncome > 1500000)      incomeTax = (taxableIncome - 1500000) * 0.30 + 300000 * 0.20 + 300000 * 0.15 + 300000 * 0.10;
    else if (taxableIncome > 1200000) incomeTax = (taxableIncome - 1200000) * 0.20 + 300000 * 0.15 + 300000 * 0.10;
    else if (taxableIncome > 900000)  incomeTax = (taxableIncome - 900000)  * 0.15 + 300000 * 0.10;
    else if (taxableIncome > 600000)  incomeTax = (taxableIncome - 600000)  * 0.10;
    if (taxableIncome <= 700000) incomeTax = 0;

    const annualInHand  = annualGross - employeePF - professionalTax - incomeTax;
    const monthlyInHand = annualInHand / 12;

    return {
        basic, hra, conveyance, medical, specialAllow,
        employerPF, gratuity, annualGross, monthlyGross,
        employeePF, professionalTax, incomeTax,
        annualInHand, monthlyInHand,
    };
}

// Binary-search: find the annual CTC that produces the given monthly in-hand.
// converges in ~50 iterations to within ₹1 accuracy.
function ctcFromMonthlyInHand(targetMonthly: number): number {
    if (targetMonthly <= 0) return 0;
    let lo = targetMonthly * 12;          // floor: no deductions
    let hi = targetMonthly * 12 * 3;     // ceiling: ≥3× covers highest tax bracket
    for (let i = 0; i < 60; i++) {
        const mid = (lo + hi) / 2;
        const { monthlyInHand } = computeCTC(mid);
        if (Math.abs(monthlyInHand - targetMonthly) < 0.5) break;
        if (monthlyInHand < targetMonthly) lo = mid;
        else hi = mid;
    }
    return (lo + hi) / 2;
}

export default function CTCScreen({ onBack }: Props) {
    const [mode, setMode] = React.useState<Mode>('ctc');
    const [ctcInput, setCtcInput]         = React.useState('');
    const [monthlyInput, setMonthlyInput] = React.useState('');

    const result = React.useMemo(() => {
        try {
            if (mode === 'ctc') {
                const v = parseFloat(ctcInput);
                if (!ctcInput || isNaN(v) || v <= 0) return null;
                return { annualCTC: v, ...computeCTC(v) };
            } else {
                const v = parseFloat(monthlyInput);
                if (!monthlyInput || isNaN(v) || v <= 0) return null;
                const annualCTC = ctcFromMonthlyInHand(v);
                return { annualCTC, ...computeCTC(annualCTC) };
            }
        } catch { return null; }
    }, [mode, ctcInput, monthlyInput]);

    const ctcRows: ResultRow[] = result ? [
        { label: 'Basic (40%)',        value: fmt(result.basic) },
        { label: 'HRA (50% of basic)', value: fmt(result.hra) },
        { label: 'Conveyance',         value: fmt(result.conveyance) },
        { label: 'Medical Allowance',  value: fmt(result.medical) },
        { label: 'Special Allowance',  value: fmt(result.specialAllow) },
        { label: 'Employer PF (12%)',  value: fmt(result.employerPF) },
        { label: 'Gratuity (4.81%)',   value: fmt(result.gratuity) },
    ] : [];

    const deductionRows: ResultRow[] = result ? [
        { label: 'Employee PF',           value: fmt(result.employeePF) },
        { label: 'Professional Tax (TN)', value: fmt(result.professionalTax) },
        { label: 'Income Tax (Est.)',     value: fmt(result.incomeTax) },
    ] : [];

    const summaryRows: ResultRow[] = result ? [
        { label: 'Annual CTC',    value: fmt(result.annualCTC),    highlight: mode === 'monthly', color: mode === 'monthly' ? Colors.tool.ctc : undefined },
        { label: 'Annual Gross',  value: fmt(result.annualGross) },
        { label: 'Monthly Gross', value: fmt(result.monthlyGross) },
        { label: 'Annual In-hand',  value: fmt(result.annualInHand),  highlight: mode === 'ctc', color: mode === 'ctc' ? Colors.tool.ctc : undefined },
        { label: 'Monthly In-hand', value: fmt(result.monthlyInHand), highlight: true, color: Colors.tool.ctc },
    ] : [];

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
                <Text style={styles.title}>CTC Calculator</Text>
                <Text style={styles.subtitle}>Indian payroll · Chennai / Tamil Nadu · New Tax Regime FY 2024-25</Text>

                {/* Mode toggle */}
                <View style={styles.toggleRow}>
                    <Pressable
                        onPress={() => setMode('ctc')}
                        style={[styles.toggleBtn, mode === 'ctc' && { backgroundColor: Colors.tool.ctc + '25', borderColor: Colors.tool.ctc }]}
                    >
                        <Text style={[styles.toggleText, mode === 'ctc' && { color: Colors.tool.ctc }]}>
                            Annual CTC → In-hand
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setMode('monthly')}
                        style={[styles.toggleBtn, mode === 'monthly' && { backgroundColor: Colors.tool.ctc + '25', borderColor: Colors.tool.ctc }]}
                    >
                        <Text style={[styles.toggleText, mode === 'monthly' && { color: Colors.tool.ctc }]}>
                            Monthly In-hand → CTC
                        </Text>
                    </Pressable>
                </View>

                {mode === 'ctc' ? (
                    <InputField
                        label="Annual CTC (₹)"
                        value={ctcInput}
                        onChangeText={setCtcInput}
                        placeholder="e.g. 1200000"
                        suffix="/ year"
                    />
                ) : (
                    <InputField
                        label="Desired Monthly In-hand (₹)"
                        value={monthlyInput}
                        onChangeText={setMonthlyInput}
                        placeholder="e.g. 75000"
                        suffix="/ month"
                    />
                )}

                {result && (
                    <>
                        <ResultCard title="Take-Home Summary" rows={summaryRows} accentColor={Colors.tool.ctc} />
                        <ResultCard title="Salary Breakdown (Annual)" rows={ctcRows} accentColor={Colors.tool.ctc} />
                        <ResultCard title="Deductions (Annual)" rows={deductionRows} accentColor={Colors.error} />
                        <View style={styles.note}>
                            <Text style={styles.noteText}>
                                Professional Tax = Tamil Nadu slab (₹2,500/year). Section 87A rebate applied for taxable income ≤ ₹7L. Actual figures may vary with declarations and employer policies.
                            </Text>
                        </View>
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
    backText: { color: Colors.tool.ctc, fontSize: FontSize.body, fontWeight: '600' },
    title: { color: Colors.text.primary, fontSize: FontSize.xxl, fontWeight: '700', marginBottom: Spacing.xs },
    subtitle: { color: Colors.text.muted, fontSize: FontSize.xs, marginBottom: Spacing.xl, lineHeight: 16 },
    toggleRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: Spacing.md,
        borderRadius: Radii.md,
        borderWidth: 1,
        borderColor: Colors.inputBorder,
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
    },
    toggleText: {
        color: Colors.text.secondary,
        fontSize: FontSize.xs,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 16,
    },
    note: { marginTop: Spacing.sm },
    noteText: { color: Colors.text.muted, fontSize: FontSize.xs, lineHeight: 18 },
});
