import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import InputField from '../../components/InputField';
import ResultCard from '../../components/ResultCard';
import type { ResultRow } from '../../components/ResultCard';
import { Colors, FontSize, Spacing, Radii } from '../../config/theme';

type Props = { onBack: () => void };

function fmt(n: number) { return '₹' + Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }
function pct(n: number) { return (n >= 0 ? '+' : '') + n.toLocaleString('en-IN', { maximumFractionDigits: 2 }) + '%'; }

export default function ProfitLossScreen({ onBack }: Props) {
    const [costPrice, setCP]    = React.useState('');
    const [sellPrice, setSP]    = React.useState('');
    const [quantity, setQty]    = React.useState('1');

    const result = React.useMemo<ResultRow[] | null>(() => {
        const cp  = parseFloat(costPrice);
        const sp  = parseFloat(sellPrice);
        const qty = parseFloat(quantity) || 1;
        if (!cp || !sp || cp <= 0 || sp <= 0) return null;
        try {
            const totalCost   = cp * qty;
            const totalSell   = sp * qty;
            const profitLoss  = totalSell - totalCost;
            const pctChange   = ((sp - cp) / cp) * 100;
            const isProfit    = profitLoss >= 0;
            const COLOR       = isProfit ? Colors.accent : Colors.error;
            const label       = isProfit ? 'Profit' : 'Loss';
            return [
                { label: 'Cost Price (per unit)',  value: fmt(cp) },
                { label: 'Selling Price (per unit)', value: fmt(sp) },
                { label: 'Quantity',              value: qty.toString() },
                { label: 'Total Cost',            value: fmt(totalCost) },
                { label: 'Total Revenue',         value: fmt(totalSell) },
                { label: label,                   value: fmt(profitLoss), highlight: true, color: COLOR },
                { label: `${label} %`,            value: pct(pctChange), color: COLOR },
            ];
        } catch { return null; }
    }, [costPrice, sellPrice, quantity]);

    const cp   = parseFloat(costPrice);
    const sp   = parseFloat(sellPrice);
    const isProfit = sp >= cp;
    const accentColor = (!cp || !sp) ? Colors.tool.ctc : (isProfit ? Colors.accent : Colors.error);

    // Break-even section
    const breakEven = React.useMemo<ResultRow[] | null>(() => {
        const cp = parseFloat(costPrice);
        const sp = parseFloat(sellPrice);
        if (!cp || !sp || cp <= 0 || sp <= 0) return null;
        const markup     = ((sp - cp) / cp) * 100;
        const margin     = ((sp - cp) / sp) * 100;
        return [
            { label: 'Markup %',  value: pct(markup) },
            { label: 'Margin %',  value: pct(margin) },
        ];
    }, [costPrice, sellPrice]);

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Pressable onPress={onBack} style={styles.back}><Text style={[styles.backText, { color: accentColor }]}>‹ Back</Text></Pressable>
                <Text style={styles.title}>Profit & Loss</Text>
                <Text style={styles.sub}>Cost price, selling price, quantity → P&L + margin</Text>

                <InputField label="Cost Price (₹)" value={costPrice} onChangeText={setCP} placeholder="500" />
                <InputField label="Selling Price (₹)" value={sellPrice} onChangeText={setSP} placeholder="650" />
                <InputField label="Quantity (units)" value={quantity} onChangeText={setQty} placeholder="1" keyboardType="number-pad" />

                {result       && <ResultCard title="P&L Summary"  rows={result}    accentColor={accentColor} />}
                {breakEven    && <ResultCard title="Margin & Markup" rows={breakEven} accentColor={accentColor} />}
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
});
