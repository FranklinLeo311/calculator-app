import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import InputField from '../../components/InputField';
import ResultCard from '../../components/ResultCard';
import type { ResultRow } from '../../components/ResultCard';
import { Colors, FontSize, Spacing, Radii } from '../../config/theme';

type Props = { onBack: () => void };
const COLOR = Colors.chart.amber;

const QUICK = [5, 10, 15, 20, 25, 30, 40, 50];

function fmt(n: number) { return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 }); }

export default function DiscountScreen({ onBack }: Props) {
    const [price, setPrice]       = React.useState('');
    const [discount, setDiscount] = React.useState('');

    const result = React.useMemo<ResultRow[] | null>(() => {
        const p = parseFloat(price);
        const d = parseFloat(discount);
        if (!p || !d || p <= 0 || d < 0 || d > 100) return null;
        try {
            const discountAmt = p * (d / 100);
            const finalPrice  = p - discountAmt;
            const savings     = discountAmt;
            return [
                { label: 'Original Price',  value: fmt(p) },
                { label: `Discount (${d}%)`, value: fmt(discountAmt), color: Colors.error },
                { label: 'You Save',         value: fmt(savings),      color: Colors.error },
                { label: 'Final Price',      value: fmt(finalPrice),   highlight: true, color: COLOR },
            ];
        } catch { return null; }
    }, [price, discount]);

    return (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Pressable onPress={onBack} style={styles.back}><Text style={[styles.backText, { color: COLOR }]}>‹ Back</Text></Pressable>
                <Text style={styles.title}>Discount Calculator</Text>
                <Text style={styles.sub}>Original price + discount % → final price</Text>

                <InputField label="Original Price (₹)" value={price} onChangeText={setPrice} placeholder="1000" />

                <Text style={styles.sectionLabel}>Quick Discount</Text>
                <View style={styles.quickRow}>
                    {QUICK.map(d => (
                        <Pressable key={d} onPress={() => setDiscount(String(d))}
                            style={[styles.quickBtn, discount === String(d) && { backgroundColor: COLOR + '25', borderColor: COLOR }]}>
                            <Text style={[styles.quickText, discount === String(d) && { color: COLOR }]}>{d}%</Text>
                        </Pressable>
                    ))}
                </View>

                <InputField label="Discount (%)" value={discount} onChangeText={setDiscount} placeholder="20" suffix="%" />

                {result && <ResultCard title="Breakdown" rows={result} accentColor={COLOR} />}
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
    quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
    quickBtn: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.inputBorder },
    quickText: { color: Colors.text.secondary, fontSize: FontSize.sm, fontWeight: '700' },
});
