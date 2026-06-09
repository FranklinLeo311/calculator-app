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

function fmt(n: number): string {
    return '₹' + Math.round(n).toLocaleString('en-IN');
}

function computeCTC(annualCTC: number) {
    // Standard Indian payroll split (Chennai = metro)
    const basic          = annualCTC * 0.40;
    const hra            = basic * 0.50;           // 50% of basic — metro HRA
    const conveyance     = 19200;                  // ₹1,600/month standard
    const medical        = 15000;                  // ₹1,250/month standard
    const employerPF     = basic * 0.12;           // 12% of basic
    const gratuity       = basic * 0.0481;         // 4.81% of basic
    const specialAllow   = annualCTC - basic - hra - conveyance - medical - employerPF - gratuity;

    // Gross = CTC - Employer PF - Gratuity
    const annualGross    = annualCTC - employerPF - gratuity;
    const monthlyGross   = annualGross / 12;

    // Deductions from gross
    const employeePF     = basic * 0.12;           // 12% of basic
    const professionalTax = 2500;                  // Tamil Nadu PT max

    // Simplified income tax (New regime FY 2024-25)
    const taxableIncome  = annualGross - employeePF - professionalTax;
    let incomeTax        = 0;
    if (taxableIncome > 1500000) {
        incomeTax = (taxableIncome - 1500000) * 0.30 + 300000 * 0.20 + 300000 * 0.15 + 300000 * 0.10;
    } else if (taxableIncome > 1200000) {
        incomeTax = (taxableIncome - 1200000) * 0.20 + 300000 * 0.15 + 300000 * 0.10;
    } else if (taxableIncome > 900000) {
        incomeTax = (taxableIncome - 900000) * 0.15 + 300000 * 0.10;
    } else if (taxableIncome > 600000) {
        incomeTax = (taxableIncome - 600000) * 0.10;
    }
    // Section 87A rebate — no tax up to ₹7L taxable income
    if (taxableIncome <= 700000) incomeTax = 0;

    const annualInHand   = annualGross - employeePF - professionalTax - incomeTax;
    const monthlyInHand  = annualInHand / 12;

    return {
        basic, hra, conveyance, medical, specialAllow,
        employerPF, gratuity,
        annualGross, monthlyGross,
        employeePF, professionalTax, incomeTax,
        annualInHand, monthlyInHand,
    };
}

export default function CTCScreen({ onBack }: Props) {
    const [ctc, setCtc] = React.useState('');
    const result = React.useMemo(() => {
        const v = parseFloat(ctc);
        if (!ctc || isNaN(v) || v <= 0) return null;
        return computeCTC(v);
    }, [ctc]);

    const ctcRows: ResultRow[] = result ? [
        { label: 'Basic (40%)',           value: fmt(result.basic) },
        { label: 'HRA (50% of basic)',    value: fmt(result.hra) },
        { label: 'Conveyance',            value: fmt(result.conveyance) },
        { label: 'Medical Allowance',     value: fmt(result.medical) },
        { label: 'Special Allowance',     value: fmt(result.specialAllow) },
        { label: 'Employer PF (12%)',     value: fmt(result.employerPF) },
        { label: 'Gratuity (4.81%)',      value: fmt(result.gratuity) },
    ] : [];

    const deductionRows: ResultRow[] = result ? [
        { label: 'Employee PF',           value: fmt(result.employeePF) },
        { label: 'Professional Tax (TN)', value: fmt(result.professionalTax) },
        { label: 'Income Tax (Est.)',     value: fmt(result.incomeTax) },
    ] : [];

    const summaryRows: ResultRow[] = result ? [
        { label: 'Annual Gross',          value: fmt(result.annualGross) },
        { label: 'Monthly Gross',         value: fmt(result.monthlyGross) },
        { label: 'Annual In-hand',        value: fmt(result.annualInHand), highlight: true, color: Colors.tool.ctc },
        { label: 'Monthly In-hand',       value: fmt(result.monthlyInHand), highlight: true, color: Colors.tool.ctc },
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
                <Text style={styles.title}>CTC Calculator</Text>
                <Text style={styles.subtitle}>Indian payroll · Chennai / Tamil Nadu</Text>

                <InputField
                    label="Annual CTC (₹)"
                    value={ctc}
                    onChangeText={setCtc}
                    placeholder="e.g. 1200000"
                    suffix="/ year"
                />

                {result && (
                    <>
                        <ResultCard title="Salary Breakdown (Annual)" rows={ctcRows} accentColor={Colors.tool.ctc} />
                        <ResultCard title="Deductions (Annual)" rows={deductionRows} accentColor={Colors.error} />
                        <ResultCard title="Take-Home" rows={summaryRows} accentColor={Colors.tool.ctc} />
                        <View style={styles.note}>
                            <Text style={styles.noteText}>
                                Estimates use New Tax Regime (FY 2024-25). Professional Tax = Tamil Nadu slab. Actual take-home may vary with investments, declarations, and employer policies.
                            </Text>
                        </View>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    content: {
        padding: Spacing.xl,
        paddingBottom: 40,
    },
    backRow: {
        marginBottom: Spacing.lg,
    },
    backBtn: {
        alignSelf: 'flex-start',
    },
    backText: {
        color: Colors.tool.ctc,
        fontSize: FontSize.body,
        fontWeight: '600',
    },
    title: {
        color: Colors.text.primary,
        fontSize: FontSize.xxl,
        fontWeight: '700',
        marginBottom: Spacing.xs,
    },
    subtitle: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        marginBottom: Spacing.xl,
    },
    note: {
        marginTop: Spacing.sm,
    },
    noteText: {
        color: Colors.text.muted,
        fontSize: FontSize.xs,
        lineHeight: 18,
    },
});
